import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Users, Calendar, Edit } from 'lucide-react';

export default function TeachersTab() {
  const [teachers, setTeachers] = useState([]);
  const [schools, setSchools] = useState([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [teacherForm, setTeacherForm] = useState({
    name: '',
    school_ids: [],
    weekly_duty_limit: 5
  });

  useEffect(() => {
    fetchTeachers();
    fetchSchools();
  }, []);

  const fetchTeachers = async () => {
    try {
      const response = await axios.get(`${API}/teachers`);
      setTeachers(response.data);
    } catch (error) {
      toast.error('Öğretmenler yüklenemedi');
    }
  };

  const fetchSchools = async () => {
    try {
      const response = await axios.get(`${API}/schools`);
      setSchools(response.data);
    } catch (error) {
      toast.error('Okullar yüklenemedi');
    }
  };

  const handleAddTeacher = async (e) => {
    e.preventDefault();
    if (teacherForm.school_ids.length === 0) {
      toast.error('En az bir okul seçmelisiniz');
      return;
    }
    try {
      await axios.post(`${API}/teachers`, teacherForm);
      toast.success('Öğretmen eklendi');
      setTeacherForm({ name: '', school_ids: [], weekly_duty_limit: 5 });
      setShowAddDialog(false);
      fetchTeachers();
    } catch (error) {
      toast.error('Öğretmen eklenemedi');
    }
  };

  const handleEditTeacher = async (e) => {
    e.preventDefault();
    if (teacherForm.school_ids.length === 0) {
      toast.error('En az bir okul seçmelisiniz');
      return;
    }
    try {
      await axios.put(`${API}/teachers/${editingTeacher.id}`, teacherForm);
      toast.success('Öğretmen güncellendi');
      setShowEditDialog(false);
      setEditingTeacher(null);
      fetchTeachers();
    } catch (error) {
      toast.error('Öğretmen güncellenemedi');
    }
  };

  const openEditDialog = (teacher) => {
    setEditingTeacher(teacher);
    setTeacherForm({
      name: teacher.name,
      school_ids: teacher.school_ids,
      weekly_duty_limit: teacher.weekly_duty_limit
    });
    setShowEditDialog(true);
  };

  const handleDeleteTeacher = async (id) => {
    if (!window.confirm('Bu öğretmeni silmek istediğinizden emin misiniz?')) return;
    try {
      await axios.delete(`${API}/teachers/${id}`);
      toast.success('Öğretmen silindi');
      fetchTeachers();
    } catch (error) {
      toast.error('Öğretmen silinemedi');
    }
  };

  const handleSchoolToggle = (schoolId) => {
    setTeacherForm(prev => ({
      ...prev,
      school_ids: prev.school_ids.includes(schoolId)
        ? prev.school_ids.filter(id => id !== schoolId)
        : [...prev.school_ids, schoolId]
    }));
  };

  const getSchoolNames = (schoolIds) => {
    return schoolIds
      .map(id => schools.find(s => s.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  };

  return (
    <div className="space-y-4 sm:space-y-6" data-testid="teachers-tab">
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                Öğretmenler
              </CardTitle>
              <CardDescription className="text-sm">Öğretmenleri ve günlük nöbet limitlerini yönetin</CardDescription>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button 
                  data-testid="add-teacher-button"
                  className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 gap-2 shadow-md w-full sm:w-auto"
                  disabled={schools.length === 0}
                >
                  <Plus className="w-4 h-4" />
                  Öğretmen Ekle
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md mx-4">
                <DialogHeader>
                  <DialogTitle>Yeni Öğretmen Ekle</DialogTitle>
                  <DialogDescription>Yeni bir öğretmen bilgisi ekleyin</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddTeacher} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="teacher-name">Öğretmen Adı</Label>
                    <Input
                      id="teacher-name"
                      data-testid="teacher-name-input"
                      placeholder="Örnek: Ahmet Yılmaz"
                      value={teacherForm.name}
                      onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Görevli Okullar</Label>
                    <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3" data-testid="schools-checklist">
                      {schools.map((school) => (
                        <label key={school.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            data-testid={`school-checkbox-${school.id}`}
                            checked={teacherForm.school_ids.includes(school.id)}
                            onChange={() => handleSchoolToggle(school.id)}
                            className="w-4 h-4 text-purple-600 rounded"
                          />
                          <span className="text-sm">{school.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weekly-limit">
                      Haftalık Nöbet Limiti
                      <span className="text-xs text-gray-500 ml-2">(gün/hafta)</span>
                    </Label>
                    <Input
                      id="weekly-limit"
                      data-testid="weekly-limit-input"
                      type="number"
                      min="1"
                      max="5"
                      value={teacherForm.weekly_duty_limit}
                      onChange={(e) => setTeacherForm({ ...teacherForm, weekly_duty_limit: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    data-testid="submit-teacher-button"
                    className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
                  >
                    Ekle
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {teachers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Henüz öğretmen eklenmemiş</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {teachers.map((teacher) => (
                <div 
                  key={teacher.id} 
                  data-testid={`teacher-item-${teacher.id}`}
                  className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-purple-50 to-white border border-purple-100 hover:shadow-md transition-all"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">{teacher.name}</p>
                    <p className="text-sm text-gray-600 mt-1">{getSchoolNames(teacher.school_ids)}</p>
                    <div className="flex items-center gap-1 mt-2 text-sm text-purple-600">
                      <Clock className="w-4 h-4" />
                      <span>Haftalık limit: {teacher.weekly_duty_limit} saat</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    data-testid={`delete-teacher-${teacher.id}`}
                    onClick={() => handleDeleteTeacher(teacher.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}