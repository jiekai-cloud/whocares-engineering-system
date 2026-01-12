
import React, { useMemo, useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Legend
} from 'recharts';
import {
  LayoutDashboard, FolderKanban, Users, BarChart3, TrendingUp,
  AlertCircle, Clock, CheckCircle2, DollarSign, ArrowUpRight,
  ArrowDownRight, Activity, ShieldAlert, Zap, ExternalLink,
  Sparkles, Phone, MapPin, FileWarning, CalendarDays, AlertTriangle,
  Layers, Target, ArrowRight, Briefcase, Loader2, Download, X
} from 'lucide-react';
import { Project, ProjectStatus, Lead } from '../types';
import DefectExportModal from './DefectExportModal';

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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [portfolioAnalysis, setPortfolioAnalysis] = useState<string | null>(null);
  const [showAIModal, setShowAIModal] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const generatePortfolioAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const { getPortfolioAnalysis } = await import('../services/geminiService');
      // 排除測試專案
      const realProjects = projects.filter(p => !p.name.toLowerCase().includes('test') && !p.name.includes('測試'));
      const result = await getPortfolioAnalysis(realProjects);
      setPortfolioAnalysis(result.text);
      setShowAIModal(true);
    } catch (e) {
      alert('AI 診斷失敗，請稍後再試');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const availableYears = useMemo(() => {
    const years = projects
      .map(p => p.startDate ? p.startDate.split('-')[0] : null)
      .filter(Boolean);
    const uniqueYears = (Array.from(new Set(years)) as string[]).sort((a, b) => b.localeCompare(a));
    return uniqueYears;
  }, [projects]);

  const months = [
    { value: '01', label: '1月' }, { value: '02', label: '2月' }, { value: '03', label: '3月' },
    { value: '04', label: '4月' }, { value: '05', label: '5月' }, { value: '06', label: '6月' },
    { value: '07', label: '7月' }, { value: '08', label: '8月' }, { value: '09', label: '9月' },
    { value: '10', label: '10月' }, { value: '11', label: '11月' }, { value: '12', label: '12月' },
  ];

  const projectsWithDefects = useMemo(() => {
    return projects.filter(p =>
      !p.name.includes('測試') &&
      p.defectRecords?.some(record => record.items.some(item => item.status === 'Pending'))
    );
  }, [projects]);

  // 1. 高效過濾：在大數據量下僅在必要時重新計算
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      // 排除測試專案 (濾除名稱包含「測試」或「Test」的案件)
      const isTestProject = p.name.toLowerCase().includes('test') || p.name.includes('測試');
      if (isTestProject) return false;

      if (!p.startDate) return false;
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
      if (!p) return;
      counts[p.status] = (counts[p.status] || 0) + 1;
      totalBudget += (p.budget || 0);
      totalSpent += (p.spent || 0);
    });

    return { counts, totalBudget, totalSpent };
  }, [filteredProjects]);

  // 3. 進階異常檢測：工資超標、進度落後、預算超支
  const riskProjects = useMemo(() => {
    const now = new Date();

    // 時間與進度風險 (Schedule Risk)
    const scheduleRisks = filteredProjects
      .filter(p => p.startDate && p.endDate && p.status === ProjectStatus.CONSTRUCTING)
      .map(p => {
        const start = new Date(p.startDate!).getTime();
        const end = new Date(p.endDate!).getTime();
        const totalDuration = end - start;
        const elapsed = now.getTime() - start;
        const timeRatio = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
        const progressGap = timeRatio - p.progress;
        return { ...p, riskType: 'schedule', riskValue: Math.round(progressGap) };
      })
      .filter(p => p.riskValue >= 20); // 如果時間消耗比進度多出 20%，則發出警訊

    // 工資效率風險 (Labor Efficiency Risk)
    const laborRisks = filteredProjects
      .filter(p => p.budget > 0 && p.status === ProjectStatus.CONSTRUCTING)
      .map(p => {
        const laborCost = (p.workAssignments || []).reduce((acc, curr) => acc + curr.totalCost, 0);
        const laborRatio = (laborCost / p.budget) * 100;
        return { ...p, riskType: 'labor', riskValue: Math.round(laborRatio), progress: p.progress };
      })
      .filter(p => p.riskValue > 50 && p.progress < 40); // 如果工資已耗去預算一半但進度未達 40%

    // 報價逾期風險
    const timeRisks = filteredProjects
      .filter(p => (p.statusChangedAt || p.createdDate) && (p.status === ProjectStatus.NEGOTIATING || p.status === ProjectStatus.QUOTING))
      .map(p => {
        const statusTime = p.statusChangedAt || p.createdDate;
        const diff = now.getTime() - new Date(statusTime!).getTime();
        return { ...p, riskType: 'delay', riskValue: Math.floor(diff / (1000 * 60 * 60 * 24)) };
      })
      .filter(p => p.riskValue >= 5);

    // 預算超支風險
    const financialRisks = filteredProjects
      .filter(p => p.budget > 0)
      .map(p => {
        const ratio = p.spent / p.budget;
        return { ...p, riskType: 'budget', riskValue: Math.round(ratio * 100) };
      })
      .filter(p => p.riskValue >= 90);

    return [...scheduleRisks, ...laborRisks, ...timeRisks, ...financialRisks]
      .sort((a, b) => b.riskValue - a.riskValue);
  }, [filteredProjects]);

  const overdueByManager = useMemo(() => {
    const overdueOnes = riskProjects.filter(r => r.riskType === 'delay');
    const counts: Record<string, number> = {};
    overdueOnes.forEach(p => {
      const manager = p.quotationManager || '未指定';
      counts[manager] = (counts[manager] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [riskProjects]);

  // 4. 智慧監控數據預算
  const monitorStats = useMemo(() => {
    const laborAtRisk = filteredProjects.filter(p => {
      const labor = (p.workAssignments || []).reduce((a, c) => a + c.totalCost, 0);
      return p.budget > 0 && (labor / p.budget) > 0.4 && p.progress < 30;
    }).length;

    const scheduleAtRisk = riskProjects.filter(r => r.riskType === 'schedule').length;

    const totalLabor = projects.reduce((a, p) => a + (p.workAssignments || []).reduce((la, lc) => la + lc.totalCost, 0), 0);
    const totalBudget = projects.reduce((a, p) => a + (p.budget || 0), 0);
    const avgLaborRatio = totalBudget > 0 ? Math.round((totalLabor / totalBudget) * 100) : 0;

    return { laborAtRisk, scheduleAtRisk, avgLaborRatio };
  }, [filteredProjects, riskProjects, projects]);

  const efficiencyData = useMemo(() => {
    return filteredProjects
      .filter(p => p.budget > 0)
      .slice(0, 8)
      .map(p => {
        const labor = (p.workAssignments || []).reduce((a, c) => a + c.totalCost, 0);
        const ratio = Math.round((labor / p.budget) * 100);
        return { ...p, laborRatio: ratio };
      });
  }, [filteredProjects]);

  // Chart Data Preparation
  const statusData = useMemo(() => {
    return Object.entries(stats.counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [stats]);

  const financialChartData = useMemo(() => {
    return filteredProjects
      .filter(p => p.budget > 0 && p.status !== '撤案' && p.status !== '未成交')
      .sort((a, b) => b.budget - a.budget)
      .slice(0, 5)
      .map(p => ({
        name: p.name.length > 6 ? p.name.substring(0, 6) + '...' : p.name,
        budget: p.budget,
        spent: p.spent,
        full_name: p.name
      }));
  }, [filteredProjects]);

  const STATUS_COLORS: Record<string, string> = {
    [ProjectStatus.NEGOTIATING]: '#64748b', // Slate-500
    [ProjectStatus.QUOTING]: '#3b82f6', // Blue-500
    [ProjectStatus.QUOTED]: '#6366f1', // Indigo-500
    [ProjectStatus.WAITING_SIGN]: '#8b5cf6', // Violet-500
    [ProjectStatus.SIGNED_WAITING_WORK]: '#a855f7', // Purple-500
    [ProjectStatus.CONSTRUCTING]: '#f97316', // Orange-500
    [ProjectStatus.COMPLETED]: '#10b981', // Emerald-500
    [ProjectStatus.INSPECTION]: '#06b6d4', // Cyan-500
    [ProjectStatus.CLOSED]: '#059669', // Emerald-600
    [ProjectStatus.CANCELLED]: '#94a3b8', // Slate-400
    [ProjectStatus.LOST]: '#cbd5e1', // Slate-300
  };

  const formatMoney = (val: number) => {
    if (val >= 100000000) return (val / 100000000).toFixed(1) + '億';
    if (val >= 10000) return (val / 10000).toFixed(0) + '萬';
    return val.toLocaleString();
  };

  const statsCards = [
    { label: '案件總量', value: filteredProjects.length, icon: Layers, color: 'text-slate-600', bg: 'bg-slate-50' },
    { label: '總合約金額', value: `$${formatMoney(stats.totalBudget)}`, icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50' },
    {
      label: '報價逾期',
      value: riskProjects.filter(r => r.riskType === 'delay').length,
      icon: FileWarning,
      color: 'text-rose-600',
      bg: 'bg-rose-50'
    },
    { label: '施工進行中', value: stats.counts[ProjectStatus.CONSTRUCTING] || 0, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
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
          <p className="text-stone-500 text-xs font-medium">數據規模：{projects.length} 案場 | 最後運算：{lastSync ? lastSync.toLocaleTimeString() : 'N/A'}</p>
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
          <button
            onClick={generatePortfolioAnalysis}
            disabled={isAnalyzing}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black hover:bg-black transition-all shadow-lg shadow-slate-200 disabled:opacity-50"
          >
            {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            AI 營運診斷
          </button>
        </div>
      </header>

      {/* AI Portfolio Modal */}
      {showAIModal && portfolioAnalysis && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-2xl max-h-[80vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
                  <Activity size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">宏觀營運診斷報告</h3>
                  <p className="text-xs text-stone-400 font-bold uppercase tracking-widest">Global Operations Diagnosis</p>
                </div>
              </div>
              <button onClick={() => setShowAIModal(false)} className="w-10 h-10 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center hover:bg-stone-200">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pr-4 no-scrollbar prose prose-stone max-w-none">
              <div className="bg-slate-50 p-6 rounded-3xl border border-stone-100 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                {portfolioAnalysis}
              </div>
            </div>
            <div className="mt-8 pt-8 border-t border-stone-50 flex justify-end">
              <button onClick={() => setShowAIModal(false)} className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all">
                已閱
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {statsCards.map((stat, i) => (
          <div key={i} className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-100 shadow-sm hover:shadow-lg hover:border-stone-200 transition-all group">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className={`p-2.5 sm:p-3 rounded-xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                <stat.icon size={18} className="sm:w-5 sm:h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] sm:text-[10px] font-black text-stone-400 uppercase tracking-widest mb-0.5 sm:mb-1 truncate">{stat.label}</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-black text-stone-900 leading-tight">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Defect Summary Section */}
      <div className="bg-white rounded-[2rem] border border-stone-100 shadow-sm p-6 lg:p-8 animate-in slide-in-from-bottom-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h3 className="text-sm font-black text-stone-900 uppercase tracking-widest flex items-center gap-2 border-l-4 border-rose-500 pl-3">
            <AlertTriangle size={18} className="text-rose-500" /> 缺失改善紀錄彙整 (未完成)
          </h3>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="flex items-center gap-2 bg-white border border-stone-200 text-stone-600 px-3 py-1.5 rounded-full text-[10px] font-black hover:bg-stone-50 transition-all shadow-sm active:scale-95"
            >
              <Download size={12} /> 批量匯出報告
            </button>
            <span className="text-[10px] bg-rose-50 text-rose-600 px-3 py-1 rounded-full font-black uppercase tracking-wider self-start sm:self-auto border border-rose-100">
              共有 {projectsWithDefects.length} 案有待改進項目
            </span>
          </div>
        </div>

        {projectsWithDefects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {projectsWithDefects.slice(0, 8).map(p => {
              const totalPending = p.defectRecords?.reduce((acc, r) => acc + r.items.filter(i => i.status === 'Pending').length, 0) || 0;
              return (
                <div key={p.id} onClick={() => onProjectClick(p.id)} className="cursor-pointer bg-stone-50 hover:bg-white hover:shadow-lg hover:-translate-y-1 hover:border-rose-200 border border-stone-100 rounded-2xl p-5 transition-all group duration-300">
                  <div className="flex justify-between items-start mb-3 gap-2">
                    <h4 className="font-black text-stone-800 text-xs line-clamp-1 flex-1" title={p.name}>{p.name}</h4>
                    <span className="bg-rose-500 text-white shadow-sm text-[9px] font-black px-2 py-1 rounded-lg flex items-center gap-1 shrink-0">
                      <AlertTriangle size={10} /> {totalPending}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-stone-400 font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1"><Users size={10} /> {p.quotationManager || p.engineeringManager || '未指定'}</span>
                    <span className="group-hover:translate-x-1 group-hover:text-rose-500 transition-all flex items-center gap-1">前往改善 <ArrowRight size={10} /></span>
                  </div>
                </div>
              )
            })}
            {projectsWithDefects.length > 8 && (
              <div onClick={() => { /* Consider filtering projects list */ }} className="flex items-center justify-center p-12 border border-dashed border-stone-200 rounded-2xl text-stone-400 hover:text-stone-600 hover:bg-stone-50 cursor-pointer transition-all">
                <span className="text-xs font-black uppercase tracking-widest">查看更多 ({projectsWithDefects.length - 8})...</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center p-12 text-stone-300 gap-3 bg-stone-50/50 rounded-3xl border border-dashed border-stone-200">
            <CheckCircle2 size={32} className="text-emerald-400" />
            <span className="font-bold text-xs uppercase tracking-widest text-emerald-600/50">所有案件皆無待改善缺失，品質良好！</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution Chart */}
        <div className="bg-white p-6 rounded-[2rem] border border-stone-100 shadow-sm flex flex-col">
          <h3 className="text-sm font-black text-stone-900 uppercase tracking-widest mb-6 border-l-4 border-indigo-500 pl-3">案件狀態分佈</h3>
          <div className="flex-1 w-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || '#94a3b8'} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '20px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Financial Overview Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-[2rem] border border-stone-100 shadow-sm flex flex-col">
          <h3 className="text-sm font-black text-stone-900 uppercase tracking-widest mb-6 border-l-4 border-emerald-500 pl-3">重點案件預算執行概況 (Top 5)</h3>
          <div className="flex-1 w-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financialChartData} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                <XAxis dataKey="name" fontSize={10} tick={{ fontWeight: 'bold', fill: '#78716c' }} axisLine={false} tickLine={false} />
                <YAxis
                  fontSize={10}
                  tick={{ fontWeight: 'bold', fill: '#78716c' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => formatMoney(val)}
                />
                <Tooltip
                  cursor={{ fill: '#fafaf9' }}
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontSize: '12px', fontWeight: '900', color: '#1c1917', marginBottom: '8px' }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                />
                <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '20px' }} />
                <Bar dataKey="budget" name="預算金額" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                <Bar dataKey="spent" name="已支出" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-6">

          {/* 報價逾期績效報告 (New Section) */}
          <div className="bg-white rounded-[2rem] lg:rounded-[2.5rem] border border-stone-100 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4">
            <div className="px-8 py-6 border-b border-stone-50 flex items-center justify-between bg-stone-50/30">
              <h3 className="text-sm font-black text-stone-900 uppercase tracking-widest flex items-center gap-2">
                <FileWarning size={18} className="text-rose-600" /> 報價逾期追蹤與人員績效
              </h3>
              <span className="text-[10px] font-black text-rose-500 bg-rose-50 px-3 py-1 rounded-full border border-rose-100 uppercase">
                當前共 {riskProjects.filter(r => r.riskType === 'delay').length} 案逾期
              </span>
            </div>

            <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Overdue List */}
              <div className="lg:col-span-2 space-y-4">
                <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">逾期案件清單</h4>
                <div className="space-y-2">
                  {riskProjects.map(p => (
                    <div key={`${p.id}-${p.riskType}`} className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-100 hover:bg-stone-100/50 transition-all group">
                      <div className="space-y-1">
                        <p className="text-xs font-black text-stone-900">{p.name}</p>
                        <div className="flex items-center gap-3">
                          <span className="text-[9px] font-bold text-stone-400 uppercase">ID: {p.id}</span>
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase flex items-center gap-1 ${p.riskType === 'delay' ? 'text-rose-500 bg-rose-50 border-rose-100' :
                            p.riskType === 'labor' ? 'text-orange-500 bg-orange-50 border-orange-100' :
                              p.riskType === 'schedule' ? 'text-amber-500 bg-amber-50 border-amber-100' :
                                'text-rose-500 bg-rose-50 border-rose-100'
                            }`}>
                            {p.riskType === 'delay' ? `逾期 ${p.riskValue} 天` :
                              p.riskType === 'labor' ? `工資佔比 ${p.riskValue}%` :
                                p.riskType === 'schedule' ? `進度滯後 ${p.riskValue}%` :
                                  `預算執行 ${p.riskValue}%`}
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-4">
                        <div className="hidden sm:block">
                          <p className="text-[9px] font-black text-stone-400 uppercase tracking-tighter mb-0.5">負責人</p>
                          <p className="text-[10px] font-black text-stone-700">{p.quotationManager || p.manager || '未指定'}</p>
                        </div>
                        <button onClick={() => onProjectClick(p.id)} className="w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center text-stone-400 hover:text-stone-900 hover:border-stone-400 transition-all shadow-sm">
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {riskProjects.length === 0 && (
                    <div className="py-12 border-2 border-dashed border-stone-100 rounded-[2rem] flex flex-col items-center justify-center text-stone-300 gap-3">
                      <CheckCircle2 size={32} />
                      <p className="text-[10px] font-black uppercase tracking-widest">目前暫無異常案件</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Manager Ranking */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">負責人逾期統計</h4>
                <div className="bg-stone-900 rounded-3xl p-6 text-white space-y-4">
                  {overdueByManager.map((m, i) => (
                    <div key={m.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-black ${i === 0 ? 'bg-rose-500 text-white' : 'bg-white/10 text-stone-400'}`}>
                          {i + 1}
                        </span>
                        <span className="text-[11px] font-black">{m.name}</span>
                      </div>
                      <span className="text-[11px] font-black text-rose-400">{m.count} 案</span>
                    </div>
                  ))}
                  {overdueByManager.length === 0 && (
                    <p className="text-[10px] text-stone-500 font-bold text-center py-4">無數據可統計</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] border border-stone-100 shadow-sm">
            <h3 className="text-xs sm:text-sm font-black text-stone-900 mb-4 sm:mb-6 lg:mb-8 uppercase tracking-widest border-l-4 border-orange-500 pl-3 sm:pl-4">全案場狀態分佈矩陣</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
              {Object.values(ProjectStatus).map((status) => (
                <div key={status} className="bg-stone-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-stone-100 hover:border-orange-200 hover:bg-orange-50/30 transition-all flex flex-col items-center justify-center text-center min-h-[70px] sm:min-h-[80px]">
                  <span className="text-base sm:text-lg lg:text-xl font-black text-stone-900">{stats.counts[status] || 0}</span>
                  <span className="text-[8px] sm:text-[9px] font-black text-stone-400 uppercase tracking-tighter mt-1 leading-tight">{status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* New Section: Labor Efficiency & Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-[2rem] border border-stone-100 shadow-sm overflow-hidden p-8">
              <h3 className="text-sm font-black text-stone-900 uppercase tracking-widest flex items-center gap-2 mb-6">
                <TrendingUp size={18} className="text-emerald-600" /> 人力成本效率分佈
              </h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={efficiencyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                    <XAxis dataKey="name" fontSize={9} tick={{ fontWeight: 'bold', fill: '#a8a29e' }} axisLine={false} tickLine={false} />
                    <YAxis fontSize={9} tick={{ fontWeight: 'bold', fill: '#a8a29e' }} axisLine={false} tickLine={false} unit="%" />
                    <Tooltip
                      contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      cursor={{ fill: '#fafaf9' }}
                    />
                    <Bar dataKey="laborRatio" name="工資佔預算比" radius={[4, 4, 0, 0]}>
                      {efficiencyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.laborRatio > 40 ? '#f43f5e' : '#10b981'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-4 text-[9px] font-bold text-stone-400 text-center uppercase tracking-widest leading-loose">
                紅條代表工資佔比過高 (&gt;40%)，可能存在工率低下或點工浪費風險
              </p>
            </div>

            <div className="bg-stone-900 rounded-[2rem] shadow-xl p-8 text-white">
              <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-6">
                <Zap size={18} className="text-amber-400" /> 系統智慧監控摘要
              </h3>
              <div className="space-y-6">
                <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                  <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center shrink-0">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase">工率風險預警</p>
                    <p className="text-[10px] text-stone-400 mt-1">
                      共有 {monitorStats.laborAtRisk} 案發生「工資超前、進度落後」現象。
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                  <div className="w-10 h-10 rounded-xl bg-blue-400/20 text-blue-400 flex items-center justify-center shrink-0">
                    <Clock size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase">進度時效檢測</p>
                    <p className="text-[10px] text-stone-400 mt-1">
                      目前有 {monitorStats.scheduleAtRisk} 案時間消耗與進度不匹配。
                    </p>
                  </div>
                </div>
                <div className="pt-4">
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                    <p className="text-[11px] font-black text-emerald-400 uppercase flex items-center gap-2">
                      <CheckCircle2 size={14} /> 營運用工效率建議
                    </p>
                    <p className="text-[10px] text-emerald-500/80 mt-2 font-bold leading-relaxed">
                      目前平均工資佔比為 {monitorStats.avgLaborRatio}%。建議針對高工資佔比案件進行工序優化。
                    </p>
                  </div>
                </div>
              </div>
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
                      <Phone size={10} /> <a href={`tel:${lead.phone}`} className="hover:text-indigo-600 hover:underline transition-colors">{lead.phone}</a>
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

      {isExportModalOpen && (
        <DefectExportModal
          projects={projects}
          onClose={() => setIsExportModalOpen(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;

