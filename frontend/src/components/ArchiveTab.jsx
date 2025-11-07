import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Archive, Download, RefreshCw, Eye, Share2, Edit, Trash2, Plus, Save } from 'lucide-react';

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];

export default function ArchiveTab() {
  const [archives, setArchives] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [transforming, setTransforming] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({
    teacher_id: '',
    classroom_id: '',
    day: 0
  });

  useEffect(() => {
    fetchArchives();
    fetchReferenceData();
  }, []);

  const fetchArchives = async () => {
    try {
      const response = await axios.get(`${API}/duty-assignments/archive`);
      setArchives(response.data);
    } catch (error) {
      toast.error('Arşiv yüklenemedi');
    }
  };

  const fetchReferenceData = async () => {
    try {
      const [teachersRes, classroomsRes] = await Promise.all([
        axios.get(`${API}/teachers`),
        axios.get(`${API}/classrooms`)
      ]);
      setTeachers(teachersRes.data);
      setClassrooms(classroomsRes.data);
    } catch (error) {
      console.error('Reference data loading failed');
    }
  };

  const viewAssignments = async (weekNumber) => {
    try {
      const response = await axios.get(`${API}/duty-assignments?week_number=${weekNumber}&approved=true`);
      setAssignments(response.data);
      setSelectedWeek(weekNumber);
      setShowViewDialog(true);
    } catch (error) {
      toast.error('Nöbetler yüklenemedi');
    }
  };

  const downloadPDF = async (weekNumber) => {
    try {
      const response = await axios.get(`${API}/duty-assignments/export-pdf?week_number=${weekNumber}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `nobet_hafta_${weekNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF indirildi');
    } catch (error) {
      toast.error('PDF indirilemedi');
    }
  };

  const shareWhatsApp = async (weekNumber) => {
    try {
      const text = `Hafta ${weekNumber} Nöbet Çizelgesi - eduNÖBET sistemi üzerinden paylaşıldı`;
      const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
    } catch (error) {
      toast.error('Paylaşma başarısız');
    }
  };

  const transformDuties = async (weekNumber) => {
    if (!window.confirm('Bu nöbet çizelgesini ders programına göre dönüştürmek istediğinizden emin misiniz?')) return;
    setTransforming(true);
    try {
      await axios.post(`${API}/duty-assignments/transform?week_number=${weekNumber}`);
      toast.success('Nöbet dönüştürüldü. Haftalık Nöbet sekmesinden kontrol edip onaylayabilirsiniz.');
      await fetchArchives();
    } catch (error) {
      toast.error('Dönüştürme başarısız');
    } finally {
      setTransforming(false);
    }
  };

  const getTeacherName = (teacherId) => {
    const teacher = teachers.find(t => t.id === teacherId);
    return teacher ? teacher.name : 'Bilinmiyor';
  };

  const getClassroomName = (classroomId) => {
    const classroom = classrooms.find(c => c.id === classroomId);
    return classroom ? classroom.name : 'Bilinmiyor';
  };

  // Create table data for view dialog
  const tableData = classrooms.map(classroom => {
    const row = { classroom };
    DAYS.forEach((_, dayIdx) => {
      const assignment = assignments.find(a => a.classroom_id === classroom.id && a.day === dayIdx);
      row[`day_${dayIdx}`] = assignment;
    });
    return row;
  });

  return (
    <div className="space-y-6" data-testid="archive-tab">
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Archive className="w-6 h-6 text-purple-600" />
            Onaylanmış Nöbet Arşivi
          </CardTitle>
          <CardDescription>Onaylanmış nöbet çizelgelerini görüntüleyin, indirin veya dönüştürün</CardDescription>
        </CardHeader>
        <CardContent>
          {archives.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Archive className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Henüz onaylanmış nöbet yok</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {archives.map((archive) => (
                <div 
                  key={archive.week_number} 
                  className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-purple-50 to-white border border-purple-100 hover:shadow-md transition-all"
                >
                  <div>
                    <p className="font-semibold text-lg text-purple-800">Hafta {archive.week_number}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Onaylanma: {archive.approved_at ? new Date(archive.approved_at).toLocaleDateString('tr-TR') : 'N/A'}
                    </p>
                    {archive.transformed_from && (
                      <p className="text-xs text-orange-600 mt-1">
                        🔄 Dönüştürülmüş
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {archive.count} nöbet ataması
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => viewAssignments(archive.week_number)}
                      className="gap-2 border-purple-200 hover:bg-purple-50"
                    >
                      <Eye className="w-4 h-4" />
                      Görüntüle
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => downloadPDF(archive.week_number)}
                      className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Download className="w-4 h-4" />
                      PDF
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => shareWhatsApp(archive.week_number)}
                      className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Share2 className="w-4 h-4" />
                      WhatsApp
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => transformDuties(archive.week_number)}
                      disabled={transforming}
                      className="gap-2 bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Dönüştür
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Hafta {selectedWeek} - Nöbet Çizelgesi</DialogTitle>
          </DialogHeader>
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
                            <div className="bg-gradient-to-br from-purple-100 to-white p-2 rounded">
                              <div className="font-medium text-sm text-purple-800">
                                {getTeacherName(assignment.teacher_id)}
                              </div>
                            </div>
                          ) : (
                            <div className="text-center text-gray-400">-</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
