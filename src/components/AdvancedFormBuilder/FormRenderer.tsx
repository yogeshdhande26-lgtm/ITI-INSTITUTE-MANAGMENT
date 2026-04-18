import React, { useState, useEffect } from 'react';
import { AdvancedForm, AdvancedFormField, AdvancedFormSection, AdvancedFormColumn, ConditionalLogic } from './types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { Save, FileDown, Loader2, ChevronRight, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Badge } from '@/components/ui/badge';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2pdf from 'html2pdf.js';
import { toast } from 'sonner';

interface FormRendererProps {
  form: AdvancedForm;
  onSubmit: (data: Record<string, any>) => Promise<void>;
  initialData?: Record<string, any>;
  isSubmitting?: boolean;
}

export const FormRenderer: React.FC<FormRendererProps> = ({ form, onSubmit, initialData = {}, isSubmitting = false }) => {
  const [formData, setFormData] = useState<Record<string, any>>(initialData);
  const [currentStep, setCurrentStep] = useState(0);
  const pdfTemplateRef = React.useRef<HTMLDivElement>(null);

  const sections = form.structure;
  const isMultiStep = form.settings.multiStep && sections.length > 1;
  const isLastStep = currentStep === sections.length - 1;

  const handleChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const nextStep = () => {
    if (currentStep < sections.length - 1) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const isVisible = (field: AdvancedFormField) => {
    if (!field.logic) return true;

    const { action, match, rules } = field.logic;
    
    const ruleResults = rules.map(rule => {
      const fieldValue = formData[rule.fieldId];
      switch (rule.operator) {
        case 'equals': return fieldValue === rule.value;
        case 'not_equals': return fieldValue !== rule.value;
        case 'contains': return String(fieldValue).includes(rule.value);
        case 'not_contains': return !String(fieldValue).includes(rule.value);
        case 'greater_than': return Number(fieldValue) > Number(rule.value);
        case 'less_than': return Number(fieldValue) < Number(rule.value);
        default: return true;
      }
    });

    const isMatch = match === 'all' 
      ? ruleResults.every(r => r) 
      : ruleResults.some(r => r);

    return action === 'show' ? isMatch : !isMatch;
  };

  const exportPDF = async () => {
    if (!pdfTemplateRef.current) return;
    
    const element = pdfTemplateRef.current;
    toast.info("Generating PDF entry...");

    const opt = {
      margin: 10,
      filename: `${form.name.replace(/\s+/g, '_')}_Entry.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
    };

    try {
      await html2pdf().set(opt).from(element).save();
      toast.success('PDF generated!');
    } catch (err) {
      console.error(err);
      toast.error('PDF generation failed.');
    }
  };

  const renderField = (field: AdvancedFormField) => {
    if (!isVisible(field)) return null;

    const commonProps = {
      id: field.id,
      onChange: (e: any) => handleChange(field.id, e.target.value),
      placeholder: field.placeholder,
      required: field.required,
      className: "rounded-xl",
    };

    return (
      <div className="space-y-2">
        <Label htmlFor={field.id} className="text-sm font-bold text-slate-700 flex items-center gap-1">
          {field.label}
          {field.required && <span className="text-red-500">*</span>}
        </Label>
        
        {field.type === 'text' && <Input type="text" value={formData[field.id] || ''} {...commonProps} />}
        {field.type === 'email' && <Input type="email" value={formData[field.id] || ''} {...commonProps} />}
        {field.type === 'number' && <Input type="number" value={formData[field.id] || ''} {...commonProps} />}
        {field.type === 'date' && <Input type="date" value={formData[field.id] || ''} {...commonProps} />}
        
        {field.type === 'textarea' && (
          <textarea 
            {...commonProps}
            value={formData[field.id] || ''}
            className="w-full min-h-[100px] p-4 rounded-2xl border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          />
        )}

        {field.type === 'select' && (
          <Select 
            value={formData[field.id] || ''} 
            onValueChange={(val) => handleChange(field.id, val)}
          >
            <SelectTrigger className="rounded-xl h-11">
              <SelectValue placeholder={field.placeholder || "Select an option..."} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map(opt => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {field.type === 'radio' && (
          <RadioGroup 
            value={formData[field.id] || ''} 
            onValueChange={(val) => handleChange(field.id, val)}
            className="flex flex-col gap-2 pt-2"
          >
            {field.options?.map(opt => (
              <div key={opt} className="flex items-center space-x-2">
                <RadioGroupItem value={opt} id={`${field.id}-${opt}`} />
                <Label htmlFor={`${field.id}-${opt}`} className="font-medium cursor-pointer">{opt}</Label>
              </div>
            ))}
          </RadioGroup>
        )}

        {field.type === 'checkbox' && (
          <div className="flex flex-col gap-2 pt-2">
            {field.options?.map(opt => (
              <div key={opt} className="flex items-center space-x-2">
                <Checkbox 
                  id={`${field.id}-${opt}`}
                  checked={(formData[field.id] || []).includes(opt)}
                  onCheckedChange={(checked) => {
                    const current = formData[field.id] || [];
                    if (checked) {
                      handleChange(field.id, [...current, opt]);
                    } else {
                      handleChange(field.id, current.filter((v: string) => v !== opt));
                    }
                  }}
                />
                <Label htmlFor={`${field.id}-${opt}`} className="font-medium cursor-pointer">{opt}</Label>
              </div>
            ))}
          </div>
        )}

        {field.type === 'file' && (
          <div className="space-y-4">
             <Input 
                type="file" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = () => handleChange(field.id, reader.result);
                    reader.readAsDataURL(file);
                  }
                }}
                className="cursor-pointer file:bg-primary file:text-white file:border-none file:px-4 file:py-1 file:rounded-lg file:mr-4"
             />
             {formData[field.id] && (
               <div className="w-32 h-32 rounded-2xl overflow-hidden border">
                 <img src={formData[field.id]} className="w-full h-full object-cover" />
               </div>
             )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-32 max-w-4xl mx-auto">
      <div className="flex justify-end gap-2 no-print">
        <Button variant="outline" size="sm" onClick={exportPDF} className="rounded-xl border-slate-200">
          <FileDown className="h-4 w-4 mr-2" /> PDF Preview
        </Button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
        <div className="bg-slate-900 p-10 text-white relative">
          <div className="relative z-10">
            <h2 className="text-3xl font-black tracking-tight">{form.name}</h2>
            {form.description && <p className="text-slate-400 mt-2 font-medium">{form.description}</p>}
          </div>
          
          {isMultiStep && (
            <div className="absolute bottom-0 left-0 w-full h-1.5 bg-white/10">
              <motion.div 
                className="h-full bg-primary shadow-[0_0_20px_rgba(var(--primary),0.5)]"
                initial={{ width: 0 }}
                animate={{ width: `${((currentStep + 1) / sections.length) * 100}%` }}
              />
            </div>
          )}
        </div>

        {isMultiStep && (
          <div className="bg-slate-50 px-10 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Progress</span>
              <div className="flex gap-1.5">
                {sections.map((_, idx) => (
                  <div 
                    key={idx} 
                    className={cn(
                      "h-1.5 w-8 rounded-full transition-all duration-300",
                      idx <= currentStep ? "bg-primary" : "bg-slate-200"
                    )}
                  />
                ))}
              </div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Step {currentStep + 1} of {sections.length}</span>
          </div>
        )}

        <div className="p-10 space-y-12">
          {sections.map((section, sIdx) => {
            if (isMultiStep && sIdx !== currentStep) return null;
            
            return (
              <motion.div 
                key={section.id} 
                initial={{ opacity: 0, x: isMultiStep ? 20 : 0 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-8"
              >
                {section.title && (
                  <div className="flex items-center gap-4">
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest">{section.title}</h3>
                    <div className="flex-1 h-px bg-slate-100" />
                    {isMultiStep && <Badge variant="secondary" className="bg-slate-100 text-slate-400 border-none uppercase text-[9px] px-2">Part {sIdx + 1}</Badge>}
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                  {section.columns.map(column => (
                    <div 
                      key={column.id} 
                      className="space-y-6"
                      style={{ gridColumn: `span ${column.width}` }}
                    >
                      {column.fields.map(field => (
                        <div key={field.id}>
                          {renderField(field)}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}

          <div className={cn("pt-10 border-t border-slate-100 flex items-center", isMultiStep ? "justify-between" : "justify-end")}>
            {isMultiStep && (
              <Button 
                variant="ghost" 
                size="lg" 
                disabled={currentStep === 0} 
                onClick={prevStep}
                className="h-14 px-8 rounded-2xl font-bold gap-2 text-slate-500"
              >
                <ChevronLeft className="h-5 w-5" /> Previous step
              </Button>
            )}

            <div className="flex gap-4">
              {isMultiStep && !isLastStep ? (
                <Button 
                  size="lg" 
                  onClick={nextStep} 
                  className="h-14 px-10 rounded-[1.25rem] bg-slate-900 hover:bg-slate-800 text-lg font-bold shadow-xl gap-3 transition-all hover:scale-[1.02]"
                >
                  Continue <ChevronRight className="h-6 w-6" />
                </Button>
              ) : (
                <Button 
                  size="lg" 
                  onClick={() => onSubmit(formData)} 
                  disabled={isSubmitting}
                  className="h-14 px-12 rounded-[1.25rem] bg-primary hover:bg-primary/90 text-lg font-bold shadow-xl shadow-primary/20 gap-3 transition-all hover:scale-[1.02]"
                >
                  {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : <CheckCircle2 className="h-6 w-6" />}
                  {form.settings.submitLabel || "Finalize & Submit"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* PDF Hidden Template (Custom Forms Font Support) */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div ref={pdfTemplateRef} className="p-12 bg-white text-black font-['Hind',_sans-serif]" style={{ width: '800px' }}>
          <div className="text-center mb-10 pb-6 border-b-2 border-slate-900">
            <h1 className="text-4xl font-black uppercase tracking-tight">{form.settings.pdfTitle || form.name}</h1>
            {form.settings.pdfHeader && <p className="text-lg mt-2 text-slate-600 font-medium italic">{form.settings.pdfHeader}</p>}
          </div>

          <div className="space-y-12">
            {form.structure.map((section) => (
              <div key={section.id} className="space-y-6">
                {section.title && (
                  <div className="flex items-center gap-4">
                     <h3 className="text-xl font-bold text-slate-900 uppercase tracking-widest">{section.title}</h3>
                     <div className="flex-1 h-0.5 bg-slate-200" />
                  </div>
                )}
                
                <table className="w-full border-collapse">
                  <tbody>
                    {section.columns.flatMap(column => column.fields).map((field) => {
                      if (!isVisible(field)) return null;
                      
                      let val = formData[field.id];
                      if (val === undefined || val === null || val === '') val = '-';
                      if (field.type === 'file' && val !== '-') val = '[Attached Image]';
                      if (Array.isArray(val)) val = val.join(', ');

                      return (
                        <tr key={field.id} className="border-b border-slate-100">
                          <td className="py-4 pr-8 font-bold text-slate-600 w-1/3 align-top">{field.label}</td>
                          <td className="py-4 text-slate-900 align-top font-medium break-words">{String(val)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          <div className="mt-20 pt-8 border-t border-slate-200 flex justify-between items-end">
             <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Submitted On</p>
                <p className="text-sm font-bold">{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
             </div>
             {form.settings.pdfFooter && <p className="text-sm text-slate-500 font-medium max-w-md text-right leading-relaxed">{form.settings.pdfFooter}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};
