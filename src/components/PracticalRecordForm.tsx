import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { 
  Save, 
  Trash2, 
  Plus, 
  GraduationCap, 
  ArrowLeft, 
  Loader2, 
  Sparkles,
  Lock,
  Unlock,
  Upload,
  FileDown,
  FileSpreadsheet,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppSettings } from './AppSettingsContext';
import { exportToExcel, exportUsingTemplate, prepareTemplateData } from '../lib/excelUtils';
import html2pdf from 'html2pdf.js';
import { exportToPDF } from '../lib/pdfUtils';
import { GoogleGenAI, Type } from "@google/genai";
import { FormBuilder, CustomField } from './FormBuilder';
import { AttachmentBuilder, Attachment } from './AttachmentBuilder';

interface TableRow {
  col1: string;
  col2: string;
  col3: string;
  col4: string;
}

interface PracticalRecord {
  trade: string;
  practicalNo: string;
  module: string;
  date: string;
  studentName: string;
  year: string;
  rollNo: string;
  title: string;
  objective: string;
  tools: string;
  skill: string;
  procedure: string[];
  table: TableRow[];
  conclusion: string;
  precaution: string;
  imageUrl: string;
  customFields?: CustomField[];
  attachments?: Attachment[];
}

export const PracticalRecordForm: React.FC<{ onBack: () => void, recordId?: string }> = ({ onBack, recordId }) => {
  const { user } = useAuth();
  const { settings } = useAppSettings();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(!!recordId);
  const pdfTemplateRef = React.useRef<HTMLDivElement>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportFormat, setExportFormat] = useState<'a4' | 'legal'>('a4');
  
  const [formData, setFormData] = useState<PracticalRecord>({
    trade: "Electrician",
    practicalNo: "",
    module: "७. मूलभूत वायरिंग अभ्यास",
    date: "",
    studentName: "",
    year: "२०२३-२४",
    rollNo: "",
    title: "",
    objective: "",
    tools: "",
    skill: "",
    procedure: [""],
    table: [{ col1: "", col2: "", col3: "", col4: "" }],
    conclusion: "प्रात्यक्षिक तांत्रिकदृष्ट्या यशस्वीरीत्या पूर्ण झाले आणि वायरिंगचे कार्य समाधानकारक आढळले.",
    precaution: "",
    imageUrl: "",
    customFields: [],
    attachments: []
  });

  useEffect(() => {
    if (recordId) {
      fetchRecord();
    }
  }, [recordId]);

  const fetchRecord = async () => {
    const path = `practical_records/${recordId}`;
    try {
      const docRef = doc(db, 'practical_records', recordId!);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setFormData(docSnap.data() as PracticalRecord);
      } else {
        toast.error('Record not found');
        onBack();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof PracticalRecord, value: any) => {
    if (isLocked) return;
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const adjustTextareaHeight = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    target.style.height = 'inherit';
    target.style.height = `${target.scrollHeight}px`;
  };

  const handleProcedureChange = (index: number, value: string) => {
    if (isLocked) return;
    const newProcedure = [...formData.procedure];
    newProcedure[index] = value;
    setFormData(prev => ({ ...prev, procedure: newProcedure }));
  };

  const addProcedureStep = () => {
    if (isLocked) return;
    setFormData(prev => ({ ...prev, procedure: [...prev.procedure, ""] }));
  };

  const removeProcedureStep = (index: number) => {
    if (isLocked) return;
    if (formData.procedure.length === 1) return;
    const newProcedure = formData.procedure.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, procedure: newProcedure }));
  };

  const handleTableRowChange = (index: number, field: keyof TableRow, value: string) => {
    if (isLocked) return;
    const newTable = [...formData.table];
    newTable[index] = { ...newTable[index], [field]: value };
    setFormData(prev => ({ ...prev, table: newTable }));
  };

  const addTableRow = () => {
    if (isLocked) return;
    setFormData(prev => ({ ...prev, table: [...prev.table, { col1: "", col2: "", col3: "", col4: "" }] }));
  };

  const removeTableRow = (index: number) => {
    if (isLocked) return;
    if (formData.table.length === 1) return;
    const newTable = formData.table.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, table: newTable }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLocked) return;
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData(prev => ({ ...prev, imageUrl: event.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const generateWithAI = async () => {
    if (!formData.title) {
      toast.error("कृपया प्रात्यक्षिकाचे नाव लिहा!");
      return;
    }

    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Bharat Skills (CTS) ITI ${formData.trade} syllabus chya aadhare '${formData.title}' (Module: ${formData.module}) ya practical chi saptar mahiti Marathi bhashet dya. Visheshataha '५. कृती (Procedure)' ha bhag atishay savistar (detailed) aani kamit kami 400-500 shabdancha asava. '६. निरीक्षण तक्ता' sathi 4 columns ahet: तपासलेला घटक, रीडिंग/माप, प्रकार, शेरा. Tyachi yogya mahiti dya.`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config: {
          systemInstruction: "You are an expert ITI Instructor. Generate accurate practical record sheet details in Marathi language based on the provided practical name. Follow standard ITI CTS guidelines. *CRITICAL*: The 'Procedure' (कृती) section MUST be extremely detailed, extensive, and thoroughly explain every technical step, aiming for around 400-500 words for that section alone. Break it down into 15 to 25 long, descriptive steps.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              objective: { type: Type.STRING },
              tools: { type: Type.STRING },
              skill: { type: Type.STRING },
              procedure: { type: Type.ARRAY, items: { type: Type.STRING } },
              tableRows: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT,
                  properties: {
                    col1: { type: Type.STRING },
                    col2: { type: Type.STRING },
                    col3: { type: Type.STRING },
                    col4: { type: Type.STRING }
                  }
                }
              },
              conclusion: { type: Type.STRING },
              precaution: { type: Type.STRING }
            }
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      
      setFormData(prev => ({
        ...prev,
        objective: result.objective || prev.objective,
        tools: result.tools || prev.tools,
        skill: result.skill || prev.skill,
        procedure: result.procedure || prev.procedure,
        table: result.tableRows || prev.table,
        conclusion: result.conclusion || prev.conclusion,
        precaution: result.precaution || prev.precaution
      }));
      
      toast.success('AI generated content successfully!');
    } catch (error) {
      console.error('AI Generation Error:', error);
      toast.error('Failed to generate content with AI');
    } finally {
      setIsGenerating(false);
    }
  };

  const exportPDF = async (format: 'a4' | 'legal' = 'a4') => {
    if (!pdfTemplateRef.current) return;
    await exportToPDF(pdfTemplateRef.current, {
      filename: `Practical_Record_${formData.practicalNo || 'Report'}_${formData.studentName}.pdf`,
      orientation: 'portrait',
      format: format
    });
  };

  const exportExcel = async () => {
    if (!settings.docSettings) return;

    // Check for custom template
    const customTemplate = settings.excelTemplates?.find(t => t.pageName === 'practical-record');

    if (customTemplate) {
      try {
        const templateData = prepareTemplateData(formData, customTemplate.mappings);
        await exportUsingTemplate(customTemplate.fileBase64, templateData, `Custom_Practical_${formData.studentName}.xlsx`);
        toast.success('Custom Template Excel exported.');
        return;
      } catch (err) {
        toast.error('Template export failed. Using default.');
      }
    }

    const exportData = {
      title: "प्रात्यक्षिक रेकॉर्ड (Practical Record)",
      subtitle: `${formData.studentName} | Trade: ${formData.trade} | Roll No: ${formData.rollNo}`,
      headers: ["Practical Name", "Objective", "Skill", "Conclusion"],
      rows: [
        [formData.title, formData.objective, formData.skill, formData.conclusion]
      ],
      colWidths: [40, 40, 20, 30]
    };

    try {
      await exportToExcel(exportData, settings.docSettings, `Practical_${formData.studentName}_${formData.practicalNo}.xlsx`);
      toast.success('Professional Excel Report generated.');
    } catch (err) {
      toast.error('Failed to export Excel.');
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!formData.title || !formData.practicalNo) {
      toast.error('Please fill in Practical No and Title');
      return;
    }

    setIsSaving(true);
    const path = 'practical_records';
    try {
      const dataToSave = {
        ...formData,
        instructorId: user.uid,
        updatedAt: new Date().toISOString()
      };

      if (recordId) {
        await updateDoc(doc(db, 'practical_records', recordId), dataToSave);
        toast.success('Record updated successfully!');
      } else {
        await addDoc(collection(db, 'practical_records'), {
          ...dataToSave,
          createdAt: new Date().toISOString()
        });
        toast.success('Record saved successfully!');
      }
      onBack();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px]">
        <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Loading record data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <style>{`
        .a4-page {
          width: 210mm;
          min-height: 297mm;
          padding: 12mm;
          margin: 10px auto;
          background: white;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
          position: relative;
          box-sizing: border-box;
          font-family: 'Noto Sans Devanagari', 'Hind', sans-serif;
        }

        .legal-page {
          width: 215.9mm;
          min-height: 355.6mm;
          padding: 12mm;
          margin: 10px auto;
          background: white;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
          position: relative;
          box-sizing: border-box;
          font-family: 'Noto Sans Devanagari', 'Hind', sans-serif;
        }

        .print-border {
          border: 4px double #000;
          padding: 8mm;
          min-height: calc(100% - 16mm);
          display: flex;
          flex-direction: column;
        }

        .doc-header-top {
          text-align: center;
          border-bottom: 2px solid #000;
          margin-bottom: 20px;
          padding-bottom: 15px;
        }

        .institute-name {
          font-size: 20px;
          font-weight: 900;
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .dept-name {
          font-size: 14px;
          font-weight: 700;
          color: #374151;
          margin-bottom: 10px;
        }

        .record-title {
          background: #000;
          color: #fff;
          display: inline-block;
          padding: 6px 25px;
          font-size: 16px;
          font-weight: 700;
          border-radius: 4px;
          letter-spacing: 1px;
        }

        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
          font-size: 13px;
        }

        .info-item {
          display: flex;
          gap: 8px;
          border-bottom: 1.5px dotted #94a3b8;
          padding-bottom: 4px;
        }

        .info-label { font-weight: 800; min-width: 90px; color: #000; }
        .info-value { color: #1e40af; font-family: 'Hind', sans-serif; font-weight: 600; }

        .heading-section {
          font-size: 14px;
          font-weight: 900;
          margin-top: 20px;
          margin-bottom: 8px;
          border-left: 5px solid #000;
          padding: 4px 10px;
          background: #f8fafc;
        }

        .procedure-list { 
          font-size: 13px; 
          line-height: 1.8; 
          margin-left: 25px; 
          list-style-type: decimal; 
        }

        .procedure-list li {
          margin-bottom: 6px; 
          border-bottom: 1px dashed #e5e7eb;
          padding-bottom: 4px;
        }

        .observation-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        .observation-table th, .observation-table td { border: 1.5px solid #000; padding: 10px 8px; font-size: 12px; text-align: center; }
        .observation-table th { background: #f3f4f6; font-weight: 800; text-transform: uppercase; font-size: 11px; }

        .diagram-container {
          border: 1.5px solid #000;
          min-height: 250px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 10px 0;
          background: #fafafa;
          padding: 10px;
        }

        .footer-signatures {
          display: flex;
          justify-content: space-between;
          margin-top: auto;
          padding-top: 50px;
        }

        .sig-box {
          border-top: 2px solid #000;
          width: 38%;
          text-align: center;
          font-size: 13px;
          font-weight: 800;
          padding-top: 8px;
        }

        .handwritten-input {
          border: none;
          background: transparent;
          color: #1e40af;
          padding: 2px 4px;
          outline: none;
          width: 100%;
          font-family: 'Hind', sans-serif;
          font-weight: 600;
        }

        textarea.handwritten-input {
          resize: none;
          line-height: 1.7;
        }

        @media print {
          .no-print { display: none !important; }
          .a4-page, .legal-page { margin: 0 !important; box-shadow: none !important; border: none !important; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      <div className="flex justify-between items-center no-print sticky top-0 bg-slate-50/80 backdrop-blur-sm z-50 p-4 border-b -mx-4 -mt-6 mb-6">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
          <div className="flex gap-2">
            {!isLocked && (
              <Button 
                variant="outline" 
                onClick={generateWithAI} 
                disabled={isGenerating}
                className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              >
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                AI Content
              </Button>
            )}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <Button size="sm" variant={exportFormat === 'a4' ? 'secondary' : 'ghost'} onClick={() => setExportFormat('a4')} className="h-8 text-[10px] uppercase font-bold px-3">A4</Button>
              <Button size="sm" variant={exportFormat === 'legal' ? 'secondary' : 'ghost'} onClick={() => setExportFormat('legal')} className="h-8 text-[10px] uppercase font-bold px-3">Legal</Button>
            </div>
            <Button variant="outline" onClick={() => exportPDF(exportFormat)} className="gap-2 border-purple-200 text-purple-700">
              <FileDown className="h-4 w-4" /> PDF
            </Button>
            <Button variant="outline" onClick={exportExcel} className="gap-2 border-orange-200 text-orange-700">
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </Button>
            <Button 
              variant={isLocked ? "secondary" : "outline"} 
              onClick={() => setIsLocked(!isLocked)}
              className="gap-2"
            >
              {isLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              {isLocked ? "Unlock Form" : "Lock Form"}
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="gap-2 bg-slate-900">
              <Save className="h-4 w-4" /> {isSaving ? 'Saving...' : 'Save Record'}
            </Button>
          </div>
      </div>

      <div className="document-layout" ref={pdfTemplateRef}>
        <div className={exportFormat === 'legal' ? 'legal-page' : 'a4-page'}>
          <div className={`print-border ${isLocked ? 'locked' : ''}`}>
            <div className="doc-header-top">
              <div className="institute-name">श्री झेंडूजी महाराज शैक्षणिक व क्रीडा मंडळ चितोडे संचालित</div>
              <div className="dept-name">श्री गणेश खाजगी औद्योगिक प्रशिक्षण संस्था यावल</div>
              <div className="record-title">PRACTICAL RECORD</div>
            </div>

            <div className="info-grid">
              <div className="space-y-2">
                <div className="info-item">
                  <span className="info-label">ट्रेड:</span>
                  <input className="handwritten-input flex-1" value={formData.trade} onChange={(e) => handleInputChange('trade', e.target.value)} />
                </div>
                <div className="info-item">
                  <span className="info-label">प्रशिक्षणार्थी:</span>
                  <input className="handwritten-input flex-1" value={formData.studentName} onChange={(e) => handleInputChange('studentName', e.target.value)} />
                </div>
                <div className="info-item">
                  <span className="info-label">प्रात्यक्षिक क्र:</span>
                  <input className="handwritten-input flex-1" value={formData.practicalNo} onChange={(e) => handleInputChange('practicalNo', e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="info-item">
                  <span className="info-label">तारीख:</span>
                  <input type="text" className="handwritten-input flex-1" value={formData.date} onChange={(e) => handleInputChange('date', e.target.value)} placeholder="___/___/२०२__" />
                </div>
                <div className="info-item">
                  <span className="info-label">वर्ष/सत्र:</span>
                  <input className="handwritten-input flex-1" value={formData.year} onChange={(e) => handleInputChange('year', e.target.value)} />
                </div>
                <div className="info-item">
                  <span className="info-label">रोल क्र:</span>
                  <input className="handwritten-input flex-1" value={formData.rollNo} onChange={(e) => handleInputChange('rollNo', e.target.value)} />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-4 border-b-2 border-slate-900 pb-2">
              <span className="font-bold text-sm min-w-[120px]">प्रात्यक्षिकाचे नाव:</span>
              <input className="handwritten-input flex-1 text-lg font-bold" value={formData.title} onChange={(e) => handleInputChange('title', e.target.value)} />
              {!isLocked && (
                <Button size="sm" variant="secondary" onClick={generateWithAI} disabled={isGenerating} className="no-print h-7 text-xs gap-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
                  {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  AI ने भरा
                </Button>
              )}
            </div>

            <div className="mb-4">
              <div className="heading-section">१. उद्देश (Objective)</div>
              <textarea className="handwritten-input w-full min-h-[40px]" value={formData.objective} onChange={(e) => handleInputChange('objective', e.target.value)} onInput={adjustTextareaHeight} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
              <div className="col-span-2">
                <div className="heading-section">२. आकृती (Technical Drawing)</div>
                <div className="diagram-container relative group">
                  {formData.imageUrl ? (
                    <>
                      <img src={formData.imageUrl} alt="Drawing" className="max-h-full max-w-full object-contain" />
                      {!isLocked && (
                        <button onClick={() => handleInputChange('imageUrl', '')} className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity no-print"><X className="h-4 w-4" /></button>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-400 no-print">
                      <Upload className="h-8 w-8" />
                      <span className="text-xs font-bold uppercase tracking-wider">Upload Schematic</span>
                      <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageUpload} />
                    </div>
                  )}
                </div>
              </div>
              <div>
                <div className="heading-section">३. साधने व उपकरणे</div>
                <textarea className="handwritten-input w-full min-h-[180px]" value={formData.tools} onChange={(e) => handleInputChange('tools', e.target.value)} onInput={adjustTextareaHeight} />
              </div>
            </div>

            <div className="mb-4">
              <div className="heading-section">४. कौशल्य (Skill)</div>
              <input className="handwritten-input w-full" value={formData.skill} onChange={(e) => handleInputChange('skill', e.target.value)} />
            </div>

            <div className="mb-4">
              <div className="flex justify-between items-center heading-section pr-2">
                <span>५. कृती (Procedure)</span>
                {!isLocked && (
                  <Button size="icon-xs" variant="ghost" onClick={addProcedureStep} className="no-print h-5 w-5 hover:bg-slate-200">
                    <Plus className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <ol className="procedure-list mt-2">
                {formData.procedure.map((step, idx) => (
                  <li key={idx} className="relative group">
                    <textarea className="handwritten-input w-full min-h-[20px]" rows={1} value={step} onChange={(e) => handleProcedureChange(idx, e.target.value)} />
                    {!isLocked && formData.procedure.length > 1 && (
                      <button onClick={() => removeProcedureStep(idx)} className="absolute -right-6 top-1 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity no-print"><Trash2 className="h-3 w-3" /></button>
                    )}
                  </li>
                ))}
              </ol>
            </div>

            <div className="mb-4">
              <div className="flex justify-between items-center heading-section pr-2">
                <span>६. निरीक्षण तक्ता (Observation Table)</span>
                {!isLocked && (
                  <Button size="icon-xs" variant="ghost" onClick={addTableRow} className="no-print h-5 w-5 hover:bg-slate-200">
                    <Plus className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <table className="observation-table">
                <thead>
                  <tr>
                    <th style={{ width: '8%' }}>क्र.</th>
                    <th style={{ width: '30%' }}>तपासलेला घटक</th>
                    <th style={{ width: '20%' }}>रीडिंग/माप</th>
                    <th style={{ width: '22%' }}>प्रकार</th>
                    <th style={{ width: '20%' }}>शेरा</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.table.map((row, idx) => (
                    <tr key={idx} className="group">
                      <td>{idx + 1}</td>
                      <td><input className="handwritten-input text-center" value={row.col1} onChange={(e) => handleTableRowChange(idx, 'col1', e.target.value)} /></td>
                      <td><input className="handwritten-input text-center" value={row.col2} onChange={(e) => handleTableRowChange(idx, 'col2', e.target.value)} /></td>
                      <td><input className="handwritten-input text-center" value={row.col3} onChange={(e) => handleTableRowChange(idx, 'col3', e.target.value)} /></td>
                      <td className="relative">
                        <input className="handwritten-input text-center" value={row.col4} onChange={(e) => handleTableRowChange(idx, 'col4', e.target.value)} />
                        {!isLocked && formData.table.length > 1 && (
                          <button onClick={() => removeTableRow(idx)} className="absolute -right-6 top-1/2 -translate-y-1/2 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity no-print"><Trash2 className="h-3 w-3" /></button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-6 mt-6">
              <div>
                <div className="heading-section">७. निष्कर्ष (Conclusion)</div>
                <textarea className="handwritten-input w-full min-h-[40px]" value={formData.conclusion} onChange={(e) => handleInputChange('conclusion', e.target.value)} />
              </div>
              <div>
                <div className="heading-section">८. निगा व काळजी</div>
                <textarea className="handwritten-input w-full min-h-[40px]" value={formData.precaution} onChange={(e) => handleInputChange('precaution', e.target.value)} />
              </div>
            </div>

            <div className="no-print space-y-8 pt-8 mt-10 border-t border-slate-100">
              <FormBuilder fields={formData.customFields || []} onChange={(fields) => handleInputChange('customFields', fields)} isLocked={isLocked} />
              <AttachmentBuilder attachments={formData.attachments || []} onChange={(attachments) => handleInputChange('attachments', attachments)} isLocked={isLocked} />
            </div>

            <div className="footer-signatures">
              <div className="sig-box">विद्यार्थ्याची स्वाक्षरी</div>
              <div className="sig-box">निदेशकाची स्वाक्षरी</div>
            </div>
            <div className="text-right text-[10px] font-bold mt-4 text-slate-400">P.NO: {formData.practicalNo || '___'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
