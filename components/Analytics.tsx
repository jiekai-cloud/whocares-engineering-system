
import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, Cell, PieChart, Pie
} from 'recharts';
import { TrendingUp, Coins, Users, Target, ArrowUpRight, ArrowDownRight, Sparkles, Activity } from 'lucide-react';
import { Project } from '../types';

interface AnalyticsProps {
  projects: Project[];
}

const Analytics: React.FC<AnalyticsProps> = ({ projects }) => {
  const sourceStats = useMemo(() => {
    const sources = Array.from(new Set(projects.map(p => p.source))).filter(Boolean);
    const stats = sources.map(source => {
      const sourceProjects = projects.filter(p => p.source === source);
      const total = sourceProjects.length;
      const won = sourceProjects.filter(p =>
        p.status === '施工中' || p.status === '已完工'
      ).length;
      const rate = total > 0 ? (won / total) * 100 : 0;
      return { name: source, total, won, rate };
    }).sort((a, b) => b.rate - a.rate);
    return stats;
  }, [projects]);

  const globalWon = projects.filter(p => p.status === '施工中' || p.status === '已完工').length;
  const globalRate = projects.length > 0 ? (globalWon / projects.length) * 100 : 0;

  const profitData = projects.slice(0, 6).map(p => ({
    name: p.name.substring(0, 4),
    預算: p.budget / 10000,
    支出: p.spent / 10000,
    毛利: (p.budget - p.spent) / 10000
  }));

  const COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

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
            <Activity size={20} className="text-indigo-600" /> 月度財務趨勢 (萬元)
          </h3>
          <div className="h-60 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[
                { month: '1月', income: 45, expense: 32 },
                { month: '2月', income: 52, expense: 38 },
                { month: '3月', income: 48, expense: 35 },
                { month: '4月', income: 61, expense: 42 },
                { month: '5月', income: 55, expense: 40 },
                { month: '6月', income: 70, expense: 48 },
              ]}>
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
                <Area type="monotone" dataKey="income" name="收入" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                <Area type="monotone" dataKey="expense" name="支出" stroke="#94a3b8" strokeWidth={2} fill="transparent" strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 團隊負擔與客戶來源 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col">
            <h3 className="font-bold text-slate-900 text-[11px] uppercase tracking-widest mb-4">團隊工作負載</h3>
            <div className="flex-1 min-h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: '設計組', value: 35 },
                      { name: '工程組', value: 45 },
                      { name: '售服組', value: 20 },
                    ]}
                    cx="50%" cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    <Cell fill="#6366f1" />
                    <Cell fill="#10b981" />
                    <Cell fill="#f59e0b" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-1 mt-4">
              <div className="text-center"><p className="text-[8px] font-black text-slate-400">設計</p><p className="text-xs font-black">35%</p></div>
              <div className="text-center"><p className="text-[8px] font-black text-slate-400">工程</p><p className="text-xs font-black">45%</p></div>
              <div className="text-center"><p className="text-[8px] font-black text-slate-400">售服</p><p className="text-xs font-black">20%</p></div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col">
            <h3 className="font-bold text-slate-900 text-[11px] uppercase tracking-widest mb-4">潛在客戶轉化</h3>
            <div className="space-y-4 flex-1 flex flex-col justify-center">
              {[
                { label: '初步聯繫', count: 120, color: 'bg-slate-900' },
                { label: '現場會勘', count: 85, color: 'bg-slate-700' },
                { label: '提供報價', count: 42, color: 'bg-blue-600' },
                { label: '正式簽約', count: 18, color: 'bg-emerald-500' },
              ].map((step, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-[8px] font-black uppercase tracking-tighter">
                    <span>{step.label}</span>
                    <span>{step.count}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                    <div className={`${step.color} h-full rounded-full`} style={{ width: `${(step.count / 120) * 100}%` }}></div>
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
        {[
          { label: '人均產值', value: `$2.8M`, trend: '+12.5%', isUp: true, icon: Users },
          { label: '成交率', value: `${globalRate.toFixed(1)}%`, trend: globalRate > 50 ? '優於平均' : '需優化', isUp: globalRate > 50, icon: Target },
          { label: '材料成本', value: '45.8%', trend: '+4.3%', isUp: false, icon: Coins },
          { label: '準時率', value: '88%', trend: '+5.0%', isUp: true, icon: Target },
        ].map((item, i) => (
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
