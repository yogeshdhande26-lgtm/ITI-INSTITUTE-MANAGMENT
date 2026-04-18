import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Settings2, 
  GripVertical, 
  MoveUp, 
  MoveDown, 
  Copy, 
  Layout, 
  Columns, 
  Type, 
  Hash, 
  Mail, 
  Calendar, 
  CheckSquare, 
  CircleDot, 
  FileUp, 
  ChevronDown, 
  ChevronUp,
  X,
  Split
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Reorder, motion, AnimatePresence } from 'motion/react';
import { AdvancedForm, AdvancedFormSection, AdvancedFormColumn, AdvancedFormField, FieldType } from './types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';

interface FormDesignerProps {
  form: AdvancedForm;
  onChange: (form: AdvancedForm) => void;
}

export const FormDesigner: React.FC<FormDesignerProps> = ({ form, onChange }) => {
  const [activeTab, setActiveTab] = useState<'build' | 'settings'>('build');
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  const addSection = () => {
    const newSection: AdvancedFormSection = {
      id: crypto.randomUUID(),
      title: 'New Section',
      columns: [
        { id: crypto.randomUUID(), fields: [], width: 12 }
      ]
    };
    onChange({ ...form, structure: [...form.structure, newSection] });
  };

  const removeSection = (sectionId: string) => {
    onChange({ ...form, structure: form.structure.filter(s => s.id !== sectionId) });
  };

  const addColumn = (sectionId: string) => {
    const section = form.structure.find(s => s.id === sectionId);
    if (!section) return;
    
    // Distribute width evenly
    const newColumnCount = section.columns.length + 1;
    const newWidth = Math.max(1, Math.floor(12 / newColumnCount));
    
    const newColumns = [
      ...section.columns.map(c => ({ ...c, width: newWidth })),
      { id: crypto.randomUUID(), fields: [], width: newWidth }
    ];
    
    const newStructure = form.structure.map(s => 
      s.id === sectionId ? { ...s, columns: newColumns } : s
    );
    onChange({ ...form, structure: newStructure });
  };

  const addField = (sectionId: string, columnId: string, type: FieldType) => {
    const newField: AdvancedFormField = {
      id: crypto.randomUUID(),
      type,
      label: `New ${type} Field`,
      required: false,
      width: 12,
    };

    const newStructure = form.structure.map(s => {
      if (s.id !== sectionId) return s;
      return {
        ...s,
        columns: s.columns.map(c => {
          if (c.id !== columnId) return c;
          return { ...c, fields: [...c.fields, newField] };
        })
      };
    });
    onChange({ ...form, structure: newStructure });
    setSelectedFieldId(newField.id);
  };

  const removeField = (fieldId: string) => {
    const newStructure = form.structure.map(s => ({
      ...s,
      columns: s.columns.map(c => ({
        ...c,
        fields: c.fields.filter(f => f.id !== fieldId)
      }))
    }));
    onChange({ ...form, structure: newStructure });
    if (selectedFieldId === fieldId) setSelectedFieldId(null);
  };

  const updateField = (fieldId: string, updates: Partial<AdvancedFormField>) => {
    const newStructure = form.structure.map(s => ({
      ...s,
      columns: s.columns.map(c => ({
        ...c,
        fields: c.fields.map(f => f.id === fieldId ? { ...f, ...updates } : f)
      }))
    }));
    onChange({ ...form, structure: newStructure });
  };

  const getSelectedField = () => {
    for (const section of form.structure) {
      for (const column of section.columns) {
        const field = column.fields.find(f => f.id === selectedFieldId);
        if (field) return field;
      }
    }
    return null;
  };

  const activeField = getSelectedField();

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full min-h-[700px]">
      {/* Toolbox / Structure */}
      <div className="flex-1 space-y-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-black text-slate-900 tracking-tight">Form Canvas</h3>
          <Button onClick={addSection} size="sm" variant="outline" className="gap-2 rounded-xl border-slate-200">
            <Plus className="h-4 w-4" /> Add Section
          </Button>
        </div>

        <div className="space-y-8">
          {form.structure.map((section, sIdx) => (
            <div key={section.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden group/section">
              <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center justify-between">
                <Input 
                  value={section.title} 
                  onChange={(e) => {
                    const newStructure = [...form.structure];
                    newStructure[sIdx].title = e.target.value;
                    onChange({ ...form, structure: newStructure });
                  }}
                  className="bg-transparent border-none font-bold text-slate-700 focus-visible:ring-0 p-0 h-auto w-auto min-w-[200px]"
                />
                <div className="flex items-center gap-2 opacity-0 group-hover/section:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" onClick={() => addColumn(section.id)} className="h-8 w-8 text-slate-400 hover:text-primary">
                    <Split className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => removeSection(section.id)} className="h-8 w-8 text-slate-400 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="p-6">
                <div className={cn("grid gap-6", section.columns.length > 1 ? `grid-cols-${section.columns.length}` : "grid-cols-1")}>
                  {section.columns.map((column, cIdx) => (
                    <div key={column.id} className="space-y-4 min-h-[100px] bg-slate-50/50 rounded-2xl p-4 border border-dashed border-slate-200 relative group/column">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Column {cIdx + 1}</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover/column:opacity-100 transition-opacity">
                          
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-slate-300 hover:text-red-500"
                            onClick={() => {
                              const newStructure = [...form.structure];
                              newStructure[sIdx].columns = section.columns.filter(c => c.id !== column.id);
                              onChange({ ...form, structure: newStructure });
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {column.fields.map((field, fIdx) => (
                          <motion.div 
                            key={field.id}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(
                              "p-4 bg-white border rounded-2xl shadow-sm cursor-pointer transition-all relative group/field",
                              selectedFieldId === field.id ? "border-primary ring-2 ring-primary/10" : "border-slate-200 hover:border-primary/50"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFieldId(field.id);
                            }}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                {field.type === 'text' && <Type className="h-3 w-3" />}
                                {field.type === 'number' && <Hash className="h-3 w-3" />}
                                {field.type === 'email' && <Mail className="h-3 w-3" />}
                                {field.type}
                              </span>
                              <div className="flex items-center gap-1 opacity-0 group-hover/field:opacity-100 transition-opacity">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 text-slate-300 hover:text-red-500"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeField(field.id);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <p className="font-bold text-slate-700">{field.label || "Untitled Field"}</p>
                            {field.required && <Badge variant="secondary" className="mt-2 text-[8px] bg-red-50 text-red-500 border-none uppercase py-0 px-1">Required</Badge>}
                          </motion.div>
                        ))}
                      </div>

                      <div className="pt-4 border-t border-slate-200 mt-4 flex items-center justify-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-[10px] uppercase font-bold text-slate-400 hover:text-primary h-8"
                          onClick={() => addField(section.id, column.id, 'text')}
                        >
                          <Plus className="h-3 w-3 mr-1" /> Text
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-[10px] uppercase font-bold text-slate-400 hover:text-primary h-8"
                          onClick={() => addField(section.id, column.id, 'number')}
                        >
                          <Plus className="h-3 w-3 mr-1" /> Number
                        </Button>
                        <Select onValueChange={(val: FieldType) => addField(section.id, column.id, val)}>
                          <SelectTrigger className="w-auto h-8 bg-transparent border-none p-0 text-[10px] font-bold uppercase text-slate-400 hover:text-primary gap-1">
                            <Plus className="h-3 w-3" /> More
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="date">Date</SelectItem>
                            <SelectItem value="select">Dropdown</SelectItem>
                            <SelectItem value="textarea">Multi-line Text</SelectItem>
                            <SelectItem value="checkbox">Checkbox</SelectItem>
                            <SelectItem value="radio">Radio Buttons</SelectItem>
                            <SelectItem value="file">File Upload</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {form.structure.length === 0 && (
            <div className="py-20 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl">
               <p className="text-slate-400 font-medium italic">Start by adding a section...</p>
               <Button onClick={addSection} className="mt-4 gap-2 rounded-xl">
                 <Plus className="h-4 w-4" /> Add First Section
               </Button>
            </div>
          )}
        </div>
      </div>

      {/* Editor Panel */}
      <div className="w-full lg:w-80 h-fit sticky top-24">
        <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
          <CardHeader className="bg-slate-900 text-white p-6">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Settings2 className="h-4 w-4" /> 
              {activeField ? 'Field Settings' : 'Form Configuration'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {activeField ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Label</Label>
                  <Input 
                    value={activeField.label} 
                    onChange={(e) => updateField(activeField.id, { label: e.target.value })}
                    className="rounded-xl border-slate-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Placeholder</Label>
                  <Input 
                    value={activeField.placeholder || ''} 
                    onChange={(e) => updateField(activeField.id, { placeholder: e.target.value })}
                    className="rounded-xl border-slate-200"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <Label className="text-xs font-bold text-slate-700">Required Field</Label>
                  <Switch 
                    checked={activeField.required} 
                    onCheckedChange={(checked) => updateField(activeField.id, { required: checked })}
                  />
                </div>

                {['select', 'radio', 'checkbox'].includes(activeField.type) && (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Options (Comma separated)</Label>
                    <textarea 
                      className="w-full min-h-[100px] p-4 rounded-2xl border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                      value={activeField.options?.join(', ') || ''}
                      onChange={(e) => updateField(activeField.id, { options: e.target.value.split(',').map(s => s.trim()).filter(s => s) })}
                    />
                  </div>
                )}

                <div className="pt-4 border-t flex flex-col gap-2">
                  <Button variant="outline" className="w-full rounded-xl border-slate-200" onClick={() => setSelectedFieldId(null)}>
                    Done Editing
                  </Button>
                  <Button variant="ghost" className="w-full rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => removeField(activeField.id)}>
                    Delete Field
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-10">
                <div className="bg-slate-100 h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Settings2 className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-500">Select a field on the canvas to edit its properties.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
