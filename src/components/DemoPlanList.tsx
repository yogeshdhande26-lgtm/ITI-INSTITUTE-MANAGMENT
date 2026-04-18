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
  FileText,
  Calendar,
  Clock,
  Loader2,
  BookOpen,
  Presentation
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
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { safeFormatDate } from '@/lib/utils';

interface DemoPlanListProps {
  onNewEntry: () => void;
  onEditEntry: (planId: string) => void;
}

export const DemoPlanList: React.FC<DemoPlanListProps> = ({ onNewEntry, onEditEntry }) => {
  const { user, isAdmin } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;

    let q = query(
      collection(db, 'demo_plans'),
      orderBy('createdAt', 'desc')
    );

    if (!isAdmin) {
      q = query(
        collection(db, 'demo_plans'),
        where('instructorId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPlans(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'demo_plans');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, isAdmin]);

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    setIsDeleting(true);
    
    try {
      await deleteDoc(doc(db, 'demo_plans', deleteConfirmId));
      toast.success('Demonstration plan deleted successfully');
      setDeleteConfirmId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `demo_plans/${deleteConfirmId}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredPlans = plans.filter(p => 
    p.lessonName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.trade.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.institute.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight text-slate-900">Demonstration Plans</h2>
          <p className="text-slate-500 mt-2 font-medium">Technical Demonstration Plan Register for ITI Instructors.</p>
        </div>
        <Button onClick={onNewEntry} className="gap-2 bg-slate-900 hover:bg-slate-800 shadow-lg h-12 px-6 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]">
          <Plus className="h-5 w-5" /> New Demo Plan
        </Button>
      </div>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
        <input 
          type="text"
          placeholder="Search by lesson name, trade or institute..."
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
      ) : filteredPlans.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlans.map((plan) => (
            <Card key={plan.id} className="overflow-hidden group hover:shadow-xl transition-all border-slate-200 rounded-2xl flex flex-col">
              <CardHeader className="pb-4 flex flex-row items-start justify-between space-y-0 bg-slate-50/50">
                <div className="space-y-2">
                  <Badge variant="secondary" className="bg-white text-slate-900 border-slate-200 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5">
                    {plan.trade}
                  </Badge>
                  <CardTitle className="text-xl font-bold line-clamp-1 text-slate-900">{plan.lessonName}</CardTitle>
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
                    <DropdownMenuItem onClick={() => onEditEntry(plan.id)} className="gap-3 py-2.5 cursor-pointer">
                      <Edit2 className="h-4 w-4 text-slate-500" /> 
                      <span className="font-medium">Edit Plan</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDeleteConfirmId(plan.id)} className="gap-3 py-2.5 text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer">
                      <Trash2 className="h-4 w-4" /> 
                      <span className="font-medium">Delete Plan</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="p-6 flex-1 flex flex-col">
                <div className="space-y-4 text-sm text-slate-600 flex-1">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lesson No</p>
                      <div className="flex items-center gap-2 text-slate-900 font-semibold">
                        <BookOpen className="h-4 w-4 text-slate-400" />
                        <span>{plan.lessonNo}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Duration</p>
                      <div className="flex items-center gap-2 text-slate-900 font-semibold">
                        <Clock className="h-4 w-4 text-slate-400" />
                        <span>{plan.time} Min</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Planned Date</p>
                    <div className="flex items-center gap-2 text-slate-900 font-semibold">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <span>{plan.plannedDate || 'Not set'}</span>
                    </div>
                  </div>
                </div>
                <div className="pt-6 mt-6 border-t border-slate-100 flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Created</span>
                    <span className="text-xs font-semibold text-slate-600">
                      {safeFormatDate(plan.createdAt, 'MMM d, yyyy')}
                    </span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onEditEntry(plan.id)} 
                    className="text-slate-900 hover:bg-slate-100 text-xs font-bold h-9 px-4 rounded-lg border border-slate-200"
                  >
                    VIEW DETAILS
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-32 bg-white rounded-3xl border-2 border-dashed border-slate-200 px-6 text-center">
          <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-6">
            <Presentation className="h-10 w-10" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900">No demonstration plans found</h3>
          <p className="text-slate-500 mb-8 max-w-sm">Your technical demonstration plan register is empty. Start by creating your first plan using our AI-powered tool.</p>
          <Button onClick={onNewEntry} className="gap-2 bg-slate-900 hover:bg-slate-800 h-12 px-8 rounded-xl shadow-lg">
            <Plus className="h-5 w-5" /> Create Your First Plan
          </Button>
        </div>
      )}

      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Demonstration Plan?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete this demonstration plan record.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setDeleteConfirmId(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting} className="gap-2">
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
