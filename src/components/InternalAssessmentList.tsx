import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  TrendingUp,
  Calendar,
  GraduationCap,
  Loader2,
  Users
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface InternalAssessmentListProps {
  onNewEntry: () => void;
  onEditEntry: (assessmentId: string) => void;
}

export const InternalAssessmentList: React.FC<InternalAssessmentListProps> = ({ onNewEntry, onEditEntry }) => {
  const { user, isAdmin } = useAuth();
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;

    let q = query(
      collection(db, 'internal_assessments'),
      orderBy('createdAt', 'desc')
    );

    if (!isAdmin) {
      q = query(
        collection(db, 'internal_assessments'),
        where('instructorId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAssessments(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'internal_assessments');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, isAdmin]);

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    setIsDeleting(true);
    
    try {
      await deleteDoc(doc(db, 'internal_assessments', deleteConfirmId));
      toast.success('Assessment deleted successfully');
      setDeleteConfirmId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `internal_assessments/${deleteConfirmId}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredAssessments = assessments.filter(a => 
    a.trade.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.iti.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.assessor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight text-slate-900">Internal Assessment Register</h2>
          <p className="text-slate-500 mt-2 font-medium">Enhanced Format for Candidate Progress Evaluation.</p>
        </div>
        <Button onClick={onNewEntry} className="gap-2 bg-slate-900 hover:bg-slate-800 shadow-lg h-12 px-6 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]">
          <Plus className="h-5 w-5" /> New Assessment
        </Button>
      </div>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
        <input 
          type="text"
          placeholder="Search by trade, ITI or assessor..."
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 outline-none transition-all shadow-sm text-lg"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-64 bg-slate-100 animate-pulse rounded-2xl border border-slate-200" />
          ))}
        </div>
      ) : filteredAssessments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssessments.map((assessment) => (
            <Card key={assessment.id} className="overflow-hidden group hover:shadow-xl transition-all border-slate-200 rounded-2xl flex flex-col">
              <CardHeader className="pb-4 flex flex-row items-start justify-between space-y-0 bg-slate-50/50">
                <div className="space-y-2">
                  <Badge variant="secondary" className="bg-white text-slate-900 border-slate-200 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5">
                    {assessment.trade}
                  </Badge>
                  <CardTitle className="text-xl font-bold line-clamp-1 text-slate-900">Semester {assessment.semester}</CardTitle>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-slate-900 hover:bg-white rounded-full transition-colors">
                        <MoreVertical className="h-5 w-5" />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl border-slate-200">
                    <DropdownMenuItem onClick={() => onEditEntry(assessment.id)} className="gap-3 py-2.5 cursor-pointer">
                      <Edit2 className="h-4 w-4 text-slate-500" /> 
                      <span className="font-medium">Edit Assessment</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDeleteConfirmId(assessment.id)} className="gap-3 py-2.5 text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer">
                      <Trash2 className="h-4 w-4" /> 
                      <span className="font-medium">Delete Assessment</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="p-6 flex-1 flex flex-col">
                <div className="space-y-4 text-sm text-slate-600 flex-1">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Enrollment Year</p>
                      <div className="flex items-center gap-2 text-slate-900 font-semibold">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <span>{assessment.year}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Candidates</p>
                      <div className="flex items-center gap-2 text-slate-900 font-semibold">
                        <Users className="h-4 w-4 text-slate-400" />
                        <span>{assessment.candidates?.filter((c: any) => c.name).length || 0} Students</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ITI Name</p>
                    <div className="flex items-center gap-2 text-slate-900 font-semibold">
                      <GraduationCap className="h-4 w-4 text-slate-400" />
                      <span className="truncate">{assessment.iti}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                      <span className="text-emerald-600 font-bold">{assessment.grandSummary?.totalPass || 0} PASS</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-red-500"></div>
                      <span className="text-red-600 font-bold">{assessment.grandSummary?.totalFail || 0} FAIL</span>
                    </div>
                  </div>
                </div>
                <div className="pt-6 mt-6 border-t border-slate-100 flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Grand Total</span>
                    <span className="text-lg font-black text-slate-900">
                      {assessment.grandSummary?.grandTotal || 0}
                    </span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onEditEntry(assessment.id)} 
                    className="text-slate-900 hover:bg-slate-100 text-xs font-bold h-9 px-4 rounded-lg border border-slate-200"
                  >
                    VIEW REGISTER
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-32 bg-white rounded-3xl border-2 border-dashed border-slate-200 px-6 text-center">
          <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-6">
            <Users className="h-10 w-10" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900">No assessment records found</h3>
          <p className="text-slate-500 mb-8 max-w-sm">Start tracking your candidates' progress by creating your first enhanced internal assessment record.</p>
          <Button onClick={onNewEntry} className="gap-2 bg-slate-900 hover:bg-slate-800 h-12 px-8 rounded-xl shadow-lg">
            <Plus className="h-5 w-5" /> Create First Record
          </Button>
        </div>
      )}

      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Assessment Record?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete this internal assessment register.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setDeleteConfirmId(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting} className="gap-2">
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
