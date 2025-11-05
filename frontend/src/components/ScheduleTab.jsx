import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Calendar, Trash2 } from 'lucide-react';

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
const HOURS = Array.from({ length: 9 }, (_, i) => `${i + 1}. Ders`);

export default function ScheduleTab() {
  const [schedules, setSchedules] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [schools, setSchools] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    teacher_id: '',
    school_id: '',
    classroom_id: '',
    day: 0,
    hour: 0,
    subject: ''
  });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [schedulesRes, teachersRes, schoolsRes, classroomsRes] = await Promise.all([
        axios.get(`${API}/schedules`),
        axios.get(`${API}/teachers`),
        axios.get(`${API}/schools`),
        axios.get(`${API}/classrooms`)
      ]);
      setSchedules(schedulesRes.data);
      setTeachers(teachersRes.data);
      setSchools(schoolsRes.data);
      setClassrooms(classroomsRes.data);
    } catch (error) {
      toast.error('Veriler yüklenemedi');
    }
  };

  const handleAddSchedule = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/schedules`, scheduleForm);
      toast.success('Ders eklendi');
      setScheduleForm({
        teacher_id: '',
        school_id: '',
        classroom_id: '',
        day: 0,
        hour: 0,
        subject: ''
      });
      setShowDialog(false);
      fetchAll();
    } catch (error) {
      toast.error('Ders eklenemedi');
    }
  };

  const handleDeleteSchedule = async (id) => {
    if (!window.confirm('Bu dersi silmek istediğinizden emin misiniz?')) return;
    try {
      await axios.delete(`${API}/schedules/${id}`);
      toast.success('Ders silindi');
      fetchAll();
    } catch (error) {
      toast.error('Ders silinemedi');
    }
  };

  const getTeacherName = (teacherId) => teachers.find(t => t.id === teacherId)?.name || '?';
  const getClassroomName = (classroomId) => classrooms.find(c => c.id === classroomId)?.name || '?';
  const getSchoolName = (schoolId) => schools.find(s => s.id === schoolId)?.name || '?';

  const scheduleGrid = Array(5).fill(null).map(() => Array(9).fill(null).map(() => []));
  schedules.forEach(schedule => {
    if (schedule.day >= 0 && schedule.day < 5 && schedule.hour >= 0 && schedule.hour < 9) {
      scheduleGrid[schedule.day][schedule.hour].push(schedule);
    }
  });

  return (
    <div className="space-y-6" data-testid="schedule-tab">
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Calendar className="w-6 h-6 text-purple-600" />
                Ders Programı
              </CardTitle>
              <CardDescription>Haftalık ders programını yönetin (45 ders - 9 ders/gün)</CardDescription>
            </div>
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
              <DialogTrigger asChild>
                <Button 
                  data-testid="add-schedule-button"
                  className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 gap-2 shadow-md"
                  disabled={teachers.length === 0 || classrooms.length === 0}
                >
                  <Plus className="w-4 h-4" />
                  Ders Ekle
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Yeni Ders Ekle</DialogTitle>
                  <DialogDescription>Ders programına yeni ders ekleyin</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddSchedule} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="teacher">Öğretmen</Label>
                    <select
                      id="teacher"
                      data-testid="teacher-select"
                      className="w-full p-2 border rounded-md bg-white"
                      value={scheduleForm.teacher_id}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, teacher_id: e.target.value })}
                      required
                    >
                      <option value="">Öğretmen seçiniz</option>
                      {teachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="school">Okul</Label>
                    <select
                      id="school"
                      data-testid="school-select"
                      className="w-full p-2 border rounded-md bg-white"
                      value={scheduleForm.school_id}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, school_id: e.target.value })}
                      required
                    >
                      <option value="">Okul seçiniz</option>
                      {schools.map((school) => (
                        <option key={school.id} value={school.id}>{school.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="classroom">Sınıf</Label>
                    <select
                      id="classroom"
                      data-testid="classroom-select"
                      className="w-full p-2 border rounded-md bg-white"
                      value={scheduleForm.classroom_id}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, classroom_id: e.target.value })}
                      required
                    >
                      <option value="">Sınıf seçiniz</option>
                      {classrooms.map((classroom) => (
                        <option key={classroom.id} value={classroom.id}>
                          {classroom.name} ({getSchoolName(classroom.school_id)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="day">Gün</Label>
                    <select
                      id="day"
                      data-testid="day-select"
                      className="w-full p-2 border rounded-md bg-white"
                      value={scheduleForm.day}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, day: parseInt(e.target.value) })}
                      required
                    >
                      {DAYS.map((day, idx) => (
                        <option key={idx} value={idx}>{day}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hour">Ders Saati</Label>
                    <select
                      id="hour"
                      data-testid="hour-select"
                      className="w-full p-2 border rounded-md bg-white"
                      value={scheduleForm.hour}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, hour: parseInt(e.target.value) })}
                      required
                    >
                      {HOURS.map((hour, idx) => (
                        <option key={idx} value={idx}>{hour}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Ders Adı</Label>
                    <input
                      id="subject"
                      data-testid="subject-input"
                      type="text"
                      placeholder="Örnek: Matematik"
                      className="w-full p-2 border rounded-md"
                      value={scheduleForm.subject}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, subject: e.target.value })}
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    data-testid="submit-schedule-button"
                    className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
                  >
                    Ekle
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto" data-testid="schedule-grid">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border border-purple-200 bg-gradient-to-r from-purple-600 to-purple-700 text-white p-2 text-sm font-medium">Ders</th>
                  {DAYS.map((day, idx) => (
                    <th key={idx} className="border border-purple-200 bg-gradient-to-r from-purple-600 to-purple-700 text-white p-2 text-sm font-medium">{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HOURS.map((hour, hourIdx) => (
                  <tr key={hourIdx}>
                    <td className="border border-purple-200 bg-purple-50 p-2 text-sm font-medium text-center">{hour}</td>
                    {DAYS.map((_, dayIdx) => (
                      <td key={dayIdx} className="border border-purple-200 p-1 min-w-[120px] align-top">
                        {scheduleGrid[dayIdx][hourIdx].map((schedule) => (
                          <div 
                            key={schedule.id} 
                            data-testid={`schedule-cell-${schedule.id}`}
                            className="bg-gradient-to-br from-purple-100 to-white p-2 rounded mb-1 text-xs group relative hover:shadow-md transition-all"
                          >
                            <div className="font-semibold text-purple-800">{schedule.subject}</div>
                            <div className="text-gray-600">{getTeacherName(schedule.teacher_id)}</div>
                            <div className="text-gray-500">{getClassroomName(schedule.classroom_id)}</div>
                            <button
                              onClick={() => handleDeleteSchedule(schedule.id)}
                              data-testid={`delete-schedule-${schedule.id}`}
                              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}