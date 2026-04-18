import React from 'react';
import { AdvancedForm } from './types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Shield, FileDown, Lock, Layers } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface FormSettingsProps {
  form: AdvancedForm;
  onChange: (form: AdvancedForm) => void;
}

const AVAILABLE_ROLES = ['admin', 'instructor', 'student', 'guest'];

export const FormSettings: React.FC<FormSettingsProps> = ({ form, onChange }) => {
  const updateSettings = (updates: Partial<AdvancedForm['settings']>) => {
    onChange({
      ...form,
      settings: { ...form.settings, ...updates }
    });
  };

  const toggleRole = (role: string) => {
    const current = form.settings.allowedRoles || [];
    if (current.includes(role)) {
      updateSettings({ allowedRoles: current.filter(r => r !== role) });
    } else {
      updateSettings({ allowedRoles: [...current, role] });
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
      {/* PDF Settings */}
      <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
        <CardHeader className="bg-slate-900 text-white p-6">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <FileDown className="h-5 w-5 text-primary" />
            PDF & Export Branding
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 space-y-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">PDF Export Title</Label>
            <Input 
              placeholder="e.g., OFFICIAL INVENTORY REPORT" 
              value={form.settings.pdfTitle || ''}
              onChange={(e) => updateSettings({ pdfTitle: e.target.value })}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Header Text (centered)</Label>
            <textarea 
              placeholder="e.g., Government of Maharashtra, ITI Mumbai"
              className="w-full min-h-[80px] p-4 rounded-2xl border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              value={form.settings.pdfHeader || ''}
              onChange={(e) => updateSettings({ pdfHeader: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Footer / Disclaimer Text</Label>
            <textarea 
              placeholder="e.g., This is a computer generated document."
              className="w-full min-h-[80px] p-4 rounded-2xl border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              value={form.settings.pdfFooter || ''}
              onChange={(e) => updateSettings({ pdfFooter: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Custom Submit Button Label</Label>
            <Input 
              placeholder="e.g., Save Inventory" 
              value={form.settings.submitLabel || ''}
              onChange={(e) => updateSettings({ submitLabel: e.target.value })}
              className="rounded-xl"
            />
          </div>

          <div className="pt-6 border-t border-slate-100">
             <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 transition-all hover:bg-slate-100/50 cursor-pointer" onClick={() => updateSettings({ multiStep: !form.settings.multiStep })}>
               <div className="flex items-center gap-3">
                 <div className="bg-white p-2.5 rounded-xl shadow-sm">
                   <Layers className="h-5 w-5 text-primary" />
                 </div>
                 <div>
                   <p className="text-sm font-bold text-slate-800">Multi-Step Form Mode</p>
                   <p className="text-[10px] text-slate-500 font-medium leading-tight">Break form into steps based on sections.</p>
                 </div>
               </div>
               <Switch 
                 checked={form.settings.multiStep} 
                 onCheckedChange={(checked) => updateSettings({ multiStep: checked })}
               />
             </div>
          </div>
        </CardContent>
      </Card>

      {/* Permissions Settings */}
      <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
        <CardHeader className="bg-primary text-white p-6">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Shield className="h-5 w-5 text-white/70" />
            Role Access Permissions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 space-y-8">
          <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-start gap-4">
            <Lock className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-blue-900">Who can submit this form?</p>
              <p className="text-xs text-blue-700/70 mt-1">Check the roles that should have access to fill and submit this register. Admins always have access.</p>
            </div>
          </div>

          <div className="space-y-4">
            {AVAILABLE_ROLES.map(role => (
              <div key={role} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-primary/20 transition-all cursor-pointer group" onClick={() => toggleRole(role)}>
                <div className="flex items-center gap-3">
                  <Checkbox 
                    checked={form.settings.allowedRoles?.includes(role) || role === 'admin'} 
                    disabled={role === 'admin'}
                    onCheckedChange={() => toggleRole(role)}
                  />
                  <div>
                    <p className="font-bold text-slate-700 capitalize">{role}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">
                      {role === 'admin' ? 'Master Access' : `Standard ${role} access`}
                    </p>
                  </div>
                </div>
                {form.settings.allowedRoles?.includes(role) && (
                   <Badge className="bg-emerald-50 text-emerald-600 border-none px-3">Enabled</Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
