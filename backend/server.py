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

class Schedule(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    teacher_id: str
    school_id: str
    classroom_id: str
    day: int  # 0-4 (Monday-Friday)
    hour: int  # 0-8 (9 hours per day)
    subject: str
    user_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ScheduleCreate(BaseModel):
    teacher_id: str
    school_id: str
    classroom_id: str
    day: int
    hour: int
    subject: str

class DutyAssignment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    teacher_id: str
    classroom_id: str  # Classroom/location ID
    day: int  # 0-4 (Monday-Friday)
    week_number: int
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

@api_router.delete("/teachers/{teacher_id}")
async def delete_teacher(teacher_id: str, current_user: User = Depends(get_current_user)):
    result = await db.teachers.delete_one({"id": teacher_id, "user_id": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Teacher not found")
    return {"message": "Teacher deleted"}

# ===== SCHEDULE ENDPOINTS =====

@api_router.post("/schedules", response_model=Schedule)
async def create_schedule(schedule_data: ScheduleCreate, current_user: User = Depends(get_current_user)):
    schedule = Schedule(**schedule_data.model_dump(), user_id=current_user.id)
    doc = schedule.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.schedules.insert_one(doc)
    return schedule

@api_router.get("/schedules", response_model=List[Schedule])
async def get_schedules(current_user: User = Depends(get_current_user)):
    schedules = await db.schedules.find({"user_id": current_user.id}, {"_id": 0}).to_list(10000)
    for schedule in schedules:
        if isinstance(schedule.get('created_at'), str):
            schedule['created_at'] = datetime.fromisoformat(schedule['created_at'])
    return schedules

@api_router.delete("/schedules/{schedule_id}")
async def delete_schedule(schedule_id: str, current_user: User = Depends(get_current_user)):
    result = await db.schedules.delete_one({"id": schedule_id, "user_id": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return {"message": "Schedule deleted"}

# ===== DUTY ASSIGNMENT ENDPOINTS =====

@api_router.post("/duty-assignments/generate")
async def generate_duty_assignments(week_number: int, current_user: User = Depends(get_current_user)):
    # Get all teachers, schedules, and classrooms
    teachers = await db.teachers.find({"user_id": current_user.id}, {"_id": 0}).to_list(1000)
    schedules = await db.schedules.find({"user_id": current_user.id}, {"_id": 0}).to_list(10000)
    classrooms = await db.classrooms.find({"user_id": current_user.id}, {"_id": 0}).to_list(1000)
    
    # Clear existing assignments for this week
    await db.duty_assignments.delete_many({"user_id": current_user.id, "week_number": week_number})
    
    assignments = []
    teacher_duty_count = {t['id']: 0 for t in teachers}
    
    # Calculate teacher workload per day (number of classes)
    teacher_schedule_count = {}
    for schedule in schedules:
        key = f"{schedule['teacher_id']}_{schedule['day']}"
        teacher_schedule_count[key] = teacher_schedule_count.get(key, 0) + 1
    
    # Assign duties for each day and time slot
    time_slots = ["08:00-09:00", "09:00-10:00", "10:00-11:00", "11:00-12:00", "12:00-13:00"]
    
    for day in range(5):  # Monday to Friday
        for classroom in classrooms:
            for time_slot in time_slots[:2]:  # 2 duty shifts per day
                # Find suitable teacher
                suitable_teachers = [
                    t for t in teachers 
                    if teacher_duty_count[t['id']] < t['weekly_duty_limit']
                ]
                
                if not suitable_teachers:
                    continue
                
                # Sort by: least duties assigned, then least classes that day
                suitable_teachers.sort(
                    key=lambda t: (
                        teacher_duty_count[t['id']], 
                        teacher_schedule_count.get(f"{t['id']}_{day}", 0)
                    )
                )
                
                selected_teacher = suitable_teachers[0]
                
                assignment = DutyAssignment(
                    teacher_id=selected_teacher['id'],
                    location=f"{classroom['name']} (Kat {classroom['floor']})",
                    day=day,
                    time_slot=time_slot,
                    week_number=week_number,
                    user_id=current_user.id
                )
                
                doc = assignment.model_dump()
                doc['created_at'] = doc['created_at'].isoformat()
                await db.duty_assignments.insert_one(doc)
                
                teacher_duty_count[selected_teacher['id']] += 1
                assignments.append(assignment)
    
    return {"message": f"Generated {len(assignments)} duty assignments for week {week_number}"}

@api_router.get("/duty-assignments")
async def get_duty_assignments(week_number: int, current_user: User = Depends(get_current_user)):
    assignments = await db.duty_assignments.find(
        {"user_id": current_user.id, "week_number": week_number}, 
        {"_id": 0}
    ).to_list(10000)
    
    for assignment in assignments:
        if isinstance(assignment.get('created_at'), str):
            assignment['created_at'] = datetime.fromisoformat(assignment['created_at'])
    
    return assignments

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