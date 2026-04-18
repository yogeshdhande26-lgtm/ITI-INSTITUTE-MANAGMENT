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
  Calendar,
  GraduationCap,
  Loader2,
  FileText,
  BookOpen,
  FileSpreadsheet,
  TrendingUp,
  BarChart3
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
import * as XLSX from 'xlsx';

interface YearlyPlanListProps {
  onNewEntry: () => void;
  onEditEntry: (planId: string) => void;
}

export const YearlyPlanList: React.FC<YearlyPlanListProps> = ({ onNewEntry, onEditEntry }) => {
  const { user, isAdmin } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;

    let q = query(
      collection(db, 'yearly_plans'),
      orderBy('createdAt', 'desc')
    );

    if (!isAdmin) {
      q = query(
        collection(db, 'yearly_plans'),
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
      handleFirestoreError(error, OperationType.LIST, 'yearly_plans');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, isAdmin]);

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    setIsDeleting(true);
    
    try {
      await deleteDoc(doc(db, 'yearly_plans', deleteConfirmId));
      toast.success('Yearly plan deleted successfully');
      setDeleteConfirmId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `yearly_plans/${deleteConfirmId}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const exportConsolidatedExcel = () => {
    const data = [
      ["Trade-wise Yearly Register (Consolidated)"],
      [],
      ["Year", "Trade", "Instructor", "Total Lessons", "Institute"],
      ...plans.map(p => [
        p.year,
        p.trade,
        p.instructorName,
        p.yearTotal,
        p.institute
      ])
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Yearly Register");
    XLSX.writeFile(wb, "Trade_Wise_Yearly_Register.xlsx");
    toast.success('Consolidated register exported to Excel');
  };

  const filteredPlans = plans.filter(p => 
    p.trade.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.year.toString().includes(searchTerm) ||
    p.instructorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.institute.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 text-marathi">वार्षिक नियोजन रजिस्टर</h2>
          <p className="text-slate-500 mt-2 font-medium">Yearly Academic Planning & Progress Tracking.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={exportConsolidatedExcel} className="gap-2 border-orange-200 text-orange-700 hover:bg-orange-50 h-12 px-6 rounded-xl">
            <FileSpreadsheet className="h-5 w-5" /> Export Consolidated
          </Button>
          <Button onClick={onNewEntry} className="gap-2 bg-slate-900 hover:bg-slate-800 shadow-lg h-12 px-6 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]">
            <Plus className="h-5 w-5" /> New Yearly Plan
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-900 text-white border-none shadow-xl rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Yearly Plans</p>
                <p className="text-3xl font-black">{plans.length}</p>
              </div>
              <div className="h-12 w-12 bg-white/10 rounded-xl flex items-center justify-center">
                <FileText className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-600 text-white border-none shadow-xl rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-emerald-200 uppercase tracking-widest mb-1">Avg Lessons/Year</p>
                <p className="text-3xl font-black">
                  {plans.length > 0 ? Math.round(plans.reduce((acc, p) => acc + (p.yearTotal || 0), 0) / plans.length) : 0}
                </p>
              </div>
              <div className="h-12 w-12 bg-white/10 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-lg rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Active Year</p>
                <p className="text-3xl font-black text-slate-900">{new Date().getFullYear()}</p>
              </div>
              <div className="h-12 w-12 bg-slate-50 rounded-xl flex items-center justify-center">
                <Calendar className="h-6 w-6 text-slate-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
        <input 
          type="text"
          placeholder="Search by trade, year, instructor or institute..."
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 outline-none transition-all shadow-sm text-lg"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
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
                  <CardTitle className="text-xl font-bold line-clamp-1 text-slate-900">Yearly Plan {plan.year}</CardTitle>
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
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Instructor</p>
                    <div className="flex items-center gap-2 text-slate-900 font-semibold">
                      <GraduationCap className="h-4 w-4 text-slate-400" />
                      <span className="truncate">{plan.instructorName}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Institute</p>
                    <div className="flex items-center gap-2 text-slate-900 font-semibold">
                      <BookOpen className="h-4 w-4 text-slate-400" />
                      <span className="truncate">{plan.institute}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Lessons</span>
                      <span className="text-2xl font-black text-slate-900">{plan.yearTotal || 0}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Holidays</span>
                      <span className="text-2xl font-black text-slate-900">{plan.holidays?.length || 0}</span>
                    </div>
                  </div>
                </div>
                <div className="pt-6 mt-6 border-t border-slate-100">
                  <Button 
                    variant="ghost" 
                    className="w-full text-slate-900 hover:bg-slate-100 text-xs font-bold h-10 rounded-lg border border-slate-200"
                    onClick={() => onEditEntry(plan.id)}
                  >
                    VIEW YEARLY PLAN
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-32 bg-white rounded-3xl border-2 border-dashed border-slate-200 px-6 text-center">
          <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-6">
            <Calendar className="h-10 w-10" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900">No yearly plans found</h3>
          <p className="text-slate-500 mb-8 max-w-sm">Start organizing your academic year by creating your first yearly plan record.</p>
          <Button onClick={onNewEntry} className="gap-2 bg-slate-900 hover:bg-slate-800 h-12 px-8 rounded-xl shadow-lg">
            <Plus className="h-5 w-5" /> Create First Plan
          </Button>
        </div>
      )}

      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Yearly Plan?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete this yearly plan record.
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
