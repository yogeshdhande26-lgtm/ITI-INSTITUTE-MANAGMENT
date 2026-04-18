import React from 'react';
import { Plus, Trash2, Type, AlignLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

export interface CustomField {
  id: string;
  label: string;
  value: string;
  type: 'text' | 'textarea';
}

interface FormBuilderProps {
  fields: CustomField[];
  onChange: (fields: CustomField[]) => void;
  isLocked?: boolean;
}

export const FormBuilder: React.FC<FormBuilderProps> = ({ fields, onChange, isLocked }) => {
  const addField = () => {
    const newField: CustomField = {
      id: Math.random().toString(36).substr(2, 9),
      label: 'New Field',
      value: '',
      type: 'text'
    };
    onChange([...fields, newField]);
  };

  const removeField = (id: string) => {
    onChange(fields.filter(f => f.id !== id));
  };

  const updateField = (id: string, updates: Partial<CustomField>) => {
    onChange(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Custom Fields</h3>
        {!isLocked && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={addField}
            className="h-8 gap-2 text-xs border-dashed"
          >
            <Plus className="h-3 w-3" /> Add Field
          </Button>
        )}
      </div>

      {fields.length === 0 ? (
        <div className="text-center py-6 bg-slate-50 rounded-lg border border-dashed border-slate-200">
          <p className="text-xs text-slate-400">No custom fields added yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {fields.map((field) => (
            <div key={field.id} className="flex gap-3 items-start p-3 bg-white rounded-lg border border-slate-200 shadow-sm group">
              <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                  <Input 
                    placeholder="Field Label"
                    value={field.label}
                    onChange={(e) => updateField(field.id, { label: e.target.value })}
                    disabled={isLocked}
                    className="h-8 text-xs font-bold bg-slate-50/50"
                  />
                  <Select
                    value={field.type}
                    onValueChange={(val: 'text' | 'textarea') => updateField(field.id, { type: val })}
                    disabled={isLocked}
                  >
                    <SelectTrigger className="h-8 w-32 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">
                        <div className="flex items-center gap-2">
                          <Type className="h-3 w-3" /> Text
                        </div>
                      </SelectItem>
                      <SelectItem value="textarea">
                        <div className="flex items-center gap-2">
                          <AlignLeft className="h-3 w-3" /> Textarea
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {field.type === 'text' ? (
                  <Input 
                    placeholder="Value..."
                    value={field.value}
                    onChange={(e) => updateField(field.id, { value: e.target.value })}
                    disabled={isLocked}
                    className="h-9 text-sm"
                  />
                ) : (
                  <textarea 
                    placeholder="Value..."
                    value={field.value}
                    onChange={(e) => updateField(field.id, { value: e.target.value })}
                    disabled={isLocked}
                    className="w-full min-h-[80px] p-2 text-sm border rounded-md focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                  />
                )}
              </div>
              
              {!isLocked && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => removeField(field.id)}
                  className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
