import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, BookCheck } from 'lucide-react';
import DutyLocationsTab from '@/components/DutyLocationsTab';
import ScheduleTab from '@/components/ScheduleTab';
import TeachersTab from '@/components/TeachersTab';
import DutyAssignmentsTab from '@/components/DutyAssignmentsTab';
import SchoolDutyTab from '@/components/SchoolDutyTab';

export default function Dashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('locations');

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-purple-100 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center shadow-md">
                <BookCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
                  eduNÖBET
                </h1>
                <p className="text-xs text-gray-500">Nöbet Yönetim Sistemi</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-700" data-testid="user-name">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
              <Button 
                onClick={onLogout}
                data-testid="logout-button"
                variant="outline"
                className="gap-2 border-purple-200 hover:bg-purple-50 hover:border-purple-300 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Çıkış
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur-sm p-1.5 h-auto flex-wrap gap-1 shadow-md border border-purple-100" data-testid="main-tabs">
            <TabsTrigger 
              value="locations" 
              data-testid="locations-tab"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-purple-700 data-[state=active]:text-white px-6 py-2.5 rounded-lg font-medium transition-all"
            >
              Nöbet Yerleri
            </TabsTrigger>
            <TabsTrigger 
              value="schedule" 
              data-testid="schedule-tab"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-purple-700 data-[state=active]:text-white px-6 py-2.5 rounded-lg font-medium transition-all"
            >
              Ders Programı
            </TabsTrigger>
            <TabsTrigger 
              value="teachers" 
              data-testid="teachers-tab"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-purple-700 data-[state=active]:text-white px-6 py-2.5 rounded-lg font-medium transition-all"
            >
              Öğretmenler
            </TabsTrigger>
            <TabsTrigger 
              value="assignments" 
              data-testid="assignments-tab"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-purple-700 data-[state=active]:text-white px-6 py-2.5 rounded-lg font-medium transition-all"
            >
              Haftalık Nöbet
            </TabsTrigger>
            <TabsTrigger 
              value="school-duty" 
              data-testid="school-duty-tab"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-purple-700 data-[state=active]:text-white px-6 py-2.5 rounded-lg font-medium transition-all"
            >
              Okul Nöbet Takvimi
            </TabsTrigger>
          </TabsList>

          <TabsContent value="locations" className="mt-6">
            <DutyLocationsTab />
          </TabsContent>

          <TabsContent value="schedule" className="mt-6">
            <ScheduleTab />
          </TabsContent>

          <TabsContent value="teachers" className="mt-6">
            <TeachersTab />
          </TabsContent>

          <TabsContent value="assignments" className="mt-6">
            <DutyAssignmentsTab />
          </TabsContent>

          <TabsContent value="school-duty" className="mt-6">
            <SchoolDutyTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}