import React from 'react';
import { useAuth } from './AuthContext';
import { useLanguage, type Language } from './LanguageContext';
import { Button } from '@/components/ui/button';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { 
  LayoutDashboard, 
  Users, 
  LogOut, 
  Menu, 
  GraduationCap,
  User,
  Users2,
  ClipboardList,
  FileText,
  Presentation,
  CalendarDays,
  CalendarRange,
  ClipboardCheck,
  BarChart3,
  BookOpenCheck,
  FileSignature,
  Layout as LayoutIcon,
  Languages,
  Printer,
  Settings,
  Library,
  TrendingUp
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuGroup,
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

import { useAppSettings } from './AppSettingsContext';

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { user, userData } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { settings } = useAppSettings();

  const handleLogout = () => signOut(auth);

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
    'monthly-assess': BarChart3,
    'internal-assess': ClipboardList,
    'attendance': ClipboardList,
    'custom-forms': LayoutIcon,
    'form-templates': Library,
    'form-analytics': TrendingUp
  };

  const navItems = settings.menuItems
    .filter(item => item.enabled)
    .filter(item => {
      if (userData?.role === 'admin') {
        return ['dashboard', 'instructors', 'students', 'settings', 'custom-forms', 'form-templates', 'form-analytics'].includes(item.id);
      }
      
      if (userData?.role === 'student') {
        if (item.id === 'dashboard' || item.id === 'profile' || item.id === 'settings') return true;
        return userData?.enabledFeatures?.includes(item.id);
      }
      
      if (item.id === 'dashboard' || item.id === 'profile' || item.id === 'settings') return true;
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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="h-16 border-b bg-white sticky top-0 z-50 px-4 md:px-8 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-primary p-2 rounded-lg">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">{settings.appName}</h1>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => window.print()} 
            title={t('print')}
            className="text-slate-500"
          >
            <Printer className="h-5 w-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" className="gap-2 px-2 w-auto h-10 border border-slate-200">
                  <Languages className="h-4 w-4 text-slate-500" />
                  <span className="text-xs font-bold uppercase">{language}</span>
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Change Language</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setLanguage('en')} className={language === 'en' ? 'bg-slate-100 font-bold' : ''}>
                  English
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage('mr')} className={language === 'mr' ? 'bg-slate-100 font-bold' : ''}>
                  मराठी (Marathi)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage('hi')} className={language === 'hi' ? 'bg-slate-100 font-bold' : ''}>
                  हिन्दी (Hindi)
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10 border-2 border-primary/10">
                    <AvatarImage src={user?.photoURL || ''} alt={user?.displayName || ''} />
                    <AvatarFallback className="bg-primary/5 text-primary">
                      {user?.displayName?.charAt(0) || <User className="h-5 w-5" />}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              }
            />
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.displayName}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                    <div className="pt-2">
                      <Badge variant="outline" className="capitalize text-[10px]">
                        {userData?.role || 'User'}
                      </Badge>
                    </div>
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar for Desktop */}
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          role={userData?.role || 'instructor'} 
        />

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 w-full overflow-x-hidden">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t h-16 flex items-center justify-around px-4 z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        {navItems.slice(0, 5).map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center gap-1 p-2 transition-colors ${
              activeTab === item.id ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
