import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, setDoc, collection, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Save, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Calculator, 
  FileDown, 
  Wand2,
  Table as TableIcon,
  FileSpreadsheet,
  BarChart3
} from 'lucide-react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import html2pdf from 'html2pdf.js';
import { exportToPDF } from '../lib/pdfUtils';
import * as XLSX from 'xlsx';
import { FormBuilder, CustomField } from './FormBuilder';
import { AttachmentBuilder, Attachment } from './AttachmentBuilder';

interface WeekPlan {
  sr: number;
  weekDates: string;
  lessonNo: string;
  theory: string;
  practical: string;
  material: string;
  remark: string;
}

interface MonthlyPlanFormProps {
  onBack: () => void;
  onNext?: () => void;
  nextLabel?: string;
  planId?: string;
  downloadOnSave?: boolean;
}

const MONTHS_MR = [
  'एप्रिल', 'मे', 'जून', 'जुलै', 'ऑगस्ट', 'सप्टेंबर', 
  'ऑक्टोबर', 'नोव्हेंबर', 'डिसेंबर', 'जानेवारी', 'फेब्रुवारी', 'मार्च'
];

export const MonthlyPlanForm: React.FC<MonthlyPlanFormProps> = ({ 
  onBack, 
  onNext, 
  nextLabel, 
  planId, 
  downloadOnSave 
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const pdfTemplateRef = React.useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    institute: '',
    trade: '',
    month: 'एप्रिल',
    year: new Date().getFullYear().toString(),
    customFields: [] as CustomField[],
    attachments: [] as Attachment[],
  });

  const [weeks, setWeeks] = useState<WeekPlan[]>(
    Array.from({ length: 4 }, (_, i) => ({
      sr: i + 1,
      weekDates: '',
      lessonNo: '',
      theory: '',
      practical: '',
      material: '',
      remark: '',
    }))
  );

  const [lessonTotal, setLessonTotal] = useState(0);

  useEffect(() => {
    if (planId) {
      loadPlan();
    }
  }, [planId]);

  const loadPlan = async () => {
    if (!planId) return;
    setLoading(true);
    try {
      const docRef = doc(db, 'monthly_plans', planId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setFormData({
          institute: data.institute || '',
          trade: data.trade || '',
          month: data.month || 'एप्रिल',
          year: data.year || new Date().getFullYear().toString(),
          customFields: data.customFields || [],
          attachments: data.attachments || [],
        });
        setWeeks(data.weeks || []);
        setLessonTotal(data.lessonTotal || 0);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `monthly_plans/${planId}`);
    } finally {
      setLoading(false);
    }
  };

  const handleWeekChange = (index: number, field: keyof WeekPlan, value: string | number) => {
    const updatedWeeks = [...weeks];
    updatedWeeks[index] = {
      ...updatedWeeks[index],
      [field]: value,
    };
    setWeeks(updatedWeeks);
  };

  const calculateLessonTotal = () => {
    const total = weeks.filter(w => w.lessonNo.trim() !== '').length;
    setLessonTotal(total);
    toast.success(`Total Lessons: ${total}`);
  };

  const addRow = () => {
    setWeeks([...weeks, {
      sr: weeks.length + 1,
      weekDates: '',
      lessonNo: '',
      theory: '',
      practical: '',
      material: '',
      remark: '',
    }]);
  };

  const deleteRow = () => {
    if (weeks.length > 1) {
      setWeeks(weeks.slice(0, -1));
    }
  };

  const setWeekDates = () => {
    const weekRanges = [
      "1 ते 7",
      "8 ते 14",
      "15 ते 21",
      "22 ते 31"
    ];
    const updatedWeeks = weeks.map((w, i) => ({
      ...w,
      weekDates: weekRanges[i] || w.weekDates
    }));
    setWeeks(updatedWeeks);
    toast.info('Week dates auto-filled');
  };

  const handleSave = async (isNext: boolean = false) => {
    if (!user) return;
    setSaving(true);
    try {
      const data = {
        instructorId: user.uid,
        ...formData,
        weeks,
        lessonTotal,
        updatedAt: serverTimestamp(),
      };

      if (planId) {
        await updateDoc(doc(db, 'monthly_plans', planId), data);
        toast.success('Monthly plan updated successfully');
      } else {
        await addDoc(collection(db, 'monthly_plans'), {
          ...data,
          createdAt: serverTimestamp(),
        });
        toast.success('Monthly plan saved successfully');
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
      handleFirestoreError(error, OperationType.WRITE, 'monthly_plans');
    } finally {
      setSaving(false);
    }
  };

  const exportExcel = () => {
    const data = [
      ["मासिक नियोजन (Monthly Plan Register)"],
      [],
      ["संस्थेचे नाव", formData.institute, "ट्रेड", formData.trade],
      ["महिना", formData.month, "वर्ष", formData.year],
      [],
      ["अ.क्र.", "आठवडा (दिनांक)", "पाठ क्र.", "सैद्धांतिक विषय", "प्रात्यक्षिक विषय", "आवश्यक साहित्य", "टीप"],
      ...weeks.map(w => [
        w.sr, w.weekDates, w.lessonNo, w.theory, w.practical, w.material, w.remark
      ]),
      [],
      ["Total Lessons", lessonTotal]
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Monthly Plan");
    XLSX.writeFile(wb, `Monthly_Plan_${formData.month}_${formData.year}.xlsx`);
  };

  const exportPDF = async (format: 'a4' | 'legal' = 'a4') => {
    if (!pdfTemplateRef.current) return;
    await exportToPDF(pdfTemplateRef.current, {
      filename: `Monthly_Plan_${formData.month}_${formData.year}.pdf`,
      orientation: 'landscape',
      format: format
    });
  };

  const aiAutoFill = () => {
    setFormData({
      ...formData,
      institute: "Industrial Training Institute",
      trade: "Electrician",
      year: new Date().getFullYear().toString(),
    });
    setWeekDates();
    toast.info('AI Auto Fill Completed');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to List
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={aiAutoFill} className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50">
            <Wand2 className="h-4 w-4" /> AI Auto Fill
          </Button>
          <Button onClick={() => handleSave(false)} disabled={saving} className="gap-2 bg-slate-700">
            <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Plan'}
          </Button>
          {onNext && (
            <Button onClick={() => handleSave(true)} disabled={saving} className="gap-2 bg-slate-900 shadow-lg shadow-slate-200">
              <Save className="h-4 w-4" /> {saving ? 'Saving...' : (nextLabel || 'Save & Next')}
            </Button>
          )}
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-xl font-bold text-center uppercase tracking-tight">मासिक नियोजन (Monthly Plan)</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <Label>संस्थेचे नाव (Institute Name)</Label>
              <Input 
                value={formData.institute} 
                onChange={(e) => setFormData({...formData, institute: e.target.value})}
                placeholder="Name of ITI"
              />
            </div>
            <div className="space-y-2">
              <Label>ट्रेड (Trade)</Label>
              <Input 
                value={formData.trade} 
                onChange={(e) => setFormData({...formData, trade: e.target.value})}
                placeholder="Trade"
              />
            </div>
            <div className="space-y-2">
              <Label>महिना (Month)</Label>
              <select 
                className="w-full h-10 px-3 py-2 bg-white border border-slate-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all"
                value={formData.month}
                onChange={(e) => setFormData({...formData, month: e.target.value})}
              >
                {MONTHS_MR.map((m, i) => (
                  <option key={i} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>वर्ष (Year)</Label>
              <Input 
                type="number"
                value={formData.year} 
                onChange={(e) => setFormData({...formData, year: e.target.value})}
                placeholder="Year"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="no-print space-y-8">
        <FormBuilder 
          fields={formData.customFields || []} 
          onChange={(fields) => setFormData({ ...formData, customFields: fields })}
        />
        <AttachmentBuilder 
          attachments={formData.attachments || []} 
          onChange={(attachments) => setFormData({ ...formData, attachments: attachments })}
        />
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <TableIcon className="h-5 w-5 text-slate-400" />
            <span className="font-bold text-slate-700">Monthly Plan Table</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={setWeekDates} className="gap-2">
              <Wand2 className="h-4 w-4" /> Auto Week Dates
            </Button>
            <Button variant="outline" size="sm" onClick={calculateLessonTotal} className="gap-2">
              <Calculator className="h-4 w-4" /> Calculate Lessons
            </Button>
            <Button variant="outline" size="sm" onClick={addRow} className="gap-2">
              <Plus className="h-4 w-4" /> Add Row
            </Button>
            <Button variant="outline" size="sm" onClick={deleteRow} className="text-red-600 hover:bg-red-50 gap-2">
              <Trash2 className="h-4 w-4" /> Delete Row
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold tracking-wider">
                <th className="border p-3 w-12">अ.क्र.</th>
                <th className="border p-3 min-w-[150px]">आठवडा (दिनांक)</th>
                <th className="border p-3 w-24">पाठ क्र.</th>
                <th className="border p-3 min-w-[200px]">सैद्धांतिक विषय</th>
                <th className="border p-3 min-w-[200px]">प्रात्यक्षिक विषय</th>
                <th className="border p-3 min-w-[150px]">आवश्यक साहित्य</th>
                <th className="border p-3 min-w-[120px]">टीप</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((w, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="border p-2 text-center font-bold text-slate-500">{w.sr}</td>
                  <td className="border p-2">
                    <input 
                      className="w-full px-2 py-1 outline-none bg-transparent"
                      value={w.weekDates}
                      onChange={(e) => handleWeekChange(i, 'weekDates', e.target.value)}
                      placeholder="e.g. 1 ते 7"
                    />
                  </td>
                  <td className="border p-2">
                    <input 
                      className="w-full px-2 py-1 outline-none bg-transparent text-center"
                      value={w.lessonNo}
                      onChange={(e) => handleWeekChange(i, 'lessonNo', e.target.value)}
                    />
                  </td>
                  <td className="border p-2">
                    <textarea 
                      className="w-full px-2 py-1 outline-none bg-transparent resize-none h-12"
                      value={w.theory}
                      onChange={(e) => handleWeekChange(i, 'theory', e.target.value)}
                    />
                  </td>
                  <td className="border p-2">
                    <textarea 
                      className="w-full px-2 py-1 outline-none bg-transparent resize-none h-12"
                      value={w.practical}
                      onChange={(e) => handleWeekChange(i, 'practical', e.target.value)}
                    />
                  </td>
                  <td className="border p-2">
                    <textarea 
                      className="w-full px-2 py-1 outline-none bg-transparent resize-none h-12"
                      value={w.material}
                      onChange={(e) => handleWeekChange(i, 'material', e.target.value)}
                    />
                  </td>
                  <td className="border p-2">
                    <input 
                      className="w-full px-2 py-1 outline-none bg-transparent"
                      value={w.remark}
                      onChange={(e) => handleWeekChange(i, 'remark', e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-slate-400" />
              Monthly Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex items-center justify-between p-6 bg-slate-900 rounded-2xl text-white">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Lessons Planned</p>
                <p className="text-4xl font-black">{lessonTotal}</p>
              </div>
              <Button onClick={calculateLessonTotal} variant="secondary" className="gap-2">
                <Calculator className="h-4 w-4" /> Recalculate
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <FileDown className="h-5 w-5 text-slate-400" />
              Export & Print
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button variant="outline" onClick={exportExcel} className="gap-2 h-12 border-orange-200 hover:bg-orange-50 text-orange-700">
                <FileSpreadsheet className="h-5 w-5" /> Export Excel (.xlsx)
              </Button>
              <Button variant="outline" onClick={() => exportPDF('legal')} className="gap-2 h-12 border-purple-200 hover:bg-purple-50 text-purple-700">
                <FileDown className="h-5 w-5" /> Legal Landscape
              </Button>
              <Button variant="outline" onClick={() => exportPDF('a4')} className="gap-2 h-12 border-purple-200 hover:bg-purple-50 text-purple-700">
                <FileDown className="h-5 w-5" /> A4 Landscape
              </Button>
            </div>
            </CardContent>
        </Card>
      </div>

            {/* PDF Hidden Template (Devanagari Support & Optimized Landscape) */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div ref={pdfTemplateRef} className="p-10 bg-white text-black font-['Noto_Sans_Devanagari',_sans-serif]" style={{ width: '1280px' }}>
          <div className="text-center mb-10 pb-6 border-b-4 border-slate-900">
            <h1 className="text-4xl font-black uppercase tracking-tight">मासिक नियोजन (Monthly Plan Register)</h1>
            <div className="grid grid-cols-2 gap-12 mt-8 px-10 text-left">
               <div className="space-y-3">
                  <div className="flex gap-4 border-b border-slate-200 pb-1"><span className="font-bold w-32 uppercase text-slate-500 text-[11px] tracking-widest">Institute:</span> <span className="flex-1 font-black text-slate-800">{formData.institute || '-'}</span></div>
                  <div className="flex gap-4 border-b border-slate-200 pb-1"><span className="font-bold w-32 uppercase text-slate-500 text-[11px] tracking-widest">Trade:</span> <span className="flex-1 font-black text-slate-800">{formData.trade || '-'}</span></div>
               </div>
               <div className="space-y-3">
                  <div className="flex gap-4 border-b border-slate-200 pb-1"><span className="font-bold w-32 uppercase text-slate-500 text-[11px] tracking-widest">Month/Year:</span> <span className="flex-1 font-black text-slate-800">{formData.month} {formData.year}</span></div>
                  <div className="flex gap-4 border-b border-slate-200 pb-1"><span className="font-bold w-32 uppercase text-slate-500 text-[11px] tracking-widest">Lessons:</span> <span className="flex-1 font-black text-slate-800">{lessonTotal}</span></div>
               </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border-2 border-black">
            <table className="w-full border-collapse text-[14px]">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="border border-white/20 p-4 text-center w-12 font-black uppercase tracking-widest text-[10px]">Sr.</th>
                  <th className="border border-white/20 p-4 text-center w-40 font-black uppercase tracking-widest text-[10px]">Week (Dates)</th>
                  <th className="border border-white/20 p-4 text-center w-24 font-black uppercase tracking-widest text-[10px]">L.No.</th>
                  <th className="border border-white/20 p-4 text-left font-black uppercase tracking-widest text-[10px]">Theory Subject</th>
                  <th className="border border-white/20 p-4 text-left font-black uppercase tracking-widest text-[10px]">Practical Subject</th>
                  <th className="border border-white/20 p-4 text-left font-black uppercase tracking-widest text-[10px]">Materials Required</th>
                  <th className="border border-white/20 p-4 text-left font-black uppercase tracking-widest text-[10px]">Notes</th>
                </tr>
              </thead>
              <tbody>
                {weeks.map((w, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="border border-black p-5 text-center font-bold align-top">{w.sr}</td>
                    <td className="border border-black p-5 text-center align-top font-black text-slate-600">{w.weekDates || '-'}</td>
                    <td className="border border-black p-5 text-center align-top font-bold text-blue-900">{w.lessonNo || '-'}</td>
                    <td className="border border-black p-5 align-top whitespace-pre-wrap leading-relaxed italic text-slate-900">{w.theory || '-'}</td>
                    <td className="border border-black p-5 align-top whitespace-pre-wrap leading-relaxed font-medium">{w.practical || '-'}</td>
                    <td className="border border-black p-5 align-top whitespace-pre-wrap leading-relaxed text-[13px] text-slate-700">{w.material || '-'}</td>
                    <td className="border border-black p-5 align-top text-slate-500 text-[12px]">{w.remark || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid grid-cols-2 gap-6 pt-12 border-t border-slate-200 mt-12">
            <div className="text-center space-y-8">
              <div className="h-px bg-slate-300 w-48 mx-auto"></div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">प्रशिक्षक स्वाक्षरी (Instructor Signature)</p>
            </div>
            <div className="text-center space-y-8">
              <div className="h-px bg-slate-300 w-48 mx-auto"></div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">प्राचार्य स्वाक्षरी (Principal Signature)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
