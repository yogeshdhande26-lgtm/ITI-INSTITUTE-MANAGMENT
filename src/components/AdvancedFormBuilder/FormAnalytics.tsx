import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { AdvancedForm } from './types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Users, 
  FileText, 
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Activity
} from 'lucide-react';

interface FormAnalyticsProps {
  forms: AdvancedForm[];
}

export const FormAnalytics: React.FC<FormAnalyticsProps> = ({ forms }) => {
  // Mock data for visualization
  const submissionData = [
    { date: 'Mon', count: 12 },
    { date: 'Tue', count: 18 },
    { date: 'Wed', count: 45 },
    { date: 'Thu', count: 32 },
    { date: 'Fri', count: 28 },
    { date: 'Sat', count: 15 },
    { date: 'Sun', count: 8 },
  ];

  const tradeData = [
    { name: 'Fitter', value: 400 },
    { name: 'Electrician', value: 300 },
    { name: 'Welder', value: 200 },
    { name: 'CNC Lab', value: 150 },
  ];

  const COLORS = ['#0f172a', '#3b82f6', '#10b981', '#f59e0b'];

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Forms', value: forms.length, icon: FileText, color: 'blue', change: '+2', trend: 'up' },
          { label: 'Total Submissions', value: '1,284', icon: Users, color: 'slate', change: '+12%', trend: 'up' },
          { label: 'Avg. Completion', value: '4m 32s', icon: Clock, color: 'emerald', change: '-10s', trend: 'down' },
          { label: 'Active Rate', value: '86%', icon: Activity, color: 'amber', change: '+5%', trend: 'up' },
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-sm rounded-[2rem] bg-white p-8">
            <div className="flex items-start justify-between">
              <div className={`p-4 rounded-2xl bg-${stat.color}-50`}>
                <stat.icon className={`h-6 w-6 text-${stat.color}-600`} />
              </div>
              <div className={`flex items-center gap-1 text-xs font-bold ${stat.trend === 'up' ? 'text-emerald-500' : 'text-red-500'}`}>
                {stat.change}
                {stat.trend === 'up' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              </div>
            </div>
            <div className="mt-6">
              <p className="text-3xl font-black text-slate-900">{stat.value}</p>
              <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest mt-1">{stat.label}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Activity Chart */}
        <Card className="border-none shadow-sm rounded-[2.5rem] bg-white p-8">
          <CardHeader className="p-0 mb-8">
            <CardTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Submission Velocity
            </CardTitle>
          </CardHeader>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={submissionData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    padding: '12px'
                  }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#0f172a" 
                  strokeWidth={4} 
                  dot={{ r: 6, fill: '#0f172a', strokeWidth: 0 }}
                  activeDot={{ r: 8, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Trade Distribution */}
        <Card className="border-none shadow-sm rounded-[2.5rem] bg-white p-8">
          <CardHeader className="p-0 mb-8">
            <CardTitle className="text-xl font-black text-slate-900">Trade Distribution</CardTitle>
          </CardHeader>
          <div className="flex items-center justify-between h-[300px]">
            <div className="w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={tradeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {tradeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-1/2 space-y-4">
              {tradeData.map((item, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{item.name}</p>
                    <p className="text-sm font-black text-slate-700">{item.value} Entries</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Form Performance List */}
      <Card className="border-none shadow-sm rounded-[2.5rem] bg-white overflow-hidden">
        <div className="p-8 border-b border-slate-50">
          <h3 className="text-xl font-black text-slate-900">Form Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Form Name</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Submissions</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Avg. Time</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Conversion</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {forms.slice(0, 5).map((form, i) => (
                <tr key={form.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-6">
                    <p className="font-bold text-slate-900">{form.name}</p>
                    <p className="text-xs text-slate-400 font-medium">Updated {safeFormatDate(form.updatedAt || form.createdAt, 'MMM d')}</p>
                  </td>
                  <td className="px-8 py-6 font-black text-slate-700">{Math.floor(Math.random() * 500) + 10}</td>
                  <td className="px-8 py-6 font-medium text-slate-500">2m {Math.floor(Math.random() * 59)}s</td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${Math.floor(Math.random() * 40) + 60}%` }} />
                      </div>
                      <span className="text-xs font-black text-slate-400">{Math.floor(Math.random() * 40) + 60}%</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <Badge className="rounded-full bg-emerald-50 text-emerald-600 border-none font-bold text-[10px] uppercase">Healthy</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// Helper for date formatting
function safeFormatDate(date: any, format: string) {
  if (!date) return 'N/A';
  try {
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return 'N/A';
  }
}
