import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, orderBy, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../AuthContext';
import { AdvancedForm, AdvancedFormEntry } from './types';
import { FormDesigner } from './FormDesigner';
import { FormRenderer } from './FormRenderer';
import { FormSettings } from './FormSettings';
import { FormEntries } from './FormEntries';
import { FormTemplates } from './FormTemplates';
import { FormAnalytics } from './FormAnalytics';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Plus, 
  Settings2, 
  Trash2, 
  Edit2, 
  FileText, 
  Layout, 
  ChevronRight, 
  ArrowLeft, 
  Save, 
  Loader2, 
  Eye, 
  ListOrdered,
  Sparkles,
  ClipboardList
} from 'lucide-react';
import { toast } from 'sonner';
import { cn, safeFormatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface FormManagerProps {
  initialFormId?: string;
  defaultView?: 'list' | 'design' | 'fill' | 'entries' | 'templates' | 'analytics';
}

export const FormManager: React.FC<FormManagerProps> = ({ initialFormId, defaultView }) => {
  const { user, isAdmin } = useAuth();
  const [forms, setForms] = useState<AdvancedForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'design' | 'fill' | 'entries' | 'templates' | 'analytics'>(defaultView || (initialFormId ? 'fill' : 'list'));
  const [activeTab, setActiveTabInternal] = useState<'build' | 'settings'>('build');
  const [activeForm, setActiveForm] = useState<AdvancedForm | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) return;

    let q = query(
      collection(db, 'advanced_forms'),
      orderBy('createdAt', 'desc')
    );

    if (!isAdmin) {
      q = query(
        collection(db, 'advanced_forms'),
        where('instructorId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
    }

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as AdvancedForm[];
      setForms(data);
      
      if (initialFormId && !activeForm) {
        const found = data.find(f => f.id === initialFormId);
        if (found) setActiveForm(found);
      }
      
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'advanced_forms');
      setLoading(false);
    });

    return () => unsub();
  }, [user, isAdmin]);

  const startNewForm = () => {
    const newForm: AdvancedForm = {
      id: '',
      name: 'Untitled Form',
      description: 'A custom register for tracking technical details.',
      structure: [
        {
          id: crypto.randomUUID(),
          title: 'General Information',
          columns: [{ id: crypto.randomUUID(), fields: [], width: 12 }]
        }
      ],
      settings: {
        allowedRoles: ['admin', 'instructor'],
        submitLabel: 'Save Register Entry'
      },
      instructorId: user?.uid || '',
      createdAt: null
    };
    setActiveForm(newForm);
    setView('design');
    setActiveTabInternal('build');
  };

  const saveForm = async () => {
    if (!activeForm || !user) return;
    setIsSaving(true);
    
    try {
      const { id, ...formData } = activeForm;
      const data = {
        ...formData,
        instructorId: activeForm.instructorId || user.uid,
        updatedAt: serverTimestamp()
      };
      
      if (id) {
        await updateDoc(doc(db, 'advanced_forms', id), data);
        toast.success('Form design updated Pro');
      } else {
        const docRef = await addDoc(collection(db, 'advanced_forms'), {
          ...data,
          createdAt: serverTimestamp()
        });
        setActiveForm({ ...activeForm, ...data, id: docRef.id });
        toast.success('Form created successfully');
      }
      setView('list');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'advanced_forms');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteForm = async (id: string) => {
    if (!id) {
      console.error('Cannot delete form: missing ID');
      return;
    }
    try {
      await deleteDoc(doc(db, 'advanced_forms', id));
      toast.success('Form deleted');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `advanced_forms/${id}`);
    }
  };

  const handleSubmitEntry = async (data: Record<string, any>) => {
    if (!activeForm || !user) return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'advanced_form_entries'), {
        formId: activeForm.id,
        instructorId: activeForm.instructorId,
        data,
        submittedBy: {
           uid: user.uid,
           name: user.displayName || 'Anonymous',
           role: isAdmin ? 'admin' : 'instructor' 
        },
        createdAt: serverTimestamp()
      });
      toast.success('Entry saved successfully');
      setView('list');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'advanced_form_entries');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
        <p className="mt-4 text-slate-500 font-medium">Loading Form Builder Pro...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 -m-8 p-8">
      {/* View Header */}
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            {view !== 'list' && (
              <Button variant="ghost" size="icon" onClick={() => setView('list')} className="rounded-full bg-white shadow-sm border">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <div>
              <h2 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                {view === 'list' && "Form Builder Pro"}
                {view === 'design' && "Design Studio"}
                {view === 'fill' && activeForm?.name}
                {view === 'entries' && "Submissions"}
                {view === 'templates' && "Template Library"}
                {view === 'analytics' && "Form Insights"}
                <Sparkles className="h-6 w-6 text-primary animate-pulse" />
              </h2>
              <p className="text-slate-500 font-medium mt-1">
                {view === 'list' && "Advanced Drag & Drop Form Builder with Logic & PDF Export."}
                {view === 'design' && "Architect your custom data registers with multi-column layouts."}
                {view === 'fill' && "Fill out the custom form register."}
                {view === 'entries' && `Viewing all entries for ${activeForm?.name}.`}
                {view === 'templates' && "Choose from high-performance pre-built form architectures."}
                {view === 'analytics' && "Deep dive into your register data and submission patterns."}
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            {view === 'list' && (
              <Button onClick={startNewForm} className="h-12 px-8 rounded-xl bg-slate-900 hover:bg-slate-800 shadow-xl gap-2 font-bold transition-all hover:scale-[1.02]">
                <Plus className="h-5 w-5" /> New Form Pro
              </Button>
            )}
            {view === 'design' && (
              <>
                 <Button variant="outline" className="h-12 px-6 rounded-xl border-slate-200" onClick={() => setView('list')}>Discard</Button>
                 <Button onClick={saveForm} disabled={isSaving} className="h-12 px-8 rounded-xl bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 gap-2 font-bold">
                    {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                    Save Design Pro
                 </Button>
              </>
            )}
            {view === 'entries' && (
              <Button onClick={() => setView('fill')} className="h-12 px-8 rounded-xl bg-slate-900 hover:bg-slate-800 shadow-xl gap-2 font-bold">
                <Plus className="h-5 w-5" /> Add Submission
              </Button>
            )}
          </div>
        </div>

        {view === 'list' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {forms.map(form => (
              <Card key={form.id} className="border-none shadow-sm hover:shadow-xl transition-all duration-300 rounded-[2rem] overflow-hidden bg-white group hover:-translate-y-1">
                <div className="p-8 h-full flex flex-col">
                  <div className="flex justify-between items-start mb-6">
                    <div className="bg-slate-100 p-4 rounded-2xl group-hover:bg-primary/10 transition-colors">
                      <Layout className="h-6 w-6 text-slate-400 group-hover:text-primary transition-colors" />
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={() => { setActiveForm(form); setView('design'); }} title="Edit Design" className="h-8 w-8 text-slate-400 hover:text-primary rounded-full">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { setActiveForm(form); setView('entries'); }} title="View Submissions" className="h-8 w-8 text-slate-400 hover:text-blue-500 rounded-full">
                        <ListOrdered className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteForm(form.id);
                        }} 
                        title="Delete Form" 
                        className="h-8 w-8 text-slate-400 hover:text-red-500 rounded-full"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 flex-grow">
                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-primary transition-colors line-clamp-1">{form.name}</h3>
                    <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">{form.description}</p>
                  </div>

                  <div className="mt-8 pt-6 border-t border-slate-50 flex flex-col gap-3">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      <span>{form.structure.reduce((acc, s) => acc + s.columns.reduce((acc2, c) => acc2 + c.fields.length, 0), 0)} Fields</span>
                      <span>{safeFormatDate(form.createdAt, 'MMM d, yyyy')}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost"
                        className="flex-1 h-11 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold gap-2"
                        onClick={() => { setActiveForm(form); setView('entries'); }}
                      >
                        <Eye className="h-4 w-4" /> Results
                      </Button>
                      <Button 
                        className="flex-2 h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold gap-2 px-6"
                        onClick={() => { setActiveForm(form); setView('fill'); }}
                      >
                        <Plus className="h-4 w-4" /> Add Submission
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}

            {forms.length === 0 && (
              <div className="col-span-full py-32 flex flex-col items-center justify-center text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 shadow-inner">
                <div className="bg-slate-50 p-6 rounded-full mb-6">
                  <ClipboardList className="h-12 w-12 text-slate-300" />
                </div>
                <h3 className="text-2xl font-black text-slate-900">No Professional Forms Yet</h3>
                <p className="text-slate-500 max-w-sm mt-2 mb-8 text-lg">Create advanced custom registers with conditional logic and PDF branding.</p>
                <Button onClick={startNewForm} size="lg" className="rounded-2xl h-14 px-10 font-bold shadow-xl shadow-slate-900/10">
                  <Plus className="h-6 w-6 mr-2" /> Start Building Pro
                </Button>
              </div>
            )}
          </div>
        )}

        {view === 'design' && activeForm && (
          <div className="space-y-8">
            <Card className="border-none shadow-sm rounded-3xl p-8 bg-white">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Form Pro Name</Label>
                    <Input 
                      value={activeForm.name} 
                      onChange={(e) => setActiveForm({...activeForm, name: e.target.value})}
                      placeholder="e.g., Workshop Machine Maintenance"
                      className="text-xl font-bold h-14 rounded-2xl border-slate-200 focus:ring-primary/20"
                    />
                 </div>
                 <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Short Description</Label>
                    <Input 
                      value={activeForm.description || ''} 
                      onChange={(e) => setActiveForm({...activeForm, description: e.target.value})}
                      placeholder="e.g., Track maintenance and repair history of workshop tools."
                      className="h-14 rounded-2xl border-slate-200 focus:ring-primary/20"
                    />
                 </div>
               </div>
            </Card>

            <div className="flex gap-2 p-1.5 bg-slate-200/50 rounded-2xl w-fit">
               <Button 
                 variant={activeTab === 'build' ? 'secondary' : 'ghost'}
                 onClick={() => setActiveTabInternal('build')}
                 className={cn("rounded-xl px-10 h-11 text-xs font-bold uppercase tracking-wider", activeTab === 'build' && "bg-white shadow-sm text-primary")}
               >
                 <Layout className="h-4 w-4 mr-2" /> Builder Canvas
               </Button>
               <Button 
                 variant={activeTab === 'settings' ? 'secondary' : 'ghost'}
                 onClick={() => setActiveTabInternal('settings')}
                 className={cn("rounded-xl px-10 h-11 text-xs font-bold uppercase tracking-wider", activeTab === 'settings' && "bg-white shadow-sm text-primary")}
               >
                 <Settings2 className="h-4 w-4 mr-2" /> PDF & Access
               </Button>
            </div>

            {activeTab === 'build' ? (
              <FormDesigner form={activeForm} onChange={setActiveForm} />
            ) : (
              <FormSettings form={activeForm} onChange={setActiveForm} />
            )}
          </div>
        )}

        {view === 'fill' && activeForm && (
           <FormRenderer 
             form={activeForm} 
             onSubmit={handleSubmitEntry}
             isSubmitting={isSaving}
           />
        )}

        {view === 'entries' && activeForm && (
          <FormEntries 
            form={activeForm} 
            onBack={() => setView('list')} 
          />
        )}

        {view === 'templates' && (
          <FormTemplates 
            onSelect={(tpl) => {
              setActiveForm({
                ...tpl,
                id: '',
                instructorId: user?.uid || '',
                createdAt: null
              });
              setView('design');
            }}
          />
        )}

        {view === 'analytics' && (
          <FormAnalytics forms={forms} />
        )}
      </div>
    </div>
  );
};
