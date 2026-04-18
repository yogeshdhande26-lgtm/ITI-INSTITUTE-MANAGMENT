import React, { useState, useEffect } from 'react';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { db, handleFirestoreError, OperationType, config } from '../lib/firebase';
import { collection, addDoc, updateDoc, doc, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { FormBuilder, CustomField } from './FormBuilder';
import { AttachmentBuilder, Attachment } from './AttachmentBuilder';

interface InstructorFormProps {
  instructor?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export const InstructorForm: React.FC<InstructorFormProps> = ({ instructor, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    trade: '',
    qualification: '',
    experience: '',
    phone: '',
    joiningDate: '',
    status: 'Active',
    loginId: '',
    password: '',
    customFields: [] as CustomField[],
    attachments: [] as Attachment[],
  });

  useEffect(() => {
    if (instructor) {
      setFormData({
        name: instructor.name || '',
        email: instructor.email || '',
        trade: instructor.trade || '',
        qualification: instructor.qualification || '',
        experience: instructor.experience || '',
        phone: instructor.phone || '',
        joiningDate: instructor.joiningDate || '',
        status: instructor.status || 'Active',
        loginId: instructor.loginId || '',
        password: instructor.password || '',
        customFields: instructor.customFields || [],
        attachments: instructor.attachments || [],
      });
    }
  }, [instructor]);

  const ensureAuthUser = async (email: string, pass: string) => {
    if (!pass || pass.length < 6) return;
    
    // Create a secondary app to avoid signing out the current admin
    const tempAppName = `temp-app-${Date.now()}`;
    const tempApp = initializeApp(config, tempAppName);
    const tempAuth = getAuth(tempApp);
    
    try {
      await createUserWithEmailAndPassword(tempAuth, email, pass);
      console.log('Auth user created successfully for:', email);
    } catch (err: any) {
      // If user already exists, that's fine
      if (err.code !== 'auth/email-already-in-use') {
        console.error('Error creating auth user:', err);
      }
    } finally {
      await deleteApp(tempApp);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password && formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      // 1. Ensure Auth user exists if password is provided
      if (formData.password) {
        await ensureAuthUser(formData.email, formData.password);
      }

      // 2. Save to Firestore
      if (instructor) {
        await updateDoc(doc(db, 'instructors', instructor.id), formData);
        
        if (formData.loginId) {
          await setDoc(doc(db, 'login_mappings', formData.loginId), {
            email: formData.email,
            instructorId: instructor.id
          });
        }
        
        toast.success('Instructor updated successfully');
      } else {
        const docRef = await addDoc(collection(db, 'instructors'), {
          ...formData,
          createdAt: new Date().toISOString(),
        });

        if (formData.loginId) {
          await setDoc(doc(db, 'login_mappings', formData.loginId), {
            email: formData.email,
            instructorId: docRef.id
          });
        }

        toast.success('Instructor added successfully');
      }
      onSuccess();
    } catch (error) {
      handleFirestoreError(error, instructor ? OperationType.UPDATE : OperationType.CREATE, 'instructors');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name *</Label>
          <Input 
            id="name" 
            required 
            value={formData.name} 
            onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input 
            id="email" 
            type="email" 
            required 
            value={formData.email} 
            onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="trade">Trade/Department *</Label>
          <Select 
            value={formData.trade} 
            onValueChange={(value) => setFormData({ ...formData, trade: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Trade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Electrician">Electrician</SelectItem>
              <SelectItem value="Fitter">Fitter</SelectItem>
              <SelectItem value="Welder">Welder</SelectItem>
              <SelectItem value="COPA">COPA</SelectItem>
              <SelectItem value="Mechanic Diesel">Mechanic Diesel</SelectItem>
              <SelectItem value="Wireman">Wireman</SelectItem>
              <SelectItem value="Draughtsman Civil">Draughtsman Civil</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status *</Label>
          <Select 
            value={formData.status} 
            onValueChange={(value) => setFormData({ ...formData, status: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="qualification">Qualification</Label>
          <Input 
            id="qualification" 
            value={formData.qualification} 
            onChange={(e) => setFormData({ ...formData, qualification: e.target.value })} 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="experience">Experience (Years)</Label>
          <Input 
            id="experience" 
            value={formData.experience} 
            onChange={(e) => setFormData({ ...formData, experience: e.target.value })} 
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input 
            id="phone" 
            value={formData.phone} 
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="joiningDate">Joining Date</Label>
          <Input 
            id="joiningDate" 
            type="date" 
            value={formData.joiningDate} 
            onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })} 
          />
        </div>
      </div>

      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
        <h3 className="text-sm font-semibold text-slate-700">Login Credentials</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="loginId">Login ID (Email or Username)</Label>
            <Input 
              id="loginId" 
              placeholder="e.g. inst_001"
              value={formData.loginId} 
              onChange={(e) => setFormData({ ...formData, loginId: e.target.value })} 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input 
                id="password" 
                type={showPassword ? "text" : "password"}
                placeholder="Set login password"
                value={formData.password} 
                onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4 text-slate-400" /> : <Eye className="h-4 w-4 text-slate-400" />}
              </Button>
            </div>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground italic">
          Note: These credentials will be used by the instructor to log in to their dashboard.
        </p>
      </div>

      <div className="space-y-6 pt-4 border-t border-slate-100">
        <FormBuilder 
          fields={formData.customFields} 
          onChange={(fields) => setFormData({ ...formData, customFields: fields })}
        />
        <AttachmentBuilder 
          attachments={formData.attachments} 
          onChange={(attachments) => setFormData({ ...formData, attachments: attachments })}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : instructor ? 'Update Instructor' : 'Add Instructor'}
        </Button>
      </div>
    </form>
  );
};
