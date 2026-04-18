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
  ClipboardList,
  Paperclip,
  Settings2
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

interface AttendanceListProps {
  onNewEntry: () => void;
  onEditEntry: (recordId: string) => void;
}

export const AttendanceList: React.FC<AttendanceListProps> = ({ onNewEntry, onEditEntry }) => {
  const { user } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'practical_records'),
      where('instructorId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const recordData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRecords(recordData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'practical_records');
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
    const path = `practical_records/${deleteConfirmId}`;
    
    try {
      await deleteDoc(doc(db, 'practical_records', deleteConfirmId));
      toast.success('Record deleted successfully');
      setDeleteConfirmId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredRecords = records.filter(record => 
    record.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.practicalNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.module.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px]">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-muted-foreground">Loading records...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Practical Records (Attendance)</h2>
          <p className="text-muted-foreground">Manage student practical record sheets and attendance.</p>
        </div>
        <Button onClick={onNewEntry} className="shadow-sm gap-2 bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4" /> New Entry
        </Button>
      </div>

      <div className="flex items-center gap-2 bg-white p-2 rounded-lg border shadow-sm">
        <Search className="h-4 w-4 text-slate-400 ml-2" />
        <input 
          type="text" 
          placeholder="Search by title, practical no, or module..." 
          className="flex-1 bg-transparent border-none outline-none text-sm p-2"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredRecords.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 h-[400px] flex flex-col items-center justify-center text-center p-8">
          <div className="bg-slate-50 p-4 rounded-full mb-4">
            <ClipboardList className="h-10 w-10 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">No Records Found</h3>
          <p className="text-slate-500 max-w-xs mt-2">
            {searchTerm ? "No records match your search criteria." : "You haven't added any practical records yet. Click the 'New Entry' button to get started."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecords.map((record) => (
            <div key={record.id} className="bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col group">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-blue-50 p-2.5 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), "h-8 w-8")}>
                    <MoreVertical className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEditEntry(record.id)} className="gap-2">
                      <Edit2 className="h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDelete(record.id)} className="gap-2 text-red-600 focus:text-red-600">
                      <Trash2 className="h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-1 mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">
                    {record.practicalNo}
                  </Badge>
                  <span className="text-[10px] text-slate-400">{record.date || 'No Date'}</span>
                </div>
                <h3 className="font-bold text-lg text-slate-900 line-clamp-2 leading-tight h-12">{record.title}</h3>
                <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-2">
                  <Calendar className="h-3 w-3" /> {record.module}
                </p>

                <div className="flex items-center gap-3 mt-3">
                  {record.customFields?.length > 0 && (
                    <div className="flex items-center gap-1 text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-medium">
                      <Settings2 className="h-3 w-3" /> {record.customFields.length} Custom
                    </div>
                  )}
                  {record.attachments?.length > 0 && (
                    <div className="flex items-center gap-1 text-[10px] bg-blue-50 px-1.5 py-0.5 rounded text-blue-600 font-medium">
                      <Paperclip className="h-3 w-3" /> {record.attachments.length} Files
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-auto pt-4 border-t flex justify-between items-center">
                <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-100 text-[10px]">
                  {record.procedure?.length || 0} Steps
                </Badge>
                <span className="text-[10px] text-slate-400">
                  {safeFormatDate(record.createdAt, 'MMM d, yyyy')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Record</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this practical record? This action cannot be undone.
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
