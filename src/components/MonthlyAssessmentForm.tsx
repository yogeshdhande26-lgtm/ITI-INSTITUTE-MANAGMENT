import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, FileDown, Loader2, Calculator, TrendingUp, Plus, Trash2 } from 'lucide-react';
import { useAuth } from './AuthContext';
import { jsPDF } from 'jspdf';
import html2pdf from 'html2pdf.js';
import { exportToPDF } from '../lib/pdfUtils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FormBuilder, CustomField } from './FormBuilder';
import { AttachmentBuilder, Attachment } from './AttachmentBuilder';

interface MonthlyAssessmentFormProps {
  assessmentId?: string;
  onBack: () => void;
  onNext?: () => void;
  nextLabel?: string;
  downloadOnSave?: boolean;
}

const MONTHS = [
  "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY"
];

interface MonthlyMark {
  month: string;
  safety: number;
  discipline: number;
  workshop: number;
  knowledge: number;
  skill: number;
  total: number;
  percent: number;
  result: string;
}

export const MonthlyAssessmentForm: React.FC<MonthlyAssessmentFormProps> = ({ 
  assessmentId, 
  onBack, 
  onNext, 
  nextLabel, 
  downloadOnSave 
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(!!assessmentId);
  const [saving, setSaving] = useState(false);
  const pdfTemplateRef = React.useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    institute: '',
    trade: '',
    trainee: '',
    year: '',
    customFields: [] as CustomField[],
    attachments: [] as Attachment[],
  });

  const [marks, setMarks] = useState<MonthlyMark[]>(
    MONTHS.map(month => ({
      month,
      safety: 0,
      discipline: 0,
      workshop: 0,
      knowledge: 0,
      skill: 0,
      total: 0,
      percent: 0,
      result: ''
    }))
  );

  const [annualSummary, setAnnualSummary] = useState({
    grandTotal: 0,
    averagePercent: 0,
    finalResult: ''
  });

  useEffect(() => {
    if (assessmentId) {
      fetchAssessment();
    }
  }, [assessmentId]);

  const fetchAssessment = async () => {
    try {
      const docRef = doc(db, 'monthly_assessments', assessmentId!);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setFormData({
          institute: data.institute || '',
          trade: data.trade || '',
          trainee: data.trainee || '',
          year: data.year || '',
          customFields: data.customFields || [],
          attachments: data.attachments || [],
        });
        if (data.marks) setMarks(data.marks);
        if (data.annualSummary) setAnnualSummary(data.annualSummary);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `monthly_assessments/${assessmentId}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkChange = (index: number, field: keyof MonthlyMark, value: string) => {
    const numValue = Number(value) || 0;
    const newMarks = [...marks];
    (newMarks[index] as any)[field] = numValue;
    
    // Auto calculate row total
    const row = newMarks[index];
    const total = row.safety + row.discipline + row.workshop + row.knowledge + row.skill;
    const percent = (total / 110) * 100;
    const result = percent >= 50 ? 'PASS' : 'FAIL';
    
    newMarks[index] = { ...row, total, percent, result };
    setMarks(newMarks);
  };

  const calculateAnnualResult = () => {
    const grandTotal = marks.reduce((sum, m) => sum + m.total, 0);
    const averagePercent = (grandTotal / (110 * 12)) * 100;
    const finalResult = averagePercent >= 50 ? 'PASS' : 'FAIL';
    
    setAnnualSummary({
      grandTotal,
      averagePercent,
      finalResult
    });
    toast.success("Annual result calculated!");
  };

  const handleSubmitWithAction = async (e: React.FormEvent, isNext: boolean = false) => {
    if (e) e.preventDefault();
    if (!user) return;
    setSaving(true);

    try {
      const assessmentData = {
        ...formData,
        marks,
        annualSummary,
        instructorId: user.uid,
        updatedAt: new Date().toISOString(),
      };

      if (assessmentId) {
        await updateDoc(doc(db, 'monthly_assessments', assessmentId), assessmentData);
        toast.success('Assessment updated successfully');
      } else {
        await addDoc(collection(db, 'monthly_assessments'), {
          ...assessmentData,
          createdAt: new Date().toISOString(),
        });
        toast.success('Assessment saved successfully');
      }

      if (downloadOnSave || isNext) {
        exportPDF();
      }

      if (isNext && onNext) {
        onNext();
      } else {
        onBack();
      }
    } catch (error) {
      handleFirestoreError(error, assessmentId ? OperationType.UPDATE : OperationType.CREATE, 'monthly_assessments');
    } finally {
      setSaving(false);
    }
  };

  const exportPDF = async (format: 'a4' | 'legal' = 'a4') => {
    if (!pdfTemplateRef.current) return;
    await exportToPDF(pdfTemplateRef.current, {
      filename: `Monthly_Assessment_${formData.trainee || 'Report'}.pdf`,
      orientation: 'landscape',
      format: format
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px]">
        <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Loading assessment data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Button variant="ghost" onClick={onBack} className="gap-2 text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Back to List
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => exportPDF('legal')} className="gap-2 border-purple-200 text-purple-700 hover:bg-purple-50">
            <FileDown className="h-4 w-4" /> Legal Landscape
          </Button>
          <Button variant="outline" onClick={() => exportPDF('a4')} className="gap-2 border-purple-200 text-purple-700 hover:bg-purple-50">
            <FileDown className="h-4 w-4" /> A4 Landscape
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-900 text-white p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Trainee's Monthly Internal Assessment</h2>
              <p className="text-slate-400 mt-1 font-medium">Monthly Progress Tracking & Annual Result Summary</p>
            </div>
          </div>
        </div>

        <form onSubmit={(e) => handleSubmitWithAction(e, false)} className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <Label htmlFor="institute" className="text-xs font-bold uppercase tracking-wider text-slate-500">Name of Institute</Label>
              <Input 
                id="institute" 
                value={formData.institute} 
                onChange={(e) => setFormData({ ...formData, institute: e.target.value })} 
                className="h-10 border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trade" className="text-xs font-bold uppercase tracking-wider text-slate-500">Trade Name</Label>
              <Input 
                id="trade" 
                value={formData.trade} 
                onChange={(e) => setFormData({ ...formData, trade: e.target.value })} 
                className="h-10 border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trainee" className="text-xs font-bold uppercase tracking-wider text-slate-500">Full Name of Trainee</Label>
              <Input 
                id="trainee" 
                value={formData.trainee} 
                onChange={(e) => setFormData({ ...formData, trainee: e.target.value })} 
                className="h-10 border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year" className="text-xs font-bold uppercase tracking-wider text-slate-500">Year of Admission</Label>
              <Input 
                id="year" 
                value={formData.year} 
                onChange={(e) => setFormData({ ...formData, year: e.target.value })} 
                className="h-10 border-slate-200"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="w-[50px] text-center">Sr</TableHead>
                  <TableHead className="w-[120px]">Month</TableHead>
                  <TableHead className="text-center">Safety (30)</TableHead>
                  <TableHead className="text-center">Disc. (10)</TableHead>
                  <TableHead className="text-center">Work. (20)</TableHead>
                  <TableHead className="text-center">Know. (20)</TableHead>
                  <TableHead className="text-center">Skill (30)</TableHead>
                  <TableHead className="text-center font-bold">Total (110)</TableHead>
                  <TableHead className="text-center">%</TableHead>
                  <TableHead className="text-center">Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {marks.map((m, i) => (
                  <TableRow key={m.month}>
                    <TableCell className="text-center font-medium text-slate-500">{i + 1}</TableCell>
                    <TableCell className="font-bold text-slate-700">{m.month}</TableCell>
                    <TableCell className="p-1">
                      <Input 
                        type="number" 
                        max={30} 
                        value={m.safety || ''} 
                        onChange={(e) => handleMarkChange(i, 'safety', e.target.value)}
                        className="h-8 text-center border-none focus:ring-1 focus:ring-slate-200"
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input 
                        type="number" 
                        max={10} 
                        value={m.discipline || ''} 
                        onChange={(e) => handleMarkChange(i, 'discipline', e.target.value)}
                        className="h-8 text-center border-none focus:ring-1 focus:ring-slate-200"
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input 
                        type="number" 
                        max={20} 
                        value={m.workshop || ''} 
                        onChange={(e) => handleMarkChange(i, 'workshop', e.target.value)}
                        className="h-8 text-center border-none focus:ring-1 focus:ring-slate-200"
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input 
                        type="number" 
                        max={20} 
                        value={m.knowledge || ''} 
                        onChange={(e) => handleMarkChange(i, 'knowledge', e.target.value)}
                        className="h-8 text-center border-none focus:ring-1 focus:ring-slate-200"
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input 
                        type="number" 
                        max={30} 
                        value={m.skill || ''} 
                        onChange={(e) => handleMarkChange(i, 'skill', e.target.value)}
                        className="h-8 text-center border-none focus:ring-1 focus:ring-slate-200"
                      />
                    </TableCell>
                    <TableCell className="text-center font-bold text-slate-900">{m.total}</TableCell>
                    <TableCell className="text-center text-slate-600">{m.percent.toFixed(0)}%</TableCell>
                    <TableCell className="text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.result === 'PASS' ? 'bg-emerald-100 text-emerald-700' : m.result === 'FAIL' ? 'bg-red-100 text-red-700' : ''}`}>
                        {m.result}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-100">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Total Year Marks</p>
              <p className="text-3xl font-black text-slate-900">{annualSummary.grandTotal}</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Average Percentage</p>
              <p className="text-3xl font-black text-slate-900">{annualSummary.averagePercent.toFixed(1)}%</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Final Result</p>
              <p className={`text-3xl font-black ${annualSummary.finalResult === 'PASS' ? 'text-emerald-600' : 'text-red-600'}`}>
                {annualSummary.finalResult || '---'}
              </p>
            </div>
          </div>

          <div className="no-print space-y-8 pt-8 border-t border-slate-100">
            <FormBuilder 
              fields={formData.customFields || []} 
              onChange={(fields) => setFormData({ ...formData, customFields: fields })}
            />
            <AttachmentBuilder 
              attachments={formData.attachments || []} 
              onChange={(attachments) => setFormData({ ...formData, attachments: attachments })}
            />
          </div>

          <div className="flex flex-wrap gap-4 pt-8 border-t border-slate-100">
            <Button 
              type="button" 
              variant="outline" 
              onClick={calculateAnnualResult} 
              className="gap-2 border-orange-200 text-orange-600 hover:bg-orange-50 h-11 px-6"
            >
              <Calculator className="h-4 w-4" /> Calculate Annual Result
            </Button>
            <Button 
              type="submit" 
              disabled={saving} 
              className="gap-2 ml-auto bg-slate-700 hover:bg-slate-800 h-11 px-8"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {assessmentId ? 'Update Record' : 'Save Assessment'}
            </Button>
            {onNext && (
              <Button 
                type="button" 
                onClick={(e) => handleSubmitWithAction(e as any, true)} 
                disabled={saving} 
                className="gap-2 bg-slate-900 hover:bg-slate-800 h-11 px-8 shadow-lg shadow-slate-200"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {nextLabel || 'Save & Next'}
              </Button>
            )}
          </div>
        </form>
      </div>

      {/* PDF Hidden Template (Devanagari Support & Optimized Landscape) */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div ref={pdfTemplateRef} className="p-10 bg-white text-black font-['Noto_Sans_Devanagari',_sans-serif]" style={{ width: '1280px' }}>
          <div className="text-center mb-10 pb-8 border-b-4 border-slate-900">
            <h1 className="text-4xl font-black uppercase tracking-tight">TRAINEE'S MONTHLY INTERNAL ASSESSMENT (मासिक मूल्यमापन अहवाल)</h1>
            <div className="grid grid-cols-2 gap-x-12 gap-y-3 mt-8 px-10 text-left text-[14px]">
               <div className="space-y-3">
                  <div className="flex gap-4 border-b border-slate-200 pb-2"><span className="font-bold w-40 uppercase text-slate-500 text-[10px] tracking-widest">Institute:</span> <span className="flex-1 font-black text-slate-800">{formData.institute || '-'}</span></div>
                  <div className="flex gap-4 border-b border-slate-200 pb-2"><span className="font-bold w-40 uppercase text-slate-500 text-[10px] tracking-widest">Trainee Name:</span> <span className="flex-1 font-black text-slate-800">{formData.trainee || '-'}</span></div>
               </div>
               <div className="space-y-3">
                  <div className="flex gap-4 border-b border-slate-200 pb-2"><span className="font-bold w-40 uppercase text-slate-500 text-[10px] tracking-widest">Trade:</span> <span className="flex-1 font-black leading-tight text-blue-900">{formData.trade || '-'}</span></div>
                  <div className="flex gap-4 border-b border-slate-200 pb-2"><span className="font-bold w-40 uppercase text-slate-500 text-[10px] tracking-widest">Admission Year:</span> <span className="flex-1 font-black text-slate-800">{formData.year || '-'}</span></div>
               </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border-2 border-black mb-10">
            <table className="w-full border-collapse text-[14px]">
              <thead>
                <tr className="bg-slate-900 text-white font-black uppercase text-[9px] tracking-widest">
                  <th className="border border-white/20 p-4 text-center w-12">Sr</th>
                  <th className="border border-white/20 p-4 text-left w-40">Month</th>
                  <th className="border border-white/20 p-4 text-center">Safety (30)</th>
                  <th className="border border-white/20 p-4 text-center">Disc. (10)</th>
                  <th className="border border-white/20 p-4 text-center">Work. (20)</th>
                  <th className="border border-white/20 p-4 text-center">Know. (20)</th>
                  <th className="border border-white/20 p-4 text-center">Skill (30)</th>
                  <th className="border border-white/20 p-4 text-center bg-slate-700 font-extrabold text-[11px]">Total (110)</th>
                  <th className="border border-white/20 p-4 text-center bg-slate-700">%</th>
                  <th className="border border-white/20 p-4 text-center bg-slate-700">Result</th>
                </tr>
              </thead>
              <tbody>
                {marks.map((m, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'}>
                    <td className="border border-black p-4 text-center font-bold text-slate-400">{i + 1}</td>
                    <td className="border border-black p-4 font-black text-slate-900">{m.month}</td>
                    <td className="border border-black p-4 text-center font-medium">{m.safety || '0'}</td>
                    <td className="border border-black p-4 text-center font-medium">{m.discipline || '0'}</td>
                    <td className="border border-black p-4 text-center font-medium">{m.workshop || '0'}</td>
                    <td className="border border-black p-4 text-center font-medium">{m.knowledge || '0'}</td>
                    <td className="border border-black p-4 text-center font-medium">{m.skill || '0'}</td>
                    <td className="border border-black p-4 text-center font-black bg-blue-50/50 text-blue-900">{m.total}</td>
                    <td className="border border-black p-4 text-center font-bold">{m.percent.toFixed(0)}%</td>
                    <td className={`border border-black p-4 text-center font-black ${m.result === 'PASS' ? 'text-emerald-700 bg-emerald-50/30' : 'text-red-700 bg-red-50/30'}`}>{m.result || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-3 gap-10">
            <div className="col-span-1 p-8 border-4 border-slate-900 rounded-3xl flex flex-col justify-center items-center shadow-xl shadow-slate-100">
               <p className="text-[12px] uppercase font-black text-slate-400 mb-2 tracking-widest">Annual Grand Total</p>
               <p className="text-6xl font-black text-slate-900">{annualSummary.grandTotal}</p>
            </div>
            <div className="col-span-1 p-8 border-4 border-slate-900 bg-slate-50 rounded-3xl flex flex-col justify-center items-center shadow-xl shadow-slate-100">
               <p className="text-[12px] uppercase font-black text-slate-400 mb-2 tracking-widest">Average Annual %</p>
               <p className="text-6xl font-black text-slate-900">{annualSummary.averagePercent.toFixed(1)}%</p>
            </div>
            <div className="col-span-1 p-8 border-4 border-emerald-600 bg-emerald-50 rounded-3xl flex flex-col justify-center items-center shadow-xl shadow-emerald-50">
               <p className="text-[12px] uppercase font-black text-emerald-600 mb-2 tracking-widest">Final Assessment</p>
               <p className="text-6xl font-black text-emerald-700">{annualSummary.finalResult || '---'}</p>
            </div>
          </div>

          {/* Custom Fields in PDF */}
          {formData.customFields && formData.customFields.length > 0 && (
            <div className="mt-10 space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest border-b border-black pb-2">Additional Observations</h3>
              <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                {formData.customFields.map((field, idx) => (
                  <div key={idx} className="flex gap-4 text-xs">
                    <span className="font-bold w-48 uppercase text-slate-500 text-[9px]">{field.label}:</span>
                    <span className="border-b border-black flex-1 font-medium">{String(field.value || '-')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attachments Section in PDF */}
          {formData.attachments && formData.attachments.length > 0 && (
            <div className="mt-10 space-y-4">
               <h3 className="text-sm font-black uppercase tracking-widest border-b border-black pb-2">Reference Documents & Graphics</h3>
               <div className="grid grid-cols-4 gap-6">
                 {formData.attachments.map((att, idx) => (
                    <div key={idx} className="space-y-2">
                       <div className="border border-black rounded-lg overflow-hidden aspect-square flex items-center justify-center bg-slate-50">
                          {att.type.startsWith('image/') && att.url ? (
                            <img src={att.url} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-[10px] font-bold text-slate-400 uppercase text-center p-2">
                               {att.type.toUpperCase()}<br/>Document
                            </div>
                          )}
                       </div>
                       <p className="text-[9px] font-bold text-center truncate">{att.name}</p>
                    </div>
                 ))}
               </div>
            </div>
          )}

          <div className="mt-24 pt-12 grid grid-cols-2 gap-24 text-center text-[10px] font-black text-slate-500 border-t border-slate-200">
            <div className="space-y-4 flex flex-col items-center">
              <div className="border-t border-black w-64" />
              <p className="uppercase tracking-[4px]">Trainee Signature</p>
            </div>
            <div className="space-y-4 flex flex-col items-center">
              <div className="border-t border-black w-64" />
              <p className="uppercase tracking-[4px]">Instructor Signature</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
