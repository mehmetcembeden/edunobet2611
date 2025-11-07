import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Clock, Sparkles, CheckCircle, AlertTriangle, Edit, Trash2, Plus } from 'lucide-react';

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];

export default function DutyAssignmentsTab() {
  const [assignments, setAssignments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [schools, setSchools] = useState([]);
  const [weekNumber, setWeekNumber] = useState(1);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [assignmentForm, setAssignmentForm] = useState({
    teacher_id: '',
    classroom_id: '',
    day: 0
  });

  useEffect(() => {
    fetchAll();
  }, [weekNumber]);

  const fetchAll = async () => {
    try {
      const [teachersRes, classroomsRes, schoolsRes] = await Promise.all([
        axios.get(`${API}/teachers`),
        axios.get(`${API}/classrooms`),
        axios.get(`${API}/schools`)
      ]);
      setTeachers(teachersRes.data);
      setClassrooms(classroomsRes.data);
      setSchools(schoolsRes.data);
      await fetchAssignments();
    } catch (error) {
      toast.error('Veriler yüklenemedi');
    }
  };

  const fetchAssignments = async () => {
    try {
      const response = await axios.get(`${API}/duty-assignments?week_number=${weekNumber}&approved=false`);
      setAssignments(response.data);
    } catch (error) {
      toast.error('Nöbetler yüklenemedi');
    }
  };

  const handleGenerate = async () => {
    if (teachers.length === 0) {
      toast.error('Önce öğretmen ekleyin');
      return;
    }
    if (classrooms.length === 0) {
      toast.error('Önce sınıf ekleyin');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`${API}/duty-assignments/generate?week_number=${weekNumber}`);
      toast.success(response.data.message);
      setSuggestions(response.data.suggestions || []);
      await fetchAssignments();
    } catch (error) {
      toast.error('Nöbetler oluşturulamadı');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      await axios.post(`${API}/duty-assignments/approve?week_number=${weekNumber}`);
      toast.success('Nöbetler onaylandı ve arşive taşındı');
      await fetchAssignments();
    } catch (error) {
      toast.error('Onaylama başarısız');
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/duty-assignments`, {
        ...assignmentForm,
        week_number: weekNumber
      });
      toast.success('Nöbet eklendi');
      setShowAddDialog(false);
      setAssignmentForm({ teacher_id: '', classroom_id: '', day: 0 });
      await fetchAssignments();
    } catch (error) {
      toast.error('Nöbet eklenemedi');
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/duty-assignments/${editingAssignment.id}`, {
        ...assignmentForm,
        week_number: weekNumber
      });
      toast.success('Nöbet güncellendi');
      setShowEditDialog(false);
      setEditingAssignment(null);
      await fetchAssignments();
    } catch (error) {
      toast.error('Nöbet güncellenemedi');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu nöbeti silmek istediğinizden emin misiniz?')) return;
    try {
      await axios.delete(`${API}/duty-assignments/${id}`);
      toast.success('Nöbet silindi');
      await fetchAssignments();
    } catch (error) {
      toast.error('Nöbet silinemedi');
    }
  };

  const openEditDialog = (assignment) => {
    setEditingAssignment(assignment);
    setAssignmentForm({
      teacher_id: assignment.teacher_id,
      classroom_id: assignment.classroom_id,
      day: assignment.day
    });
    setShowEditDialog(true);
  };

  const getTeacherName = (teacherId) => {
    const teacher = teachers.find(t => t.id === teacherId);
    return teacher ? teacher.name : 'Bilinmiyor';
  };

  const getClassroomName = (classroomId) => {
    const classroom = classrooms.find(c => c.id === classroomId);
    return classroom ? classroom.name : 'Bilinmiyor';
  };

  const getSchoolName = (schoolId) => {
    const school = schools.find(s => s.id === schoolId);
    return school ? school.name : 'Bilinmiyor';
  };

  // Group classrooms by school
  const classroomsBySchool = {};
  schools.forEach(school => {
    classroomsBySchool[school.id] = classrooms.filter(c => c.school_id === school.id);
  });

  // Create table data structure for each school
  const schoolTableData = {};
  schools.forEach(school => {
    const schoolClassrooms = classroomsBySchool[school.id] || [];
    schoolTableData[school.id] = schoolClassrooms.map(classroom => {
      const row = { classroom };
      DAYS.forEach((_, dayIdx) => {
        const assignment = assignments.find(a => a.classroom_id === classroom.id && a.day === dayIdx);
        row[`day_${dayIdx}`] = assignment;
      });
      return row;
    });
  });

  // Calculate teacher duty counts
  const teacherDutyCounts = {};
  teachers.forEach(t => {
    teacherDutyCounts[t.id] = assignments.filter(a => a.teacher_id === t.id).length;
  });

  return (
    <div className="space-y-6" data-testid="duty-assignments-tab">
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Clock className="w-6 h-6 text-purple-600" />
                Haftalık Nöbet Ataması
              </CardTitle>
              <CardDescription>Gün bazlı nöbet ataması yapın ve onaylayın</CardDescription>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
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
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button 
                    data-testid="add-assignment-button"
                    variant="outline"
                    className="gap-2 border-purple-200 hover:bg-purple-50"
                  >
                    <Plus className="w-4 h-4" />
                    Manuel Ekle
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nöbet Ekle</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAdd} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Öğretmen</Label>
                      <select
                        className="w-full p-2 border rounded-md"
                        value={assignmentForm.teacher_id}
                        onChange={(e) => setAssignmentForm({ ...assignmentForm, teacher_id: e.target.value })}
                        required
                      >
                        <option value="">Seçiniz</option>
                        {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Sınıf</Label>
                      <select
                        className="w-full p-2 border rounded-md"
                        value={assignmentForm.classroom_id}
                        onChange={(e) => setAssignmentForm({ ...assignmentForm, classroom_id: e.target.value })}
                        required
                      >
                        <option value="">Seçiniz</option>
                        {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Gün</Label>
                      <select
                        className="w-full p-2 border rounded-md"
                        value={assignmentForm.day}
                        onChange={(e) => setAssignmentForm({ ...assignmentForm, day: parseInt(e.target.value) })}
                        required
                      >
                        {DAYS.map((day, idx) => <option key={idx} value={idx}>{day}</option>)}
                      </select>
                    </div>
                    <Button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-purple-700">
                      Ekle
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
              <Button 
                onClick={handleGenerate}
                data-testid="generate-assignments-button"
                disabled={loading}
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 gap-2 shadow-md"
              >
                <Sparkles className="w-4 h-4" />
                {loading ? 'Oluşturuluyor...' : 'Nöbet Oluştur'}
              </Button>
              {assignments.length > 0 && (
                <Button 
                  onClick={handleApprove}
                  data-testid="approve-button"
                  className="bg-green-600 hover:bg-green-700 gap-2 shadow-md"
                >
                  <CheckCircle className="w-4 h-4" />
                  Onayla
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Suggestions */}
          {suggestions.length > 0 && (
            <Alert className="mb-6 border-orange-200 bg-orange-50">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <AlertDescription>
                <p className="font-semibold mb-2">Öneriler:</p>
                <ul className="list-disc list-inside space-y-1">
                  {suggestions.map((s, idx) => (
                    <li key={idx} className="text-sm">{s.suggestion}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Teacher Summary */}
          {assignments.length > 0 && (
            <div className="mb-6 p-4 bg-purple-50 rounded-lg">
              <h3 className="font-semibold mb-3 text-purple-800">Öğretmen Nöbet Özeti</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {teachers.map(teacher => (
                  <div key={teacher.id} className="text-sm">
                    <span className="font-medium">{teacher.name}:</span>{' '}
                    <span className="text-purple-600">{teacherDutyCounts[teacher.id] || 0} gün</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Duty Tables - One per School */}
          {assignments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Bu hafta için nöbet ataması yok</p>
              <p className="text-sm mt-2">"Nöbet Oluştur" butonuna tıklayarak otomatik atama yapabilirsiniz</p>
            </div>
          ) : (
            <div className="space-y-8">
              {schools.map((school) => {
                const tableData = schoolTableData[school.id] || [];
                if (tableData.length === 0) return null;
                
                return (
                  <div key={school.id} className="space-y-4">
                    <h3 className="text-xl font-bold text-purple-800 flex items-center gap-2">
                      <div className="w-2 h-8 bg-purple-600 rounded"></div>
                      {school.name}
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr>
                            <th className="border border-purple-200 bg-gradient-to-r from-purple-600 to-purple-700 text-white p-3 text-sm font-medium">
                              Nöbet Yeri
                            </th>
                            {DAYS.map((day, idx) => (
                              <th key={idx} className="border border-purple-200 bg-gradient-to-r from-purple-600 to-purple-700 text-white p-3 text-sm font-medium">
                                {day}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {tableData.map((row) => (
                            <tr key={row.classroom.id}>
                              <td className="border border-purple-200 bg-purple-50 p-3 font-medium">
                                {row.classroom.name}
                              </td>
                              {DAYS.map((_, dayIdx) => {
                                const assignment = row[`day_${dayIdx}`];
                                return (
                                  <td key={dayIdx} className="border border-purple-200 p-2 align-top">
                                    {assignment ? (
                                      <div className="group relative bg-gradient-to-br from-purple-100 to-white p-2 rounded min-h-[60px]">
                                        <div className="font-medium text-sm text-purple-800">
                                          {getTeacherName(assignment.teacher_id)}
                                        </div>
                                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                          <button
                                            onClick={() => openEditDialog(assignment)}
                                            className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-blue-600"
                                            title="Düzenle"
                                          >
                                            <Edit className="w-3 h-3" />
                                          </button>
                                          <button
                                            onClick={() => handleDelete(assignment.id)}
                                            className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                                            title="Sil"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-center text-gray-400 min-h-[60px] flex items-center justify-center">-</div>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nöbet Düzenle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label>Öğretmen</Label>
              <select
                className="w-full p-2 border rounded-md"
                value={assignmentForm.teacher_id}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, teacher_id: e.target.value })}
                required
              >
                <option value="">Seçiniz</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Sınıf</Label>
              <select
                className="w-full p-2 border rounded-md"
                value={assignmentForm.classroom_id}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, classroom_id: e.target.value })}
                required
              >
                <option value="">Seçiniz</option>
                {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Gün</Label>
              <select
                className="w-full p-2 border rounded-md"
                value={assignmentForm.day}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, day: parseInt(e.target.value) })}
                required
              >
                {DAYS.map((day, idx) => <option key={idx} value={idx}>{day}</option>)}
              </select>
            </div>
            <Button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-purple-700">
              Güncelle
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
