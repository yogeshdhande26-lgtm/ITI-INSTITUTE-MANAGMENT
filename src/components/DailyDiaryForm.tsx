import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { 
  Save, 
  Trash2, 
  Plus, 
  ArrowLeft, 
  Loader2, 
  FileDown, 
  FileSpreadsheet, 
  Wand2,
  BarChart3
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2pdf from 'html2pdf.js';
import { exportToPDF } from '../lib/pdfUtils';
import * as XLSX from 'xlsx';
import { FormBuilder, CustomField } from './FormBuilder';
import { AttachmentBuilder, Attachment } from './AttachmentBuilder';
import { cn } from '@/lib/utils';
import { useAppSettings } from './AppSettingsContext';
import { exportToExcel, exportUsingTemplate, prepareTemplateData } from '../lib/excelUtils';

interface DiaryEntry {
  date: string;
  day: string;
  lessonNo: string;
  theory: string;
  pracNo: string;
  pracName: string;
  other: string;
  remark: string;
}

const DAYS_MR = ["रविवार", "सोमवार", "मंगळवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"];
const MONTHS_MR = [
  'एप्रिल', 'मे', 'जून', 'जुलै', 'ऑगस्ट', 'सप्टेंबर', 
  'ऑक्टोबर', 'नोव्हेंबर', 'डिसेंबर', 'जानेवारी', 'फेब्रुवारी', 'मार्च'
];

export const DailyDiaryForm: React.FC<{ 
  onBack: () => void, 
  onNext?: () => void,
  nextLabel?: string,
  diaryId?: string,
  downloadOnSave?: boolean
}> = ({ onBack, onNext, nextLabel, diaryId, downloadOnSave }) => {
  const { user } = useAuth();
  const { settings } = useAppSettings();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(!!diaryId);
  const pdfTemplateRef = React.useRef<HTMLDivElement>(null);

  const [month, setMonth] = useState('एप्रिल');
  const [weekNo, setWeekNo] = useState('1');
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [entries, setEntries] = useState<DiaryEntry[]>(
    Array(6).fill(null).map(() => ({
      date: '',
      day: '',
      lessonNo: '',
      theory: '',
      pracNo: '',
      pracName: '',
      other: '',
      remark: ''
    }))
  );

  const [exportFormat, setExportFormat] = useState<'a4' | 'legal'>('a4');

  useEffect(() => {
    if (diaryId) {
      fetchDiary();
    }
  }, [diaryId]);

  const fetchDiary = async () => {
    try {
      const docRef = doc(db, 'daily_diaries', diaryId!);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setMonth(data.month);
        setWeekNo(data.weekNo);
        setEntries(data.entries);
        setCustomFields(data.customFields || []);
        setAttachments(data.attachments || []);
      } else {
        toast.error('Diary entry not found');
        onBack();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `daily_diaries/${diaryId}`);
    } finally {
      setIsLoading(false);
    }
  };

  const updateEntry = (index: number, field: keyof DiaryEntry, value: string) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    
    if (field === 'date' && value) {
      const dateObj = new Date(value);
      if (!isNaN(dateObj.getTime())) {
        newEntries[index].day = DAYS_MR[dateObj.getDay()];
      }
    }
    
    setEntries(newEntries);
  };

  const addRow = () => {
    setEntries([...entries, {
      date: '',
      day: '',
      lessonNo: '',
      theory: '',
      pracNo: '',
      pracName: '',
      other: '',
      remark: ''
    }]);
  };

  const removeRow = (index: number) => {
    if (entries.length > 1) {
      setEntries(entries.filter((_, i) => i !== index));
    } else {
      toast.warning('कमीतकमी एक ओळ असणे आवश्यक आहे.');
    }
  };

  const saveDiaryWithAction = async (isNext: boolean = false) => {
    if (!user) return;
    setIsSaving(true);
    const path = 'daily_diaries';
    try {
      const diaryData = {
        instructorId: user.uid,
        month,
        weekNo,
        entries,
        customFields,
        attachments,
        updatedAt: serverTimestamp()
      };

      if (diaryId) {
        await updateDoc(doc(db, path, diaryId), diaryData);
        toast.success('Diary updated successfully!');
      } else {
        await addDoc(collection(db, path), {
          ...diaryData,
          createdAt: serverTimestamp()
        });
        toast.success('Diary saved successfully!');
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
      handleFirestoreError(error, diaryId ? OperationType.UPDATE : OperationType.CREATE, path);
    } finally {
      setIsSaving(false);
    }
  };

  const exportPDF = async (format: 'a4' | 'legal' = 'a4') => {
    if (!pdfTemplateRef.current) return;
    await exportToPDF(pdfTemplateRef.current, {
      filename: `Daily_Diary_${month}_Week_${weekNo}.pdf`,
      orientation: 'landscape',
      format: format
    });
  };

  const exportExcel = async () => {
    if (!settings.docSettings) return;

    // Check for custom template
    const customTemplate = settings.excelTemplates?.find(t => t.pageName === 'daily-diary');
    
    if (customTemplate) {
      try {
        const flatData = {
          month,
          weekNo,
          ...entries.reduce((acc, entry, idx) => ({
            ...acc,
            [`entry_date_${idx}`]: entry.date,
            [`entry_day_${idx}`]: entry.day,
            [`entry_theory_${idx}`]: entry.theory,
            [`entry_prac_${idx}`]: entry.pracName,
          }), {})
        };
        const templateData = prepareTemplateData(flatData, customTemplate.mappings);
        await exportUsingTemplate(customTemplate.fileBase64, templateData, `Custom_Diary_${month}.xlsx`);
        toast.success('Custom Template Excel exported successfully.');
        return;
      } catch (err) {
        console.error('Custom Template Error:', err);
        toast.error('Failed to export using custom template. Falling back to default.');
      }
    }

    const data = {
      title: "निर्देशकाची दैनंदिनी (Daily Diary Register)",
      subtitle: `महिना: ${month} | आठवडा क्र.: ${weekNo}`,
      headers: ["Sr", "Date", "Day", "Lesson No", "Theory", "Prac No", "Practical", "Other", "Remark"],
      rows: entries.map((e, i) => [
        i + 1, e.date, e.day, e.lessonNo, e.theory, e.pracNo, e.pracName, e.other, e.remark
      ]),
      colWidths: [5, 12, 10, 8, 30, 8, 30, 25, 15]
    };

    try {
      await exportToExcel(data, settings.docSettings, `Daily_Diary_${month}_Week_${weekNo}.xlsx`);
      toast.success('Professional Excel Register exported successfully.');
    } catch (err) {
      toast.error('Failed to export Excel.');
      console.error(err);
    }
  };

  const aiAutoFill = () => {
    setMonth('एप्रिल');
    setWeekNo('1');
    toast.info('AI Sample Data Generated');
  };

  const generateReport = () => {
    toast.success(`Total Working Days in this record: ${entries.filter(e => e.date).length}`);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px]">
        <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Loading diary data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/50 backdrop-blur-sm p-4 rounded-2xl border border-slate-200 sticky top-0 z-50 no-print">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg mr-2">
            <Button size="sm" variant={exportFormat === 'a4' ? 'secondary' : 'ghost'} onClick={() => setExportFormat('a4')} className="h-8 text-[10px] uppercase font-bold px-3">A4</Button>
            <Button size="sm" variant={exportFormat === 'legal' ? 'secondary' : 'ghost'} onClick={() => setExportFormat('legal')} className="h-8 text-[10px] uppercase font-bold px-3">Legal</Button>
          </div>
          <Button variant="outline" onClick={aiAutoFill} className="gap-2 border-slate-200">
            <Wand2 className="h-4 w-4" /> AI Auto Fill
          </Button>
          <Button variant="outline" onClick={exportExcel} className="gap-2 border-orange-200 text-orange-700">
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </Button>
          <Button variant="outline" onClick={() => exportPDF(exportFormat)} className="gap-2 border-purple-200 text-purple-700">
            <FileDown className="h-4 w-4" /> PDF
          </Button>
          <Button onClick={() => saveDiaryWithAction(false)} disabled={isSaving} className="gap-2 bg-slate-700">
            <Save className="h-4 w-4" /> {isSaving ? 'Saving...' : 'Save Diary'}
          </Button>
          {onNext && (
            <Button onClick={() => saveDiaryWithAction(true)} disabled={isSaving} className="gap-2 bg-slate-900 shadow-lg shadow-slate-200">
              <Save className="h-4 w-4" /> {isSaving ? 'Saving...' : (nextLabel || 'Save & Next')}
            </Button>
          )}
        </div>
      </div>

      <div ref={pdfTemplateRef} className="document-layout">
        <div className={cn(exportFormat === 'legal' ? 'legal-page' : 'a4-page', "landscape-mode")}>
          <style>{`
            .landscape-mode { width: 297mm; min-height: 210mm; }
            .legal-page.landscape-mode { width: 355.6mm; min-height: 215.9mm; }
            @media print { .landscape-mode { width: 100% !important; min-height: 0 !important; } }
            .diary-table th { font-size: 10px; padding: 4px; }
            .diary-table td { padding: 0; }
          `}</style>
          <div className="print-border">
            <div className="doc-header-top">
              <div className="institute-name">Industrial Training Institute</div>
              <div className="dept-name">Directorate of Vocational Education & Training</div>
              <div className="record-title">INSTRUCTOR'S DAILY DIARY REGISTER</div>
            </div>

            <div className="flex justify-between items-center bg-slate-50 p-4 border-2 border-slate-900 rounded-lg mb-6">
              <div className="flex items-center gap-4">
                <span className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">महिना (Month):</span>
                <select className="handwritten-input w-40 bg-white" value={month} onChange={(e) => setMonth(e.target.value)}>
                  {MONTHS_MR.map((m, i) => (<option key={i} value={m}>{m}</option>))}
                </select>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">आठवडा क्र. (Week):</span>
                <input type="number" className="handwritten-input w-20 text-center bg-white" value={weekNo} onChange={(e) => setWeekNo(e.target.value)} />
              </div>
            </div>

            <div className="overflow-x-auto mb-6">
              <table className="doc-table diary-table w-full">
                <thead>
                  <tr className="bg-slate-100 font-bold uppercase">
                    <th className="w-10">Sr</th>
                    <th className="w-28">Date (दिनांक)</th>
                    <th className="w-20">Day (वार)</th>
                    <th className="w-16">Lesson No</th>
                    <th>Theory (सैद्धांतिक पाठ)</th>
                    <th className="w-16">Prac No</th>
                    <th>Practical (प्रात्याक्षिकाचे नाव)</th>
                    <th>Other (इतर तपशील)</th>
                    <th className="w-20">Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, i) => (
                    <tr key={i} className="group">
                      <td className="p-2 text-center font-bold text-slate-400 relative">
                        {i + 1}
                        <button onClick={() => removeRow(i)} className="absolute -left-6 top-1/2 -translate-y-1/2 p-1 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity no-print"><Trash2 className="h-3 w-3" /></button>
                      </td>
                      <td><input type="date" className="handwritten-input text-center text-[11px]" value={entry.date} onChange={(e) => updateEntry(i, 'date', e.target.value)} /></td>
                      <td className="text-center font-bold text-slate-600 bg-slate-50/50 text-[11px] font-mono">{entry.day}</td>
                      <td><input className="handwritten-input text-center text-[11px]" value={entry.lessonNo} onChange={(e) => updateEntry(i, 'lessonNo', e.target.value)} /></td>
                      <td><textarea className="handwritten-input text-[11px] h-12 resize-none" value={entry.theory} onChange={(e) => updateEntry(i, 'theory', e.target.value)} /></td>
                      <td><input className="handwritten-input text-center text-[11px]" value={entry.pracNo} onChange={(e) => updateEntry(i, 'pracNo', e.target.value)} /></td>
                      <td><textarea className="handwritten-input text-[11px] h-12 resize-none" value={entry.pracName} onChange={(e) => updateEntry(i, 'pracName', e.target.value)} /></td>
                      <td><textarea className="handwritten-input text-[11px] h-12 resize-none" value={entry.other} onChange={(e) => updateEntry(i, 'other', e.target.value)} /></td>
                      <td><input className="handwritten-input text-[11px]" value={entry.remark} onChange={(e) => updateEntry(i, 'remark', e.target.value)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-center p-2 no-print">
                <Button variant="ghost" size="sm" onClick={addRow} className="gap-2 text-slate-400 hover:text-slate-900"><Plus className="h-4 w-4" /> Add Day Entry</Button>
              </div>
            </div>

            {/* Custom Content during Print */}
            {(customFields.length > 0 || attachments.length > 0) && (
              <div className="mt-8 space-y-8 border-t-2 border-slate-900 pt-6">
                {customFields.length > 0 && (
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest mb-4">Additional Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {customFields.map((f, idx) => (
                        <div key={idx} className="flex gap-2 text-xs">
                          <span className="font-bold text-slate-500">{f.label}:</span>
                          <span className="border-b border-slate-300 flex-1">{String(f.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {attachments.length > 0 && (
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest mb-4">Evidence & Documentation</h3>
                    <div className="grid grid-cols-4 gap-4">
                      {attachments.map((at, idx) => (
                        <div key={idx} className="border border-slate-900 rounded p-1 text-center">
                          {at.type.includes('image') ? (
                            <img src={at.url} className="w-full h-24 object-cover mb-1" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="h-24 bg-slate-50 flex items-center justify-center text-[8px] font-bold uppercase">{at.type}</div>
                          )}
                          <span className="text-[8px] truncate block">{at.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="no-print space-y-8 mt-6">
              <FormBuilder fields={customFields} onChange={setCustomFields} />
              <AttachmentBuilder attachments={attachments} onChange={setAttachments} />
            </div>

            <div className="footer-signatures mt-12">
              <div className="sig-box">Supervisor Signature</div>
              <div className="sig-box">Principal Signature</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
