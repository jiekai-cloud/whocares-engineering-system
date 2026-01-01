
import React, { useMemo, useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie
} from 'recharts';
import { LayoutDashboard, FolderKanban, Users, BarChart3, TrendingUp, AlertCircle, Clock, CheckCircle2, DollarSign, ArrowUpRight, ArrowDownRight, Activity, ShieldAlert, Zap, ExternalLink, Sparkles, Phone, MapPin } from 'lucide-react';
import { Project, ProjectStatus, Lead } from '../types';

interface DashboardProps {
  projects: Project[];
  leads?: Lead[];
  onConvertLead?: (leadId: string) => void;
  onProjectClick: (projectId: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ projects, leads = [], onConvertLead, onProjectClick }) => {
  const [lastSync, setLastSync] = useState(new Date());
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  const availableYears = useMemo(() => {
    const years = projects.map(p => p.startDate.split('-')[0]);
    const uniqueYears = (Array.from(new Set(years)) as string[]).sort((a, b) => b.localeCompare(a));
    return uniqueYears;
  }, [projects]);

  const months = [
    { value: '01', label: '1月' }, { value: '02', label: '2月' }, { value: '03', label: '3月' },
    { value: '04', label: '4月' }, { value: '05', label: '5月' }, { value: '06', label: '6月' },
    { value: '07', label: '7月' }, { value: '08', label: '8月' }, { value: '09', label: '9月' },
    { value: '10', label: '10月' }, { value: '11', label: '11月' }, { value: '12', label: '12月' },
  ];

  // 1. 高效過濾：在大數據量下僅在必要時重新計算
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const [pYear, pMonth] = p.startDate.split('-');
      const matchYear = selectedYear === 'all' || pYear === selectedYear;
      const matchMonth = selectedMonth === 'all' || pMonth === selectedMonth;
      return matchYear && matchMonth;
    });
  }, [projects, selectedYear, selectedMonth]);

  // 2. 統計數據聚合
  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    let totalBudget = 0;
    let totalSpent = 0;

    filteredProjects.forEach(p => {
      counts[p.status] = (counts[p.status] || 0) + 1;
      totalBudget += p.budget;
      totalSpent += p.spent;
    });

    return { counts, totalBudget, totalSpent };
  }, [filteredProjects]);

  // 3. 異常檢測：抓取滯留與「預算超支」案件
  const riskProjects = useMemo(() => {
    const now = new Date();

    // 時間風險
    const timeRisks = filteredProjects
      .filter(p => (p.status === ProjectStatus.NEGOTIATING || p.status === ProjectStatus.QUOTING))
      .map(p => {
        const diff = now.getTime() - new Date(p.createdDate).getTime();
        return { ...p, riskType: 'delay', riskValue: Math.floor(diff / (1000 * 60 * 60 * 24)) };
      })
      .filter(p => p.riskValue >= 5);

    // 財務風險
    const financialRisks = filteredProjects
      .filter(p => p.budget > 0)
      .map(p => {
        const ratio = p.spent / p.budget;
        return { ...p, riskType: 'budget', riskValue: Math.round(ratio * 100) };
      })
      .filter(p => p.riskValue >= 80);

    return [...timeRisks, ...financialRisks]
      .sort((a, b) => b.riskValue - a.riskValue)
      .slice(0, 6);
  }, [filteredProjects]);

  const statsCards = [
    { label: '案件總量', value: filteredProjects.length, icon: Layers, color: 'text-slate-600', bg: 'bg-slate-50' },
    { label: '報價滯留', value: (stats.counts[ProjectStatus.NEGOTIATING] || 0) + (stats.counts[ProjectStatus.QUOTING] || 0), icon: FileWarning, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: '施工進行中', value: stats.counts[ProjectStatus.CONSTRUCTING] || 0, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: '執行週轉率', value: `${filteredProjects.length > 0 ? Math.round(((stats.counts[ProjectStatus.COMPLETED] || 0) / filteredProjects.length) * 100) : 0}% `, icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="p-4 lg:p-8 space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl lg:text-2xl font-black text-stone-900 tracking-tight">生活品質 • 智慧指揮中心</h1>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-stone-900 text-white rounded-full">
              <Sparkles size={12} className="text-orange-400" />
              <span className="text-[10px] font-black uppercase tracking-widest">Scale Optimized</span>
            </div>
          </div>
          <p className="text-stone-500 text-xs font-medium">數據規模：{projects.length} 案場 | 最後運算：{lastSync.toLocaleTimeString()}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-2xl border border-stone-200 shadow-sm">
          <div className="flex items-center gap-2 px-3 border-r border-stone-100">
            <CalendarDays size={14} className="text-stone-400" />
            <select className="bg-transparent text-xs font-bold outline-none cursor-pointer" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
              <option value="all">全年度</option>
              {availableYears.map(year => <option key={year} value={year}>{year}年</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 px-3">
            <Clock size={14} className="text-stone-400" />
            <select className="bg-transparent text-xs font-bold outline-none cursor-pointer" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
              <option value="all">全月份</option>
              {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {statsCards.map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-4 transition-all hover:shadow-md">
            <div className={`p - 3 rounded - xl ${stat.bg} ${stat.color} `}>
              <stat.icon size={20} />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-xl font-black text-stone-900 leading-tight">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-6">
          {riskProjects.length > 0 && (
            <div className="bg-white rounded-[2.5rem] border-2 border-rose-100 shadow-xl shadow-rose-50 overflow-hidden">
              <div className="bg-rose-500 px-8 py-4 flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                  <AlertTriangle size={20} className="animate-pulse" />
                  <h3 className="font-black text-sm uppercase tracking-widest">營運與財務預警中心</h3>
                </div>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {riskProjects.map(p => (
                  <button key={p.id} onClick={() => onProjectClick(p)} className="flex items-center justify-between p-4 bg-rose-50/50 rounded-2xl border border-rose-100 hover:bg-rose-50 transition-all text-left group">
                    <div className="space-y-1">
                      <p className="text-xs font-black text-stone-900 group-hover:text-rose-600 truncate max-w-[150px]">{p.name}</p>
                      <p className={`text - [10px] font - bold ${p.riskType === 'budget' ? 'text-orange-600' : 'text-rose-500'} `}>
                        {p.riskType === 'budget' ? `預算執行率已達 ${p.riskValue}% ` : `報價已滯留 ${p.riskValue} 天`}
                      </p>
                    </div>
                    <ArrowRight size={14} className="text-rose-300" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white p-8 rounded-[2.5rem] border border-stone-100 shadow-sm">
            <h3 className="text-sm font-black text-stone-900 mb-8 uppercase tracking-widest border-l-4 border-orange-500 pl-4">全案場狀態分佈矩陣</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {Object.values(ProjectStatus).map((status) => (
                <div key={status} className="bg-stone-50 p-4 rounded-2xl border border-stone-100 flex flex-col items-center justify-center text-center">
                  <span className="text-lg font-black text-stone-900">{stats.counts[status] || 0}</span>
                  <span className="text-[9px] font-black text-stone-400 uppercase tracking-tighter">{status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右側：會勘線索與異常預警 */}
        <div className="xl:col-span-1 space-y-6">
          {/* 會勘線索 (Tiiny Web App 串接) */}
          <div className="bg-white rounded-[2rem] border border-stone-200 shadow-sm overflow-hidden flex flex-col h-fit">
            <div className="px-6 py-5 border-b border-stone-100 bg-gradient-to-r from-indigo-50/50 to-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-indigo-600" />
                <h3 className="font-black text-[10px] uppercase tracking-widest text-stone-900">最新會勘線索 (WEB)</h3>
              </div>
              <span className="bg-indigo-600 text-white px-2 py-0.5 rounded-lg text-[8px] font-black animate-pulse">LIVE</span>
            </div>
            <div className="p-4 space-y-3">
              {leads.filter(l => l.status === 'new').length > 0 ? leads.filter(l => l.status === 'new').map(lead => (
                <div key={lead.id} className="p-4 rounded-2xl bg-indigo-50/30 border border-indigo-100 hover:border-indigo-300 transition-all group">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-xs font-black text-stone-900">{lead.customerName}</p>
                    <span className="text-[8px] font-bold text-stone-400">{lead.timestamp}</span>
                  </div>
                  <div className="space-y-1.5 mb-4">
                    <div className="flex items-center gap-2 text-[10px] text-stone-500 font-medium">
                      <Phone size={10} /> {lead.phone}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-stone-500 font-medium">
                      <MapPin size={10} /> {lead.address}
                    </div>
                    <div className="mt-2 text-[10px] font-bold text-indigo-700 bg-indigo-100/50 p-2 rounded-lg leading-relaxed line-clamp-2">
                      AI 診斷：{lead.diagnosis}
                    </div>
                  </div>
                  <button
                    onClick={() => onConvertLead?.(lead.id)}
                    className="w-full bg-indigo-600 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 group-hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                  >
                    轉為專案洽談 <ArrowUpRight size={12} />
                  </button>
                </div>
              )) : (
                <div className="py-12 flex flex-col items-center justify-center text-stone-300 opacity-50 gap-2">
                  <Zap size={32} />
                  <p className="text-[10px] font-black uppercase tracking-widest">目前無新線索</p>
                </div>
              )}
              {leads.filter(l => l.status === 'new').length > 0 && (
                <p className="text-[9px] text-center text-stone-400 font-bold mt-2 cursor-pointer hover:text-indigo-600">查看所有外部線索 →</p>
              )}
            </div>
          </div>

          <div className="bg-stone-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-xl">
            <div className="relative z-10 space-y-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <ShieldAlert size={18} className="text-orange-500" /> 營運效能分析
              </h3>
              <div className="space-y-4">
                <div className="p-5 bg-white/5 rounded-2xl border border-white/10">
                  <p className="text-[10px] font-black text-blue-400 uppercase mb-2">預算消化率</p>
                  <p className="text-2xl font-black">{stats.totalBudget > 0 ? Math.round((stats.totalSpent / stats.totalBudget) * 100) : 0}%</p>
                  <p className="text-[10px] text-stone-400 mt-2 font-medium">當前選取範圍內總合約金額之執行狀況。</p>
                </div>
                <div className="p-5 bg-white/5 rounded-2xl border border-white/10">
                  <p className="text-[10px] font-black text-emerald-400 uppercase mb-2">管理負載度</p>
                  <p className="text-2xl font-black">{Math.ceil(filteredProjects.length / 50)} 案/人</p>
                  <p className="text-[10px] text-stone-400 mt-2 font-medium">基於五十人團隊之平均分配量。</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
