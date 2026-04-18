import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';

export interface MenuItem {
  id: string;
  label: string;
  enabled: boolean;
  icon?: string;
  isCustom?: boolean;
}

export interface DocumentSettings {
  instituteName: string;
  departmentName: string;
  subTitle?: string;
  footerLine1?: string;
  footerLine2?: string;
  showGridlines: boolean;
  headerColor?: string;
  logoUrl?: string;
}

export interface ExcelTemplate {
  id: string;
  pageName: string;
  fileName: string;
  fileBase64: string; // Storing as base64 for simplicity in prototype, normally would be Storage URL
  mappings: { field: string; cell: string; isTableColumn?: boolean }[];
  formFields?: any[]; // Schema for the generated form
  isMultipleEntry?: boolean;
  tableStartRow?: number;
  updatedAt: string;
}

export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  fields: any[]; // The schema for FormBuilder
  icon: string;
}

export interface AppSettings {
  appName: string;
  themeColor?: string;
  menuItems: MenuItem[];
  logoUrl?: string;
  docSettings?: DocumentSettings;
  excelTemplates?: ExcelTemplate[];
  formTemplates?: FormTemplate[];
}

interface AppSettingsContextType {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  loading: boolean;
}

const defaultMenuItems: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', enabled: true },
  { id: 'profile', label: 'Profile', enabled: true },
  { id: 'instructors', label: 'Instructors', enabled: true },
  { id: 'students', label: 'Students', enabled: true },
  { id: 'lesson-plan', label: 'Lesson Plan', enabled: true },
  { id: 'demo-plan', label: 'Demo Plan', enabled: true },
  { id: 'monthly-plan', label: 'Monthly Plan', enabled: true },
  { id: 'yearly-plan', label: 'Yearly Plan', enabled: true },
  { id: 'formative-assess', label: 'Formative Assessment', enabled: true },
  { id: 'monthly-assess', label: 'Monthly Assessment', enabled: true },
  { id: 'internal-assess', label: 'Internal Assessment', enabled: true },
  { id: 'daily-diary', label: 'Daily Diary', enabled: true },
  { id: 'attendance', label: 'Attendance', enabled: true },
  { id: 'custom-forms', label: 'Form Builder Pro', enabled: true },
  { id: 'form-templates', label: 'Template Library', enabled: true },
  { id: 'form-analytics', label: 'Form Analytics', enabled: true },
  { id: 'settings', label: 'Settings', enabled: true },
];

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

export const AppSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>({
    appName: 'ITI Instructor Management',
    menuItems: defaultMenuItems,
    docSettings: {
      instituteName: 'Industrial Training Institute',
      departmentName: 'Directorate of Vocational Education & Training',
      showGridlines: true,
      footerLine1: 'Supervisor Signature',
      footerLine2: 'Principal Signature'
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'system', 'config'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as AppSettings;
        
        // Merge menu items to ensure new defaults are present if not in DB
        const existingItems = data.menuItems || [];
        const mergedItems = [...existingItems];
        
        defaultMenuItems.forEach(defaultItem => {
          if (!mergedItems.find(item => item.id === defaultItem.id)) {
            mergedItems.push(defaultItem);
          }
        });

        setSettings(prev => ({
          ...prev,
          ...data,
          menuItems: mergedItems
        }));
      }
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'system/config');
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    try {
      const updated = { ...settings, ...newSettings };
      await setDoc(doc(db, 'system', 'config'), updated);
      toast.success('App settings updated successfully');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'system/config');
    }
  };

  return (
    <AppSettingsContext.Provider value={{ settings, updateSettings, loading }}>
      {children}
    </AppSettingsContext.Provider>
  );
};

export const useAppSettings = () => {
  const context = useContext(AppSettingsContext);
  if (context === undefined) {
    throw new Error('useAppSettings must be used within an AppSettingsProvider');
  }
  return context;
};
