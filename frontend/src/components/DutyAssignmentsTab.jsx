import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Clock, Sparkles, Download } from 'lucide-react';

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];

export default function DutyAssignmentsTab() {
  const [assignments, setAssignments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [weekNumber, setWeekNumber] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTeachers();
    fetchAssignments();
  }, [weekNumber]);

  const fetchTeachers = async () => {
    try {
      const response = await axios.get(`${API}/teachers`);
      setTeachers(response.data);
    } catch (error) {
      toast.error('Öğretmenler yüklenemedi');
    }
  };

  const fetchAssignments = async () => {
    try {
      const response = await axios.get(`${API}/duty-assignments?week_number=${weekNumber}`);
      setAssignments(response.data);
    } catch (error) {
      toast.error('Nöbetler yüklenemedi');
    }
  };

  const handleGenerateAssignments = async () => {
    if (teachers.length === 0) {
      toast.error('Önce öğretmen ekleyin');
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API}/duty-assignments/generate?week_number=${weekNumber}`);
      toast.success('Nöbetler oluşturuldu');
      fetchAssignments();
    } catch (error) {
      toast.error('Nöbetler oluşturulamadı');
    } finally {
      setLoading(false);
    }
  };

  const getTeacherName = (teacherId) => {
    const teacher = teachers.find(t => t.id === teacherId);
    return teacher ? teacher.name : 'Bilinmiyor';
  };

  const groupedAssignments = {};
  DAYS.forEach((_, idx) => {
    groupedAssignments[idx] = assignments.filter(a => a.day === idx);
  });

  return (
    <div className="space-y-6" data-testid="duty-assignments-tab">
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Clock className="w-6 h-6 text-purple-600" />
                Haftalık Nöbet Ataması
              </CardTitle>
              <CardDescription>Öğretmenlere otomatik nöbet ataması yapın</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Label htmlFor="week-number" className="text-sm whitespace-nowrap">Hafta:</Label>
                <Input
                  id="week-number"
                  data-testid="week-number-input"
                  type="number"
                  min="1"
                  max="52"
                  value={weekNumber}
                  onChange={(e) => setWeekNumber(parseInt(e.target.value))}
                  className="w-20 h-9"
                />
              </div>
              <Button 
                onClick={handleGenerateAssignments}
                data-testid="generate-assignments-button"
                disabled={loading}
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 gap-2 shadow-md"
              >
                <Sparkles className="w-4 h-4" />
                {loading ? 'Oluşturuluyor...' : 'Nöbet Oluştur'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Bu hafta için nöbet ataması yok</p>
              <p className="text-sm mt-2">"Nöbet Oluştur" butonuna tıklayarak otomatik atama yapabilirsiniz</p>
            </div>
          ) : (
            <div className="space-y-6" data-testid="assignments-list">
              {DAYS.map((day, dayIdx) => (
                <div key={dayIdx}>
                  <h3 className="text-lg font-semibold mb-3 text-purple-800">{day}</h3>
                  <div className="grid gap-2">
                    {groupedAssignments[dayIdx].length === 0 ? (
                      <p className="text-sm text-gray-500 italic">Bu gün için nöbet yok</p>
                    ) : (
                      groupedAssignments[dayIdx].map((assignment) => (
                        <div 
                          key={assignment.id} 
                          data-testid={`assignment-item-${assignment.id}`}
                          className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-purple-50 to-white border border-purple-100"
                        >
                          <div>
                            <p className="font-semibold text-gray-800">{getTeacherName(assignment.teacher_id)}</p>
                            <p className="text-sm text-gray-600">{assignment.location}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-purple-600">{assignment.time_slot}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}