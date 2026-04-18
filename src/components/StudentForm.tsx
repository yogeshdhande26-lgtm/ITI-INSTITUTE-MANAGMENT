import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, updateDoc, doc, deleteDoc, query, where, onSnapshot } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { FormBuilder, CustomField } from './FormBuilder';
import { AttachmentBuilder, Attachment } from './AttachmentBuilder';
import { useAuth } from './AuthContext';

interface StudentFormProps {
  student?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export const StudentForm: React.FC<StudentFormProps> = ({ student, onSuccess, onCancel }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    rollNo: '',
    trade: '',
    admissionDate: '',
    phone: '',
    email: '',
    password: '',
    customFields: [] as CustomField[],
    attachments: [] as Attachment[],
  });

  useEffect(() => {
    if (student) {
      setFormData({
        name: student.name || '',
        rollNo: student.rollNo || '',
        trade: student.trade || '',
        admissionDate: student.admissionDate || '',
        phone: student.phone || '',
        email: student.email || '',
        password: student.password || '',
        customFields: student.customFields || [],
        attachments: student.attachments || [],
      });
    }
  }, [student]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const studentData = {
        ...formData,
        role: 'student',
        instructorId: user?.uid,
        updatedAt: new Date().toISOString(),
      };

      if (student) {
        await updateDoc(doc(db, 'students', student.id), studentData);
        toast.success('Student updated successfully');
      } else {
        await addDoc(collection(db, 'students'), {
          ...studentData,
          createdAt: new Date().toISOString(),
        });
        toast.success('Student added successfully');
      }
      onSuccess();
    } catch (error) {
      handleFirestoreError(error, student ? OperationType.UPDATE : OperationType.CREATE, 'students');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4 max-h-[80vh] overflow-y-auto px-1">
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
          <Label htmlFor="rollNo">Roll Number *</Label>
          <Input 
            id="rollNo" 
            required 
            value={formData.rollNo} 
            onChange={(e) => setFormData({ ...formData, rollNo: e.target.value })} 
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="trade">Trade *</Label>
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
          <Label htmlFor="admissionDate">Admission Date</Label>
          <Input 
            id="admissionDate" 
            type="date" 
            value={formData.admissionDate} 
            onChange={(e) => setFormData({ ...formData, admissionDate: e.target.value })} 
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
          <Label htmlFor="email">Email</Label>
          <Input 
            id="email" 
            type="email" 
            value={formData.email} 
            onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Login Password</Label>
          <Input 
            id="password" 
            type="password" 
            value={formData.password} 
            onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
            placeholder="Min 6 characters"
          />
        </div>
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
          {loading ? 'Saving...' : student ? 'Update Student' : 'Add Student'}
        </Button>
      </div>
    </form>
  );
};
