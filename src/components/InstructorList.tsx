import React, { useState, useEffect } from 'react';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { db, handleFirestoreError, OperationType, config } from '../lib/firebase';
import { collection, onSnapshot, query, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Plus, Search, UserPlus, RefreshCw, Shield } from 'lucide-react';
import { InstructorForm } from './InstructorForm';
import { InstructorPermissions } from './InstructorPermissions';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';

export const InstructorList: React.FC = () => {
  const { isAdmin } = useAuth();
  const [instructors, setInstructors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingInstructor, setEditingInstructor] = useState<any>(null);
  const [deletingInstructor, setDeletingInstructor] = useState<any>(null);
  const [permissionsInstructor, setPermissionsInstructor] = useState<any>(null);

  useEffect(() => {
    const q = query(collection(db, 'instructors'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInstructors(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'instructors');
    });

    return () => unsubscribe();
  }, []);

  const handleSyncAuth = async (inst: any) => {
    if (!inst.email || !inst.password) {
      toast.error('Instructor must have an email and password set to sync.');
      return;
    }

    if (inst.password.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }

    setSyncingId(inst.id);
    
    // Create a secondary app to avoid signing out the current admin
    const tempAppName = `sync-app-${Date.now()}`;
    const tempApp = initializeApp(config, tempAppName);
    const tempAuth = getAuth(tempApp);
    
    try {
      await createUserWithEmailAndPassword(tempAuth, inst.email, inst.password);
      
      // Also ensure login_mappings is set here
      if (inst.loginId) {
        await setDoc(doc(db, 'login_mappings', inst.loginId), {
          email: inst.email,
          instructorId: inst.id
        });
      }
      
      toast.success(`Login account created and synced for ${inst.name}`);
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        // If user exists, still try to update the mapping just in case
        if (inst.loginId) {
          await setDoc(doc(db, 'login_mappings', inst.loginId), {
            email: inst.email,
            instructorId: inst.id
          });
        }
        toast.info(`Login account already exists for ${inst.email}. Mapping updated.`);
      } else {
        console.error('Sync error:', err);
        toast.error(`Failed to sync: ${err.message}`);
      }
    } finally {
      await deleteApp(tempApp);
      setSyncingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deletingInstructor) return;
    
    try {
      await deleteDoc(doc(db, 'instructors', deletingInstructor.id));
      toast.success('Instructor deleted successfully');
      setDeletingInstructor(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'instructors');
    }
  };

  const filteredInstructors = instructors.filter(inst => 
    inst.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inst.trade.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inst.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-3xl font-bold tracking-tight">Instructors</h2>
        {isAdmin && (
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger render={<Button className="shadow-sm" />}>
                <UserPlus className="mr-2 h-4 w-4" /> Add Instructor
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Add New Instructor</DialogTitle>
              </DialogHeader>
              <InstructorForm 
                onSuccess={() => setIsAddOpen(false)} 
                onCancel={() => setIsAddOpen(false)} 
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name, trade or email..." 
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
                  <TableHead>Name</TableHead>
                  <TableHead>Trade</TableHead>
                  <TableHead>Login ID</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Experience</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 7 : 6} className="text-center py-10">
                      Loading instructors...
                    </TableCell>
                  </TableRow>
                ) : filteredInstructors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 7 : 6} className="text-center py-10 text-muted-foreground">
                      No instructors found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInstructors.map((inst) => (
                    <TableRow key={inst.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">{inst.name}</TableCell>
                      <TableCell>{inst.trade}</TableCell>
                      <TableCell>
                        <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono">
                          {inst.loginId || '-'}
                        </code>
                      </TableCell>
                      <TableCell>{inst.email}</TableCell>
                      <TableCell>
                        <Badge variant={inst.status === 'Active' ? 'default' : 'secondary'}>
                          {inst.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{inst.experience || 'N/A'} yrs</TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleSyncAuth(inst)}
                              disabled={syncingId === inst.id}
                              title="Sync Login Account"
                            >
                              <RefreshCw className={`h-4 w-4 text-emerald-600 ${syncingId === inst.id ? 'animate-spin' : ''}`} />
                            </Button>
                            <Dialog open={permissionsInstructor?.id === inst.id} onOpenChange={(open) => !open && setPermissionsInstructor(null)}>
                              <DialogTrigger 
                                onClick={() => setPermissionsInstructor(inst)}
                                render={<Button variant="ghost" size="icon" title="Manage Permissions" />}
                              >
                                  <Shield className="h-4 w-4 text-amber-600" />
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[450px]">
                                <DialogHeader>
                                  <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                    <Shield className="h-5 w-5 text-amber-600" />
                                    Manage Features: {inst.name}
                                  </DialogTitle>
                                </DialogHeader>
                                <InstructorPermissions 
                                  instructor={inst}
                                  onClose={() => setPermissionsInstructor(null)} 
                                />
                              </DialogContent>
                            </Dialog>
                            <Dialog>
                              <DialogTrigger 
                                onClick={() => setEditingInstructor(inst)}
                                render={<Button variant="ghost" size="icon" />}
                              >
                                  <Edit className="h-4 w-4 text-blue-600" />
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[600px]">
                                <DialogHeader>
                                  <DialogTitle>Edit Instructor</DialogTitle>
                                </DialogHeader>
                                <InstructorForm 
                                  instructor={inst}
                                  onSuccess={() => setEditingInstructor(null)} 
                                  onCancel={() => setEditingInstructor(null)} 
                                />
                              </DialogContent>
                            </Dialog>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => setDeletingInstructor(inst)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingInstructor} onOpenChange={(open) => !open && setDeletingInstructor(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to delete instructor <span className="font-semibold text-slate-900">{deletingInstructor?.name}</span>? 
              This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setDeletingInstructor(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete Instructor</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
