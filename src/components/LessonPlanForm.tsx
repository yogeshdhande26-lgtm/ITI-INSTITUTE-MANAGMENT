import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, updateDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, 
  Save, 
  Sparkles, 
  FileDown, 
  Loader2, 
  Plus, 
  Trash2,
  Table as TableIcon,
  FileSpreadsheet,
  Calendar,
  Clock
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { useLanguage } from './LanguageContext';
import { jsPDF } from 'jspdf';
import html2pdf from 'html2pdf.js';
import { exportToPDF } from '../lib/pdfUtils';
import * as XLSX from 'xlsx';
import { GoogleGenAI, Type } from "@google/genai";
import { FormBuilder, CustomField } from './FormBuilder';
import { AttachmentBuilder, Attachment } from './AttachmentBuilder';

interface ProcedureRow {
  sr: number;
  procedure: string;
  information: string;
  visual: string;
}

interface LessonPlanFormProps {
  planId?: string;
  onBack: () => void;
  onNext?: () => void;
  nextLabel?: string;
  downloadOnSave?: boolean;
}

export const LessonPlanForm: React.FC<LessonPlanFormProps> = ({ 
  planId, 
  onBack, 
  onNext, 
  nextLabel, 
  downloadOnSave 
}) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(!!planId);
  const [saving, setSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const pdfTemplateRef = React.useRef<HTMLDivElement>(null);
  
  const [formData, setFormData] = useState({
    institute: '',
    instructorName: '',
    trade: 'Electrician',
    batch: '',
    lessonName: '',
    lessonNo: '',
    duration: '',
    durationUnit: 'minutes',
    plannedDate: '',
    customFields: [] as CustomField[],
    attachments: [] as Attachment[],
  });

  const [procedures, setProcedures] = useState<ProcedureRow[]>([
    { sr: 1, procedure: '', information: '', visual: '' },
    { sr: 2, procedure: '', information: '', visual: '' },
    { sr: 3, procedure: '', information: '', visual: '' },
    { sr: 4, procedure: '', information: '', visual: '' },
    { sr: 5, procedure: '', information: '', visual: '' },
  ]);

  useEffect(() => {
    if (planId) {
      fetchPlan();
    } else if (user) {
      setFormData(prev => ({ ...prev, instructorName: user.displayName || '' }));
    }
  }, [planId, user]);

  const fetchPlan = async () => {
    try {
      const docRef = doc(db, 'lesson_plans', planId!);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setFormData({
          institute: data.institute || '',
          instructorName: data.instructorName || '',
          trade: data.trade || 'Electrician',
          batch: data.batch || '',
          lessonName: data.lessonName || '',
          lessonNo: data.lessonNo || '',
          duration: data.duration?.toString() || '',
          durationUnit: data.durationUnit || 'minutes',
          plannedDate: data.plannedDate || '',
          customFields: data.customFields || [],
          attachments: data.attachments || [],
        });
        if (data.procedures) {
          setProcedures(data.procedures);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `lesson_plans/${planId}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAIByGemini = async () => {
    if (!formData.lessonName && !formData.trade) {
      toast.error("Please enter a Lesson Name or Trade to generate content.");
      return;
    }

    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

      const prompt = `Generate a technical lesson plan for ITI (Industrial Training Institute) for the trade ${formData.trade} and lesson name "${formData.lessonName}". 
      Return ONLY a JSON object with the following fields:
      - lessonNo: "1"
      - duration: "45"
      - durationUnit: "minutes"
      - procedures: Array of 5 objects with fields {sr, procedure, information, visual}
      
      Ensure the content is technical, in Marathi where appropriate, and accurate for the ITI curriculum.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              lessonNo: { type: Type.STRING },
              duration: { type: Type.STRING },
              durationUnit: { type: Type.STRING },
              procedures: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    sr: { type: Type.NUMBER },
                    procedure: { type: Type.STRING },
                    information: { type: Type.STRING },
                    visual: { type: Type.STRING }
                  },
                  required: ["sr", "procedure", "information", "visual"]
                }
              }
            },
            required: ["lessonNo", "duration", "durationUnit", "procedures"]
          }
        }
      });
      
      const text = response.text;
      if (text) {
        const aiData = JSON.parse(text);
        setFormData(prev => ({
          ...prev,
          lessonNo: aiData.lessonNo || prev.lessonNo,
          duration: aiData.duration || prev.duration,
          durationUnit: aiData.durationUnit || prev.durationUnit,
        }));
        if (aiData.procedures) {
          setProcedures(aiData.procedures);
        }
        toast.success("Lesson plan generated successfully!");
      }
    } catch (error) {
      console.error("AI Generation Error:", error);
      toast.error("Failed to generate content with AI.");
      generateStaticAI();
    } finally {
      setIsGenerating(false);
    }
  };

  const generateStaticAI = () => {
    setFormData({
      ...formData,
      institute: "Industrial Training Institute",
      trade: formData.trade || "Fitter",
      lessonName: formData.lessonName || "Safety Introduction",
      lessonNo: "01",
      duration: "45",
      durationUnit: "minutes",
      plannedDate: new Date().toISOString().split('T')[0]
    });
    setProcedures([
      { sr: 1, procedure: 'Introduction', information: 'Importance of safety in workshop', visual: 'Charts' },
      { sr: 2, procedure: 'Personal Safety', information: 'Use of PPE like helmet, gloves', visual: 'Actual PPE' },
      { sr: 3, procedure: 'Machine Safety', information: 'Safe operation of lathe/drilling', visual: 'Machine Demo' },
      { sr: 4, procedure: 'Fire Safety', information: 'Types of fire extinguishers', visual: 'Extinguisher' },
      { sr: 5, procedure: 'Conclusion', information: 'Summary of safety rules', visual: 'Blackboard' },
    ]);
    toast.info("Generated sample data.");
  };

  const addRow = () => {
    setProcedures([...procedures, { sr: procedures.length + 1, procedure: '', information: '', visual: '' }]);
  };

  const removeRow = (index: number) => {
    if (procedures.length > 1) {
      const updated = procedures.filter((_, i) => i !== index).map((p, i) => ({ ...p, sr: i + 1 }));
      setProcedures(updated);
    } else {
      toast.warning('कमीतकमी एक ओळ असणे आवश्यक आहे.');
    }
  };

  const handleProcedureChange = (index: number, field: keyof ProcedureRow, value: string) => {
    const updated = [...procedures];
    updated[index] = { ...updated[index], [field]: value };
    setProcedures(updated);
  };

  const handleSubmitWithAction = async (e: React.FormEvent, isNext: boolean = false) => {
    if (e) e.preventDefault();
    if (!user) return;
    setSaving(true);

    try {
      const planData = {
        ...formData,
        duration: parseFloat(formData.duration) || 0,
        procedures,
        instructorId: user.uid,
        updatedAt: serverTimestamp(),
      };

      if (planId) {
        await updateDoc(doc(db, 'lesson_plans', planId), planData);
        toast.success('Lesson plan updated successfully');
      } else {
        await addDoc(collection(db, 'lesson_plans'), {
          ...planData,
          createdAt: serverTimestamp(),
        });
        toast.success('Lesson plan saved successfully');
      }

      if (downloadOnSave || isNext) {
        exportPDF('a4');
      }

      if (isNext && onNext) {
        onNext();
      } else {
        onBack();
      }
    } catch (error) {
      handleFirestoreError(error, planId ? OperationType.UPDATE : OperationType.CREATE, 'lesson_plans');
    } finally {
      setSaving(false);
    }
  };

  const exportPDF = async (format: 'a4' | 'legal' = 'a4', orientation: 'portrait' | 'landscape' = 'landscape') => {
    if (!pdfTemplateRef.current) return;
    await exportToPDF(pdfTemplateRef.current, {
      filename: `Lesson_Plan_${formData.lessonNo || 'Report'}_${formData.trade}.pdf`,
      orientation: orientation,
      format: format
    });
  };

  const exportExcel = () => {
    const data = [
      ["सैद्धांतिक पाठ नियोजन आराखडा (Lesson Plan)"],
      [],
      ["संस्थेचे नाव", formData.institute, "प्रशिक्षक", formData.instructorName],
      ["व्यवसाय", formData.trade, "बॅच", formData.batch],
      ["पाठाचे नाव", formData.lessonName, "पाठ क्र", formData.lessonNo],
      ["वेळ", `${formData.duration} ${formData.durationUnit}`, "तारीख", formData.plannedDate],
      [],
      ["अ.क्र.", "मुद्दे (Procedure)", "माहिती विषयक मुद्दे", "दृश्य सूचना"],
      ...procedures.map(p => [p.sr, p.procedure, p.information, p.visual])
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lesson Plan");
    XLSX.writeFile(wb, `Lesson_Plan_${formData.lessonNo}_${formData.trade}.xlsx`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px]">
        <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Loading lesson plan...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Button 
          type="button"
          variant="ghost" 
          onClick={onBack} 
          className="gap-2 text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> {t('back')}
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => exportPDF('legal', 'landscape')} className="gap-2 border-slate-200 text-slate-700 hover:bg-slate-50">
            <FileDown className="h-4 w-4" /> Legal Landscape
          </Button>
          <Button variant="outline" onClick={() => exportPDF('a4', 'landscape')} className="gap-2 border-slate-200 text-slate-700 hover:bg-slate-50">
            <FileDown className="h-4 w-4" /> A4 Landscape
          </Button>
          <Button variant="outline" onClick={() => exportPDF('a4', 'portrait')} className="gap-2 border-slate-200 text-slate-700 hover:bg-slate-50">
            <FileDown className="h-4 w-4" /> Standard Portrait
          </Button>
          <Button variant="outline" onClick={exportExcel} className="gap-2 border-slate-200 text-slate-700 hover:bg-slate-50">
            <FileSpreadsheet className="h-4 w-4" /> Excel Export
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-900 text-white p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">{t('lessonPlan')}</h2>
              <p className="text-slate-400 mt-1 font-medium">Lesson Plan Register • Technical Documentation</p>
            </div>
            <div className="flex gap-4">
              <div className="bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/10">
                <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">{t('currentStatus')}</p>
                <p className="text-sm font-bold">{planId ? t('updateRecord') : t('generate')}</p>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={(e) => handleSubmitWithAction(e, false)} className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-500">{t('instituteName')}</Label>
              <Input 
                value={formData.institute} 
                onChange={(e) => setFormData({ ...formData, institute: e.target.value })} 
                placeholder="ITI Name"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-500">{t('instructors')}</Label>
              <Input 
                value={formData.instructorName} 
                onChange={(e) => setFormData({ ...formData, instructorName: e.target.value })} 
                placeholder="Instructor Name"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-500">{t('trade')}</Label>
              <Select 
                value={formData.trade} 
                onValueChange={(v) => setFormData({ ...formData, trade: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectTrade')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Electrician">Electrician</SelectItem>
                  <SelectItem value="Fitter">Fitter</SelectItem>
                  <SelectItem value="Welder">Welder</SelectItem>
                  <SelectItem value="COPA">COPA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-500">{t('batch')}</Label>
              <Input 
                value={formData.batch} 
                onChange={(e) => setFormData({ ...formData, batch: e.target.value })} 
                placeholder="Batch"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2 lg:col-span-2">
              <Label className="text-xs font-bold uppercase text-slate-500">{t('lessonName')}</Label>
              <Input 
                value={formData.lessonName} 
                onChange={(e) => setFormData({ ...formData, lessonName: e.target.value })} 
                placeholder="Lesson Name"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-500">{t('lessonNo')}</Label>
              <Input 
                value={formData.lessonNo} 
                onChange={(e) => setFormData({ ...formData, lessonNo: e.target.value })} 
                placeholder="Lesson No"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-500">{t('duration')}</Label>
              <div className="flex gap-2">
                <Input 
                  type="number"
                  value={formData.duration} 
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })} 
                  placeholder="Duration"
                  className="w-2/3"
                />
                <Select 
                  value={formData.durationUnit} 
                  onValueChange={(v) => setFormData({ ...formData, durationUnit: v })}
                >
                  <SelectTrigger className="w-1/3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minutes">{t('min')}</SelectItem>
                    <SelectItem value="hours">{t('hrs')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-slate-500">{t('plannedDate')}</Label>
            <Input 
              type="date"
              value={formData.plannedDate} 
              onChange={(e) => setFormData({ ...formData, plannedDate: e.target.value })} 
              className="max-w-[200px]"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TableIcon className="h-5 w-5 text-slate-400" />
                <h3 className="font-bold text-slate-700">{t('procedure')} & {t('infoPoints')}</h3>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={addRow} className="h-8 gap-1">
                  <Plus className="h-3.5 w-3.5" /> {t('addRow')}
                </Button>
              </div>
            </div>

            <div className="border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    <th className="p-4 text-left w-12 text-[10px] font-black uppercase tracking-widest">अ.क्र.</th>
                    <th className="p-4 text-left w-1/4 text-[10px] font-black uppercase tracking-widest">{t('procedure')}</th>
                    <th className="p-4 text-left w-1/3 text-[10px] font-black uppercase tracking-widest">{t('infoPoints')}</th>
                    <th className="p-4 text-left text-[10px] font-black uppercase tracking-widest">{t('visualAids')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {procedures.map((p, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 group">
                      <td className="p-3 text-center font-bold text-slate-400 relative">
                        {p.sr}
                        <button 
                          type="button"
                          onClick={() => removeRow(i)}
                          className="absolute -left-2 top-1/2 -translate-y-1/2 p-1.5 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all no-print bg-white rounded-full shadow-sm border border-slate-100 z-10"
                          title={t('deleteRow')}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                      <td className="p-2">
                        <Textarea 
                          value={p.procedure} 
                          onChange={(e) => handleProcedureChange(i, 'procedure', e.target.value)}
                          className="min-h-[80px] border-none shadow-none focus-visible:ring-1 focus-visible:ring-slate-900/10 leading-relaxed text-slate-700 py-3"
                          placeholder={`${t('step')}...`}
                        />
                      </td>
                      <td className="p-2">
                        <Textarea 
                          value={p.information} 
                          onChange={(e) => handleProcedureChange(i, 'information', e.target.value)}
                          className="min-h-[80px] border-none shadow-none focus-visible:ring-1 focus-visible:ring-slate-900/10 leading-relaxed text-slate-700 py-3"
                          placeholder={`${t('details')}...`}
                        />
                      </td>
                      <td className="p-2">
                        <Textarea 
                          value={p.visual} 
                          onChange={(e) => handleProcedureChange(i, 'visual', e.target.value)}
                          className="min-h-[80px] border-none shadow-none focus-visible:ring-1 focus-visible:ring-slate-900/10 leading-relaxed text-slate-700 py-3"
                          placeholder={`${t('visualAids')}...`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
              onClick={handleAIByGemini} 
              disabled={isGenerating}
              className="gap-2 border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700 h-11 px-6"
            >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {t('aiGenerate')}
            </Button>
            <Button 
              type="submit" 
              disabled={saving} 
              className="gap-2 ml-auto bg-slate-700 hover:bg-slate-800 h-11 px-8"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {planId ? t('updateRecord') : t('savePlan')}
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
          <div className="text-center space-y-2 mb-10 border-b-2 border-black pb-6">
            <h1 className="text-4xl font-black uppercase tracking-tight">Directorate of Vocational Education & Training</h1>
            <h2 className="text-2xl font-bold">TECHNICAL LESSON PLAN REGISTER (DEPT. OF SKILL DEVELOPMENT)</h2>
          </div>

          <div className="grid grid-cols-2 gap-x-12 gap-y-4 mb-10 text-[15px]">
            <div className="flex gap-4 border-b border-slate-200 pb-1"><span className="font-bold w-32 uppercase text-slate-500 text-[11px] tracking-widest">Institute:</span> <span className="flex-1 font-medium">{formData.institute || '-'}</span></div>
            <div className="flex gap-4 border-b border-slate-200 pb-1"><span className="font-bold w-32 uppercase text-slate-500 text-[11px] tracking-widest">Batch:</span> <span className="flex-1 font-medium">{formData.batch || '-'}</span></div>
            <div className="flex gap-4 border-b border-slate-200 pb-1"><span className="font-bold w-32 uppercase text-slate-500 text-[11px] tracking-widest">Trade:</span> <span className="flex-1 font-medium">{formData.trade || '-'}</span></div>
            <div className="flex gap-4 border-b border-slate-200 pb-1"><span className="font-bold w-32 uppercase text-slate-500 text-[11px] tracking-widest">Lesson No:</span> <span className="flex-1 font-medium">{formData.lessonNo || '-'}</span></div>
            <div className="flex gap-4 border-b border-slate-200 pb-1"><span className="font-bold w-32 uppercase text-slate-500 text-[11px] tracking-widest">Instructor:</span> <span className="flex-1 font-medium">{formData.instructorName || '-'}</span></div>
            <div className="flex gap-4 border-b border-slate-200 pb-1"><span className="font-bold w-32 uppercase text-slate-500 text-[11px] tracking-widest">Duration:</span> <span className="flex-1 font-medium">{formData.duration} {formData.durationUnit}</span></div>
            <div className="flex gap-4 border-b border-slate-200 pb-1 col-span-2"><span className="font-bold w-32 uppercase text-slate-500 text-[11px] tracking-widest">Lesson Name:</span> <span className="flex-1 font-medium">{formData.lessonName || '-'}</span></div>
            <div className="flex gap-4 border-b border-slate-200 pb-1"><span className="font-bold w-32 uppercase text-slate-500 text-[11px] tracking-widest">Date:</span> <span className="flex-1 font-medium">{formData.plannedDate || '-'}</span></div>
          </div>

          <div className="mb-10 overflow-hidden rounded-xl border-2 border-black">
            <table className="w-full border-collapse text-[14px]">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="border border-white/20 p-4 text-center w-16 uppercase text-[11px] font-black tracking-widest">Sr. No.</th>
                  <th className="border border-white/20 p-4 text-left w-[38%] uppercase text-[11px] font-black tracking-widest">Procedure (Steps of Lesson)</th>
                  <th className="border border-white/20 p-4 text-left w-[32%] uppercase text-[11px] font-black tracking-widest">Information Points & Safety Precautions</th>
                  <th className="border border-white/20 p-4 text-left uppercase text-[11px] font-black tracking-widest">Visual Aids / Hand Tools Used</th>
                </tr>
              </thead>
              <tbody>
                {procedures.map((p, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="border border-black p-5 text-center font-bold align-top">{p.sr}</td>
                    <td className="border border-black p-5 align-top whitespace-pre-wrap leading-relaxed italic text-slate-700 font-medium">{p.procedure}</td>
                    <td className="border border-black p-5 align-top whitespace-pre-wrap leading-loose text-slate-900">{p.information}</td>
                    <td className="border border-black p-5 align-top whitespace-pre-wrap leading-relaxed font-bold text-blue-900">{p.visual}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Custom Fields in PDF */}
          {formData.customFields && formData.customFields.length > 0 && (
            <div className="mt-10 space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest border-b border-black pb-2">Additional Specifications</h3>
              <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                {formData.customFields.map((field, idx) => (
                  <div key={idx} className="flex gap-4 text-xs">
                    <span className="font-bold w-32 uppercase text-slate-500 text-[9px]">{field.label}:</span>
                    <span className="border-b border-black flex-1 font-medium">{String(field.value || '-')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attachments Section in PDF */}
          {formData.attachments && formData.attachments.length > 0 && (
            <div className="mt-10 space-y-4">
               <h3 className="text-sm font-black uppercase tracking-widest border-b border-black pb-2">Reference Attachments</h3>
               <div className="grid grid-cols-4 gap-4">
                 {formData.attachments.map((att, idx) => (
                    <div key={idx} className="space-y-2">
                       <div className="border border-black rounded-lg overflow-hidden aspect-square bg-slate-50 flex items-center justify-center">
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

          <div className="grid grid-cols-3 gap-8 mt-24 text-[9px] font-black text-center text-slate-500">
            <div className="space-y-4">
              <div className="border-t border-black w-48 mx-auto" />
              <p className="uppercase tracking-widest">Instructor Signature</p>
            </div>
            <div className="space-y-4">
              <div className="border-t border-black w-48 mx-auto" />
              <p className="uppercase tracking-widest">Principal / Supervisor</p>
            </div>
            <div className="space-y-4">
              <div className="border-t border-black w-48 mx-auto" />
              <p className="uppercase tracking-widest">Date of Review</p>
            </div>
          </div>
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
    </div>
  );
};
