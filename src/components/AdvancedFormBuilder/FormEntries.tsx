import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { AdvancedForm, AdvancedFormEntry } from './types';
import { useAuth } from '../AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, FileDown, Search, Filter, Loader2, User, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { safeFormatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface FormEntriesProps {
  form: AdvancedForm;
  onBack: () => void;
}

export const FormEntries: React.FC<FormEntriesProps> = ({ form, onBack }) => {
  const { user, isAdmin } = useAuth();
  const [entries, setEntries] = useState<AdvancedFormEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user) return;

    let q = query(
      collection(db, 'advanced_form_entries'),
      where('formId', '==', form.id),
      orderBy('createdAt', 'desc')
    );

    // If not admin, we must explicitly filter by instructorId to satisfy security rules for list
    if (!isAdmin) {
      q = query(
        collection(db, 'advanced_form_entries'),
        where('formId', '==', form.id),
        where('instructorId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
    }

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as AdvancedFormEntry[];
      setEntries(data);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'advanced_form_entries');
      setLoading(false);
    });

    return () => unsub();
  }, [form.id, user, isAdmin]);

  const deleteEntry = async (id: string) => {
    if (!id) {
      console.error('Cannot delete entry: missing ID');
      return;
    }
    try {
      await deleteDoc(doc(db, 'advanced_form_entries', id));
      toast.success('Entry deleted');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `advanced_form_entries/${id}`);
    }
  };

  // Flatten all fields from the structure to use as columns
  const allFields = form.structure.flatMap(s => s.columns.flatMap(c => c.fields));

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h3 className="text-3xl font-black text-slate-900 tracking-tight">{form.name} Submissions</h3>
          <p className="text-slate-500 font-medium mt-1">Found {entries.length} technical register entries.</p>
        </div>
      </div>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
        <input 
          type="text"
          placeholder="Search through submissions..."
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 outline-none transition-all shadow-sm text-lg"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
        </div>
      ) : (
        <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-900 text-white uppercase text-[10px] font-black tracking-[0.15em]">
                <tr>
                  <th className="px-6 py-5">Date & Submitter</th>
                  {allFields.slice(0, 3).map(f => (
                    <th key={f.id} className="px-6 py-5 whitespace-nowrap">{f.label}</th>
                  ))}
                  <th className="px-6 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="bg-slate-100 p-2 rounded-lg">
                          <User className="h-4 w-4 text-slate-400" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{entry.submittedBy.name}</p>
                          <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {safeFormatDate(entry.createdAt, 'MMM d, HH:mm')}
                          </p>
                        </div>
                      </div>
                    </td>
                    {allFields.slice(0, 3).map(f => (
                      <td key={f.id} className="px-6 py-5">
                        {f.type === 'file' ? (
                          entry.data[f.id] ? (
                            <div className="h-10 w-10 rounded-lg overflow-hidden border">
                              <img src={entry.data[f.id]} className="h-full w-full object-cover" />
                            </div>
                          ) : '-'
                        ) : (
                          <span className="font-medium text-slate-600 line-clamp-1">{entry.data[f.id] || '-'}</span>
                        )}
                      </td>
                    ))}
                    <td className="px-6 py-5 text-right flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                       <Button 
                         variant="ghost" 
                         size="icon" 
                         onClick={(e) => {
                           e.stopPropagation();
                           deleteEntry(entry.id);
                         }} 
                         className="h-9 w-9 text-slate-400 hover:text-red-500 rounded-full hover:bg-red-50"
                       >
                         <Trash2 className="h-4 w-4" />
                       </Button>
                    </td>
                  </tr>
                ))}
                {entries.length === 0 && (
                  <tr>
                    <td colSpan={allFields.length + 2} className="px-6 py-20 text-center text-slate-400 italic">
                      No submissions found yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
