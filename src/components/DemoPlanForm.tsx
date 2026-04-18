import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Sparkles, FileDown, Loader2, Plus, Trash2 } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useLanguage } from './LanguageContext';
import { jsPDF } from 'jspdf';
import html2pdf from 'html2pdf.js';
import { exportToPDF } from '../lib/pdfUtils';
import { GoogleGenAI, Type } from "@google/genai";
import { FormBuilder, CustomField } from './FormBuilder';
import { AttachmentBuilder, Attachment } from './AttachmentBuilder';

interface DemoPlanFormProps {
  planId?: string;
  onBack: () => void;
}

interface ProcedureRow {
  procedure: string;
  infoPoints: string;
  spotHints: string;
}

export const DemoPlanForm: React.FC<DemoPlanFormProps> = ({ planId, onBack }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(!!planId);
  const [saving, setSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const pdfTemplateRef = React.useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    institute: '',
    district: '',
    trade: 'Electrician',
    lessonName: '',
    lessonNo: '',
    time: '',
    plannedDate: '',
    instructorName: '',
    objectives: '',
    skills: '',
    tools: '',
    motivation: '',
    presentation: '',
    result: '',
    summary: '',
    studentInvolvement: '',
    customFields: [] as CustomField[],
    attachments: [] as Attachment[],
  });
  const [procedures, setProcedures] = useState<ProcedureRow[]>([
    { procedure: '', infoPoints: '', spotHints: '' }
  ]);

  useEffect(() => {
    if (planId) {
      fetchPlan();
    }
  }, [planId]);

  const fetchPlan = async () => {
    try {
      const docRef = doc(db, 'demo_plans', planId!);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setFormData({
          institute: data.institute || '',
          district: data.district || '',
          trade: data.trade || 'Electrician',
          lessonName: data.lessonName || '',
          lessonNo: data.lessonNo || '',
          time: data.time || '',
          plannedDate: data.plannedDate || '',
          instructorName: data.instructorName || '',
          objectives: data.objectives || '',
          skills: data.skills || '',
          tools: data.tools || '',
          motivation: data.motivation || '',
          presentation: data.presentation || '',
          result: data.result || '',
          summary: data.summary || '',
          studentInvolvement: data.studentInvolvement || '',
          customFields: data.customFields || [],
          attachments: data.attachments || [],
        });
        if (data.procedures) {
          setProcedures(data.procedures);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `demo_plans/${planId}`);
    } finally {
      setLoading(false);
    }
  };

  const addProcedureRow = () => {
    setProcedures([...procedures, { procedure: '', infoPoints: '', spotHints: '' }]);
  };

  const removeProcedureRow = (index: number) => {
    if (procedures.length > 1) {
      setProcedures(procedures.filter((_, i) => i !== index));
    }
  };

  const updateProcedureRow = (index: number, field: keyof ProcedureRow, value: string) => {
    const newProcedures = [...procedures];
    newProcedures[index][field] = value;
    setProcedures(newProcedures);
  };

  const handleAIByGemini = async () => {
    if (!formData.lessonName && !formData.trade) {
      toast.error("Please enter a Lesson Name or Trade to generate content.");
      return;
    }

    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

      const prompt = `Generate a technical demonstration plan for ITI (Industrial Training Institute) for the trade ${formData.trade} and lesson name "${formData.lessonName}". 
      Return ONLY a JSON object with the following fields:
      - institute: "Industrial Training Institute"
      - district: "Pune"
      - lessonName: "${formData.lessonName || 'Technical Demo'}"
      - lessonNo: "1"
      - time: "45"
      - plannedDate: "${new Date().toISOString().split('T')[0]}"
      - instructorName: "${user?.displayName || 'Instructor'}"
      - objectives: "1) Understand the core principles of ${formData.lessonName}\\n2) Master the practical skills required"
      - skills: "Observation, Drawing, Installation identification"
      - tools: "HB Pencil, Charts, Required Trade Tools"
      - motivation: "Students gain practical knowledge through direct observation."
      - presentation: "Demonstration will show all installation steps."
      - procedures: [
          { "procedure": "Introduction to tools", "infoPoints": "Safety first", "spotHints": "Check tool condition" },
          { "procedure": "Step by step demo", "infoPoints": "Follow standard procedure", "spotHints": "Observe student attention" }
        ]
      - result: "Students can successfully perform the task."
      - summary: "Key points covered: Tool safety, procedure steps."
      - studentInvolvement: "Active participation in observation and Q&A."
      
      Ensure the content is technical and accurate for the ITI curriculum.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              institute: { type: Type.STRING },
              district: { type: Type.STRING },
              lessonName: { type: Type.STRING },
              lessonNo: { type: Type.STRING },
              time: { type: Type.STRING },
              plannedDate: { type: Type.STRING },
              instructorName: { type: Type.STRING },
              objectives: { type: Type.STRING },
              skills: { type: Type.STRING },
              tools: { type: Type.STRING },
              motivation: { type: Type.STRING },
              presentation: { type: Type.STRING },
              procedures: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    procedure: { type: Type.STRING },
                    infoPoints: { type: Type.STRING },
                    spotHints: { type: Type.STRING }
                  },
                  required: ["procedure", "infoPoints", "spotHints"]
                }
              },
              result: { type: Type.STRING },
              summary: { type: Type.STRING },
              studentInvolvement: { type: Type.STRING }
            },
            required: [
              "institute", "district", "lessonName", "lessonNo", "time", 
              "plannedDate", "instructorName", "objectives", "skills", 
              "tools", "motivation", "presentation", "procedures", 
              "result", "summary", "studentInvolvement"
            ]
          }
        }
      });
      
      const text = response.text;
      if (text) {
        const aiData = JSON.parse(text);
        const { procedures: aiProcedures, ...restData } = aiData;
        setFormData(prev => ({
          ...prev,
          ...restData
        }));
        if (aiProcedures) {
          setProcedures(aiProcedures);
        }
        toast.success("Demonstration plan generated successfully!");
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
      instructorName: user?.displayName || "Instructor Name",
      institute: "EKVIRA PRIVATE I.T.I ERANDOL",
      district: "Jalgaon",
      lessonName: formData.lessonName || "I.T.I परिसर विविध इलेक्ट्रीकल इंस्टॉलेशन ओळखणे",
      lessonNo: "01",
      time: "45",
      objectives: "1) I.T.I परिसर विविध इंस्टॉलेशन ओळखणे\n2) सुरक्षितता नियम समजणे",
      skills: "ऑब्झर्वेशन, ड्रॉईंग, इंस्टॉलेशन ओळख",
      tools: "HB पेन्सिल, चार्ट, वायर, टूल्स",
      motivation: "विद्यार्थ्यांना प्रत्यक्ष निरीक्षणातून ज्ञान मिळते.",
      presentation: "प्रात्यक्षिकाद्वारे सर्व इंस्टॉलेशन दाखवले जातील.",
      result: "प्रात्यक्षिकाचा निष्कर्ष यशस्वी.",
      summary: "महत्त्वाचे मुद्दे: सुरक्षा, प्रक्रिया.",
      studentInvolvement: "विद्यार्थ्यांचा सक्रिय सहभाग."
    });
    setProcedures([
      { procedure: "Step by step procedure लिहा...", infoPoints: "Information points आणि Safety rules लिहा...", spotHints: "Questions / Hints / Showing points लिहा..." }
    ]);
    toast.info("Generated sample data.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    try {
      const planData = {
        ...formData,
        procedures,
        instructorId: user.uid,
        updatedAt: new Date().toISOString(),
      };

      if (planId) {
        await updateDoc(doc(db, 'demo_plans', planId), planData);
        toast.success('Demonstration plan updated successfully');
      } else {
        await addDoc(collection(db, 'demo_plans'), {
          ...planData,
          createdAt: new Date().toISOString(),
        });
        toast.success('Demonstration plan saved successfully');
      }
      onBack();
    } catch (error) {
      handleFirestoreError(error, planId ? OperationType.UPDATE : OperationType.CREATE, 'demo_plans');
    } finally {
      setSaving(false);
    }
  };

  const exportPDF = async (format: 'a4' | 'legal' = 'a4', orientation: 'portrait' | 'landscape' = 'landscape') => {
    if (!pdfTemplateRef.current) return;
    await exportToPDF(pdfTemplateRef.current, {
      filename: `Demo_Plan_${formData.lessonNo || 'Report'}.pdf`,
      orientation: orientation,
      format: format
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px]">
        <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Loading demonstration plan...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
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
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-900 text-white p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">{t('demoPlan')}</h2>
              <p className="text-slate-400 mt-1 font-medium">Demonstration Plan Register • Technical Documentation</p>
            </div>
            <div className="bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/10">
              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">{t('currentStatus')}</p>
              <p className="text-sm font-bold">{planId ? t('updateRecord') : t('generate')}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <Label htmlFor="institute" className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('instituteName')}</Label>
              <Input 
                id="institute" 
                value={formData.institute} 
                onChange={(e) => setFormData({ ...formData, institute: e.target.value })} 
                placeholder="ITI Name"
                className="h-11 border-slate-200 focus:ring-slate-900"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="district" className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('district')}</Label>
              <Input 
                id="district" 
                value={formData.district} 
                onChange={(e) => setFormData({ ...formData, district: e.target.value })} 
                placeholder="District"
                className="h-11 border-slate-200 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <Label htmlFor="trade" className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('trade')}</Label>
              <Select 
                value={formData.trade} 
                onValueChange={(v) => setFormData({ ...formData, trade: v })}
              >
                <SelectTrigger className="h-11 border-slate-200">
                  <SelectValue placeholder={t('selectTrade')} />
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
            <div className="space-y-3">
              <Label htmlFor="lessonName" className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('lessonName')}</Label>
              <Input 
                id="lessonName" 
                value={formData.lessonName} 
                onChange={(e) => setFormData({ ...formData, lessonName: e.target.value })} 
                placeholder="e.g. Arc Welding Safety"
                className="h-11 border-slate-200 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <Label htmlFor="lessonNo" className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('lessonNo')}</Label>
              <Input 
                id="lessonNo" 
                type="number"
                value={formData.lessonNo} 
                onChange={(e) => setFormData({ ...formData, lessonNo: e.target.value })} 
                className="h-11 border-slate-200 focus:ring-slate-900"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="time" className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('duration')} ({t('min')})</Label>
              <Input 
                id="time" 
                type="number"
                value={formData.time} 
                onChange={(e) => setFormData({ ...formData, time: e.target.value })} 
                className="h-11 border-slate-200 focus:ring-slate-900"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="plannedDate" className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('plannedDate')}</Label>
              <Input 
                id="plannedDate" 
                type="date"
                value={formData.plannedDate} 
                onChange={(e) => setFormData({ ...formData, plannedDate: e.target.value })} 
                className="h-11 border-slate-200 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="instructorName" className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('instructors')}</Label>
            <Input 
              id="instructorName" 
              value={formData.instructorName} 
              onChange={(e) => setFormData({ ...formData, instructorName: e.target.value })} 
              placeholder="Instructor Name"
              className="h-11 border-slate-200 focus:ring-slate-900"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <Label htmlFor="objectives" className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('objectives')}</Label>
              <Textarea 
                id="objectives" 
                value={formData.objectives} 
                onChange={(e) => setFormData({ ...formData, objectives: e.target.value })} 
                placeholder={t('objectives')}
                rows={3}
                className="border-slate-200 focus:ring-slate-900"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="skills" className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('skillsLearned')}</Label>
              <Textarea 
                id="skills" 
                value={formData.skills} 
                onChange={(e) => setFormData({ ...formData, skills: e.target.value })} 
                placeholder={t('skillsLearned')}
                rows={2}
                className="border-slate-200 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <Label htmlFor="tools" className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('toolsUsed')}</Label>
              <Textarea 
                id="tools" 
                value={formData.tools} 
                onChange={(e) => setFormData({ ...formData, tools: e.target.value })} 
                placeholder={t('toolsUsed')}
                rows={2}
                className="border-slate-200 focus:ring-slate-900"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="motivation" className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('motivation')}</Label>
              <Textarea 
                id="motivation" 
                value={formData.motivation} 
                onChange={(e) => setFormData({ ...formData, motivation: e.target.value })} 
                placeholder={t('motivation')}
                rows={2}
                className="border-slate-200 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="presentation" className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('presentation')}</Label>
            <Textarea 
              id="presentation" 
              value={formData.presentation} 
              onChange={(e) => setFormData({ ...formData, presentation: e.target.value })} 
              placeholder={t('presentation')}
              rows={3}
              className="border-slate-200 focus:ring-slate-900"
            />
          </div>

          <div className="space-y-6 pt-8 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">{t('procedure')} तक्ता (Procedure Table)</h3>
              <Button type="button" variant="outline" size="sm" onClick={addProcedureRow} className="gap-2">
                <Plus className="h-4 w-4" /> {t('addRow')}
              </Button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="p-4 text-left text-[10px] font-black uppercase tracking-widest w-[40%]">{t('procedure')} (DOING)</th>
                    <th className="p-4 text-left text-[10px] font-black uppercase tracking-widest w-[30%]">{t('infoPoints')} & SAFETY (TELLING)</th>
                    <th className="p-4 text-left text-[10px] font-black uppercase tracking-widest w-[25%]">{t('spotHints')} / QUESTIONS (ASKING / SHOWING)</th>
                    <th className="p-4 text-center text-[10px] font-black uppercase tracking-widest w-[5%]">ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {procedures.map((row, index) => (
                    <tr key={index} className="border-b border-slate-200">
                      <td className="p-2 border-x border-slate-200">
                        <Textarea 
                          value={row.procedure} 
                          onChange={(e) => updateProcedureRow(index, 'procedure', e.target.value)}
                          placeholder={`${t('step')}...`}
                          className="min-h-[100px] border-none focus:ring-0 resize-none"
                        />
                      </td>
                      <td className="p-2 border-x border-slate-200">
                        <Textarea 
                          value={row.infoPoints} 
                          onChange={(e) => updateProcedureRow(index, 'infoPoints', e.target.value)}
                          placeholder={`${t('details')}...`}
                          className="min-h-[100px] border-none focus:ring-0 resize-none leading-relaxed text-slate-700 py-3"
                        />
                      </td>
                      <td className="p-2 border-x border-slate-200">
                        <Textarea 
                          value={row.spotHints} 
                          onChange={(e) => updateProcedureRow(index, 'spotHints', e.target.value)}
                          placeholder={`${t('spotHints')}...`}
                          className="min-h-[100px] border-none focus:ring-0 resize-none leading-relaxed text-slate-700 py-3"
                        />
                      </td>
                      <td className="p-2 border-x border-slate-200 text-center">
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => removeProcedureRow(index)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          disabled={procedures.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-slate-100">
            <div className="space-y-3">
              <Label htmlFor="result" className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('result')}</Label>
              <Textarea 
                id="result" 
                value={formData.result} 
                onChange={(e) => setFormData({ ...formData, result: e.target.value })} 
                placeholder={t('result')}
                rows={2}
                className="border-slate-200 focus:ring-slate-900"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="summary" className="text-xs font-bold uppercase tracking-wider text-slate-500">तपशील (Summary)</Label>
              <Textarea 
                id="summary" 
                value={formData.summary} 
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })} 
                placeholder="Summary"
                rows={2}
                className="border-slate-200 focus:ring-slate-900"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="studentInvolvement" className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('studentInvolvement')}</Label>
              <Textarea 
                id="studentInvolvement" 
                value={formData.studentInvolvement} 
                onChange={(e) => setFormData({ ...formData, studentInvolvement: e.target.value })} 
                placeholder={t('studentInvolvement')}
                rows={2}
                className="border-slate-200 focus:ring-slate-900"
              />
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
            <Button type="submit" disabled={saving} className="gap-2 ml-auto bg-slate-900 hover:bg-slate-800 h-11 px-8">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {planId ? t('updateRecord') : t('savePlan')}
            </Button>
          </div>
        </form>
      </div>

      {/* PDF Hidden Template (Devanagari Support & Optimized Landscape) */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div ref={pdfTemplateRef} className="p-10 bg-white text-black font-['Noto_Sans_Devanagari',_sans-serif]" style={{ width: '1280px' }}>
          <div className="text-center space-y-2 mb-10">
            <h1 className="text-4xl font-black uppercase tracking-tight">Directorate of Vocational Education & Training</h1>
            <h2 className="text-2xl font-bold border-b-2 border-black pb-4">DEMONSTRATION PLAN REGISTER (TECHNICAL REPORT)</h2>
          </div>

          <div className="grid grid-cols-2 gap-x-16 gap-y-4 mb-10 text-[15px]">
            <div className="flex gap-4 border-b border-slate-200 pb-1"><span className="font-bold w-32 uppercase text-slate-500 text-[11px] tracking-widest">Institute:</span> <span className="flex-1 font-medium">{formData.institute || '-'}</span></div>
            <div className="flex gap-4 border-b border-slate-200 pb-1"><span className="font-bold w-32 uppercase text-slate-500 text-[11px] tracking-widest">Lesson No:</span> <span className="flex-1 font-medium">{formData.lessonNo || '-'}</span></div>
            <div className="flex gap-4 border-b border-slate-200 pb-1"><span className="font-bold w-32 uppercase text-slate-500 text-[11px] tracking-widest">District:</span> <span className="flex-1 font-medium">{formData.district || '-'}</span></div>
            <div className="flex gap-4 border-b border-slate-200 pb-1"><span className="font-bold w-32 uppercase text-slate-500 text-[11px] tracking-widest">Duration:</span> <span className="flex-1 font-medium">{formData.time} Min</span></div>
            <div className="flex gap-4 border-b border-slate-200 pb-1"><span className="font-bold w-32 uppercase text-slate-500 text-[11px] tracking-widest">Trade:</span> <span className="flex-1 font-medium">{formData.trade || '-'}</span></div>
            <div className="flex gap-4 border-b border-slate-200 pb-1"><span className="font-bold w-32 uppercase text-slate-500 text-[11px] tracking-widest">Date:</span> <span className="flex-1 font-medium">{formData.plannedDate || '-'}</span></div>
            <div className="flex gap-4 border-b border-slate-200 pb-1 col-span-2"><span className="font-bold w-32 uppercase text-slate-500 text-[11px] tracking-widest">Instructor:</span> <span className="flex-1 font-medium">{formData.instructorName || '-'}</span></div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-10">
            <div className="p-5 border-2 border-black rounded-xl bg-slate-50/50">
              <h3 className="font-black uppercase text-[12px] mb-3 border-b-2 border-black pb-2 tracking-widest flex items-center justify-between">
                1. Objectives 
                <span className="text-[10px] lowercase font-normal text-slate-500 italic">(उद्देश्य)</span>
              </h3>
              <p className="whitespace-pre-wrap leading-relaxed text-[14px] min-h-[100px]">{formData.objectives || '-'}</p>
            </div>
            <div className="p-5 border-2 border-black rounded-xl bg-slate-50/50">
              <h3 className="font-black uppercase text-[12px] mb-3 border-b-2 border-black pb-2 tracking-widest flex items-center justify-between">
                2. Tools & Equipments 
                <span className="text-[10px] lowercase font-normal text-slate-500 italic">(साधने व उपकरणे)</span>
              </h3>
              <p className="whitespace-pre-wrap leading-relaxed text-[14px] min-h-[100px]">{formData.tools || '-'}</p>
            </div>
            <div className="p-5 border-2 border-black rounded-xl bg-slate-50/50">
              <h3 className="font-black uppercase text-[12px] mb-3 border-b-2 border-black pb-2 tracking-widest flex items-center justify-between">
                3. Skills to be Learned 
                <span className="text-[10px] lowercase font-normal text-slate-500 italic">(हस्तगत करण्याचे कौशल्य)</span>
              </h3>
              <p className="whitespace-pre-wrap leading-relaxed text-[14px] min-h-[80px]">{formData.skills || '-'}</p>
            </div>
            <div className="p-5 border-2 border-black rounded-xl bg-slate-50/50">
              <h3 className="font-black uppercase text-[12px] mb-3 border-b-2 border-black pb-2 tracking-widest flex items-center justify-between">
                4. Motivation 
                <span className="text-[10px] lowercase font-normal text-slate-500 italic">(पूर्वज्ञान / प्रेरणा)</span>
              </h3>
              <p className="whitespace-pre-wrap leading-relaxed text-[14px] min-h-[80px]">{formData.motivation || '-'}</p>
            </div>
          </div>

          <div className="mb-10 overflow-hidden rounded-xl border-2 border-black">
            <table className="w-full border-collapse text-[14px]">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="border border-white/20 p-4 text-center w-16 uppercase text-[11px] font-black tracking-widest">Sr.</th>
                  <th className="border border-white/20 p-4 text-left w-[38%] uppercase text-[11px] font-black tracking-widest">Procedure (Doing Step)</th>
                  <th className="border border-white/20 p-4 text-left w-[32%] uppercase text-[11px] font-black tracking-widest">Information Points (Telling Step)</th>
                  <th className="border border-white/20 p-4 text-left uppercase text-[11px] font-black tracking-widest">Spot Hints / Questions (Asking)</th>
                </tr>
              </thead>
              <tbody>
                {procedures.map((p, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="border border-black p-5 text-center font-bold align-top">{i + 1}</td>
                    <td className="border border-black p-5 align-top whitespace-pre-wrap leading-loose font-medium text-slate-800">{p.procedure}</td>
                    <td className="border border-black p-5 align-top whitespace-pre-wrap leading-relaxed italic text-slate-700">{p.infoPoints}</td>
                    <td className="border border-black p-5 align-top whitespace-pre-wrap leading-relaxed font-bold text-slate-900 text-[13px]">{p.spotHints}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-3 gap-8 mb-10 p-page">
            <div className="p-5 border-2 border-black rounded-xl bg-slate-50/50">
              <h3 className="font-black uppercase text-[11px] mb-3 border-b-2 border-black pb-2 tracking-widest">Result (निष्कर्ष)</h3>
              <p className="whitespace-pre-wrap leading-relaxed text-[13px] min-h-[80px]">{formData.result || '-'}</p>
            </div>
            <div className="p-5 border-2 border-black rounded-xl bg-slate-50/50">
              <h3 className="font-black uppercase text-[11px] mb-3 border-b-2 border-black pb-2 tracking-widest">Summary (सारांश)</h3>
              <p className="whitespace-pre-wrap leading-relaxed text-[13px] min-h-[80px]">{formData.summary || '-'}</p>
            </div>
            <div className="p-5 border-2 border-black rounded-xl bg-slate-50/50">
              <h3 className="font-black uppercase text-[11px] mb-3 border-b-2 border-black pb-2 tracking-widest">Student Involvement</h3>
              <p className="whitespace-pre-wrap leading-relaxed text-[13px] min-h-[80px]">{formData.studentInvolvement || '-'}</p>
            </div>
          </div>

          {/* Custom Fields in PDF */}
          {formData.customFields && formData.customFields.length > 0 && (
            <div className="mt-10 space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest border-b border-black pb-2">Technical Specifications</h3>
              <div className="grid grid-cols-2 gap-x-12 gap-y-4 transition-all">
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
               <h3 className="text-sm font-black uppercase tracking-widest border-b border-black pb-2">Reference Graphics & Documentation</h3>
               <div className="grid grid-cols-4 gap-4">
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

          <div className="grid grid-cols-3 gap-8 mt-24 text-[9px] font-black text-center text-slate-500 pb-12">
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
    </div>
  );
};
