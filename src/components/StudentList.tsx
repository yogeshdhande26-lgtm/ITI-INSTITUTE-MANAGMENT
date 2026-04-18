import React, { useState, useEffect } from 'react';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { db, handleFirestoreError, OperationType, config } from '../lib/firebase';
import { collection, onSnapshot, query, deleteDoc, doc, where, setDoc, updateDoc } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Edit, Trash2, Plus, Search, UserPlus, GraduationCap, RefreshCw, Shield } from 'lucide-react';
import { StudentForm } from './StudentForm';
import { InstructorPermissions } from './InstructorPermissions';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';

export const StudentList: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [deletingStudent, setDeletingStudent] = useState<any>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [permissionsStudent, setPermissionsStudent] = useState<any>(null);

  useEffect(() => {
    if (!user) return;

    let q = query(collection(db, 'students'));
    
    // If not admin, only show students assigned to this instructor
    if (!isAdmin) {
      q = query(collection(db, 'students'), where('instructorId', '==', user.uid));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStudents(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'students');
    });

    return () => unsubscribe();
  }, [user, isAdmin]);

  const handleDelete = async () => {
    if (!deletingStudent) return;
    
    try {
      await deleteDoc(doc(db, 'students', deletingStudent.id));
      toast.success('Student deleted successfully');
      setDeletingStudent(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'students');
    }
  };

  const handleSyncAuth = async (student: any) => {
    if (!student.email || !student.password) {
      toast.error('Student must have an email and password set to sync.');
      return;
    }

    if (student.password.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }

    setSyncingId(student.id);
    
    const tempAppName = `sync-student-${Date.now()}`;
    const tempApp = initializeApp(config, tempAppName);
    const tempAuth = getAuth(tempApp);
    
    try {
      const userCredential = await createUserWithEmailAndPassword(tempAuth, student.email, student.password);
      const uid = userCredential.user.uid;

      // Update student document with UID
      await updateDoc(doc(db, 'students', student.id), { uid });

      // Create user document with student role
      await setDoc(doc(db, 'users', uid), {
        uid,
        email: student.email,
        role: 'student',
        displayName: student.name,
        enabledFeatures: ['dashboard', 'profile'] // Default features for students
      });
      
      toast.success(`Login account created and synced for ${student.name}`);
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        toast.info(`Login account already exists for ${student.email}.`);
      } else {
        console.error('Sync error:', err);
        toast.error(`Failed to sync: ${err.message}`);
      }
    } finally {
      await deleteApp(tempApp);
      setSyncingId(null);
    }
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.rollNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.trade.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Students</h2>
          <p className="text-muted-foreground">Manage student records and their custom information.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger render={<Button className="shadow-sm" />}>
              <UserPlus className="mr-2 h-4 w-4" /> Add Student
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add New Student</DialogTitle>
            </DialogHeader>
            <StudentForm 
              onSuccess={() => setIsAddOpen(false)} 
              onCancel={() => setIsAddOpen(false)} 
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name, roll no or trade..." 
              className="pl-10 max-w-md"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Roll No</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Trade</TableHead>
                  <TableHead>Admission Date</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10">
                      Loading students...
                    </TableCell>
                  </TableRow>
                ) : filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      No students found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((s) => (
                    <TableRow key={s.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono text-xs">{s.rollNo}</TableCell>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{s.trade}</TableCell>
                      <TableCell>{s.admissionDate || 'N/A'}</TableCell>
                      <TableCell>{s.phone || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {isAdmin && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleSyncAuth(s)}
                                disabled={syncingId === s.id}
                                title="Sync Login Account"
                              >
                                <RefreshCw className={`h-4 w-4 text-emerald-600 ${syncingId === s.id ? 'animate-spin' : ''}`} />
                              </Button>
                              <Dialog open={permissionsStudent?.id === s.id} onOpenChange={(open) => !open && setPermissionsStudent(null)}>
                                <DialogTrigger 
                                  onClick={() => setPermissionsStudent(s)}
                                  render={<Button variant="ghost" size="icon" title="Manage Permissions" />}
                                >
                                    <Shield className="h-4 w-4 text-amber-600" />
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[450px]">
                                  <DialogHeader>
                                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                      <Shield className="h-5 w-5 text-amber-600" />
                                      Manage Features: {s.name}
                                    </DialogTitle>
                                  </DialogHeader>
                                  <InstructorPermissions 
                                    instructor={s}
                                    onClose={() => setPermissionsStudent(null)} 
                                  />
                                </DialogContent>
                              </Dialog>
                            </>
                          )}
                          <Dialog>
                            <DialogTrigger 
                              onClick={() => setEditingStudent(s)}
                              render={<Button variant="ghost" size="icon" />}
                            >
                                <Edit className="h-4 w-4 text-blue-600" />
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[600px]">
                              <DialogHeader>
                                <DialogTitle>Edit Student</DialogTitle>
                              </DialogHeader>
                              <StudentForm 
                                student={s}
                                onSuccess={() => setEditingStudent(null)} 
                                onCancel={() => setEditingStudent(null)} 
                              />
                            </DialogContent>
                          </Dialog>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setDeletingStudent(s)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingStudent} onOpenChange={(open) => !open && setDeletingStudent(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to delete student <span className="font-semibold text-slate-900">{deletingStudent?.name}</span>? 
              This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setDeletingStudent(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete Student</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
