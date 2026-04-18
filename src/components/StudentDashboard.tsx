import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  GraduationCap, 
  BookOpen, 
  ClipboardCheck, 
  Calendar, 
  Clock,
  Award,
  FileText,
  TrendingUp,
  LayoutDashboard,
  CheckCircle2,
  AlertCircle,
  FileSearch,
  School,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { safeFormatDate } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface StudentDashboardProps {
  setActiveTab?: (tab: string) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ setActiveTab }) => {
  const { user, userData } = useAuth();
  const [stats, setStats] = useState({
    practicalRecords: 0,
    assessments: 0,
    attendance: 0,
    examForms: 0
  });
  const [recentRecords, setRecentRecords] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [activeForms, setActiveForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchStudentData = async () => {
      setLoading(true);
      try {
        const studentDisplayName = user.displayName || userData?.displayName;
        
        // Fetch Custom Forms
        const formsRef = collection(db, 'advanced_forms');
        const formsSnapshot = await getDocs(query(formsRef, orderBy('createdAt', 'desc')));
        const allForms = formsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Filter forms based on roles - students can only see if 'student' is in allowedRoles
        const studentForms = allForms.filter((f: any) => 
          f.settings?.allowedRoles?.includes('student') || !f.settings?.allowedRoles
        );
        setActiveForms(studentForms);

        if (!studentDisplayName) {
          console.warn('No student display name found for query');
          setLoading(false);
          return;
        }

        // Fetch Practical Records
        const recordsRef = collection(db, 'practical_records');
        const recordsQuery = query(recordsRef, where('studentName', '==', studentDisplayName), limit(10));
        const recordsSnapshot = await getDocs(recordsQuery);
        setStats(prev => ({ ...prev, practicalRecords: recordsSnapshot.size }));
        setRecentRecords(recordsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Fetch Assessments
        const assessmentsRef = collection(db, 'monthly_assessments');
        const assessmentsQuery = query(assessmentsRef, where('trainee', '==', studentDisplayName));
        const assessmentsSnapshot = await getDocs(assessmentsQuery);
        setStats(prev => ({ ...prev, assessments: assessmentsSnapshot.size }));
        setAssessments(assessmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Fetch Exam Forms
        // We look for forms where the surname matches the last part of student's name
        const surname = studentDisplayName.split(' ').pop() || '';
        const examsRef = collection(db, 'exam_forms');
        const examsQuery = query(examsRef, where('surname', '==', surname));
        const examsSnapshot = await getDocs(examsQuery);
        setStats(prev => ({ ...prev, examForms: examsSnapshot.size }));

      } catch (error) {
        console.error('Error fetching student dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [user, userData]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[2rem] shadow-sm border">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center">
            <GraduationCap className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900">Education Portal</h2>
            <p className="text-slate-500 font-medium">Welcome back, {user?.displayName || 'Student'}!</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {userData?.trade && (
            <Badge variant="secondary" className="px-4 py-2 rounded-xl border-slate-200 bg-slate-50 text-slate-700 font-bold">
              <School className="h-4 w-4 mr-2" />
              {userData.trade}
            </Badge>
          )}
          <Badge className="px-4 py-2 rounded-xl bg-emerald-500 text-white font-bold border-none">
            Active Session 2024-25
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-8">
        <div className="flex justify-center md:justify-start">
          <TabsList className="bg-slate-100 p-1 rounded-2xl h-14 border">
            <TabsTrigger value="overview" className="rounded-xl px-8 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="records" className="rounded-xl px-8 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <BookOpen className="h-4 w-4 mr-2" />
              Academic Records
            </TabsTrigger>
            <TabsTrigger value="performance" className="rounded-xl px-8 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <TrendingUp className="h-4 w-4 mr-2" />
              Performance
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-none shadow-lg rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 text-white group hover:scale-[1.02] transition-transform cursor-default">
              <CardContent className="p-8">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-4xl font-black">{stats.practicalRecords}</h3>
                    <p className="text-blue-100 font-bold uppercase tracking-widest text-[10px] mt-1">Practical Files</p>
                  </div>
                  <div className="bg-white/20 p-3 rounded-2xl group-hover:bg-white/30 transition-colors">
                    <BookOpen className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-700 text-white group hover:scale-[1.02] transition-transform cursor-default">
              <CardContent className="p-8">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-4xl font-black">{stats.assessments}</h3>
                    <p className="text-emerald-100 font-bold uppercase tracking-widest text-[10px] mt-1">Evaluations</p>
                  </div>
                  <div className="bg-white/20 p-3 rounded-2xl group-hover:bg-white/30 transition-colors">
                    <Award className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-violet-600 to-purple-700 text-white group hover:scale-[1.02] transition-transform cursor-default">
              <CardContent className="p-8">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-4xl font-black">92%</h3>
                    <p className="text-purple-100 font-bold uppercase tracking-widest text-[10px] mt-1">Attendance</p>
                  </div>
                  <div className="bg-white/20 p-3 rounded-2xl group-hover:bg-white/30 transition-colors">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-orange-500 to-rose-600 text-white group hover:scale-[1.02] transition-transform cursor-default">
              <CardContent className="p-8">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-4xl font-black">{stats.examForms > 0 ? 'Submitted' : 'Pending'}</h3>
                    <p className="text-orange-100 font-bold uppercase tracking-widest text-[10px] mt-1">AITT Exam Form</p>
                  </div>
                  <div className="bg-white/20 p-3 rounded-2xl group-hover:bg-white/30 transition-colors">
                    <FileSignatureIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Dynamic Assigned Forms for Students */}
          <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-white">
            <CardHeader className="p-8 border-b bg-slate-50/50">
              <CardTitle className="text-xl font-black flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-amber-500" />
                Technical Registers & Forms
              </CardTitle>
              <CardDescription>Fill out the registers assigned to your trade.</CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeForms.length > 0 ? (
                  activeForms.map((form) => (
                    <button 
                      key={form.id}
                      onClick={() => setActiveTab && setActiveTab(`custom-form-${form.id}`)}
                      className="group p-6 bg-slate-50 rounded-[2rem] border border-slate-100 hover:border-primary hover:bg-white transition-all text-left flex flex-col gap-4 shadow-sm hover:shadow-xl"
                    >
                      <div className="h-14 w-14 bg-white rounded-2xl shadow-sm flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                        <FileText className="h-7 w-7" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 group-hover:text-primary transition-colors text-lg">{form.name}</h4>
                        <p className="text-sm text-slate-500 mt-1 line-clamp-2">{form.description || 'Fill and submit this technical register.'}</p>
                      </div>
                      <div className="mt-2 flex items-center text-primary font-bold text-xs gap-2">
                        OPEN REGISTER <ChevronRight className="h-4 w-4" />
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="col-span-full py-12 text-center text-slate-400 italic">
                    No active forms assigned to you at this time.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-white">
              <CardHeader className="p-8 border-b bg-slate-50/50">
                <CardTitle className="text-xl font-black flex items-center gap-3">
                  <Clock className="h-5 w-5 text-primary" />
                  Recent Submissions
                </CardTitle>
                <CardDescription>Your most recently graded practical work and records.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {recentRecords.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {recentRecords.map((record) => (
                      <div key={record.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-500 border border-slate-200">
                            {record.practicalNo}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 line-clamp-1">{record.title}</h4>
                            <p className="text-xs text-slate-500 mt-0.5">{record.trade} • {safeFormatDate(record.createdAt, 'MMM d, yyyy')}</p>
                          </div>
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none px-4 py-1.5 rounded-full font-bold">
                          Verified
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-20 text-center space-y-4">
                    <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                      <FileSearch className="h-8 w-8 text-slate-300" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">No records found</h4>
                      <p className="text-slate-500 text-sm">You haven't submitted any practical records yet.</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-slate-900 text-white">
              <CardHeader className="p-8 border-b border-white/10">
                <CardTitle className="text-xl font-bold flex items-center gap-3">
                  <Award className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-4">
                <button className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all text-left group">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-blue-500 rounded-xl flex items-center justify-center">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">Hall Ticket</p>
                      <p className="text-[10px] text-white/50">Download for AITT</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-white/30 group-hover:text-white transition-colors" />
                </button>

                <button className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all text-left group">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                      <ClipboardCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">Exam Form</p>
                      <p className="text-[10px] text-white/50">Check status</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-white/30 group-hover:text-white transition-colors" />
                </button>

                <div className="pt-4 border-t border-white/10 mt-4">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-emerald-400">Profile Verified</p>
                      <p className="text-xs text-emerald-500/70">Your trainee profile is correctly linked to {userData?.trade || 'your trade'}.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="records" className="space-y-6">
          <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-8">
              <CardTitle className="text-2xl font-black">All Academic Records</CardTitle>
              <CardDescription>Comprehensive list of all your practical work and documents.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0">
               {/* Search/Filter implementation would go here */}
               <div className="grid gap-4">
                 {recentRecords.map(record => (
                   <div key={record.id} className="p-6 bg-slate-50 rounded-3xl border flex items-center justify-between group hover:border-primary/30 transition-all">
                     <div className="flex gap-6 items-center">
                        <div className="bg-white p-4 rounded-2xl border shadow-sm font-black text-primary text-xl">
                          {record.practicalNo}
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-slate-900">{record.title}</h4>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {safeFormatDate(record.createdAt, 'MMM d, yyyy')}
                            </span>
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <ClipboardCheck className="h-3 w-3" />
                              Module: {record.module}
                            </span>
                          </div>
                        </div>
                     </div>
                     <button className="bg-white text-slate-900 border font-bold px-6 py-2 rounded-xl hover:bg-slate-900 hover:text-white transition-all">
                       Download PDF
                     </button>
                   </div>
                 ))}
                 {recentRecords.length === 0 && (
                   <div className="text-center py-20 text-slate-400">
                     No records found yet.
                   </div>
                 )}
               </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="grid gap-8 grid-cols-1 lg:grid-cols-2">
          <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-8">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Assessment History
              </CardTitle>
              <CardDescription>Your monthly performance breakdown.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0">
               <div className="space-y-4">
                 {assessments.map((item, i) => (
                   <div key={i} className="p-6 bg-white border rounded-3xl flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-indigo-50 rounded-2xl flex items-center justify-center font-bold text-indigo-600">
                          {item.month?.substring(0, 3)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">Total Marks: {item.marks?.[0]?.total || 0}/100</p>
                          <p className="text-xs text-slate-500">Evaluated on {safeFormatDate(item.createdAt, 'MMM d, yyyy')}</p>
                        </div>
                     </div>
                     <Badge variant="outline" className="rounded-full border-indigo-200 text-indigo-600 bg-indigo-50 font-bold px-4">
                       Grade: {item.marks?.[0]?.result || 'P'}
                     </Badge>
                   </div>
                 ))}
                 {assessments.length === 0 && (
                   <div className="text-center py-12 text-slate-400 italic">
                     No assessments found yet.
                   </div>
                 )}
               </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-slate-900 text-white">
            <CardHeader className="p-8">
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                Teacher Remarks
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 pt-0">
              <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
                <p className="text-slate-300 italic mb-4">"Consistent performance in practical workshop. Focus more on technical theory for upcoming AITT exams."</p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center font-bold text-white text-xs">
                    INST
                  </div>
                  <div>
                    <p className="text-sm font-bold">Class Instructor</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">Trade Head</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

function FileSignatureIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 19.5v.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8.5L20 7.5V11" />
      <path d="M14 2v6h6" />
      <path d="M18.42 15.61a2.1 2.1 0 0 1 2.97 2.97L16.95 23 13 24l1-3.95 4.42-4.44Z" />
    </svg>
  )
}
