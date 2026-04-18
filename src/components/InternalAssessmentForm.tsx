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
  Search,
  Wand2,
  Table as TableIcon,
  FileSpreadsheet,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import html2pdf from 'html2pdf.js';
import { exportToPDF } from '../lib/pdfUtils';
import * as XLSX from 'xlsx';
import { FormBuilder, CustomField } from './FormBuilder';
import { AttachmentBuilder, Attachment } from './AttachmentBuilder';
import { cn } from '@/lib/utils';
import { useAppSettings } from './AppSettingsContext';
import { exportToExcel, exportUsingTemplate, prepareTemplateData } from '../lib/excelUtils';

interface Candidate {
  sr: number;
  name: string;
  fatherName: string;
  safety: number;
  hygiene: number;
  punctuality: number;
  manuals: number;
  knowledge: number;
  tools: number;
  materials: number;
  speed: number;
  quality: number;
  viva: number;
  total: number;
  result: string;
}

interface InternalAssessmentFormProps {
  onBack: () => void;
  onNext?: () => void;
  nextLabel?: string;
  assessmentId?: string;
  downloadOnSave?: boolean;
}

export const InternalAssessmentForm: React.FC<InternalAssessmentFormProps> = ({ 
  onBack, 
  onNext, 
  nextLabel, 
  assessmentId, 
  downloadOnSave 
}) => {
  const { user } = useAuth();
  const { settings } = useAppSettings();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const pdfTemplateRef = React.useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [exportFormat, setExportFormat] = useState<'a4' | 'legal'>('a4');

  const [formData, setFormData] = useState({
    assessor: '',
    year: '',
    iti: '',
    date: '',
    industry: '',
    location: '',
    trade: '',
    semester: '',
    customFields: [] as CustomField[],
    attachments: [] as Attachment[],
  });

  const [candidates, setCandidates] = useState<Candidate[]>(
    Array.from({ length: 26 }, (_, i) => ({
      sr: i + 1,
      name: '',
      fatherName: '',
      safety: 0,
      hygiene: 0,
      punctuality: 0,
      manuals: 0,
      knowledge: 0,
      tools: 0,
      materials: 0,
      speed: 0,
      quality: 0,
      viva: 0,
      total: 0,
      result: '',
    }))
  );

  const [columnTotals, setColumnTotals] = useState({
    safetyTotal: 0,
    vivaTotal: 0,
  });

  const [grandSummary, setGrandSummary] = useState({
    grandTotal: 0,
    totalPass: 0,
    totalFail: 0,
  });

  useEffect(() => {
    if (assessmentId) {
      loadAssessment();
    }
  }, [assessmentId]);

  const loadAssessment = async () => {
    if (!assessmentId) return;
    setLoading(true);
    try {
      const docRef = doc(db, 'internal_assessments', assessmentId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setFormData({
          assessor: data.assessor || '',
          year: data.year || '',
          iti: data.iti || '',
          date: data.date || '',
          industry: data.industry || '',
          location: data.location || '',
          trade: data.trade || '',
          semester: data.semester || '',
          customFields: data.customFields || [],
          attachments: data.attachments || [],
        });
        setCandidates(data.candidates || []);
        setColumnTotals(data.columnTotals || { safetyTotal: 0, vivaTotal: 0 });
        setGrandSummary(data.grandSummary || { grandTotal: 0, totalPass: 0, totalFail: 0 });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `internal_assessments/${assessmentId}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCandidateChange = (index: number, field: keyof Candidate, value: string | number) => {
    const updatedCandidates = [...candidates];
    updatedCandidates[index] = {
      ...updatedCandidates[index],
      [field]: value,
    };
    setCandidates(updatedCandidates);
  };

  const calculateTotals = () => {
    const updatedCandidates = candidates.map(c => {
      const total = Number(c.safety) + Number(c.hygiene) + Number(c.punctuality) + 
                    Number(c.manuals) + Number(c.knowledge) + Number(c.tools) + 
                    Number(c.materials) + Number(c.speed) + Number(c.quality) + 
                    Number(c.viva);
      const result = total >= 50 ? 'PASS' : 'FAIL';
      return { ...c, total, result };
    });
    setCandidates(updatedCandidates);
    toast.success('Totals calculated successfully');
  };

  const calculateGrandSummary = () => {
    let grandTotal = 0;
    let totalPass = 0;
    let totalFail = 0;
    let safetyTotal = 0;
    let vivaTotal = 0;

    candidates.forEach(c => {
      if (c.name) {
        grandTotal += c.total;
        if (c.result === 'PASS') totalPass++;
        if (c.result === 'FAIL') totalFail++;
        safetyTotal += Number(c.safety);
        vivaTotal += Number(c.viva);
      }
    });

    setGrandSummary({ grandTotal, totalPass, totalFail });
    setColumnTotals({ safetyTotal, vivaTotal });
    toast.success('Grand summary calculated');
  };

  const addRow = () => {
    setCandidates([...candidates, {
      sr: candidates.length + 1,
      name: '',
      fatherName: '',
      safety: 0,
      hygiene: 0,
      punctuality: 0,
      manuals: 0,
      knowledge: 0,
      tools: 0,
      materials: 0,
      speed: 0,
      quality: 0,
      viva: 0,
      total: 0,
      result: '',
    }]);
  };

  const removeRow = (index: number) => {
    if (candidates.length > 1) {
      const updated = candidates.filter((_, i) => i !== index).map((c, i) => ({ ...c, sr: i + 1 }));
      setCandidates(updated);
    } else {
      toast.warning('कमीतकमी एक ओळ असणे आवश्यक आहे.');
    }
  };

  const handleSaveWithAction = async (isNext: boolean = false) => {
    if (!user) return;
    setSaving(true);
    try {
      const data = {
        instructorId: user.uid,
        ...formData,
        candidates,
        columnTotals,
        grandSummary,
        updatedAt: serverTimestamp(),
      };

      if (assessmentId) {
        await updateDoc(doc(db, 'internal_assessments', assessmentId), data);
        toast.success('Assessment updated successfully');
      } else {
        await addDoc(collection(db, 'internal_assessments'), {
          ...data,
          createdAt: serverTimestamp(),
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
      handleFirestoreError(error, OperationType.WRITE, 'internal_assessments');
    } finally {
      setSaving(false);
    }
  };

  const exportExcel = async () => {
    if (!settings.docSettings) return;

    // Custom template check
    const customTemplate = settings.excelTemplates?.find(t => t.pageName === 'internal-assessment');

    if (customTemplate) {
      try {
        const flatData = {
          ...formData,
          ...candidates.reduce((acc, c, idx) => ({
            ...acc,
            [`candidate_name_${idx}`]: c.name,
            [`candidate_total_${idx}`]: c.total,
            [`candidate_result_${idx}`]: c.result
          }), {})
        };
        const templateData = prepareTemplateData(flatData, customTemplate.mappings);
        await exportUsingTemplate(customTemplate.fileBase64, templateData, `Custom_Assessment_${formData.trade}.xlsx`);
        toast.success('Custom Assessment Template exported.');
        return;
      } catch (err) {
        toast.error('Template export failed.');
      }
    }

    const exportData = {
      title: "FORMAT FOR INTERNAL ASSESSMENT",
      subtitle: `Assessor: ${formData.assessor} | Year: ${formData.year} | Trade: ${formData.trade}`,
      headers: ["Sr", "Candidate Name", "Father Name", "Safety", "Hygiene", "Punctuality", "Knowledge", "Viva", "Total", "Result"],
      rows: candidates.filter(c => c.name).map(c => [
        c.sr, c.name, c.fatherName, c.safety, c.hygiene, c.punctuality, c.knowledge, c.viva, c.total, c.result
      ]),
      colWidths: [5, 25, 25, 10, 10, 12, 12, 10, 10, 10]
    };

    try {
      await exportToExcel(exportData, settings.docSettings, `Internal_Assessment_${formData.trade || 'Report'}.xlsx`);
      toast.success('Professional Assessment Excel exported.');
    } catch (err) {
      toast.error('Failed to export Excel.');
    }
  };

  const exportPDF = async (format: 'a4' | 'legal' = 'a4') => {
    if (!pdfTemplateRef.current) return;
    await exportToPDF(pdfTemplateRef.current, {
      filename: `Internal_Assessment_${formData.trade || 'Report'}.pdf`,
      orientation: 'landscape',
      format: format
    });
  };

  const aiAutoFill = () => {
    setFormData({
      ...formData,
      assessor: "Internal Assessor",
      iti: "Industrial Training Institute",
      industry: "Local Industry Partner",
      location: "ITI Workshop",
      trade: "Electrician",
      semester: "1",
    });
    toast.info('AI Auto Fill Completed');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  const filteredCandidates = candidates.filter(c => 
    !searchTerm || 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.fatherName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white/50 backdrop-blur-sm p-4 rounded-2xl border border-slate-200 sticky top-0 z-50 no-print">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg mr-2">
            <Button 
              size="sm" 
              variant={exportFormat === 'a4' ? 'secondary' : 'ghost'} 
              onClick={() => setExportFormat('a4')}
              className="h-8 text-[10px] uppercase font-bold"
            >A4</Button>
            <Button 
              size="sm" 
              variant={exportFormat === 'legal' ? 'secondary' : 'ghost'} 
              onClick={() => setExportFormat('legal')}
              className="h-8 text-[10px] uppercase font-bold"
            >Legal</Button>
          </div>
          <Button onClick={aiAutoFill} variant="outline" className="gap-2 border-slate-200">
            <Wand2 className="h-4 w-4" /> AI Auto Fill
          </Button>
          <Button onClick={exportExcel} variant="outline" className="gap-2 border-orange-200 text-orange-700">
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </Button>
          <Button onClick={() => exportPDF(exportFormat)} variant="outline" className="gap-2 border-purple-200 text-purple-700">
            <FileDown className="h-4 w-4" /> PDF ({exportFormat.toUpperCase()})
          </Button>
          <Button onClick={() => handleSaveWithAction(false)} disabled={saving} className="gap-2 bg-slate-700">
            <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save'}
          </Button>
          {onNext && (
            <Button onClick={() => handleSaveWithAction(true)} disabled={saving} className="gap-2 bg-slate-900 shadow-lg shadow-slate-200">
              <Save className="h-4 w-4" /> {saving ? 'Saving...' : (nextLabel || 'Save & Next')}
            </Button>
          )}
        </div>
      </div>

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

      <div ref={pdfTemplateRef} className="document-layout">
        <div className={cn(exportFormat === 'legal' ? 'legal-page' : 'a4-page', "landscape-mode")}>
          <style>{`
            .landscape-mode {
              width: 297mm;
              min-height: 210mm;
            }
            .legal-page.landscape-mode {
              width: 355.6mm;
              min-height: 215.9mm;
            }
            @media print {
              .landscape-mode { width: 100% !important; min-height: 0 !important; }
            }
          `}</style>
          <div className="print-border">
            <div className="doc-header-top">
              <div className="institute-name">{formData.iti || 'Industrial Training Institute'}</div>
              <div className="dept-name">Directorate of Vocational Education & Training</div>
              <div className="record-title">INTERNAL ASSESSMENT REPORT</div>
            </div>

            <div className="info-grid grid-cols-4 gap-4 mb-6">
              <div className="info-item">
                <span className="info-label">Assessor:</span>
                <input className="handwritten-input flex-1" value={formData.assessor} onChange={(e) => setFormData({...formData, assessor: e.target.value})} />
              </div>
              <div className="info-item">
                <span className="info-label">Year:</span>
                <input className="handwritten-input flex-1" value={formData.year} onChange={(e) => setFormData({...formData, year: e.target.value})} />
              </div>
              <div className="info-item">
                <span className="info-label">Date:</span>
                <input type="date" className="handwritten-input flex-1" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
              </div>
              <div className="info-item">
                <span className="info-label">Trade:</span>
                <input className="handwritten-input flex-1" value={formData.trade} onChange={(e) => setFormData({...formData, trade: e.target.value})} />
              </div>
              <div className="info-item">
                <span className="info-label">Industry:</span>
                <input className="handwritten-input flex-1" value={formData.industry} onChange={(e) => setFormData({...formData, industry: e.target.value})} />
              </div>
              <div className="info-item">
                <span className="info-label">Location:</span>
                <input className="handwritten-input flex-1" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} />
              </div>
              <div className="info-item">
                <span className="info-label">Semester:</span>
                <input className="handwritten-input flex-1" value={formData.semester} onChange={(e) => setFormData({...formData, semester: e.target.value})} />
              </div>
              <div className="info-item">
                <span className="info-label">Search:</span>
                <div className="relative flex-1 no-print">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                  <input className="handwritten-input pl-7" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto mb-6">
              <table className="doc-table w-full text-[11px]">
                <thead>
                  <tr className="bg-slate-100 font-bold uppercase tracking-tighter">
                    <th className="p-1 w-8">Sr</th>
                    <th className="p-1">Candidate Name</th>
                    <th className="p-1">Father Name</th>
                    <th className="p-1 w-12">Safety</th>
                    <th className="p-1 w-12">Hygiene</th>
                    <th className="p-1 w-12">Punct.</th>
                    <th className="p-1 w-12">Manual</th>
                    <th className="p-1 w-12">Know.</th>
                    <th className="p-1 w-12">Tools</th>
                    <th className="p-1 w-12">Mater.</th>
                    <th className="p-1 w-12">Speed</th>
                    <th className="p-1 w-12">Qual.</th>
                    <th className="p-1 w-12">Viva</th>
                    <th className="p-1 w-16 bg-slate-200">Total</th>
                    <th className="p-1 w-20 bg-slate-200">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCandidates.map((c, i) => {
                    const actualIndex = candidates.findIndex(cand => cand.sr === c.sr);
                    return (
                      <tr key={c.sr} className="group">
                        <td className="p-1 text-center font-bold relative">
                          {c.sr}
                          <button onClick={() => removeRow(actualIndex)} className="absolute -left-6 top-1/2 -translate-y-1/2 p-1 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity no-print"><Trash2 className="h-3 w-3" /></button>
                        </td>
                        <td className="p-0"><input className="handwritten-input text-[11px]" value={c.name} onChange={(e) => handleCandidateChange(actualIndex, 'name', e.target.value)} /></td>
                        <td className="p-0"><input className="handwritten-input text-[11px]" value={c.fatherName} onChange={(e) => handleCandidateChange(actualIndex, 'fatherName', e.target.value)} /></td>
                        {['safety', 'hygiene', 'punctuality', 'manuals', 'knowledge', 'tools', 'materials', 'speed', 'quality', 'viva'].map(f => (
                          <td key={f} className="p-0 text-center"><input type="number" className="handwritten-input text-center text-[11px]" value={c[f as keyof Candidate] || ''} onChange={(e) => handleCandidateChange(actualIndex, f as keyof Candidate, Number(e.target.value))} /></td>
                        ))}
                        <td className="p-1 text-center font-bold bg-slate-50">{c.total}</td>
                        <td className={cn("p-1 text-center font-bold", c.result === 'PASS' ? 'text-emerald-700' : 'text-red-700')}>{c.result}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="flex justify-center p-2 no-print">
                <Button variant="ghost" size="sm" onClick={addRow} className="gap-2 text-slate-400 hover:text-slate-900"><Plus className="h-4 w-4" /> Add Candidate Record</Button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="p-3 bg-slate-50 border-2 border-slate-900 rounded-lg text-center">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Capacity Score</span>
                <span className="text-xl font-black">{grandSummary.grandTotal}</span>
              </div>
              <div className="p-3 bg-emerald-50 border-2 border-emerald-600 rounded-lg text-center">
                <span className="text-[10px] uppercase font-bold text-emerald-600 block">Successful Pass</span>
                <span className="text-xl font-black text-emerald-700">{grandSummary.totalPass}</span>
              </div>
              <div className="p-3 bg-red-50 border-2 border-red-600 rounded-lg text-center">
                <span className="text-[10px] uppercase font-bold text-red-600 block">Unsuccessful Fail</span>
                <span className="text-xl font-black text-red-700">{grandSummary.totalFail}</span>
              </div>
              <div className="flex flex-col gap-1 no-print">
                <Button size="sm" onClick={calculateTotals} className="h-full gap-2 border-2"><Calculator className="h-4 w-4" /> Calculate All</Button>
                <Button size="sm" onClick={calculateGrandSummary} variant="secondary" className="h-full gap-2 border-2">Summary</Button>
              </div>
            </div>

            <div className="no-print space-y-8 mt-6">
              <FormBuilder fields={formData.customFields || []} onChange={(fields) => setFormData({ ...formData, customFields: fields })} />
              <AttachmentBuilder attachments={formData.attachments || []} onChange={(attachments) => setFormData({ ...formData, attachments: attachments })} />
            </div>

            <div className="footer-signatures">
              <div className="sig-box">Instructor's Signature</div>
              <div className="sig-box">Group Instructor's Signature</div>
              <div className="sig-box">Principal Signature</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
