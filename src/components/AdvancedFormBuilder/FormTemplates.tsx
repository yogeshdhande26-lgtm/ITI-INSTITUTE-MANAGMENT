import React from 'react';
import { AdvancedForm } from './types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  GraduationCap, 
  Settings,
  ArrowRight,
  Sparkles,
  Wrench,
  ClipboardCheck
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface FormTemplatesProps {
  onSelect: (template: AdvancedForm) => void;
}

export const formTemplates: Omit<AdvancedForm, 'id' | 'instructorId' | 'createdAt'>[] = [
  {
    name: "Workshop Equipment Log",
    description: "Standard register for tracking machine usage, maintenance, and tool condition.",
    structure: [
      {
        id: "s1",
        title: "Machine Details",
        columns: [
          {
            id: "c1",
            width: 12,
            fields: [
              { id: "f1", type: "text", label: "Machine Name", required: true, width: 12 },
              { id: "f2", type: "text", label: "Machine ID/Serial No", required: true, width: 12 },
              { id: "f3", type: "select", label: "Workshop Section", options: ["Fitter", "Electrician", "Welder", "CNC Lab"], required: true, width: 12 }
            ]
          }
        ]
      },
      {
        id: "s2",
        title: "Maintenance Status",
        columns: [
          {
            id: "c2",
            width: 6,
            fields: [
              { id: "f4", type: "date", label: "Last Maintenance Date", required: true, width: 12 },
              { id: "f5", type: "select", label: "Condition", options: ["Excellent", "Working", "Needs Repair", "Out of Order"], required: false, width: 12 }
            ]
          },
          {
            id: "c3",
            width: 6,
            fields: [
              { id: "f6", type: "number", label: "Usage Hours", required: false, width: 12 },
              { id: "f7", type: "textarea", label: "Maintenance Notes", required: false, width: 12 }
            ]
          }
        ]
      }
    ],
    settings: {
      allowedRoles: ["admin", "instructor"],
      submitLabel: "Log Maintenance Data"
    }
  },
  {
    name: "Student Skill Assessment",
    description: "Detailed practical evaluation form for trade-specific student competencies.",
    structure: [
      {
        id: "s1",
        title: "Student Identification",
        columns: [
          {
            id: "c1",
            width: 6,
            fields: [
              { id: "f1", type: "text", label: "Student Name", required: true, width: 12 },
              { id: "f2", type: "text", label: "Roll Number", required: true, width: 12 }
            ]
          },
          {
            id: "c2",
            width: 6,
            fields: [
              { id: "f3", type: "select", label: "Trade Year", options: ["Year 1", "Year 2"], required: true, width: 12 },
              { id: "f4", type: "date", label: "Assessment Date", required: true, width: 12 }
            ]
          }
        ]
      },
      {
        id: "s2",
        title: "Practical Performance",
        columns: [
          {
            id: "c3",
            width: 12,
            fields: [
              { id: "f5", type: "number", label: "Accuracy Score (1-10)", required: true, width: 12 },
              { id: "f6", type: "number", label: "Safety Protocol Score (1-10)", required: true, width: 12 },
              { id: "f7", type: "textarea", label: "Instructor Feedback", required: false, width: 12 }
            ]
          }
        ]
      }
    ],
    settings: {
      allowedRoles: ["admin", "instructor"],
      submitLabel: "Finalize Assessment"
    }
  },
  {
    name: "Raw Material Inventory",
    description: "Track consumable materials, remaining stock, and procurement needs for workshops.",
    structure: [
      {
        id: "s1",
        title: "Material Info",
        columns: [
          {
            id: "c1",
            width: 12,
            fields: [
              { id: "f1", type: "text", label: "Material Type", required: true, width: 12 },
              { id: "f2", type: "number", label: "Current Quantity", required: true, width: 12 },
              { id: "f3", type: "select", label: "Unit", options: ["KG", "Meters", "Units", "Liters"], required: true, width: 12 }
            ]
          }
        ]
      }
    ],
    settings: {
      allowedRoles: ["admin"],
      submitLabel: "Update Inventory"
    }
  }
];

export const FormTemplates: React.FC<FormTemplatesProps> = ({ onSelect }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {formTemplates.map((template, index) => (
        <Card key={index} className="border-none shadow-sm hover:shadow-2xl transition-all duration-500 rounded-[2.5rem] overflow-hidden bg-white group flex flex-col">
          <div className="p-10 flex flex-col h-full">
            <div className="mb-8 relative">
              <div className="absolute -inset-4 bg-primary/5 rounded-full scale-0 group-hover:scale-100 transition-transform duration-500" />
              <div className="bg-slate-50 p-6 rounded-3xl w-fit relative group-hover:bg-primary/10 transition-colors duration-500">
                {index === 0 && <Settings className="h-8 w-8 text-primary" />}
                {index === 1 && <GraduationCap className="h-8 w-8 text-primary" />}
                {index === 2 && <ClipboardCheck className="h-8 w-8 text-primary" />}
              </div>
            </div>

            <div className="space-y-4 flex-grow">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="rounded-full px-3 py-1 text-[10px] uppercase font-black tracking-widest border-slate-200 text-slate-400">
                  {template.structure.reduce((acc, s) => acc + s.columns.reduce((a2, c) => a2 + c.fields.length, 0), 0)} Fields
                </Badge>
                {index === 0 && <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Popular</span>}
              </div>
              <h3 className="text-2xl font-black text-slate-900 group-hover:text-primary transition-colors leading-tight">{template.name}</h3>
              <p className="text-slate-500 text-sm leading-relaxed font-medium">{template.description}</p>
            </div>

            <div className="mt-10 pt-8 border-t border-slate-50">
              <Button 
                onClick={() => onSelect(template as any)}
                className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 text-sm font-black gap-3 group/btn"
              >
                Use This Template
                <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </Card>
      ))}

      <Card className="border-2 border-dashed border-slate-200 bg-transparent rounded-[2.5rem] flex flex-col items-center justify-center p-10 text-center hover:border-primary/50 transition-colors group">
        <div className="bg-white p-6 rounded-full shadow-sm mb-6 group-hover:scale-110 transition-transform">
          <Sparkles className="h-10 w-10 text-primary" />
        </div>
        <h3 className="text-xl font-black text-slate-900 leading-tight">Custom Pro Form</h3>
        <p className="text-slate-400 text-sm mt-2 mb-8 font-medium">Start with a blank canvas and architect your own structure.</p>
        <Button 
          variant="outline" 
          className="rounded-2xl h-14 px-8 border-slate-200 font-bold hover:bg-white hover:border-primary hover:text-primary transition-all active:scale-95"
          onClick={() => onSelect({
            name: "New Custom Form",
            description: "Start with a clean slate to build your own specialized document structure.",
            structure: [
              {
                id: "s1",
                title: "General Information",
                columns: [
                  { id: "c1", width: 12, fields: [] }
                ]
              }
            ],
            settings: {
              allowedRoles: ["admin", "instructor"],
              submitLabel: "Save Record",
              multiStep: false
            }
          } as any)}
        >
          Blank Slate
        </Button>
      </Card>
    </div>
  );
};
