from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
from io import BytesIO
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from fastapi.responses import StreamingResponse

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24 * 60  # 30 days

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# ===== MODELS =====

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class School(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    building: str
    user_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SchoolCreate(BaseModel):
    name: str
    building: str

class Classroom(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    school_id: str
    name: str
    floor: int
    user_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ClassroomCreate(BaseModel):
    school_id: str
    name: str
    floor: int

class Teacher(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    school_ids: List[str]  # Multiple schools
    weekly_duty_limit: int  # Max duties per week
    user_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TeacherCreate(BaseModel):
    name: str
    school_ids: List[str]
    weekly_duty_limit: int

class TeacherSchedule(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    teacher_id: str
    weekly_hours: List[int]  # 5 days, each day has hour count (0-9)
    user_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TeacherScheduleCreate(BaseModel):
    teacher_id: str
    weekly_hours: List[int]  # [monday_hours, tuesday_hours, ..., friday_hours]

class DutyAssignment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    teacher_id: str
    classroom_id: str  # Classroom/location ID
    day: int  # 0-4 (Monday-Friday)
    week_number: int
    start_date: Optional[str] = None  # Start date of the week
    end_date: Optional[str] = None  # End date of the week
    approved: bool = False
    approved_at: Optional[datetime] = None
    transformed_from: Optional[str] = None  # ID of original assignment
    user_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DutyAssignmentCreate(BaseModel):
    teacher_id: str
    classroom_id: str
    day: int
    week_number: int

class SchoolDuty(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    teacher_id: str
    month: int  # 1-12
    year: int
    duty_type: str  # "entrance", "exit", "yard"
    dates: List[str]  # List of dates assigned
    user_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SchoolDutyCreate(BaseModel):
    teacher_id: str
    month: int
    year: int
    duty_type: str
    dates: List[str]

# ===== AUTH HELPERS =====

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return User(**user)

# ===== AUTH ENDPOINTS =====

@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user_data.password)
    user = User(email=user_data.email, name=user_data.name)
    user_doc = user.model_dump()
    user_doc['timestamp'] = user_doc['created_at'].isoformat()
    user_doc['password'] = hashed_password
    
    await db.users.insert_one(user_doc)
    
    access_token = create_access_token(data={"sub": user.id})
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    user_doc = await db.users.find_one({"email": credentials.email})
    if not user_doc or not verify_password(credentials.password, user_doc['password']):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    user = User(**user_doc)
    access_token = create_access_token(data={"sub": user.id})
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# ===== SCHOOL ENDPOINTS =====

@api_router.post("/schools", response_model=School)
async def create_school(school_data: SchoolCreate, current_user: User = Depends(get_current_user)):
    school = School(**school_data.model_dump(), user_id=current_user.id)
    doc = school.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.schools.insert_one(doc)
    return school

@api_router.get("/schools", response_model=List[School])
async def get_schools(current_user: User = Depends(get_current_user)):
    schools = await db.schools.find({"user_id": current_user.id}, {"_id": 0}).to_list(1000)
    for school in schools:
        if isinstance(school.get('created_at'), str):
            school['created_at'] = datetime.fromisoformat(school['created_at'])
    return schools

@api_router.put("/schools/{school_id}")
async def update_school(school_id: str, school_data: SchoolCreate, current_user: User = Depends(get_current_user)):
    result = await db.schools.update_one(
        {"id": school_id, "user_id": current_user.id},
        {"$set": school_data.model_dump()}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="School not found")
    return {"message": "School updated"}

@api_router.delete("/schools/{school_id}")
async def delete_school(school_id: str, current_user: User = Depends(get_current_user)):
    result = await db.schools.delete_one({"id": school_id, "user_id": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="School not found")
    return {"message": "School deleted"}

# ===== CLASSROOM ENDPOINTS =====

@api_router.post("/classrooms", response_model=Classroom)
async def create_classroom(classroom_data: ClassroomCreate, current_user: User = Depends(get_current_user)):
    classroom = Classroom(**classroom_data.model_dump(), user_id=current_user.id)
    doc = classroom.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.classrooms.insert_one(doc)
    return classroom

@api_router.get("/classrooms", response_model=List[Classroom])
async def get_classrooms(current_user: User = Depends(get_current_user)):
    classrooms = await db.classrooms.find({"user_id": current_user.id}, {"_id": 0}).to_list(1000)
    for classroom in classrooms:
        if isinstance(classroom.get('created_at'), str):
            classroom['created_at'] = datetime.fromisoformat(classroom['created_at'])
    return classrooms

@api_router.put("/classrooms/{classroom_id}")
async def update_classroom(classroom_id: str, classroom_data: ClassroomCreate, current_user: User = Depends(get_current_user)):
    result = await db.classrooms.update_one(
        {"id": classroom_id, "user_id": current_user.id},
        {"$set": classroom_data.model_dump()}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Classroom not found")
    return {"message": "Classroom updated"}

@api_router.delete("/classrooms/{classroom_id}")
async def delete_classroom(classroom_id: str, current_user: User = Depends(get_current_user)):
    result = await db.classrooms.delete_one({"id": classroom_id, "user_id": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Classroom not found")
    return {"message": "Classroom deleted"}

# ===== TEACHER ENDPOINTS =====

@api_router.post("/teachers", response_model=Teacher)
async def create_teacher(teacher_data: TeacherCreate, current_user: User = Depends(get_current_user)):
    teacher = Teacher(**teacher_data.model_dump(), user_id=current_user.id)
    doc = teacher.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.teachers.insert_one(doc)
    return teacher

@api_router.get("/teachers", response_model=List[Teacher])
async def get_teachers(current_user: User = Depends(get_current_user)):
    teachers = await db.teachers.find({"user_id": current_user.id}, {"_id": 0}).to_list(1000)
    for teacher in teachers:
        if isinstance(teacher.get('created_at'), str):
            teacher['created_at'] = datetime.fromisoformat(teacher['created_at'])
    return teachers

@api_router.put("/teachers/{teacher_id}")
async def update_teacher(teacher_id: str, teacher_data: TeacherCreate, current_user: User = Depends(get_current_user)):
    result = await db.teachers.update_one(
        {"id": teacher_id, "user_id": current_user.id},
        {"$set": teacher_data.model_dump()}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Teacher not found")
    return {"message": "Teacher updated"}

@api_router.delete("/teachers/{teacher_id}")
async def delete_teacher(teacher_id: str, current_user: User = Depends(get_current_user)):
    result = await db.teachers.delete_one({"id": teacher_id, "user_id": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Teacher not found")
    return {"message": "Teacher deleted"}

# ===== TEACHER SCHEDULE ENDPOINTS =====

@api_router.post("/teacher-schedules", response_model=TeacherSchedule)
async def create_teacher_schedule(schedule_data: TeacherScheduleCreate, current_user: User = Depends(get_current_user)):
    # Check if schedule already exists for this teacher
    existing = await db.teacher_schedules.find_one({"teacher_id": schedule_data.teacher_id, "user_id": current_user.id})
    if existing:
        # Update existing
        result = await db.teacher_schedules.update_one(
            {"teacher_id": schedule_data.teacher_id, "user_id": current_user.id},
            {"$set": {"weekly_hours": schedule_data.weekly_hours}}
        )
        existing['weekly_hours'] = schedule_data.weekly_hours
        return TeacherSchedule(**existing)
    
    # Create new
    schedule = TeacherSchedule(**schedule_data.model_dump(), user_id=current_user.id)
    doc = schedule.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.teacher_schedules.insert_one(doc)
    return schedule

@api_router.get("/teacher-schedules", response_model=List[TeacherSchedule])
async def get_teacher_schedules(current_user: User = Depends(get_current_user)):
    schedules = await db.teacher_schedules.find({"user_id": current_user.id}, {"_id": 0}).to_list(1000)
    for schedule in schedules:
        if isinstance(schedule.get('created_at'), str):
            schedule['created_at'] = datetime.fromisoformat(schedule['created_at'])
    return schedules

@api_router.get("/teacher-schedules/{teacher_id}")
async def get_teacher_schedule(teacher_id: str, current_user: User = Depends(get_current_user)):
    schedule = await db.teacher_schedules.find_one(
        {"teacher_id": teacher_id, "user_id": current_user.id},
        {"_id": 0}
    )
    if not schedule:
        # Return default empty schedule
        return {"teacher_id": teacher_id, "weekly_hours": [0, 0, 0, 0, 0]}
    if isinstance(schedule.get('created_at'), str):
        schedule['created_at'] = datetime.fromisoformat(schedule['created_at'])
    return schedule

# ===== DUTY ASSIGNMENT ENDPOINTS =====

@api_router.post("/duty-assignments/generate")
async def generate_duty_assignments(week_number: int, current_user: User = Depends(get_current_user)):
    # Get all teachers, teacher schedules, and classrooms
    teachers = await db.teachers.find({"user_id": current_user.id}, {"_id": 0}).to_list(1000)
    teacher_schedules = await db.teacher_schedules.find({"user_id": current_user.id}, {"_id": 0}).to_list(1000)
    classrooms = await db.classrooms.find({"user_id": current_user.id}, {"_id": 0}).to_list(1000)
    
    # Clear existing unapproved assignments for this week
    await db.duty_assignments.delete_many({"user_id": current_user.id, "week_number": week_number, "approved": False})
    
    assignments = []
    teacher_duty_count = {t['id']: 0 for t in teachers}
    
    # Create teacher schedule lookup: teacher_id -> [hours per day]
    teacher_workload = {}
    for ts in teacher_schedules:
        teacher_workload[ts['teacher_id']] = ts['weekly_hours']
    
    # Track which classroom+day combinations are assigned
    assigned_locations = set()
    
    # Group classrooms by school
    classrooms_by_school = {}
    for classroom in classrooms:
        school_id = classroom['school_id']
        if school_id not in classrooms_by_school:
            classrooms_by_school[school_id] = []
        classrooms_by_school[school_id].append(classroom)
    
    # Assign duties for each school separately
    for school_id, school_classrooms in classrooms_by_school.items():
        # Get teachers assigned to this school
        school_teachers = [
            t for t in teachers 
            if school_id in t['school_ids']
        ]
        
        if not school_teachers:
            continue
        
        # Assign duties: one teacher per classroom per day
        for day in range(5):  # Monday to Friday
            for classroom in school_classrooms:
                location_key = f"{classroom['id']}_{day}"
                if location_key in assigned_locations:
                    continue
                
                # Find suitable teacher for this school
                suitable_teachers = [
                    t for t in school_teachers 
                    if teacher_duty_count[t['id']] < t['weekly_duty_limit']
                ]
                
                if not suitable_teachers:
                    continue
                
                # Sort by: 1) least duties assigned, 2) least hours that day (PRIORITY)
                suitable_teachers.sort(
                    key=lambda t: (
                        teacher_duty_count[t['id']], 
                        teacher_workload.get(t['id'], [0,0,0,0,0])[day]
                    )
                )
                
                selected_teacher = suitable_teachers[0]
                
                assignment = DutyAssignment(
                    teacher_id=selected_teacher['id'],
                    classroom_id=classroom['id'],
                    day=day,
                    week_number=week_number,
                    approved=False,
                    user_id=current_user.id
                )
                
                doc = assignment.model_dump()
                doc['created_at'] = doc['created_at'].isoformat()
                if doc.get('approved_at'):
                    doc['approved_at'] = doc['approved_at'].isoformat()
                await db.duty_assignments.insert_one(doc)
                
                teacher_duty_count[selected_teacher['id']] += 1
                assigned_locations.add(location_key)
                assignments.append(assignment)
    
    # Analyze and provide suggestions
    suggestions = []
    for teacher in teachers:
        teacher_id = teacher['id']
        duty_days = [a for a in assignments if a.teacher_id == teacher_id]
        
        # Check if teacher has heavy workload on duty days
        for assignment in duty_days:
            hours_that_day = teacher_workload.get(teacher_id, [0,0,0,0,0])[assignment.day]
            if hours_that_day >= 7:  # Heavy day (7+ hours)
                suggestions.append({
                    "teacher_id": teacher_id,
                    "teacher_name": teacher['name'],
                    "day": assignment.day,
                    "hours_count": hours_that_day,
                    "suggestion": f"{teacher['name']} bu gün {hours_that_day} saat ders yapıyor. Nöbet vermemek daha uygun olabilir."
                })
    
    return {
        "message": f"Generated {len(assignments)} duty assignments for week {week_number}",
        "suggestions": suggestions
    }

@api_router.get("/duty-assignments")
async def get_duty_assignments(week_number: int, approved: Optional[bool] = None, current_user: User = Depends(get_current_user)):
    query = {"user_id": current_user.id, "week_number": week_number}
    if approved is not None:
        query["approved"] = approved
        
    assignments = await db.duty_assignments.find(query, {"_id": 0}).to_list(10000)
    
    for assignment in assignments:
        if isinstance(assignment.get('created_at'), str):
            assignment['created_at'] = datetime.fromisoformat(assignment['created_at'])
        if assignment.get('approved_at') and isinstance(assignment.get('approved_at'), str):
            assignment['approved_at'] = datetime.fromisoformat(assignment['approved_at'])
    
    return assignments

@api_router.post("/duty-assignments", response_model=DutyAssignment)
async def create_duty_assignment(assignment_data: DutyAssignmentCreate, current_user: User = Depends(get_current_user)):
    assignment = DutyAssignment(**assignment_data.model_dump(), user_id=current_user.id)
    doc = assignment.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    if doc.get('approved_at'):
        doc['approved_at'] = doc['approved_at'].isoformat()
    await db.duty_assignments.insert_one(doc)
    return assignment

@api_router.put("/duty-assignments/{assignment_id}")
async def update_duty_assignment(
    assignment_id: str, 
    assignment_data: DutyAssignmentCreate, 
    current_user: User = Depends(get_current_user)
):
    result = await db.duty_assignments.update_one(
        {"id": assignment_id, "user_id": current_user.id},
        {"$set": assignment_data.model_dump()}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return {"message": "Assignment updated"}

@api_router.delete("/duty-assignments/{assignment_id}")
async def delete_duty_assignment(assignment_id: str, current_user: User = Depends(get_current_user)):
    result = await db.duty_assignments.delete_one({"id": assignment_id, "user_id": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return {"message": "Assignment deleted"}

@api_router.post("/duty-assignments/approve")
async def approve_duty_assignments(week_number: int, current_user: User = Depends(get_current_user)):
    result = await db.duty_assignments.update_many(
        {"user_id": current_user.id, "week_number": week_number, "approved": False},
        {"$set": {"approved": True, "approved_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": f"Approved {result.modified_count} duty assignments"}

@api_router.post("/duty-assignments/transform")
async def transform_duty_assignments(week_number: int, current_user: User = Depends(get_current_user)):
    # Get current approved assignments
    current_assignments = await db.duty_assignments.find(
        {"user_id": current_user.id, "week_number": week_number, "approved": True},
        {"_id": 0}
    ).to_list(10000)
    
    if not current_assignments:
        raise HTTPException(status_code=404, detail="No approved assignments found for this week")
    
    # Get schedules and teachers
    teachers = await db.teachers.find({"user_id": current_user.id}, {"_id": 0}).to_list(1000)
    schedules = await db.schedules.find({"user_id": current_user.id}, {"_id": 0}).to_list(10000)
    
    # Calculate teacher workload per day
    teacher_schedule_count = {}
    for schedule in schedules:
        key = f"{schedule['teacher_id']}_{schedule['day']}"
        teacher_schedule_count[key] = teacher_schedule_count.get(key, 0) + 1
    
    # Create new assignments with transformation
    new_assignments = []
    teacher_duty_count = {t['id']: 0 for t in teachers}
    
    for old_assignment in current_assignments:
        day = old_assignment['day']
        classroom_id = old_assignment['classroom_id']
        
        # Find best teacher for this day based on schedule
        suitable_teachers = [
            t for t in teachers 
            if teacher_duty_count[t['id']] < t['weekly_duty_limit']
        ]
        
        if not suitable_teachers:
            continue
        
        suitable_teachers.sort(
            key=lambda t: (
                teacher_duty_count[t['id']], 
                teacher_schedule_count.get(f"{t['id']}_{day}", 0)
            )
        )
        
        selected_teacher = suitable_teachers[0]
        
        assignment = DutyAssignment(
            teacher_id=selected_teacher['id'],
            classroom_id=classroom_id,
            day=day,
            week_number=week_number,
            approved=False,
            transformed_from=old_assignment['id'],
            user_id=current_user.id
        )
        
        doc = assignment.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        if doc.get('approved_at'):
            doc['approved_at'] = doc['approved_at'].isoformat()
        await db.duty_assignments.insert_one(doc)
        
        teacher_duty_count[selected_teacher['id']] += 1
        new_assignments.append(assignment)
    
    return {"message": f"Transformed {len(new_assignments)} assignments", "count": len(new_assignments)}

@api_router.get("/duty-assignments/export-pdf")
async def export_duty_assignments_pdf(week_number: int, current_user: User = Depends(get_current_user)):
    # Get approved assignments
    assignments = await db.duty_assignments.find(
        {"user_id": current_user.id, "week_number": week_number, "approved": True},
        {"_id": 0}
    ).to_list(10000)
    
    if not assignments:
        raise HTTPException(status_code=404, detail="No approved assignments found")
    
    # Get related data
    teachers = await db.teachers.find({"user_id": current_user.id}, {"_id": 0}).to_list(1000)
    classrooms = await db.classrooms.find({"user_id": current_user.id}, {"_id": 0}).to_list(1000)
    
    teacher_map = {t['id']: t['name'] for t in teachers}
    classroom_map = {c['id']: c['name'] for c in classrooms}
    
    # Create PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(A4))
    elements = []
    
    styles = getSampleStyleSheet()
    elements.append(Paragraph(f"Hafta {week_number} Nöbet Çizelgesi", styles['Title']))
    elements.append(Spacer(1, 12))
    
    # Create table
    days = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma']
    
    # Group assignments by classroom
    classroom_assignments = {}
    for assignment in assignments:
        classroom_id = assignment['classroom_id']
        if classroom_id not in classroom_assignments:
            classroom_assignments[classroom_id] = {}
        classroom_assignments[classroom_id][assignment['day']] = assignment['teacher_id']
    
    # Build table data
    table_data = [['Nöbet Yeri'] + days]
    
    for classroom_id, day_assignments in classroom_assignments.items():
        row = [classroom_map.get(classroom_id, 'Bilinmeyen')]
        for day in range(5):
            teacher_id = day_assignments.get(day, '')
            teacher_name = teacher_map.get(teacher_id, '-') if teacher_id else '-'
            row.append(teacher_name)
        table_data.append(row)
    
    table = Table(table_data)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.purple),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    
    elements.append(table)
    doc.build(elements)
    
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=nobet_hafta_{week_number}.pdf"}
    )

@api_router.get("/duty-assignments/archive")
async def get_archived_assignments(current_user: User = Depends(get_current_user)):
    # Get all approved assignments grouped by week
    assignments = await db.duty_assignments.find(
        {"user_id": current_user.id, "approved": True},
        {"_id": 0}
    ).to_list(10000)
    
    # Group by week
    weeks = {}
    for assignment in assignments:
        week = assignment['week_number']
        if week not in weeks:
            weeks[week] = {
                "week_number": week,
                "approved_at": assignment.get('approved_at'),
                "transformed_from": assignment.get('transformed_from'),
                "count": 0
            }
        weeks[week]['count'] += 1
    
    return list(weeks.values())

# ===== SCHOOL DUTY ENDPOINTS =====

@api_router.post("/school-duties", response_model=SchoolDuty)
async def create_school_duty(duty_data: SchoolDutyCreate, current_user: User = Depends(get_current_user)):
    duty = SchoolDuty(**duty_data.model_dump(), user_id=current_user.id)
    doc = duty.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.school_duties.insert_one(doc)
    return duty

@api_router.get("/school-duties")
async def get_school_duties(month: int, year: int, current_user: User = Depends(get_current_user)):
    duties = await db.school_duties.find(
        {"user_id": current_user.id, "month": month, "year": year}, 
        {"_id": 0}
    ).to_list(1000)
    
    for duty in duties:
        if isinstance(duty.get('created_at'), str):
            duty['created_at'] = datetime.fromisoformat(duty['created_at'])
    
    return duties

@api_router.delete("/school-duties/{duty_id}")
async def delete_school_duty(duty_id: str, current_user: User = Depends(get_current_user)):
    result = await db.school_duties.delete_one({"id": duty_id, "user_id": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="School duty not found")
    return {"message": "School duty deleted"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()