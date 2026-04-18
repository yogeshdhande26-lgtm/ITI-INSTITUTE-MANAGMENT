import React, { useState } from 'react';
import { ExcelTemplate, useAppSettings } from './AppSettingsContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ArrowLeft, 
  Save, 
  FileSpreadsheet, 
  Plus, 
  Trash2,
  FileCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { exportUsingTemplate, prepareTemplateData } from '../lib/excelUtils';

interface TemplateGeneratedFormProps {
  template: ExcelTemplate;
  onBack: () => void;
}

export const TemplateGeneratedForm: React.FC<TemplateGeneratedFormProps> = ({ template, onBack }) => {
  const { settings } = useAppSettings();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [tableData, setTableData] = useState<any[]>(template.isMultipleEntry ? [{}] : []);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTableCellChange = (index: number, field: string, value: any) => {
    const updated = [...tableData];
    updated[index] = { ...updated[index], [field]: value };
    setTableData(updated);
  };

  const addTableRow = () => {
    setTableData([...tableData, {}]);
  };

  const removeTableRow = (index: number) => {
    setTableData(tableData.filter((_, i) => i !== index));
  };

  const handleExport = async () => {
    try {
      // Prepare mapping for single fields
      const singleMappings = template.mappings.filter(m => !m.isTableColumn);
      const dataMap = prepareTemplateData(formData, singleMappings);

      // Prepare mapping for table fields
      const tableMappings = template.mappings
        .filter(m => m.isTableColumn)
        .map(m => ({ field: m.field, column: m.cell }));

      await exportUsingTemplate(
        template.fileBase64,
        dataMap,
        `Report_${template.pageName}_${Date.now()}.xlsx`,
        {
          isMultipleEntry: template.isMultipleEntry,
          tableData: tableData,
          tableMappings: tableMappings,
          startRow: template.tableStartRow
        }
      );
      toast.success('Professional Template Report Exported!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export report.');
    }
  };

  const singleFields = template.mappings.filter(m => !m.isTableColumn);
  const tableFields = template.mappings.filter(m => m.isTableColumn);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border sticky top-0 z-50">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Templates
        </Button>
        <div className="flex gap-2">
          <Button onClick={handleExport} className="gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-100">
            <FileSpreadsheet className="h-4 w-4" /> Export to Template Excel
          </Button>
          <Button className="gap-2 bg-slate-900">
            <Save className="h-4 w-4" /> Save Data
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-8">
        <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-8">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-xl">
                <FileCheck className="h-8 w-8 text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-2xl font-black uppercase tracking-tight">{template.pageName}</CardTitle>
                <p className="text-slate-400 font-medium">Automatic Form Generated from Template: {template.fileName}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-10 space-y-8">
            {/* Single Fields */}
            {singleFields.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {singleFields.map((field) => (
                  <div key={field.field} className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-slate-500">
                      {field.field} <span className="text-[10px] text-slate-300 ml-1">(Excel Cell: {field.cell})</span>
                    </Label>
                    <Input 
                      placeholder={`Enter ${field.field}...`} 
                      value={formData[field.field] || ''}
                      onChange={(e) => handleInputChange(field.field, e.target.value)}
                      className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-all font-bold"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Table Fields */}
            {template.isMultipleEntry && tableFields.length > 0 && (
              <div className="space-y-4 pt-6 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-black text-slate-900 uppercase">Multiple Entry Data Table</h3>
                  <Button variant="outline" size="sm" onClick={addTableRow} className="gap-2 rounded-xl border-indigo-100 text-indigo-600 font-bold hover:bg-indigo-50">
                    <Plus className="h-4 w-4" /> Add Row
                  </Button>
                </div>
                <div className="overflow-x-auto rounded-3xl border border-slate-100 shadow-sm bg-slate-50">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white">
                        <th className="p-4 font-black uppercase text-[10px] tracking-widest text-center" style={{ width: '50px' }}>#</th>
                        {tableFields.map(f => (
                          <th key={f.field} className="p-4 font-black uppercase text-[10px] tracking-widest">
                            {f.field} <span className="block text-[8px] text-slate-400">Column: {f.cell}</span>
                          </th>
                        ))}
                        <th className="p-4 font-black uppercase text-[10px] tracking-widest text-center" style={{ width: '50px' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tableData.map((row, idx) => (
                        <tr key={idx} className="bg-white hover:bg-slate-50/50 transition-colors">
                          <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                          {tableFields.map(f => (
                            <td key={f.field} className="p-2">
                              <input 
                                className="w-full h-10 px-3 bg-transparent border-none focus:ring-2 focus:ring-indigo-500 rounded-lg font-medium"
                                placeholder={`...`}
                                value={row[f.field] || ''}
                                onChange={(e) => handleTableCellChange(idx, f.field, e.target.value)}
                              />
                            </td>
                          ))}
                          <td className="p-3 text-center">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => removeTableRow(idx)} 
                              className="text-red-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 rounded-full"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {tableData.length === 0 && (
                    <div className="p-8 text-center text-slate-400 font-bold">
                      No rows added yet. Click "Add Row" to start.
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100 flex gap-4 items-start">
          <div className="h-10 w-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 flex-shrink-0">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h4 className="font-black text-amber-900 text-sm">Perfect Formatting Guarantee</h4>
            <p className="text-amber-800 text-xs leading-relaxed font-medium">
              This form was automatically generated to match the structure of your uploaded Excel template. 
              The <strong>"Export to Template Excel"</strong> button will fill your original file with the data you enter above, 
              preserving all your logos, colors, and layout perfectly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
