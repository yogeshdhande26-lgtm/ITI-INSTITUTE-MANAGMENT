import React from 'react';
import { useAuth } from './AuthContext';
import { useLanguage } from './LanguageContext';
import { 
  LayoutDashboard, 
  Users, 
  User,
  Settings,
  ClipboardList,
  Users2,
  FileText,
  Presentation,
  CalendarDays,
  CalendarRange,
  ClipboardCheck,
  BarChart3,
  BookOpenCheck,
  Layout as LayoutIcon,
  Sparkles,
  Library,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  role: string;
}

import { useAppSettings } from './AppSettingsContext';

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, role }) => {
  const { userData } = useAuth();
  const { t } = useLanguage();
  const { settings } = useAppSettings();

  const iconMap: Record<string, any> = {
    'dashboard': LayoutDashboard,
    'instructors': Users,
    'students': Users2,
    'settings': Settings,
    'profile': User,
    'lesson-plan': FileText,
    'demo-plan': Presentation,
    'monthly-plan': CalendarDays,
    'yearly-plan': CalendarRange,
    'formative-assess': ClipboardCheck,
    'monthly-assess': BarChart3,
    'internal-assess': ClipboardList,
    'daily-diary': BookOpenCheck,
    'attendance': ClipboardList,
    'custom-forms': Sparkles,
    'form-templates': Library,
    'form-analytics': TrendingUp
  };
  
  const navItems = settings.menuItems
    .filter(item => item.enabled) // Global toggle from System Config
    .filter(item => {
      // Role-based filtering
      if (role === 'admin') {
        return ['dashboard', 'instructors', 'students', 'settings', 'custom-forms', 'form-templates', 'form-analytics'].includes(item.id);
      }
      
      if (role === 'student') {
        if (['dashboard', 'profile', 'settings'].includes(item.id)) return true;
        return userData?.enabledFeatures?.includes(item.id);
      }
      
      // Instructor role
      if (['dashboard', 'profile', 'settings'].includes(item.id)) return true;
      if (userData?.enabledFeatures) {
        return userData.enabledFeatures.includes(item.id);
      }
      return true;
    })
    .map(item => ({
      ...item,
      icon: iconMap[item.id] || LayoutIcon
    }));

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r h-[calc(100vh-64px)] sticky top-16 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
      <div className="p-4 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 mb-4">
          {role === 'admin' ? t('administration') : role === 'student' ? 'Student Portal' : t('instructorPanel')}
        </p>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <Button
              key={item.id}
              variant={activeTab === item.id ? 'secondary' : 'ghost'}
              className={cn(
                "w-full justify-start gap-3 h-10 px-4 transition-all duration-200",
                activeTab === item.id 
                  ? "bg-primary/10 text-primary hover:bg-primary/15 font-semibold" 
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
              onClick={() => setActiveTab(item.id)}
            >
              <item.icon className={cn(
                "h-4 w-4",
                activeTab === item.id ? "text-primary" : "text-slate-400"
              )} />
              <span className="truncate">{item.label}</span>
            </Button>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-4 border-t bg-slate-50/50">
        <div className="bg-white p-3 rounded-xl border shadow-sm">
          <p className="text-xs font-medium text-slate-500">System Status</p>
          <div className="flex items-center gap-2 mt-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-xs font-semibold text-slate-700">All systems online</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
