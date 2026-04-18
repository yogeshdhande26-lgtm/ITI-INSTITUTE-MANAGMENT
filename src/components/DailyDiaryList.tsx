import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { Button, buttonVariants } from '@/components/ui/button';
import { 
  Plus, 
  FileText, 
  Calendar, 
  Trash2, 
  Edit2, 
  MoreVertical,
  Search,
  BookOpen
} from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { cn, safeFormatDate } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DailyDiaryListProps {
  onNewEntry: () => void;
  onEditEntry: (diaryId: string) => void;
}

export const DailyDiaryList: React.FC<DailyDiaryListProps> = ({ onNewEntry, onEditEntry }) => {
  const { user } = useAuth();
  const [diaries, setDiaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'daily_diaries'),
      where('instructorId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const diaryData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setDiaries(diaryData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'daily_diaries');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    setIsDeleting(true);
    
    try {
      await deleteDoc(doc(db, 'daily_diaries', deleteConfirmId));
      toast.success('Diary entry deleted successfully');
      setDeleteConfirmId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `daily_diaries/${deleteConfirmId}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredDiaries = diaries.filter(diary => 
    diary.month.toLowerCase().includes(searchTerm.toLowerCase()) ||
    diary.weekNo.toString().includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px]">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-muted-foreground">Loading your diaries...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Daily Diary</h2>
          <p className="text-muted-foreground">Manage and track your daily academic activities.</p>
        </div>
        <Button onClick={onNewEntry} className="shadow-sm gap-2">
          <Plus className="h-4 w-4" /> New Entry
        </Button>
      </div>

      <div className="flex items-center gap-2 bg-white p-2 rounded-lg border shadow-sm">
        <Search className="h-4 w-4 text-slate-400 ml-2" />
        <input 
          type="text" 
          placeholder="Search by month or week..." 
          className="flex-1 bg-transparent border-none outline-none text-sm p-2"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredDiaries.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 h-[400px] flex flex-col items-center justify-center text-center p-8">
          <div className="bg-slate-50 p-4 rounded-full mb-4">
            <BookOpen className="h-10 w-10 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">No Diaries Found</h3>
          <p className="text-slate-500 max-w-xs mt-2">
            {searchTerm ? "No diaries match your search criteria." : "You haven't added any daily diary entries yet. Click the 'New Entry' button to get started."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDiaries.map((diary) => (
            <div key={diary.id} className="bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col group">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-primary/10 p-2.5 rounded-lg">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), "h-8 w-8")}>
                    <MoreVertical className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEditEntry(diary.id)} className="gap-2">
                      <Edit2 className="h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDelete(diary.id)} className="gap-2 text-red-600 focus:text-red-600">
                      <Trash2 className="h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-1 mb-4">
                <h3 className="font-bold text-lg text-slate-900">{diary.month}</h3>
                <p className="text-sm text-slate-500 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Week {diary.weekNo}
                </p>
              </div>

              <div className="mt-auto pt-4 border-t flex justify-between items-center">
                <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-100">
                  {diary.entries?.filter((e: any) => e.date).length || 0} Entries
                </Badge>
                <span className="text-[10px] text-slate-400">
                  Saved {safeFormatDate(diary.createdAt, 'MMM d, yyyy')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Diary Entry</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this diary entry? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
