/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { AuthProvider, useAuth } from './components/AuthContext';
import { LanguageProvider } from './components/LanguageContext';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { InstructorDashboard } from './components/InstructorDashboard';
import { InstructorList } from './components/InstructorList';
import { Toaster } from '@/components/ui/sonner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GraduationCap, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { DailyDiaryForm } from './components/DailyDiaryForm';
import { DailyDiaryList } from './components/DailyDiaryList';
import { AttendanceList } from './components/AttendanceList';
import { PracticalRecordForm } from './components/PracticalRecordForm';
import { StudentList } from './components/StudentList';
import { LessonPlanForm } from './components/LessonPlanForm';
import { LessonPlanList } from './components/LessonPlanList';
import { DemoPlanForm } from './components/DemoPlanForm';
import { DemoPlanList } from './components/DemoPlanList';
import { MonthlyAssessmentForm } from './components/MonthlyAssessmentForm';
import { MonthlyAssessmentList } from './components/MonthlyAssessmentList';
import { InternalAssessmentForm } from './components/InternalAssessmentForm';
import { InternalAssessmentList } from './components/InternalAssessmentList';
import { MonthlyPlanForm } from './components/MonthlyPlanForm';
import { MonthlyPlanList } from './components/MonthlyPlanList';
import { YearlyPlanForm } from './components/YearlyPlanForm';
import { YearlyPlanList } from './components/YearlyPlanList';
import { FormManager as AdvancedFormBuilder } from './components/AdvancedFormBuilder/FormManager';
import { StudentDashboard } from './components/StudentDashboard';
import { AppSettingsProvider, useAppSettings } from './components/AppSettingsContext';
import { SystemConfig } from './components/SystemConfig';

