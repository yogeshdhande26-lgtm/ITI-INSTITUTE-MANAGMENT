import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

interface InstructorPermissionsProps {
  instructor: any;
  onClose: () => void;
}

const ALL_FEATURES = [
  { id: 'lesson-plan', label: 'Lesson Plan' },
  { id: 'demo-plan', label: 'Demo Plan' },
  { id: 'monthly-plan', label: 'Monthly Plan' },
  { id: 'yearly-plan', label: 'Yearly Plan' },
  { id: 'monthly-assess', label: 'Monthly Assess' },
  { id: 'internal-assess', label: 'Internal Assess' },
  { id: 'exam-form', label: 'Exam Form' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'custom-forms', label: 'Form Builder Pro' },
  { id: 'form-templates', label: 'Template Library' },
  { id: 'form-analytics', label: 'Form Analytics' },
  { id: 'reports', label: 'All Report Generation' },
];

export const InstructorPermissions: React.FC<InstructorPermissionsProps> = ({ instructor, onClose }) => {
  const [enabledFeatures, setEnabledFeatures] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchPermissions = async () => {
      if (!instructor.uid) {
        setLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', instructor.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          // If enabledFeatures is not set, default to all features enabled
          setEnabledFeatures(data.enabledFeatures || ALL_FEATURES.map(f => f.id));
        } else {
          setEnabledFeatures(ALL_FEATURES.map(f => f.id));
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${instructor.uid}`);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [instructor.uid]);

  const handleToggle = (featureId: string) => {
    setEnabledFeatures(prev => 
      prev.includes(featureId) 
        ? prev.filter(id => id !== featureId) 
        : [...prev, featureId]
    );
  };

  const handleSave = async () => {
    if (!instructor.uid) {
      toast.error('Instructor must have a linked login account to manage permissions.');
      return;
    }

    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', instructor.uid), {
        enabledFeatures: enabledFeatures
      });
      toast.success('Permissions updated successfully');
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${instructor.uid}`);
    } finally {
      setSaving(false);
    }
  };

  if (!instructor.uid) {
    return (
      <div className="p-6 text-center space-y-4">
        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
          <p className="text-amber-800 text-sm">
            This instructor does not have a linked login account yet. 
            Please sync their account first to manage permissions.
          </p>
        </div>
        <Button onClick={onClose} variant="outline" className="w-full rounded-xl">Close</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-1">
      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          ALL_FEATURES.map(feature => (
            <div key={feature.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-slate-100/50 transition-colors">
              <Label htmlFor={feature.id} className="font-bold text-slate-700 cursor-pointer flex-1 py-1">
                {feature.label}
              </Label>
              <Switch 
                id={feature.id} 
                checked={enabledFeatures.includes(feature.id)}
                onCheckedChange={() => handleToggle(feature.id)}
              />
            </div>
          ))
        )}
      </div>

      <div className="flex gap-3 pt-6 border-t border-slate-100">
        <Button variant="ghost" onClick={onClose} className="flex-1 rounded-xl h-12">Cancel</Button>
        <Button onClick={handleSave} disabled={saving || loading} className="flex-1 rounded-xl h-12 gap-2 shadow-lg">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          Save Permissions
        </Button>
      </div>
    </div>
  );
};
