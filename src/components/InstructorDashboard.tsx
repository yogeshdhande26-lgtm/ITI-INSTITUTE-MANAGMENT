import React from 'react';
import { useAuth } from './AuthContext';
import { useLanguage } from './LanguageContext';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Mail, 
  Briefcase, 
  GraduationCap, 
  Calendar, 
  Phone,
  Clock,
  CheckCircle2,
  FileText,
  Presentation,
  ClipboardList,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InstructorDashboardProps {
  setActiveTab?: (tab: string) => void;
}

export const InstructorDashboard: React.FC<InstructorDashboardProps> = ({ setActiveTab }) => {
  const { user, instructorProfile } = useAuth();
  const { t } = useLanguage();
  const [activeForms, setActiveForms] = React.useState<any[]>([]);
  const [loadingForms, setLoadingForms] = React.useState(true);

  React.useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'advanced_forms'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setActiveForms(data);
      setLoadingForms(false);
    });
    return () => unsub();
  }, [user]);

  if (!instructorProfile) {
    return (
      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 flex items-start gap-4">
          <div className="bg-blue-100 p-3 rounded-full">
            <User className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-blue-900">{t('profilePending')}</h3>
            <p className="text-blue-700 mt-1">
              {t('welcomeUser').replace('{name}', user?.displayName || '')} {t('contactAdminEmail')} <strong>{user?.email}</strong>.
            </p>
          </div>
        </div>
        
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>{t('gettingStarted')}</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            {t('profileLinkedInfo')}
          </CardContent>
        </Card>
      </div>
    );
  }

  const profileItems = [
    { icon: User, label: t('fullName'), value: instructorProfile.name },
    { icon: Mail, label: t('emailAddress'), value: instructorProfile.email },
    { icon: Briefcase, label: t('tradeDept'), value: instructorProfile.trade },
    { icon: GraduationCap, label: t('qualification'), value: instructorProfile.qualification || t('notSpecified') },
    { icon: Clock, label: t('experience'), value: `${instructorProfile.experience || '0'} ${t('years')}` },
    { icon: Phone, label: t('phoneNumber'), value: instructorProfile.phone || t('notSpecified') },
    { icon: Calendar, label: t('joiningDate'), value: instructorProfile.joiningDate || t('notSpecified') },
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t('instructorDashboard')}</h2>
          <p className="text-muted-foreground">{t('welcomeUser').replace('{name}', instructorProfile.name)}</p>
        </div>
        <Badge variant={instructorProfile.status === 'Active' ? 'default' : 'secondary'} className="text-sm px-3 py-1">
          {instructorProfile.status === 'Active' ? t('active') : instructorProfile.status}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 border-none shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              {t('myProfileDetails')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-2">
              {profileItems.map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50/50">
                  <div className="mt-1 bg-white p-2 rounded-md shadow-sm">
                    <item.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{item.label}</p>
                    <p className="text-sm font-semibold text-slate-900 mt-0.5">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Custom Forms Section */}
        <Card className="md:col-span-full border-none shadow-sm bg-slate-50/30 overflow-hidden">
          <CardHeader className="bg-white border-b">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  Custom Registers & Assigned Forms
                </CardTitle>
                <p className="text-sm text-slate-500 font-medium">Registers built using Form Builder Pro</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeForms.length > 0 ? (
                activeForms.map((form) => (
                  <button 
                    key={form.id}
                    onClick={() => setActiveTab && setActiveTab(`custom-form-${form.id}`)}
                    className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-200 hover:border-primary hover:shadow-md transition-all text-left group"
                  >
                    <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <h4 className="font-bold text-slate-900 truncate">{form.name}</h4>
                      <p className="text-xs text-slate-500 truncate">{form.description || 'Custom technical register.'}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-primary" />
                  </button>
                ))
              ) : (
                <div className="col-span-full py-12 text-center bg-white border border-dashed rounded-3xl">
                  <ClipboardList className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium text-sm">No custom forms found. Create one in the Form Builder Pro first.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-none shadow-sm bg-primary text-primary-foreground">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                {t('currentStatus')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-white/10 p-4 rounded-lg">
                  <p className="text-xs opacity-80 uppercase font-bold tracking-widest">{t('assignedTrade')}</p>
                  <p className="text-xl font-bold mt-1">{instructorProfile.trade}</p>
                </div>
                <p className="text-sm opacity-90">
                  {t('profileUpToDateInfo')}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">{t('quickLinks')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2 h-11 border-slate-200"
                onClick={() => setActiveTab('lesson-plan')}
              >
                <FileText className="h-4 w-4 text-slate-500" />
                {t('lessonPlan')}
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2 h-11 border-slate-200"
                onClick={() => setActiveTab('demo-plan')}
              >
                <Presentation className="h-4 w-4 text-slate-500" />
                {t('demoPlan')}
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2 h-11 border-slate-200"
                onClick={() => setActiveTab('attendance')}
              >
                <ClipboardList className="h-4 w-4 text-slate-500" />
                {t('attendanceRegister')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
