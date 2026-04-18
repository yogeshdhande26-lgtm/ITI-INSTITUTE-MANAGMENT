import React, { useState, useEffect } from 'react';
import { useAppSettings, MenuItem } from './AppSettingsContext';
import { useAuth } from './AuthContext';
import { db } from '../lib/firebase';
import { collection, getDocs, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Settings, 
  Layout, 
  Save, 
  Plus, 
  Trash2, 
  ChevronRight,
  GripVertical,
  PlusCircle,
  FileText,
  FileSpreadsheet,
  Type,
  Image as ImageIcon,
  Upload,
  FileCode,
  MapPin
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from 'sonner';
import { ExcelTemplate } from './AppSettingsContext';
import { TemplateGeneratedForm } from './TemplateGeneratedForm';

export const SystemConfig: React.FC = () => {
  const { user } = useAuth();
  const { settings, updateSettings } = useAppSettings();
  const [activeTemplate, setActiveTemplate] = useState<ExcelTemplate | null>(null);
  const [appName, setAppName] = useState(settings.appName);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(settings.menuItems);
  const [docSettings, setDocSettings] = useState(settings.docSettings || {
    instituteName: 'Industrial Training Institute',
    departmentName: 'Directorate of Vocational Education & Training',
    showGridlines: true,
    footerLine1: 'Supervisor Signature',
    footerLine2: 'Principal Signature'
  });
  const [excelTemplates, setExcelTemplates] = useState<ExcelTemplate[]>(settings.excelTemplates || []);
  const [newTemplate, setNewTemplate] = useState<{
    pageName: string;
    fileBase64: string;
    fileName: string;
    isMultipleEntry: boolean;
    tableStartRow: number;
    mappings: { field: string; cell: string; isTableColumn?: boolean }[];
    formFields: any[];
  }>({
    pageName: '',
    fileBase64: '',
    fileName: '',
    isMultipleEntry: false,
    tableStartRow: 2,
    mappings: [{ field: '', cell: '' }],
    formFields: []
  });
  const [availableForms, setAvailableForms] = useState<any[]>([]);

  useEffect(() => {
    if (settings.docSettings) {
      setDocSettings(settings.docSettings);
    }
    if (settings.excelTemplates) {
      setExcelTemplates(settings.excelTemplates);
    }
  }, [settings.docSettings, settings.excelTemplates]);

  useEffect(() => {
    const fetchForms = async () => {
      const q = query(collection(db, 'advanced_forms'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setAvailableForms(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchForms();
  }, []);

  const handleSaveGeneral = async () => {
    await updateSettings({ appName });
  };

  const handleSaveTemplates = async () => {
    await updateSettings({ docSettings });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setNewTemplate({ ...newTemplate, fileBase64: base64, fileName: file.name });
    };
    reader.readAsDataURL(file);
  };

  const handleAddMapping = () => {
    setNewTemplate({
      ...newTemplate,
      mappings: [...newTemplate.mappings, { field: '', cell: '' }]
    });
  };

  const handleUpdateMapping = (index: number, key: 'field' | 'cell', value: string) => {
    const updated = [...newTemplate.mappings];
    updated[index][key] = value;
    setNewTemplate({ ...newTemplate, mappings: updated });
  };

  const handleSaveExcelTemplate = async () => {
    if (!newTemplate.pageName || !newTemplate.fileBase64) {
      toast.error('Please provide a page name and upload an Excel file.');
      return;
    }

    const template: ExcelTemplate = {
      id: crypto.randomUUID(),
      pageName: newTemplate.pageName,
      fileName: newTemplate.fileName,
      fileBase64: newTemplate.fileBase64,
      mappings: newTemplate.mappings.filter(m => m.field && m.cell),
      isMultipleEntry: newTemplate.isMultipleEntry,
      tableStartRow: newTemplate.tableStartRow,
      formFields: newTemplate.mappings.map(m => ({
        id: crypto.randomUUID(),
        name: m.field,
        type: 'text',
        required: true,
        cell: m.cell,
        isTableColumn: m.isTableColumn
      })),
      updatedAt: new Date().toISOString()
    };

    const updated = [...excelTemplates, template];
    await updateSettings({ excelTemplates: updated });
    setNewTemplate({ pageName: '', fileBase64: '', fileName: '', isMultipleEntry: false, tableStartRow: 2, mappings: [{ field: '', cell: '' }], formFields: [] });
    toast.success('Professional Template and Automatic Form generated for ' + template.pageName);
  };

  const handleRemoveTemplate = async (id: string) => {
    const updated = excelTemplates.filter(t => t.id !== id);
    await updateSettings({ excelTemplates: updated });
  };

  const handleToggleMenu = (id: string, enabled: boolean) => {
    const updated = menuItems.map(item => item.id === id ? { ...item, enabled } : item);
    setMenuItems(updated);
  };

  const handleRenameMenu = (id: string, label: string) => {
    const updated = menuItems.map(item => item.id === id ? { ...item, label } : item);
    setMenuItems(updated);
  };

  const handleAddFormLink = (form: any) => {
    const id = `custom-form-${form.id}`;
    if (menuItems.find(i => i.id === id)) {
      toast.error('This form is already added to the navigation.');
      return;
    }

    const newItem: MenuItem = {
      id: id,
      label: form.name,
      enabled: true,
      isCustom: true
    };
    setMenuItems([...menuItems, newItem]);
    toast.success(`${form.name} added to navigation list (click save to persist).`);
  };

  const handleRemoveMenu = (id: string) => {
    setMenuItems(menuItems.filter(item => item.id !== id));
  };

  const handleSaveMenu = async () => {
    await updateSettings({ menuItems });
  };

  if (activeTemplate) {
    return <TemplateGeneratedForm template={activeTemplate} onBack={() => setActiveTemplate(null)} />;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900">System Customization</h2>
          <p className="text-slate-500 font-medium">Fully tailor the application behavior, documents, and menus.</p>
        </div>
      </div>

      <Tabs defaultValue="navigation" className="space-y-6">
        <TabsList className="bg-slate-100 p-1 rounded-2xl h-14">
          <TabsTrigger value="navigation" className="rounded-xl px-6 h-12 data-[state=active]:bg-white data-[state=active]:shadow-md gap-2">
            <Layout className="h-4 w-4" /> Navigation & Branding
          </TabsTrigger>
          <TabsTrigger value="templates" className="rounded-xl px-6 h-12 data-[state=active]:bg-white data-[state=active]:shadow-md gap-2">
            <FileSpreadsheet className="h-4 w-4" /> Excel & Report Templates
          </TabsTrigger>
          <TabsTrigger value="custom-templates" className="rounded-xl px-6 h-12 data-[state=active]:bg-white data-[state=active]:shadow-md gap-2 font-bold text-amber-600">
            <Upload className="h-4 w-4" /> Upload Custom Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="navigation" className="space-y-8 animate-in slide-in-from-left-4 duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* General Settings */}
            <Card className="lg:col-span-1 border-none shadow-xl rounded-[2rem] overflow-hidden">
              <CardHeader className="bg-slate-900 text-white p-6">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Settings className="h-5 w-5" />
                  App Branding
                </CardTitle>
                <CardDescription className="text-slate-400">Basic site identity and preferences.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Application Name</Label>
                  <Input 
                    value={appName} 
                    onChange={(e) => setAppName(e.target.value)} 
                    placeholder="ITI Instructor Management"
                    className="h-11 rounded-xl"
                  />
                </div>
                <Button onClick={handleSaveGeneral} className="w-full gap-2 h-11 rounded-xl shadow-lg">
                  <Save className="h-4 w-4" /> Save Branding
                </Button>
              </CardContent>
            </Card>

            {/* Menu Management */}
            <Card className="lg:col-span-2 border-none shadow-xl rounded-[2rem] overflow-hidden">
              <CardHeader className="bg-white border-b p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg font-black">
                      <Layout className="h-5 w-5 text-primary" />
                      Sidebar Menu Items
                    </CardTitle>
                    <CardDescription>Enable, disable or rename sidebar menu items.</CardDescription>
                  </div>
                  <Button onClick={handleSaveMenu} className="gap-2 h-10 px-6 rounded-xl shadow-md">
                    <Save className="h-4 w-4" /> Save Menus
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                  {menuItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-4 hover:bg-slate-50/50 transition-colors group">
                      <div className="text-slate-300 group-hover:text-slate-400 transition-colors">
                        <GripVertical className="h-5 w-5" />
                      </div>
                      <div className="flex-1 flex flex-col md:flex-row gap-4 md:items-center justify-between">
                        <div className="flex-1">
                          <Input 
                            value={item.label} 
                            onChange={(e) => handleRenameMenu(item.id, e.target.value)}
                            className="h-9 border-none bg-transparent hover:bg-white focus:bg-white transition-all font-semibold text-slate-700 w-full md:w-64"
                          />
                        </div>
                        <div className="flex items-center gap-4 bg-white p-1 rounded-lg border shadow-sm px-4 h-10">
                          <Switch 
                            checked={item.enabled} 
                            onCheckedChange={(val) => handleToggleMenu(item.id, val)}
                          />
                        </div>
                        {item.isCustom && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleRemoveMenu(item.id)}
                            className="text-red-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 rounded-full"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Custom Form Section */}
                <div className="p-6 bg-slate-50 border-t">
                  <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <PlusCircle className="h-4 w-4 text-primary" />
                    Quick Pin Custom Registers
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {availableForms.map(form => (
                      <Button 
                        key={form.id} 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleAddFormLink(form)}
                        className="bg-white border-slate-200 hover:border-primary hover:text-primary rounded-lg gap-2"
                      >
                        <FileText className="h-4 w-4" />
                        {form.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="animate-in slide-in-from-right-4 duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-slate-900">
            <div className="lg:col-span-1 space-y-6">
              <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden">
                <CardHeader className="bg-slate-900 text-white p-6">
                  <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5" />
                    Excel Header Design
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Institute Name (Header 1)</Label>
                    <Input 
                      value={docSettings.instituteName} 
                      onChange={(e) => setDocSettings({...docSettings, instituteName: e.target.value})}
                      placeholder="e.g. Industrial Training Institute"
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Department Name (Header 2)</Label>
                    <Input 
                      value={docSettings.departmentName} 
                      onChange={(e) => setDocSettings({...docSettings, departmentName: e.target.value})}
                      placeholder="e.g. Directorate of Vocational Education"
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sub-Title / Location</Label>
                    <Input 
                      value={docSettings.subTitle} 
                      onChange={(e) => setDocSettings({...docSettings, subTitle: e.target.value})}
                      placeholder="e.g. Pune, Maharashtra"
                      className="h-11 rounded-xl"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden">
                <CardHeader className="bg-slate-50 border-b p-6">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Type className="h-5 w-5 text-indigo-600" />
                    Footer Design
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Signature Title 1 (Left)</Label>
                    <Input 
                      value={docSettings.footerLine1} 
                      onChange={(e) => setDocSettings({...docSettings, footerLine1: e.target.value})}
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Signature Title 2 (Right)</Label>
                    <Input 
                      value={docSettings.footerLine2} 
                      onChange={(e) => setDocSettings({...docSettings, footerLine2: e.target.value})}
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold">Show Table Gridlines</Label>
                      <p className="text-[10px] text-slate-500">Apply borders to all cells in Excel export.</p>
                    </div>
                    <Switch 
                      checked={docSettings.showGridlines} 
                      onCheckedChange={(val) => setDocSettings({...docSettings, showGridlines: val})}
                    />
                  </div>
                  <Button onClick={handleSaveTemplates} className="w-full gap-2 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-100 mt-4">
                    <Save className="h-4 w-4" /> Apply Template Settings
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2">
              <Card className="border-none shadow-xl rounded-[3rem] overflow-hidden h-full bg-slate-50 border-2 border-dashed border-slate-200">
                <CardHeader className="p-8 text-center bg-white border-b">
                  <CardTitle className="text-xl font-black">Live Template Preview (Excel Style)</CardTitle>
                  <CardDescription>This is how your Excel reports will look when exported.</CardDescription>
                </CardHeader>
                <CardContent className="p-12 overflow-x-auto">
                  <div className="bg-white p-8 rounded-xl shadow-2xl border min-w-[600px] font-sans">
                    <div className="text-center space-y-2 mb-8 border-b-2 border-slate-900 pb-4">
                      <div className="flex justify-between items-start">
                        <div className="h-16 w-16 bg-slate-100 rounded flex items-center justify-center border text-[8px] uppercase text-slate-400">Logo Here</div>
                        <div className="flex-1 px-4">
                          <h1 className="text-xl font-black text-slate-900 uppercase">{docSettings.instituteName || "INSTITUTE NAME"}</h1>
                          <h2 className="text-sm font-bold text-slate-600 uppercase">{docSettings.departmentName || "DEPARTMENT NAME"}</h2>
                          {docSettings.subTitle && <p className="text-xs text-slate-500">{docSettings.subTitle}</p>}
                        </div>
                        <div className="h-16 w-16 opacity-0">Logo</div>
                      </div>
                      <div className="bg-slate-100 h-6 flex items-center justify-center text-[10px] font-bold tracking-widest mt-4">REPORT TITLE HERE</div>
                    </div>

                    <div className="grid grid-cols-6 border-2 border-slate-900 mb-8">
                      {[1,2,3,4,5,6].map(i => (
                        <div key={i} className="p-2 border-r border-slate-900 bg-slate-50 font-bold text-[10px]">Column {i}</div>
                      ))}
                      {Array.from({length: 3}).map((_, ri) => (
                        <React.Fragment key={ri}>
                          {[1,2,3,4,5,6].map(ci => (
                            <div key={`${ri}-${ci}`} className={cn("p-2 border-t border-r border-slate-900 h-10 italic text-[10px] text-slate-300", !docSettings.showGridlines && "border-none")}>
                              Sample Data...
                            </div>
                          ))}
                        </React.Fragment>
                      ))}
                    </div>

                    <div className="flex justify-between mt-12 pt-8">
                       <div className="text-center w-48">
                         <div className="border-t border-slate-900 pt-2 text-[10px] font-black uppercase tracking-widest">{docSettings.footerLine1}</div>
                       </div>
                       <div className="text-center w-48">
                         <div className="border-t border-slate-900 pt-2 text-[10px] font-black uppercase tracking-widest">{docSettings.footerLine2}</div>
                       </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="custom-templates" className="animate-in zoom-in-95 duration-300">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Template Uploader */}
            <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-amber-600 to-orange-600 text-white p-8">
                <CardTitle className="flex items-center gap-3 text-2xl font-black">
                  <Upload className="h-7 w-7" />
                  Upload Page Template
                </CardTitle>
                <CardDescription className="text-amber-100 font-medium">Map your own Excel files to dynamic data fields.</CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Page / Section Name</Label>
                    <select 
                      className="w-full h-12 rounded-xl border px-4 bg-slate-50 font-bold"
                      value={newTemplate.pageName}
                      onChange={(e) => setNewTemplate({...newTemplate, pageName: e.target.value})}
                    >
                      <option value="">Select a Section...</option>
                      <option value="daily-diary">Daily Diary Register</option>
                      <option value="practical-record">Practical Record</option>
                      <option value="internal-assessment">Internal Assessment</option>
                      <option value="attendance">Attendance Register</option>
                      {availableForms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Excel File (.xlsx)</Label>
                    <div className="relative h-12 rounded-xl border-2 border-dashed border-amber-200 flex items-center justify-center bg-amber-50 group hover:border-amber-400 transition-colors">
                      <input 
                        type="file" 
                        accept=".xlsx" 
                        onChange={handleFileUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                      />
                      <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
                        {newTemplate.fileName ? <FileCode className="h-4 w-4" /> : <PlusCircle className="h-4 w-4" />}
                        {newTemplate.fileName || "Choose Excel File"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold">Multiple Entry Support</Label>
                      <p className="text-[10px] text-amber-600">Enable if the template supports a table of data.</p>
                    </div>
                    <Switch 
                      checked={newTemplate.isMultipleEntry} 
                      onCheckedChange={(val) => setNewTemplate({...newTemplate, isMultipleEntry: val})}
                    />
                  </div>
                  {newTemplate.isMultipleEntry && (
                    <div className="space-y-2 animate-in slide-in-from-left-2 duration-200">
                      <Label className="text-[10px] font-black uppercase text-amber-600">Table Starting Row</Label>
                      <Input 
                        type="number" 
                        value={newTemplate.tableStartRow} 
                        onChange={(e) => setNewTemplate({...newTemplate, tableStartRow: parseInt(e.target.value)})}
                        className="h-10 rounded-xl bg-white"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Field Mappings (Excel Cell Addresses)</Label>
                    <Button variant="ghost" size="sm" onClick={handleAddMapping} className="text-amber-600 font-bold gap-1 bg-amber-50 hover:bg-amber-100 rounded-lg">
                      <Plus className="h-3 w-3" /> Add Mapping
                    </Button>
                  </div>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                    {newTemplate.mappings.map((m, idx) => (
                      <div key={idx} className="flex gap-3 animate-in fade-in slide-in-from-top-2 duration-200 items-end">
                        <div className="flex-1 space-y-1">
                          <Label className="text-[9px] font-bold text-slate-400">Field Name</Label>
                          <Input 
                            placeholder="e.g. studentName" 
                            value={m.field}
                            onChange={(e) => handleUpdateMapping(idx, 'field', e.target.value)}
                            className="h-10 rounded-lg bg-white"
                          />
                        </div>
                        <div className="flex items-center text-slate-300 pb-3"><ChevronRight className="h-4 w-4" /></div>
                        <div className="w-32 space-y-1">
                          <Label className="text-[9px] font-bold text-slate-400">Cell / Col</Label>
                          <Input 
                            placeholder="e.g. B5 or B" 
                            value={m.cell}
                            onChange={(e) => handleUpdateMapping(idx, 'cell', e.target.value)}
                            className="h-10 rounded-lg bg-white font-mono font-bold uppercase text-center"
                          />
                        </div>
                        <div className="flex flex-col items-center gap-1 pb-1">
                          <Label className="text-[8px] font-bold text-slate-400 uppercase">Col?</Label>
                          <Switch 
                            checked={m.isTableColumn} 
                            onCheckedChange={(val) => {
                              const updated = [...newTemplate.mappings];
                              updated[idx].isTableColumn = val;
                              setNewTemplate({...newTemplate, mappings: updated});
                            }}
                          />
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => {
                            const updated = newTemplate.mappings.filter((_, i) => i !== idx);
                            setNewTemplate({...newTemplate, mappings: updated});
                          }}
                          className="text-slate-300 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl text-[10px] space-y-1 text-slate-500 border border-slate-200">
                    <p className="font-black text-slate-600 uppercase mb-1">💡 Instructions:</p>
                    <p>• Use cell references like <strong>A1</strong>, <strong>B5</strong> according to your Excel file.</p>
                    <p>• Field names should match the internal form data (e.g., <strong>studentName</strong>, <strong>trade</strong>, <strong>month</strong>).</p>
                  </div>
                </div>

                <Button 
                  onClick={handleSaveExcelTemplate} 
                  className="w-full h-14 rounded-2xl bg-amber-600 hover:bg-amber-700 font-black text-lg gap-3 shadow-xl shadow-amber-100"
                >
                  <Save className="h-5 w-5" /> Save Template Configuration
                </Button>
              </CardContent>
            </Card>

            {/* Active Templates List */}
            <div className="space-y-6">
              <h3 className="text-xl font-black text-slate-900 px-4 flex items-center gap-2">
                <FileSpreadsheet className="h-6 w-6 text-emerald-600" />
                Configured Custom Templates
              </h3>
              <div className="grid grid-cols-1 gap-4 overflow-y-auto max-h-[700px] pr-2">
                {excelTemplates.map((tpl) => (
                  <Card key={tpl.id} className="border-none shadow-lg rounded-3xl overflow-hidden group hover:shadow-xl transition-shadow">
                    <div className="p-5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-100">
                          <FileSpreadsheet className="h-6 w-6" />
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 uppercase text-sm tracking-tight">{tpl.pageName}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase">{tpl.fileName}</span>
                            <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded uppercase">{tpl.mappings.length} Fields</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setActiveTemplate(tpl)}
                          className="text-emerald-600 hover:bg-emerald-50 font-bold rounded-xl h-8 gap-1"
                        >
                          <FileText className="h-4 w-4" /> Use This Form
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleRemoveTemplate(tpl.id)}
                          className="text-red-400 hover:bg-red-50 hover:text-red-600 rounded-xl"
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                    <div className="px-5 pb-5 grid grid-cols-3 gap-2">
                      {tpl.mappings.slice(0, 6).map((m, i) => (
                        <div key={i} className="bg-slate-50 p-2 rounded-lg text-[10px] border border-slate-100 flex justify-between">
                          <span className="text-slate-500 font-medium truncate pr-2">{m.field}</span>
                          <span className="font-black text-slate-900">{m.cell}</span>
                        </div>
                      ))}
                      {tpl.mappings.length > 6 && (
                        <div className="bg-slate-50 p-2 rounded-lg text-[10px] border border-slate-100 flex items-center justify-center italic text-slate-400">
                          + {tpl.mappings.length - 6} more...
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
                {excelTemplates.length === 0 && (
                  <div className="p-12 border-2 border-dashed border-slate-200 rounded-[3rem] text-center space-y-3 bg-slate-50">
                    <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center mx-auto text-slate-300 shadow-sm">
                      <FileCode className="h-8 w-8" />
                    </div>
                    <p className="font-bold text-slate-400">No custom templates found. Upload one to start printing formatted reports.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Advanced Placeholder */}
      <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden bg-gradient-to-br from-indigo-900 to-slate-900 text-white">
        <CardContent className="p-12 text-center space-y-6">
          <div className="h-20 w-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-xl">
            <Plus className="h-10 w-10 text-white" />
          </div>
          <h3 className="text-3xl font-black">Professional Template Integration</h3>
          <p className="text-slate-400 max-w-lg mx-auto text-lg leading-relaxed">
            The values configured above are automatically injected into your <strong>Excel</strong> and <strong>PDF</strong> exports across the system. This ensures every report you print is consistent with your institute's branding.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
