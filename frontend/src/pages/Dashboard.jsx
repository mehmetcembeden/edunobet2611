import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, BookCheck } from 'lucide-react';
import DutyLocationsTab from '@/components/DutyLocationsTab';
import TeacherWorkloadTab from '@/components/TeacherWorkloadTab';
import TeachersTab from '@/components/TeachersTab';
import DutyAssignmentsTab from '@/components/DutyAssignmentsTab';
import SchoolDutyTab from '@/components/SchoolDutyTab';
import ArchiveTab from '@/components/ArchiveTab';

export default function Dashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('locations');

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-purple-100 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center shadow-md">
                <BookCheck className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
                  eduNÖBET
                </h1>
                <p className="text-[10px] sm:text-xs text-gray-500 hidden sm:block">Nöbet Yönetim Sistemi</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="text-right hidden md:block">
                <p className="text-sm font-medium text-gray-700" data-testid="user-name">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
              <Button 
                onClick={onLogout}
                data-testid="logout-button"
                variant="outline"
                size="sm"
                className="gap-1 sm:gap-2 border-purple-200 hover:bg-purple-50 hover:border-purple-300 transition-colors"
              >
                <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Çıkış</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <TabsList className="bg-white/80 backdrop-blur-sm p-1 sm:p-1.5 h-auto flex-wrap gap-1 shadow-md border border-purple-100 w-full justify-start" data-testid="main-tabs">
            <TabsTrigger 
              value="locations" 
              data-testid="locations-tab"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-purple-700 data-[state=active]:text-white px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg font-medium transition-all text-xs sm:text-sm"
            >
              Nöbet Yerleri
            </TabsTrigger>
            <TabsTrigger 
              value="schedule" 
              data-testid="schedule-tab"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-purple-700 data-[state=active]:text-white px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg font-medium transition-all text-xs sm:text-sm"
            >
              Ders Programı
            </TabsTrigger>
            <TabsTrigger 
              value="teachers" 
              data-testid="teachers-tab"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-purple-700 data-[state=active]:text-white px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg font-medium transition-all text-xs sm:text-sm"
            >
              Öğretmenler
            </TabsTrigger>
            <TabsTrigger 
              value="assignments" 
              data-testid="assignments-tab"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-purple-700 data-[state=active]:text-white px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg font-medium transition-all text-xs sm:text-sm"
            >
              Haftalık Nöbet
            </TabsTrigger>
            <TabsTrigger 
              value="school-duty" 
              data-testid="school-duty-tab"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-purple-700 data-[state=active]:text-white px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg font-medium transition-all text-xs sm:text-sm"
            >
              Okul Nöbet
            </TabsTrigger>
            <TabsTrigger 
              value="archive" 
              data-testid="archive-tab"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-purple-700 data-[state=active]:text-white px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg font-medium transition-all text-xs sm:text-sm"
            >
              Arşiv
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

          <TabsContent value="archive" className="mt-6">
            <ArchiveTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}