function AppContent() {
  const { user, userData, loading, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [editingDiaryId, setEditingDiaryId] = useState<string | null>(null);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editingDemoId, setEditingDemoId] = useState<string | null>(null);
  const [editingAssessmentId, setEditingAssessmentId] = useState<string | null>(null);
  const [editingInternalId, setEditingInternalId] = useState<string | null>(null);
  const [editingMonthlyPlanId, setEditingMonthlyPlanId] = useState<string | null>(null);
  const [editingYearlyPlanId, setEditingYearlyPlanId] = useState<string | null>(null);
  const [downloadOnNext, setDownloadOnNext] = useState(false);

  const navigateToNext = (tab: string, download: boolean = true) => {
    setDownloadOnNext(download);
    setActiveTab(tab);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground font-medium animate-pulse">Initializing System...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        if (userData?.role === 'student') return <StudentDashboard />;
        return isAdmin ? <Dashboard /> : <InstructorDashboard setActiveTab={setActiveTab} />;
      case 'instructors':
        return <InstructorList />;
      case 'profile':
        return <InstructorDashboard setActiveTab={setActiveTab} />;
      case 'daily-diary-new':
        return (
          <DailyDiaryForm 
            onBack={() => setActiveTab('daily-diary')} 
            onNext={() => navigateToNext('monthly-assess-new')}
            nextLabel="Save & Monthly Assessment"
            downloadOnSave={downloadOnNext}
          />
        );
      case 'daily-diary-edit':
        return (
          <DailyDiaryForm 
            diaryId={editingDiaryId || undefined} 
            onBack={() => {
              setEditingDiaryId(null);
              setActiveTab('daily-diary');
            }} 
            onNext={() => navigateToNext('monthly-assess-new')}
            nextLabel="Save & Monthly Assessment"
          />
        );
      case 'daily-diary':
        return (
          <DailyDiaryList 
            onNewEntry={() => setActiveTab('daily-diary-new')} 
            onEditEntry={(id) => {
              setEditingDiaryId(id);
              setActiveTab('daily-diary-edit');
            }}
          />
        );
      case 'attendance':
        return (
          <AttendanceList 
            onNewEntry={() => setActiveTab('attendance-new')} 
            onEditEntry={(id) => {
              setEditingRecordId(id);
              setActiveTab('attendance-edit');
            }} 
          />
        );
      case 'attendance-new':
        return <PracticalRecordForm onBack={() => setActiveTab('attendance')} />;
      case 'attendance-edit':
        return <PracticalRecordForm onBack={() => setActiveTab('attendance')} recordId={editingRecordId || undefined} />;
      case 'lesson-plan':
        return (
          <LessonPlanList 
            onNewEntry={() => setActiveTab('lesson-plan-new')} 
            onEditEntry={(id) => {
              setEditingPlanId(id);
              setActiveTab('lesson-plan-edit');
            }} 
          />
        );
      case 'lesson-plan-new':
        return (
          <LessonPlanForm 
            onBack={() => setActiveTab('lesson-plan')} 
            onNext={() => navigateToNext('daily-diary-new')}
            nextLabel="Save & Daily Diary"
            downloadOnSave={downloadOnNext}
          />
        );
      case 'lesson-plan-edit':
        return (
          <LessonPlanForm 
            onBack={() => setActiveTab('lesson-plan')} 
            planId={editingPlanId || undefined} 
            onNext={() => navigateToNext('daily-diary-new')}
            nextLabel="Save & Daily Diary"
          />
        );
      case 'demo-plan':
        return (
          <DemoPlanList 
            onNewEntry={() => setActiveTab('demo-plan-new')} 
            onEditEntry={(id) => {
              setEditingDemoId(id);
              setActiveTab('demo-plan-edit');
            }} 
          />
        );
      case 'demo-plan-new':
        return <DemoPlanForm onBack={() => setActiveTab('demo-plan')} />;
      case 'demo-plan-edit':
        return <DemoPlanForm onBack={() => setActiveTab('demo-plan')} planId={editingDemoId || undefined} />;
      case 'monthly-assess':
        return (
          <MonthlyAssessmentList 
            onNewEntry={() => setActiveTab('monthly-assess-new')} 
            onEditEntry={(id) => {
              setEditingAssessmentId(id);
              setActiveTab('monthly-assess-edit');
            }} 
          />
        );
      case 'monthly-assess-new':
        return (
          <MonthlyAssessmentForm 
            onBack={() => setActiveTab('monthly-assess')} 
            onNext={() => navigateToNext('internal-assess-new')}
            nextLabel="Save & Internal Assessment"
            downloadOnSave={downloadOnNext}
          />
        );
      case 'monthly-assess-edit':
        return (
          <MonthlyAssessmentForm 
            onBack={() => setActiveTab('monthly-assess')} 
            assessmentId={editingAssessmentId || undefined} 
            onNext={() => navigateToNext('internal-assess-new')}
            nextLabel="Save & Internal Assessment"
          />
        );
      case 'internal-assess':
        return (
          <InternalAssessmentList 
            onNewEntry={() => setActiveTab('internal-assess-new')} 
            onEditEntry={(id) => {
              setEditingInternalId(id);
              setActiveTab('internal-assess-edit');
            }} 
          />
        );
      case 'internal-assess-new':
        return (
          <InternalAssessmentForm 
            onBack={() => setActiveTab('internal-assess')} 
            onNext={() => navigateToNext('dashboard', false)}
            nextLabel="Save & Finish"
            downloadOnSave={downloadOnNext}
          />
        );
      case 'internal-assess-edit':
        return (
          <InternalAssessmentForm 
            onBack={() => setActiveTab('internal-assess')} 
            assessmentId={editingInternalId || undefined} 
            onNext={() => navigateToNext('dashboard', false)}
            nextLabel="Save & Finish"
          />
        );
      case 'monthly-plan':
        return (
          <MonthlyPlanList 
            onNewEntry={() => setActiveTab('monthly-plan-new')} 
            onEditEntry={(id) => {
              setEditingMonthlyPlanId(id);
              setActiveTab('monthly-plan-edit');
            }} 
          />
        );
      case 'monthly-plan-new':
        return (
          <MonthlyPlanForm 
            onBack={() => setActiveTab('monthly-plan')} 
            onNext={() => navigateToNext('lesson-plan-new')}
            nextLabel="Save & Lesson Plan"
            downloadOnSave={downloadOnNext}
          />
        );
      case 'monthly-plan-edit':
        return (
          <MonthlyPlanForm 
            onBack={() => setActiveTab('monthly-plan')} 
            planId={editingMonthlyPlanId || undefined} 
            onNext={() => navigateToNext('lesson-plan-new')}
            nextLabel="Save & Lesson Plan"
          />
        );
      case 'yearly-plan':
        return (
          <YearlyPlanList 
            onNewEntry={() => setActiveTab('yearly-plan-new')} 
            onEditEntry={(id) => {
              setEditingYearlyPlanId(id);
              setActiveTab('yearly-plan-edit');
            }} 
          />
        );
      case 'yearly-plan-new':
        return (
          <YearlyPlanForm 
            onBack={() => setActiveTab('yearly-plan')} 
            onNext={() => navigateToNext('monthly-plan-new')}
            nextLabel="Save & Monthly Plan"
            downloadOnSave={downloadOnNext}
          />
        );
      case 'yearly-plan-edit':
        return (
          <YearlyPlanForm 
            onBack={() => setActiveTab('yearly-plan')} 
            planId={editingYearlyPlanId || undefined} 
            onNext={() => navigateToNext('monthly-plan-new')}
            nextLabel="Save & Monthly Plan"
          />
        );
      case 'custom-forms':
        return <AdvancedFormBuilder />;
      case 'form-templates':
        return <AdvancedFormBuilder defaultView="templates" />;
      case 'form-analytics':
        return <AdvancedFormBuilder defaultView="analytics" />;
      case 'formative-assess':
      case 'exam-form':
      case 'students':
        return <StudentList />;
      case 'settings':
        if (isAdmin) return <SystemConfig />;
        const displayTitle = activeTab.replace('-', ' ');
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold tracking-tight capitalize">{displayTitle}</h2>
                <p className="text-muted-foreground">Manage your {displayTitle} records here.</p>
              </div>
              <Button className="shadow-sm" onClick={() => setActiveTab(`${activeTab}-new`)}>
                <Plus className="mr-2 h-4 w-4" /> New Entry
              </Button>
            </div>
            
            <div className="bg-white rounded-xl border border-dashed border-slate-300 h-[400px] flex flex-col items-center justify-center text-center p-8">
              <div className="bg-slate-50 p-4 rounded-full mb-4">
                <GraduationCap className="h-10 w-10 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">No Records Found</h3>
              <p className="text-slate-500 max-w-xs mt-2">
                You haven't added any {displayTitle} entries yet. Click the "New Entry" button to get started.
              </p>
            </div>
          </div>
        );
      case 'dashboard':
        if (userData?.role === 'student') {
          return <StudentDashboard setActiveTab={setActiveTab} />;
        }
        return isAdmin ? <Dashboard /> : <InstructorDashboard setActiveTab={setActiveTab} />;
      default:
        if (activeTab.startsWith('custom-form-')) {
          const formId = activeTab.replace('custom-form-', '');
          return <AdvancedFormBuilder initialFormId={formId} />;
        }
        return isAdmin ? <Dashboard /> : <InstructorDashboard setActiveTab={setActiveTab} />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <AuthProvider>
          <AppSettingsProvider>
            <AppContent />
            <Toaster position="top-right" richColors />
          </AppSettingsProvider>
        </AuthProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}
