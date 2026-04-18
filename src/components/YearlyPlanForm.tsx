import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, collection, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
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
  BarChart3,
  Calendar as CalendarIcon,
  TrendingUp,
  Search
} from 'lucide-react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import html2pdf from 'html2pdf.js';
import { exportToPDF } from '../lib/pdfUtils';
import * as XLSX from 'xlsx';
import { FormBuilder, CustomField } from './FormBuilder';
import { AttachmentBuilder, Attachment } from './AttachmentBuilder';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

interface MonthlyData {
  month: string;
  theory: number;
  practical: number;
  remark: string;
}

interface Holiday {
  date: string;
  name: string;
  type: 'Holiday' | 'Working';
}

interface YearlyPlanFormProps {
  onBack: () => void;
  onNext?: () => void;
  nextLabel?: string;
  planId?: string;
  downloadOnSave?: boolean;
}

const MONTHS_MR = [
  "एप्रिल", "मे", "जून", "जुलै", "ऑगस्ट", "सप्टेंबर",
  "ऑक्टोबर", "नोव्हेंबर", "डिसेंबर", "जानेवारी", "फेब्रुवारी", "मार्च"
];

export const YearlyPlanForm: React.FC<YearlyPlanFormProps> = ({ 
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
    year: new Date().getFullYear().toString(),
    instructorName: '',
    customFields: [] as CustomField[],
    attachments: [] as Attachment[],
  });

  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>(
    MONTHS_MR.map(m => ({
      month: m,
      theory: 0,
      practical: 0,
      remark: '',
    }))
  );

  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [yearTotal, setYearTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (planId) {
      loadPlan();
    }
  }, [planId]);

  const loadPlan = async () => {
    if (!planId) return;
    setLoading(true);
    try {
      const docRef = doc(db, 'yearly_plans', planId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setFormData({
          institute: data.institute || '',
          trade: data.trade || '',
          year: data.year || new Date().getFullYear().toString(),
          instructorName: data.instructorName || '',
          customFields: data.customFields || [],
          attachments: data.attachments || [],
        });
        setMonthlyData(data.monthlyData || []);
        setHolidays(data.holidays || []);
        setYearTotal(data.yearTotal || 0);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `yearly_plans/${planId}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMonthlyChange = (index: number, field: keyof MonthlyData, value: string | number) => {
    const updated = [...monthlyData];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setMonthlyData(updated);
    
    // Auto-calculate total
    const total = updated.reduce((acc, m) => acc + (Number(m.theory) || 0) + (Number(m.practical) || 0), 0);
    setYearTotal(total);
  };

  const addHolidayRow = () => {
    setHolidays([...holidays, { date: '', name: '', type: 'Holiday' }]);
  };

  const deleteHolidayRow = (index: number) => {
    setHolidays(holidays.filter((_, i) => i !== index));
  };

  const handleHolidayChange = (index: number, field: keyof Holiday, value: string) => {
    const updated = [...holidays];
    updated[index] = {
      ...updated[index],
      [field]: value as any,
    };
    setHolidays(updated);
  };

  const handleSave = async (isNext: boolean = false) => {
    if (!user) return;
    setSaving(true);
    try {
      const data = {
        instructorId: user.uid,
        ...formData,
        monthlyData,
        holidays,
        yearTotal,
        updatedAt: serverTimestamp(),
      };

      if (planId) {
        await updateDoc(doc(db, 'yearly_plans', planId), data);
        toast.success('Yearly plan updated successfully');
      } else {
        await addDoc(collection(db, 'yearly_plans'), {
          ...data,
          createdAt: serverTimestamp(),
        });
        toast.success('Yearly plan saved successfully');
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
      handleFirestoreError(error, OperationType.WRITE, 'yearly_plans');
    } finally {
      setSaving(false);
    }
  };

  const exportExcel = () => {
    const data = [
      ["वार्षिक नियोजन (Yearly Plan Register)"],
      [],
      ["संस्थेचे नाव", formData.institute, "ट्रेड", formData.trade],
      ["वर्ष", formData.year, "प्रशिक्षक नाव", formData.instructorName],
      [],
      ["अ.क्र.", "महिना", "नियोजित पाठ (Theory)", "नियोजित प्रात्यक्षिक (Practical)", "एकूण पाठ", "टीप"],
      ...monthlyData.map((m, i) => [
        i + 1, m.month, m.theory, m.practical, (Number(m.theory) || 0) + (Number(m.practical) || 0), m.remark
      ]),
      [],
      ["Year Total Lessons", yearTotal]
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Yearly Plan");
    XLSX.writeFile(wb, `Yearly_Plan_${formData.trade}_${formData.year}.xlsx`);
  };

  const exportPDF = async (format: 'a4' | 'legal' = 'a4') => {
    if (!pdfTemplateRef.current) return;
    await exportToPDF(pdfTemplateRef.current, {
      filename: `Yearly_Plan_${formData.trade}_${formData.year}.pdf`,
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
      instructorName: user?.displayName || '',
    });
    toast.info('AI Auto Fill Completed');
  };

  const carryForward = () => {
    const nextYear = (Number(formData.year) + 1).toString();
    setFormData({ ...formData, year: nextYear });
    toast.success(`Plan carried forward to ${nextYear}`);
  };

  const chartData = monthlyData.map(m => ({
    name: m.month,
    total: (Number(m.theory) || 0) + (Number(m.practical) || 0)
  }));

  const completionPercent = Math.round((monthlyData.filter(m => (Number(m.theory) || 0) + (Number(m.practical) || 0) > 0).length / 12) * 100);

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
          <Button variant="outline" onClick={carryForward} className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
            <TrendingUp className="h-4 w-4" /> Carry Forward
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
          <CardTitle className="text-xl font-bold text-center uppercase tracking-tight">वार्षिक नियोजन (Yearly Plan)</CardTitle>
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
              <Label>वर्ष (Year)</Label>
              <Input 
                type="number"
                value={formData.year} 
                onChange={(e) => setFormData({...formData, year: e.target.value})}
                placeholder="Year"
              />
            </div>
            <div className="space-y-2">
              <Label>प्रशिक्षक नाव (Instructor Name)</Label>
              <Input 
                value={formData.instructorName} 
                onChange={(e) => setFormData({...formData, instructorName: e.target.value})}
                placeholder="Instructor Name"
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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <TableIcon className="h-5 w-5 text-slate-400" />
              <span className="font-bold text-slate-700">Monthly Distribution</span>
            </div>
            <div className="relative w-48">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input 
                className="pl-8 h-8 text-xs"
                placeholder="Search month..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold tracking-wider">
                  <th className="border p-3 w-12">अ.क्र.</th>
                  <th className="border p-3 min-w-[120px]">महिना</th>
                  <th className="border p-3 w-32">नियोजित पाठ (Theory)</th>
                  <th className="border p-3 w-32">नियोजित प्रात्यक्षिक (Practical)</th>
                  <th className="border p-3 w-24">एकूण पाठ</th>
                  <th className="border p-3 min-w-[150px]">टीप</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((m, i) => {
                  const isMatch = m.month.toLowerCase().includes(searchTerm.toLowerCase());
                  if (searchTerm && !isMatch) return null;
                  
                  return (
                    <tr key={i} className={`hover:bg-slate-50 transition-colors ${isMatch && searchTerm ? 'bg-yellow-50' : ''}`}>
                      <td className="border p-2 text-center font-bold text-slate-500">{i + 1}</td>
                      <td className="border p-2 font-bold text-slate-700">{m.month}</td>
                      <td className="border p-2">
                        <Input 
                          type="number"
                          className="h-8 text-center border-none shadow-none focus-visible:ring-1 focus-visible:ring-slate-900/10"
                          value={m.theory}
                          onChange={(e) => handleMonthlyChange(i, 'theory', Number(e.target.value))}
                        />
                      </td>
                      <td className="border p-2">
                        <Input 
                          type="number"
                          className="h-8 text-center border-none shadow-none focus-visible:ring-1 focus-visible:ring-slate-900/10"
                          value={m.practical}
                          onChange={(e) => handleMonthlyChange(i, 'practical', Number(e.target.value))}
                        />
                      </td>
                      <td className="border p-2 text-center font-black text-slate-900">
                        {(Number(m.theory) || 0) + (Number(m.practical) || 0)}
                      </td>
                      <td className="border p-2">
                        <Input 
                          className="h-8 border-none shadow-none focus-visible:ring-1 focus-visible:ring-slate-900/10"
                          value={m.remark}
                          onChange={(e) => handleMonthlyChange(i, 'remark', e.target.value)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-slate-400" />
                Yearly Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-900 rounded-2xl text-white">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Lessons</p>
                  <p className="text-3xl font-black">{yearTotal}</p>
                </div>
                <div className="p-4 bg-emerald-600 rounded-2xl text-white">
                  <p className="text-[10px] font-bold text-emerald-200 uppercase tracking-widest mb-1">Completion</p>
                  <p className="text-3xl font-black">{completionPercent}%</p>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                      tick={{ fill: '#64748b' }}
                    />
                    <YAxis 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                      tick={{ fill: '#64748b' }}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.total > 0 ? '#0f172a' : '#e2e8f0'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-slate-400" />
                Holiday Calendar
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={addHolidayRow} className="h-8 gap-1 text-xs">
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-slate-50 border-b font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="p-3 text-left">Date</th>
                      <th className="p-3 text-left">Holiday Name</th>
                      <th className="p-3 text-left">Type</th>
                      <th className="p-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {holidays.map((h, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-2">
                          <Input 
                            type="date"
                            className="h-8 text-[10px] border-none shadow-none p-1"
                            value={h.date}
                            onChange={(e) => handleHolidayChange(i, 'date', e.target.value)}
                          />
                        </td>
                        <td className="p-2">
                          <Input 
                            className="h-8 text-[10px] border-none shadow-none p-1"
                            value={h.name}
                            onChange={(e) => handleHolidayChange(i, 'name', e.target.value)}
                            placeholder="Holiday name"
                          />
                        </td>
                        <td className="p-2">
                          <select 
                            className="w-full h-8 text-[10px] bg-transparent border-none outline-none"
                            value={h.type}
                            onChange={(e) => handleHolidayChange(i, 'type', e.target.value)}
                          >
                            <option value="Holiday">Holiday</option>
                            <option value="Working">Working</option>
                          </select>
                        </td>
                        <td className="p-2">
                          <Button variant="ghost" size="icon" onClick={() => deleteHolidayRow(i)} className="h-6 w-6 text-red-400 hover:text-red-600">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {holidays.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-400 italic">No holidays added yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <FileDown className="h-5 w-5 text-slate-400" />
                Export Options
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              <Button variant="outline" onClick={exportExcel} className="w-full gap-2 h-12 border-orange-200 hover:bg-orange-50 text-orange-700">
                <FileSpreadsheet className="h-5 w-5" /> Export Excel (.xlsx)
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => exportPDF('legal')} className="gap-2 h-12 border-purple-200 hover:bg-purple-50 text-purple-700">
                  <FileDown className="h-5 w-5" /> Legal
                </Button>
                <Button variant="outline" onClick={() => exportPDF('a4')} className="gap-2 h-12 border-purple-200 hover:bg-purple-50 text-purple-700">
                  <FileDown className="h-5 w-5" /> A4
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 pt-12 border-t border-slate-200">
        <div className="text-center space-y-8">
          <div className="h-px bg-slate-300 w-48 mx-auto"></div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">प्रशिक्षक स्वाक्षरी (Instructor Signature)</p>
        </div>
        <div className="text-center space-y-8">
          <div className="h-px bg-slate-300 w-48 mx-auto"></div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">प्राचार्य स्वाक्षरी (Principal Signature)</p>
        </div>
      </div>

      {/* PDF Hidden Template (Devanagari Support & Optimized Landscape) */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div ref={pdfTemplateRef} className="p-10 bg-white text-black font-['Noto_Sans_Devanagari',_sans-serif]" style={{ width: '1280px' }}>
          <div className="text-center mb-10 pb-8 border-b-4 border-slate-900">
            <h1 className="text-5xl font-black uppercase tracking-tight">वार्षिक नियोजन (Yearly Plan Register)</h1>
            <div className="grid grid-cols-2 gap-x-16 gap-y-4 mt-10 px-10 text-left text-[15px]">
               <div className="space-y-3">
                  <div className="flex gap-4 border-b border-slate-200 pb-2"><span className="font-bold w-32 uppercase text-slate-500 text-[11px] tracking-widest">Institute:</span> <span className="flex-1 font-black leading-tight">{formData.institute || '-'}</span></div>
                  <div className="flex gap-4 border-b border-slate-200 pb-2"><span className="font-bold w-32 uppercase text-slate-500 text-[11px] tracking-widest">Trade:</span> <span className="flex-1 font-black leading-tight text-blue-900">{formData.trade || '-'}</span></div>
               </div>
               <div className="space-y-3">
                  <div className="flex gap-4 border-b border-slate-200 pb-2"><span className="font-bold w-32 uppercase text-slate-500 text-[11px] tracking-widest">Session Year:</span> <span className="flex-1 font-black leading-tight">{formData.year || '-'}</span></div>
                  <div className="flex gap-4 border-b border-slate-200 pb-2"><span className="font-bold w-32 uppercase text-slate-500 text-[11px] tracking-widest">Instructor:</span> <span className="flex-1 font-black leading-tight">{formData.instructorName || '-'}</span></div>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-10 mb-10">
            <div className="col-span-2 space-y-4">
              <h3 className="text-sm font-black uppercase tracking-[4px] mb-4 flex items-center gap-3">
                <span className="bg-slate-900 text-white w-8 h-8 flex items-center justify-center rounded-lg">P1</span>
                Monthly Distribution (मासिक नियोजन)
              </h3>
              <div className="overflow-hidden rounded-xl border-2 border-black">
                <table className="w-full border-collapse text-[14px]">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="border border-white/20 p-4 text-center w-12 font-black uppercase text-[10px] tracking-widest">Sr.</th>
                      <th className="border border-white/20 p-4 text-left font-black uppercase text-[10px] tracking-widest italic">Month (महिना)</th>
                      <th className="border border-white/20 p-4 text-center w-32 font-black uppercase text-[10px] tracking-widest">Theory</th>
                      <th className="border border-white/20 p-4 text-center w-32 font-black uppercase text-[10px] tracking-widest">Practical</th>
                      <th className="border border-white/20 p-4 text-center w-24 font-black uppercase text-[10px] tracking-widest">Total</th>
                      <th className="border border-white/20 p-4 text-left font-black uppercase text-[10px] tracking-widest">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyData.map((m, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'}>
                        <td className="border border-black p-4 text-center font-bold text-slate-400">{i + 1}</td>
                        <td className="border border-black p-4 font-black text-slate-900">{m.month}</td>
                        <td className="border border-black p-4 text-center font-bold">{m.theory}</td>
                        <td className="border border-black p-4 text-center font-bold">{m.practical}</td>
                        <td className="border border-black p-4 text-center font-black text-blue-900 bg-blue-50/30">{(Number(m.theory) || 0) + (Number(m.practical) || 0)}</td>
                        <td className="border border-black p-4 leading-relaxed text-[12px] italic text-slate-600">{m.remark || '-'}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-900 text-white font-black">
                      <td colSpan={4} className="border border-black p-6 text-right uppercase tracking-[4px] text-[12px]">Calculated Year Total Lessons:</td>
                      <td className="border border-black p-6 text-center text-3xl font-black">{yearTotal}</td>
                      <td className="border border-black p-6"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-10">
              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-[4px] flex items-center gap-3">
                  <span className="bg-slate-900 text-white w-8 h-8 flex items-center justify-center rounded-lg">P2</span>
                  Holiday Calendar
                </h3>
                <div className="overflow-hidden rounded-xl border-2 border-black">
                  <table className="w-full border-collapse text-[12px]">
                    <thead>
                      <tr className="bg-slate-100 font-black text-slate-700 uppercase tracking-widest">
                        <th className="border border-black p-3 text-left">Date</th>
                        <th className="border border-black p-3 text-left">Holiday Name</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black">
                      {holidays.map((h, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="border border-black p-3 font-medium text-slate-600">{h.date}</td>
                          <td className="border border-black p-3 font-bold">{h.name}</td>
                        </tr>
                      ))}
                      {holidays.length === 0 && (
                        <tr><td colSpan={2} className="border border-black p-8 text-center italic text-slate-400">No official holidays recorded.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="p-8 bg-slate-50 border-4 border-slate-900 rounded-3xl text-center shadow-xl shadow-slate-100">
                 <p className="text-[12px] uppercase font-black text-slate-500 mb-2 tracking-widest">Overall Completion</p>
                 <p className="text-7xl font-black text-slate-900">{completionPercent}%</p>
                 <div className="h-4 bg-slate-200 rounded-full mt-6 overflow-hidden border border-slate-300">
                    <div className="h-full bg-slate-900 transition-all duration-1000" style={{ width: `${completionPercent}%` }} />
                 </div>
                 <p className="text-[10px] text-slate-400 mt-4 font-bold uppercase tracking-tight italic">Generated Professional Index Report</p>
              </div>
            </div>
          </div>

          {/* Custom Fields in PDF */}
          {formData.customFields && formData.customFields.length > 0 && (
            <div className="mt-10 space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest border-b border-black pb-2">Technical Specifications (तांत्रिक तपशील)</h3>
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
               <h3 className="text-sm font-black uppercase tracking-widest border-b border-black pb-2">Reference Graphics (संदर्भ चित्रे)</h3>
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

          <div className="mt-24 pt-12 flex justify-between items-end border-t-2 border-slate-900">
            <div className="text-center space-y-4">
              <div className="border-t-2 border-black w-72 mx-auto"></div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">प्रशिक्षक स्वाक्षरी (Instructor Signature)</p>
            </div>
            <div className="text-center space-y-4">
              <div className="border-t-2 border-black w-72 mx-auto"></div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">प्राचार्य स्वाक्षरी (Principal Signature)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
