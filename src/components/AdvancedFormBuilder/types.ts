import { CustomField } from '../FormBuilder';
import { Attachment } from '../AttachmentBuilder';

export type FieldType = 'text' | 'email' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox' | 'radio' | 'file';

export interface LogicRule {
  fieldId: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than';
  value: string;
}

export interface ConditionalLogic {
  action: 'show' | 'hide';
  match: 'all' | 'any';
  rules: LogicRule[];
}

export interface AdvancedFormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[]; // For select, radio, checkbox
  width: number; // 0-100% or column span (1-4)
  defaultValue?: string;
  logic?: ConditionalLogic;
}

export interface AdvancedFormColumn {
  id: string;
  fields: AdvancedFormField[];
  width: number; // 1-12 (Grid columns)
}

export interface AdvancedFormSection {
  id: string;
  title?: string;
  columns: AdvancedFormColumn[];
}

export interface AdvancedForm {
  id: string;
  name: string;
  description?: string;
  structure: AdvancedFormSection[];
  settings: {
    pdfTitle?: string;
    pdfHeader?: string;
    pdfFooter?: string;
    allowedRoles: string[]; // Access control
    submitLabel?: string;
    multiStep?: boolean;
  };
  instructorId: string;
  createdAt: any;
  updatedAt?: any;
}

export interface AdvancedFormEntry {
  id: string;
  formId: string;
  instructorId: string;
  data: Record<string, any>;
  submittedBy: {
    uid: string;
    name: string;
    role: string;
  };
  createdAt: any;
}
