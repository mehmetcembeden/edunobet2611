import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Building2, School } from 'lucide-react';

export default function DutyLocationsTab() {
  const [schools, setSchools] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [showSchoolDialog, setShowSchoolDialog] = useState(false);
  const [showClassroomDialog, setShowClassroomDialog] = useState(false);
  const [schoolForm, setSchoolForm] = useState({ name: '', building: '' });
  const [classroomForm, setClassroomForm] = useState({ school_id: '', name: '', floor: 1 });

  useEffect(() => {
    fetchSchools();
    fetchClassrooms();
  }, []);

  const fetchSchools = async () => {
    try {
      const response = await axios.get(`${API}/schools`);
      setSchools(response.data);
    } catch (error) {
      toast.error('Okullar yüklenemedi');
    }
  };

  const fetchClassrooms = async () => {
    try {
      const response = await axios.get(`${API}/classrooms`);
      setClassrooms(response.data);
    } catch (error) {
      toast.error('Sınıflar yüklenemedi');
    }
  };

  const handleAddSchool = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/schools`, schoolForm);
      toast.success('Okul eklendi');
      setSchoolForm({ name: '', building: '' });
      setShowSchoolDialog(false);
      fetchSchools();
    } catch (error) {
      toast.error('Okul eklenemedi');
    }
  };

  const handleDeleteSchool = async (id) => {
    if (!window.confirm('Bu okulu silmek istediğinizden emin misiniz?')) return;
    try {
      await axios.delete(`${API}/schools/${id}`);
      toast.success('Okul silindi');
      fetchSchools();
    } catch (error) {
      toast.error('Okul silinemedi');
    }
  };

  const handleAddClassroom = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/classrooms`, classroomForm);
      toast.success('Sınıf eklendi');
      setClassroomForm({ school_id: '', name: '', floor: 1 });
      setShowClassroomDialog(false);
      fetchClassrooms();
    } catch (error) {
      toast.error('Sınıf eklenemedi');
    }
  };

  const handleDeleteClassroom = async (id) => {
    if (!window.confirm('Bu sınıfı silmek istediğinizden emin misiniz?')) return;
    try {
      await axios.delete(`${API}/classrooms/${id}`);
      toast.success('Sınıf silindi');
      fetchClassrooms();
    } catch (error) {
      toast.error('Sınıf silinemedi');
    }
  };

  const getSchoolName = (schoolId) => {
    const school = schools.find(s => s.id === schoolId);
    return school ? school.name : 'Bilinmiyor';
  };

  return (
    <div className="space-y-6" data-testid="duty-locations-tab">
      {/* Schools Section */}
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Building2 className="w-6 h-6 text-purple-600" />
                Okullar
              </CardTitle>
              <CardDescription>Bina içindeki okulları yönetin</CardDescription>
            </div>
            <Dialog open={showSchoolDialog} onOpenChange={setShowSchoolDialog}>
              <DialogTrigger asChild>
                <Button 
                  data-testid="add-school-button"
                  className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 gap-2 shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  Okul Ekle
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Yeni Okul Ekle</DialogTitle>
                  <DialogDescription>Yeni bir okul bilgisi ekleyin</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddSchool} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="school-name">Okul Adı</Label>
                    <Input
                      id="school-name"
                      data-testid="school-name-input"
                      placeholder="Örnek: Atatürk İlkokulu"
                      value={schoolForm.name}
                      onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="building">Bina</Label>
                    <Input
                      id="building"
                      data-testid="building-input"
                      placeholder="Örnek: A Binası"
                      value={schoolForm.building}
                      onChange={(e) => setSchoolForm({ ...schoolForm, building: e.target.value })}
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    data-testid="submit-school-button"
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
          {schools.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Henüz okul eklenmemiş</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {schools.map((school) => (
                <div 
                  key={school.id} 
                  data-testid={`school-item-${school.id}`}
                  className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-purple-50 to-white border border-purple-100 hover:shadow-md transition-all"
                >
                  <div>
                    <p className="font-semibold text-gray-800">{school.name}</p>
                    <p className="text-sm text-gray-500">{school.building}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    data-testid={`delete-school-${school.id}`}
                    onClick={() => handleDeleteSchool(school.id)}
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

      {/* Classrooms Section */}
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <School className="w-6 h-6 text-purple-600" />
                Sınıflar
              </CardTitle>
              <CardDescription>Sınıf ve kat bilgilerini yönetin</CardDescription>
            </div>
            <Dialog open={showClassroomDialog} onOpenChange={setShowClassroomDialog}>
              <DialogTrigger asChild>
                <Button 
                  data-testid="add-classroom-button"
                  className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 gap-2 shadow-md"
                  disabled={schools.length === 0}
                >
                  <Plus className="w-4 h-4" />
                  Sınıf Ekle
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Yeni Sınıf Ekle</DialogTitle>
                  <DialogDescription>Yeni bir sınıf bilgisi ekleyin</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddClassroom} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="classroom-school">Okul</Label>
                    <select
                      id="classroom-school"
                      data-testid="classroom-school-select"
                      className="w-full p-2 border rounded-md bg-white"
                      value={classroomForm.school_id}
                      onChange={(e) => setClassroomForm({ ...classroomForm, school_id: e.target.value })}
                      required
                    >
                      <option value="">Okul seçiniz</option>
                      {schools.map((school) => (
                        <option key={school.id} value={school.id}>{school.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="classroom-name">Sınıf Adı</Label>
                    <Input
                      id="classroom-name"
                      data-testid="classroom-name-input"
                      placeholder="Örnek: 5-A"
                      value={classroomForm.name}
                      onChange={(e) => setClassroomForm({ ...classroomForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="floor">Kat</Label>
                    <Input
                      id="floor"
                      data-testid="floor-input"
                      type="number"
                      min="-2"
                      max="10"
                      value={classroomForm.floor}
                      onChange={(e) => setClassroomForm({ ...classroomForm, floor: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    data-testid="submit-classroom-button"
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
          {classrooms.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <School className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Henüz sınıf eklenmemiş</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {classrooms.map((classroom) => (
                <div 
                  key={classroom.id} 
                  data-testid={`classroom-item-${classroom.id}`}
                  className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-purple-50 to-white border border-purple-100 hover:shadow-md transition-all"
                >
                  <div>
                    <p className="font-semibold text-gray-800">{classroom.name}</p>
                    <p className="text-sm text-gray-500">
                      {getSchoolName(classroom.school_id)} • Kat {classroom.floor}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    data-testid={`delete-classroom-${classroom.id}`}
                    onClick={() => handleDeleteClassroom(classroom.id)}
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