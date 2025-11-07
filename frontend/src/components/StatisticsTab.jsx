import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { BarChart3, Calendar } from 'lucide-react';

export default function StatisticsTab() {
  const [statistics, setStatistics] = useState([]);
  const [dateRange, setDateRange] = useState({
    start_date: '',
    end_date: ''
  });
  const [loading, setLoading] = useState(false);

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateRange.start_date) params.append('start_date', dateRange.start_date);
      if (dateRange.end_date) params.append('end_date', dateRange.end_date);
      
      const response = await axios.get(`${API}/duty-assignments/statistics?${params}`);
      setStatistics(response.data);
    } catch (error) {
      toast.error('İstatistikler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatistics();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR');
  };

  return (
    <div className="space-y-4 sm:space-y-6" data-testid="statistics-tab">
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
            <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
            Nöbet İstatistikleri
          </CardTitle>
          <CardDescription className="text-sm">
            Öğretmenlerin nöbet yerlerinde tuttukları toplam gün sayısı ve tarih aralıkları
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {/* Date Range Filter */}
          <div className="mb-6 p-4 bg-purple-50 rounded-lg">
            <h3 className="font-semibold mb-3 text-purple-800 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Tarih Aralığı Filtresi
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="filter-start">Başlangıç Tarihi</Label>
                <Input
                  id="filter-start"
                  type="date"
                  value={dateRange.start_date}
                  onChange={(e) => setDateRange({...dateRange, start_date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="filter-end">Bitiş Tarihi</Label>
                <Input
                  id="filter-end"
                  type="date"
                  value={dateRange.end_date}
                  onChange={(e) => setDateRange({...dateRange, end_date: e.target.value})}
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={fetchStatistics}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
                >
                  {loading ? 'Yükleniyor...' : 'Filtrele'}
                </Button>
              </div>
            </div>
          </div>

          {/* Statistics Table */}
          {statistics.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Seçilen tarih aralığında nöbet kaydı bulunamadı</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="border border-purple-200 bg-gradient-to-r from-purple-600 to-purple-700 text-white p-3 text-sm font-medium text-left">
                        Öğretmen
                      </th>
                      <th className="border border-purple-200 bg-gradient-to-r from-purple-600 to-purple-700 text-white p-3 text-sm font-medium text-left">
                        Nöbet Yeri
                      </th>
                      <th className="border border-purple-200 bg-gradient-to-r from-purple-600 to-purple-700 text-white p-3 text-sm font-medium text-center">
                        Toplam Gün
                      </th>
                      <th className="border border-purple-200 bg-gradient-to-r from-purple-600 to-purple-700 text-white p-3 text-sm font-medium text-left">
                        Tarih Aralıkları
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {statistics.map((stat, idx) => (
                      <tr key={idx} className="hover:bg-purple-50">
                        <td className="border border-purple-200 p-3 text-sm font-medium">
                          {stat.teacher_name}
                        </td>
                        <td className="border border-purple-200 p-3 text-sm">
                          {stat.classroom_name}
                        </td>
                        <td className="border border-purple-200 p-3 text-center">
                          <span className="inline-block bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-semibold">
                            {stat.total_days} gün
                          </span>
                        </td>
                        <td className="border border-purple-200 p-3 text-sm">
                          {stat.date_ranges.length > 0 ? (
                            <div className="space-y-1">
                              {stat.date_ranges.map((range, ridx) => (
                                <div key={ridx} className="text-xs">
                                  {formatDate(range.start)} - {formatDate(range.end)}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-white rounded-lg border border-purple-100">
                <h3 className="font-semibold text-purple-800 mb-3">Özet</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Toplam Kayıt</p>
                    <p className="text-2xl font-bold text-purple-700">{statistics.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Toplam Nöbet Günü</p>
                    <p className="text-2xl font-bold text-purple-700">
                      {statistics.reduce((sum, s) => sum + s.total_days, 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Benzersiz Öğretmen</p>
                    <p className="text-2xl font-bold text-purple-700">
                      {new Set(statistics.map(s => s.teacher_id)).size}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
