import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Calendar, Save, Users } from 'lucide-react';

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];

export default function TeacherWorkloadTab() {
  const [teachers, setTeachers] = useState([]);
  const [schedules, setSchedules] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [teachersRes, schedulesRes] = await Promise.all([
        axios.get(`${API}/teachers`),
        axios.get(`${API}/teacher-schedules`)
      ]);
      setTeachers(teachersRes.data);
      
      // Convert schedules array to object keyed by teacher_id
      const schedulesMap = {};
      schedulesRes.data.forEach(schedule => {
        schedulesMap[schedule.teacher_id] = schedule.weekly_hours;
      });
      setSchedules(schedulesMap);
    } catch (error) {
      toast.error('Veriler yüklenemedi');
    }
  };

  const handleHourChange = (teacherId, dayIdx, value) => {
    const hours = schedules[teacherId] || [0, 0, 0, 0, 0];
    const newHours = [...hours];
    newHours[dayIdx] = Math.min(9, Math.max(0, parseInt(value) || 0));
    
    setSchedules({
      ...schedules,
      [teacherId]: newHours
    });
  };

  const handleSave = async (teacherId) => {
    setLoading(true);
    try {
      await axios.post(`${API}/teacher-schedules`, {
        teacher_id: teacherId,
        weekly_hours: schedules[teacherId] || [0, 0, 0, 0, 0]
      });
      toast.success('Ders yükü kaydedildi');
    } catch (error) {
      toast.error('Kaydetme başarısız');
    } finally {
      setLoading(false);
    }
  };

  const getTotalHours = (teacherId) => {
    const hours = schedules[teacherId] || [0, 0, 0, 0, 0];
    return hours.reduce((sum, h) => sum + h, 0);
  };

  return (
    <div className="space-y-4 sm:space-y-6" data-testid="teacher-workload-tab">
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
            <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
            Öğretmen Ders Yükü
          </CardTitle>
          <CardDescription className="text-sm">
            Her öğretmen için haftalık ders saatlerini girin (günlük max 9 saat)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {teachers.length === 0 ? (
            <div className="text-center py-8 sm:py-12 text-gray-500">
              <Users className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm sm:text-base">Önce öğretmen ekleyin</p>
            </div>
          ) : (
            <div className="space-y-6">
              {teachers.map((teacher) => {
                const hours = schedules[teacher.id] || [0, 0, 0, 0, 0];
                const totalHours = getTotalHours(teacher.id);
                
                return (
                  <div 
                    key={teacher.id}
                    className="p-4 sm:p-6 rounded-lg bg-gradient-to-r from-purple-50 to-white border border-purple-100 space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-purple-800">{teacher.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Toplam: <span className="font-medium text-purple-600">{totalHours} saat/hafta</span>
                        </p>
                      </div>
                      <Button
                        onClick={() => handleSave(teacher.id)}
                        disabled={loading}
                        className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 gap-2 w-full sm:w-auto"
                      >
                        <Save className="w-4 h-4" />
                        Kaydet
                      </Button>
                    </div>

                    {/* Desktop Grid View */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr>
                            {DAYS.map((day, idx) => (
                              <th 
                                key={idx}
                                className="border border-purple-200 bg-gradient-to-r from-purple-600 to-purple-700 text-white p-3 text-sm font-medium"
                              >
                                {day}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            {DAYS.map((_, dayIdx) => (
                              <td key={dayIdx} className="border border-purple-200 p-2">
                                <input
                                  type="number"
                                  min="0"
                                  max="9"
                                  value={hours[dayIdx]}
                                  onChange={(e) => handleHourChange(teacher.id, dayIdx, e.target.value)}
                                  className="w-full p-2 text-center border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                  placeholder="0"
                                />
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile List View */}
                    <div className="md:hidden space-y-3">
                      {DAYS.map((day, dayIdx) => (
                        <div key={dayIdx} className="flex items-center justify-between gap-3">
                          <label className="text-sm font-medium text-gray-700 min-w-[100px]">
                            {day}
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="9"
                            value={hours[dayIdx]}
                            onChange={(e) => handleHourChange(teacher.id, dayIdx, e.target.value)}
                            className="w-20 p-2 text-center border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="0"
                          />
                          <span className="text-sm text-gray-500 min-w-[30px]">saat</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
