import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { useLanguage } from './LanguageContext';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserCheck, UserX, Briefcase, GraduationCap } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { t } = useLanguage();
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    trades: 0,
  });

  useEffect(() => {
    const q = query(collection(db, 'instructors'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data());
      const active = data.filter((d: any) => d.status === 'Active').length;
      const trades = new Set(data.map((d: any) => d.trade)).size;
      
      setStats({
        total: data.length,
        active: active,
        inactive: data.length - active,
        trades: trades,
      });
    });

    return () => unsubscribe();
  }, []);

  const statCards = [
    { title: t('totalInstructors'), value: stats.total, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: t('active'), value: stats.active, icon: UserCheck, color: 'text-green-600', bg: 'bg-green-50' },
    { title: t('inactive'), value: stats.inactive, icon: UserX, color: 'text-red-600', bg: 'bg-red-50' },
    { title: t('tradesCovered'), value: stats.trades, icon: Briefcase, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{t('dashboardOverview')}</h2>
        <p className="text-muted-foreground">{t('welcomeAppInfo')}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, i) => (
          <Card key={i} className="border-none shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className={`${stat.bg} p-2 rounded-full`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              {t('aboutSystem')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground leading-relaxed">
            <p>
              {t('systemDescription1')}
            </p>
            <p className="mt-4">
              {t('systemDescription2')}
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>{t('centralizedDb')}</li>
              <li>{t('tradeAllocation')}</li>
              <li>{t('statusTracking')}</li>
              <li>{t('rbac')}</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>{t('quickActions')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="p-3 rounded-lg bg-muted/50 text-sm flex items-center justify-between">
              <span>{t('addTradeInfo')}</span>
              <span className="text-xs font-medium text-primary">{t('contactAdmin')}</span>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-sm flex items-center justify-between">
              <span>{t('generateMonthlyReport')}</span>
              <span className="text-xs font-medium text-primary cursor-pointer hover:underline">{t('comingSoon')}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
