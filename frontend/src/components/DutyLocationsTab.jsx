import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Building2, MapPin, Edit } from 'lucide-react';

export default function DutyLocationsTab() {
  const [schools, setSchools] = useState([]);
  const [dutyLocations, setDutyLocations] = useState([]);
  const [showSchoolDialog, setShowSchoolDialog] = useState(false);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [showEditSchoolDialog, setShowEditSchoolDialog] = useState(false);
  const [showEditLocationDialog, setShowEditLocationDialog] = useState(false);
  const [editingSchool, setEditingSchool] = useState(null);
  const [editingLocation, setEditingLocation] = useState(null);
  const [schoolForm, setSchoolForm] = useState({ name: '', building: '' });
  const [locationForm, setLocationForm] = useState({ school_id: '', name: '', floor: 1 });

  useEffect(() => {
    fetchSchools();
    fetchDutyLocations();
  }, []);

  const fetchSchools = async () => {
    try {
      const response = await axios.get(`${API}/schools`);
      setSchools(response.data);
    } catch (error) {
      toast.error('Okullar yüklenemedi');
    }
  };

  const fetchDutyLocations = async () => {
    try {
      const response = await axios.get(`${API}/classrooms`);
      setDutyLocations(response.data);
    } catch (error) {
      toast.error('Nöbet yerleri yüklenemedi');
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

  const handleEditSchool = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/schools/${editingSchool.id}`, schoolForm);
      toast.success('Okul güncellendi');
      setShowEditSchoolDialog(false);
      setEditingSchool(null);
      fetchSchools();
    } catch (error) {
      toast.error('Okul güncellenemedi');
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

  const openEditSchool = (school) => {
    setEditingSchool(school);
    setSchoolForm({ name: school.name, building: school.building });
    setShowEditSchoolDialog(true);
  };

  const handleAddLocation = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/classrooms`, locationForm);
      toast.success('Nöbet yeri eklendi');
      setLocationForm({ school_id: '', name: '', floor: 1 });
      setShowLocationDialog(false);
      fetchDutyLocations();
    } catch (error) {
      toast.error('Nöbet yeri eklenemedi');
    }
  };

  const handleEditLocation = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/classrooms/${editingLocation.id}`, locationForm);
      toast.success('Nöbet yeri güncellendi');
      setShowEditLocationDialog(false);
      setEditingLocation(null);
      fetchDutyLocations();
    } catch (error) {
      toast.error('Nöbet yeri güncellenemedi');
    }
  };

  const handleDeleteLocation = async (id) => {
    if (!window.confirm('Bu nöbet yerini silmek istediğinizden emin misiniz?')) return;
    try {
      await axios.delete(`${API}/classrooms/${id}`);
      toast.success('Nöbet yeri silindi');
      fetchDutyLocations();
    } catch (error) {
      toast.error('Nöbet yeri silinemedi');
    }
  };

  const openEditLocation = (location) => {
    setEditingLocation(location);
    setLocationForm({ school_id: location.school_id, name: location.name, floor: location.floor });
    setShowEditLocationDialog(true);
  };

  const getSchoolName = (schoolId) => {
    const school = schools.find(s => s.id === schoolId);
    return school ? school.name : 'Bilinmiyor';
  };

  return (
    <div className="space-y-4 sm:space-y-6" data-testid="duty-locations-tab">
      {/* Schools Section */}
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
                <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                Okullar
              </CardTitle>
              <CardDescription className="text-sm">Bina içindeki okulları yönetin</CardDescription>
            </div>
            <Dialog open={showSchoolDialog} onOpenChange={setShowSchoolDialog}>
              <DialogTrigger asChild>
                <Button 
                  data-testid="add-school-button"
                  className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 gap-2 shadow-md w-full sm:w-auto"
                >
                  <Plus className="w-4 h-4" />
                  Okul Ekle
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md mx-4">
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
        <CardContent className="p-4 sm:p-6">
          {schools.length === 0 ? (
            <div className="text-center py-8 sm:py-12 text-gray-500">
              <Building2 className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm sm:text-base">Henüz okul eklenmemiş</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {schools.map((school) => (
                <div 
                  key={school.id} 
                  data-testid={`school-item-${school.id}`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-lg bg-gradient-to-r from-purple-50 to-white border border-purple-100 hover:shadow-md transition-all gap-3"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 text-sm sm:text-base">{school.name}</p>
                    <p className="text-xs sm:text-sm text-gray-500">{school.building}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditSchool(school)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 flex-1 sm:flex-none"
                    >
                      <Edit className="w-4 h-4 sm:mr-2" />
                      <span className="sm:inline">Düzenle</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      data-testid={`delete-school-${school.id}`}
                      onClick={() => handleDeleteSchool(school.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 flex-1 sm:flex-none"
                    >
                      <Trash2 className="w-4 h-4 sm:mr-2" />
                      <span className="sm:inline">Sil</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Duty Locations Section */}
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
                <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                Nöbet Yerleri
              </CardTitle>
              <CardDescription className="text-sm">Nöbet yerlerini ve kat bilgilerini yönetin</CardDescription>
            </div>
            <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
              <DialogTrigger asChild>
                <Button 
                  data-testid="add-classroom-button"
                  className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 gap-2 shadow-md w-full sm:w-auto"
                  disabled={schools.length === 0}
                >
                  <Plus className="w-4 h-4" />
                  Nöbet Yeri Ekle
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md mx-4">
                <DialogHeader>
                  <DialogTitle>Yeni Nöbet Yeri Ekle</DialogTitle>
                  <DialogDescription>Yeni bir nöbet yeri bilgisi ekleyin</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddLocation} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="classroom-school">Okul</Label>
                    <select
                      id="classroom-school"
                      data-testid="classroom-school-select"
                      className="w-full p-2 border rounded-md bg-white text-sm"
                      value={locationForm.school_id}
                      onChange={(e) => setLocationForm({ ...locationForm, school_id: e.target.value })}
                      required
                    >
                      <option value="">Okul seçiniz</option>
                      {schools.map((school) => (
                        <option key={school.id} value={school.id}>{school.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="classroom-name">Nöbet Yeri Adı</Label>
                    <Input
                      id="classroom-name"
                      data-testid="classroom-name-input"
                      placeholder="Örnek: 5-A Sınıfı, Giriş Kapısı"
                      value={locationForm.name}
                      onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
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
                      value={locationForm.floor}
                      onChange={(e) => setLocationForm({ ...locationForm, floor: parseInt(e.target.value) })}
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
        <CardContent className="p-4 sm:p-6">
          {dutyLocations.length === 0 ? (
            <div className="text-center py-8 sm:py-12 text-gray-500">
              <MapPin className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm sm:text-base">Henüz nöbet yeri eklenmemiş</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {dutyLocations.map((location) => (
                <div 
                  key={location.id} 
                  data-testid={`classroom-item-${location.id}`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-lg bg-gradient-to-r from-purple-50 to-white border border-purple-100 hover:shadow-md transition-all gap-3"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 text-sm sm:text-base">{location.name}</p>
                    <p className="text-xs sm:text-sm text-gray-500">
                      {getSchoolName(location.school_id)} • Kat {location.floor}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditLocation(location)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 flex-1 sm:flex-none"
                    >
                      <Edit className="w-4 h-4 sm:mr-2" />
                      <span className="sm:inline">Düzenle</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      data-testid={`delete-classroom-${location.id}`}
                      onClick={() => handleDeleteLocation(location.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 flex-1 sm:flex-none"
                    >
                      <Trash2 className="w-4 h-4 sm:mr-2" />
                      <span className="sm:inline">Sil</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit School Dialog */}
      <Dialog open={showEditSchoolDialog} onOpenChange={setShowEditSchoolDialog}>
        <DialogContent className="sm:max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>Okul Düzenle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSchool} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-school-name">Okul Adı</Label>
              <Input
                id="edit-school-name"
                value={schoolForm.name}
                onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-building">Bina</Label>
              <Input
                id="edit-building"
                value={schoolForm.building}
                onChange={(e) => setSchoolForm({ ...schoolForm, building: e.target.value })}
                required
              />
            </div>
            <Button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-purple-700">
              Güncelle
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Location Dialog */}
      <Dialog open={showEditLocationDialog} onOpenChange={setShowEditLocationDialog}>
        <DialogContent className="sm:max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>Nöbet Yeri Düzenle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditLocation} className="space-y-4">
            <div className="space-y-2">
              <Label>Okul</Label>
              <select
                className="w-full p-2 border rounded-md bg-white text-sm"
                value={locationForm.school_id}
                onChange={(e) => setLocationForm({ ...locationForm, school_id: e.target.value })}
                required
              >
                <option value="">Okul seçiniz</option>
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>{school.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Nöbet Yeri Adı</Label>
              <Input
                value={locationForm.name}
                onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Kat</Label>
              <Input
                type="number"
                min="-2"
                max="10"
                value={locationForm.floor}
                onChange={(e) => setLocationForm({ ...locationForm, floor: parseInt(e.target.value) })}
                required
              />
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