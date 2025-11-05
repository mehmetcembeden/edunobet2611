import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, CalendarDays, Trash2 } from 'lucide-react';

const MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

const DUTY_TYPES = [
  { value: 'entrance', label: 'Giriş Nöbeti' },
  { value: 'exit', label: 'Çıkış Nöbeti' },
  { value: 'yard', label: 'Bahçe Nöbeti' }
];

export default function SchoolDutyTab() {
  const [duties, setDuties] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [dutyForm, setDutyForm] = useState({
    teacher_id: '',
    duty_type: 'entrance',
    dates: []
  });
  const [selectedDates, setSelectedDates] = useState('');

  useEffect(() => {
    fetchTeachers();
    fetchDuties();
  }, [currentMonth, currentYear]);

  const fetchTeachers = async () => {
    try {
      const response = await axios.get(`${API}/teachers`);
      setTeachers(response.data);
    } catch (error) {
      toast.error('Öğretmenler yüklenemedi');
    }
  };

  const fetchDuties = async () => {
    try {
      const response = await axios.get(`${API}/school-duties?month=${currentMonth}&year=${currentYear}`);
      setDuties(response.data);
    } catch (error) {
      toast.error('Nöbetler yüklenemedi');
    }
  };

  const handleAddDuty = async (e) => {
    e.preventDefault();
    const dates = selectedDates.split(',').map(d => d.trim()).filter(Boolean);
    if (dates.length === 0) {
      toast.error('En az bir tarih giriniz');
      return;
    }
    
    try {
      await axios.post(`${API}/school-duties`, {
        ...dutyForm,
        month: currentMonth,
        year: currentYear,
        dates
      });
      toast.success('Nöbet eklendi');
      setDutyForm({ teacher_id: '', duty_type: 'entrance', dates: [] });
      setSelectedDates('');
      setShowDialog(false);
      fetchDuties();
    } catch (error) {
      toast.error('Nöbet eklenemedi');
    }
  };

  const handleDeleteDuty = async (id) => {
    if (!window.confirm('Bu nöbeti silmek istediğinizden emin misiniz?')) return;
    try {
      await axios.delete(`${API}/school-duties/${id}`);
      toast.success('Nöbet silindi');
      fetchDuties();
    } catch (error) {
      toast.error('Nöbet silinemedi');
    }
  };

  const getTeacherName = (teacherId) => {
    const teacher = teachers.find(t => t.id === teacherId);
    return teacher ? teacher.name : 'Bilinmiyor';
  };

  const getDutyTypeLabel = (type) => {
    const dutyType = DUTY_TYPES.find(dt => dt.value === type);
    return dutyType ? dutyType.label : type;
  };

  const groupedDuties = {};
  DUTY_TYPES.forEach(dt => {
    groupedDuties[dt.value] = duties.filter(d => d.duty_type === dt.value);
  });

  return (
    <div className="space-y-6" data-testid="school-duty-tab">
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <CalendarDays className="w-6 h-6 text-purple-600" />
                Okul Nöbet Takvimi
              </CardTitle>
              <CardDescription>Aylık giriş, çıkış ve bahçe nöbetlerini yönetin</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Label htmlFor="month" className="text-sm">Ay:</Label>
                <select
                  id="month"
                  data-testid="month-select"
                  className="p-2 border rounded-md bg-white h-9"
                  value={currentMonth}
                  onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
                >
                  {MONTHS.map((month, idx) => (
                    <option key={idx} value={idx + 1}>{month}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="year" className="text-sm">Yıl:</Label>
                <input
                  id="year"
                  data-testid="year-input"
                  type="number"
                  className="w-24 p-2 border rounded-md h-9"
                  value={currentYear}
                  onChange={(e) => setCurrentYear(parseInt(e.target.value))}
                />
              </div>
              <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogTrigger asChild>
                  <Button 
                    data-testid="add-school-duty-button"
                    className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 gap-2 shadow-md"
                    disabled={teachers.length === 0}
                  >
                    <Plus className="w-4 h-4" />
                    Nöbet Ekle
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Yeni Okul Nöbeti Ekle</DialogTitle>
                    <DialogDescription>
                      {MONTHS[currentMonth - 1]} {currentYear} için nöbet ekleyin
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddDuty} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="duty-teacher">Öğretmen</Label>
                      <select
                        id="duty-teacher"
                        data-testid="duty-teacher-select"
                        className="w-full p-2 border rounded-md bg-white"
                        value={dutyForm.teacher_id}
                        onChange={(e) => setDutyForm({ ...dutyForm, teacher_id: e.target.value })}
                        required
                      >
                        <option value="">Öğretmen seçiniz</option>
                        {teachers.map((teacher) => (
                          <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="duty-type">Nöbet Türü</Label>
                      <select
                        id="duty-type"
                        data-testid="duty-type-select"
                        className="w-full p-2 border rounded-md bg-white"
                        value={dutyForm.duty_type}
                        onChange={(e) => setDutyForm({ ...dutyForm, duty_type: e.target.value })}
                        required
                      >
                        {DUTY_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dates">Tarihler (virgülle ayrılı)</Label>
                      <input
                        id="dates"
                        data-testid="dates-input"
                        type="text"
                        placeholder="Örnek: 01.03.2025, 08.03.2025, 15.03.2025"
                        className="w-full p-2 border rounded-md"
                        value={selectedDates}
                        onChange={(e) => setSelectedDates(e.target.value)}
                        required
                      />
                      <p className="text-xs text-gray-500">Her tarihi virgülle ayırın</p>
                    </div>
                    <Button 
                      type="submit" 
                      data-testid="submit-school-duty-button"
                      className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
                    >
                      Ekle
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-6">
            <h3 className="text-xl font-semibold text-purple-800">
              {MONTHS[currentMonth - 1]} {currentYear} Nöbet Takvimi
            </h3>
          </div>
          
          {duties.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Bu ay için nöbet ataması yok</p>
            </div>
          ) : (
            <div className="space-y-6" data-testid="school-duties-list">
              {DUTY_TYPES.map((dutyType) => (
                <div key={dutyType.value}>
                  <h4 className="text-lg font-semibold mb-3 text-purple-700">{dutyType.label}</h4>
                  {groupedDuties[dutyType.value].length === 0 ? (
                    <p className="text-sm text-gray-500 italic mb-4">Bu tür için nöbet yok</p>
                  ) : (
                    <div className="grid gap-3 mb-4">
                      {groupedDuties[dutyType.value].map((duty) => (
                        <div 
                          key={duty.id} 
                          data-testid={`school-duty-item-${duty.id}`}
                          className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-purple-50 to-white border border-purple-100"
                        >
                          <div>
                            <p className="font-semibold text-gray-800">{getTeacherName(duty.teacher_id)}</p>
                            <p className="text-sm text-gray-600 mt-1">
                              {duty.dates.join(', ')}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid={`delete-school-duty-${duty.id}`}
                            onClick={() => handleDeleteDuty(duty.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}