import React, { useMemo, useState } from 'react';
import { Project, TeamMember, AttendanceRecord, ProjectStatus, User } from '../types';
import { Briefcase, Calendar, Plus, Search, Filter, ArrowUpRight, TrendingUp, DollarSign, Users, AlertTriangle, Wallet, LayoutGrid, List, FileSpreadsheet, RotateCcw, XCircle, Pencil, Trash2, Camera, MessageSquare } from 'lucide-react';
import { exportProjectsToCSV } from '../utils/csvExport';

interface ProjectListProps {
  projects: Project[];
  user: User; // Keep user prop for permission checks
  onAddClick: () => void;
  onEditClick: (project: Project) => void;
  onDeleteClick: (id: string) => void;
  onRestoreClick: (id: string) => void;
  onHardDeleteClick: (id: string) => void;
  onDetailClick: (project: Project) => void;
  showDeleted: boolean;
  onToggleDeleted: (val: boolean) => void;

  // New props for Financial Engine
  teamMembers: TeamMember[];
  attendanceRecords: AttendanceRecord[];
}

// Extended Interface for internal use
interface ProjectWithFinancials extends Project {
  computedFinancials: {
    laborCost: number;
    materialCost: number;
    totalCost: number;
    profit: number;
    profitMargin: number;
    healthStatus: string;
    manDays: number;
    revenue: number;
  };
}

const ProjectList: React.FC<ProjectListProps> = ({
  projects,
  user,
  onAddClick,
  onEditClick,
  onDeleteClick,
  onRestoreClick,
  onHardDeleteClick,
  onDetailClick,
  showDeleted,
  onToggleDeleted,
  teamMembers = [],
  attendanceRecords = []
}) => {
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Advanced Financial Calculation Engine
  const projectsWithFinancials = useMemo<ProjectWithFinancials[]>(() => {
    // Basic Filtering first
    let filtered = projects.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchDeleted = showDeleted ? p.deletedAt : !p.deletedAt;
      return matchSearch && matchStatus && matchDeleted;
    });

    return filtered.map(project => {
      // 1. Calculate Real-time Labor Cost from Attendance
      let calculatedLaborCost = 0;
      let totalManDays = 0;

      if (project.location && project.location.lat && project.location.lng) {
        // Simple geo-fencing (approx 500m radius) matches
        const pLat = project.location.lat;
        const pLng = project.location.lng;
        const THRESHOLD = 0.005; // approx 500m

        attendanceRecords.forEach(record => {
          if (record.location && record.type === 'work-start') {
            const dist = Math.sqrt(Math.pow(record.location.lat - pLat, 2) + Math.pow(record.location.lng - pLng, 2));
            if (dist < THRESHOLD) {
              // Match found! Find employee rate
              const member = teamMembers.find(m => m.id === record.employeeId || m.name === record.name);
              const dailyCost = member?.dailyRate || 2500; // Fallback rate
              calculatedLaborCost += dailyCost;
              totalManDays += 1;
            }
          }
        });
      }

      // Merge with manual actuals if any
      const finalLaborCost = Math.max(calculatedLaborCost, project.actualLaborCost || 0);
      const materialCost = project.actualMaterialCost || 0;
      const totalCost = finalLaborCost + materialCost;
      const budget = project.budget || 0;
      const contract = project.contractAmount || 0;
      // If contract amount is not set, use budget as a proxy for revenue (for estimation)
      const revenue = contract > 0 ? contract : budget;

      const profit = revenue > 0 ? (revenue - totalCost) : 0;
      const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

      // Status update based on budget
      let healthStatus = 'Healthy';
      if (budget > 0 && totalCost > budget) healthStatus = 'Critical';
      else if (budget > 0 && totalCost > budget * 0.9) healthStatus = 'Warning';

      return {
        ...project,
        computedFinancials: {
          laborCost: finalLaborCost,
          materialCost,
          totalCost,
          profit,
          profitMargin,
          healthStatus,
          manDays: totalManDays,
          revenue
        }
      };
    });
  }, [projects, attendanceRecords, teamMembers, searchTerm, statusFilter, showDeleted]);

  const isReadOnly = user.role === 'Guest';

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in h-screen flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-black text-stone-900 tracking-tight mb-2">專案財務戰情室</h1>
          <p className="text-stone-500 font-bold flex items-center gap-2 text-xs uppercase tracking-wider">
            <TrendingUp size={16} className="text-emerald-500" />
            即時監控全公司專案損益與預算執行率 (Project Costing Dashboard)
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {!isReadOnly && (
            <button
              onClick={onAddClick}
              className="bg-stone-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-stone-800 active:scale-95 transition-all shadow-xl shadow-stone-200 text-sm"
            >
              <Plus size={18} /> 建立新專案
            </button>
          )}
          <div className="flex gap-1 bg-white border border-stone-200 rounded-xl p-1">
            <button
              onClick={() => setViewMode('card')}
              className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${viewMode === 'card' ? 'bg-stone-900 text-white' : 'text-stone-400 hover:text-stone-600'}`}
            >
              <LayoutGrid size={16} /> 卡片
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${viewMode === 'table' ? 'bg-stone-900 text-white' : 'text-stone-400 hover:text-stone-600'}`}
            >
              <List size={16} /> 列表
            </button>
          </div>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
        <div className="bg-stone-900 text-white p-6 rounded-[2rem] shadow-xl">
          <div className="flex items-center gap-3 mb-2 opacity-80">
            <Briefcase size={18} />
            <span className="text-[10px] font-black uppercase tracking-widest">總進行中專案</span>
          </div>
          <div className="text-4xl font-black">{projects.filter(p => !p.deletedAt && p.status === 'Active').length}</div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-stone-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2 text-stone-400">
            <Wallet size={18} />
            <span className="text-[10px] font-black uppercase tracking-widest">總預期營收 Revenue</span>
          </div>
          <div className="text-3xl font-black text-stone-800 tabular-nums">
            ${projectsWithFinancials.reduce((acc, p) => acc + (p.computedFinancials.revenue || 0), 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-stone-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2 text-stone-400">
            <DollarSign size={18} />
            <span className="text-[10px] font-black uppercase tracking-widest">實際總支出 Cost</span>
          </div>
          <div className="text-3xl font-black text-rose-600 tabular-nums">
            ${projectsWithFinancials.reduce((acc, p) => acc + p.computedFinancials.totalCost, 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-stone-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2 text-stone-400">
            <TrendingUp size={18} />
            <span className="text-[10px] font-black uppercase tracking-widest">預估總毛利 Profit</span>
          </div>
          <div className="text-3xl font-black text-emerald-600 tabular-nums">
            ${projectsWithFinancials.reduce((acc, p) => acc + p.computedFinancials.profit, 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 shrink-0">
        <div className="flex items-center bg-white rounded-xl border border-stone-200 px-4 py-2.5 shadow-sm flex-1 min-w-[200px]">
          <Search size={14} className="text-stone-400 mr-2" />
          <input className="bg-transparent text-xs font-bold outline-none w-full text-stone-900" placeholder="搜尋專案名稱..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <select
          className="bg-white border border-stone-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none shadow-sm"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="all">所有狀態</option>
          {Object.values(ProjectStatus).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button
          onClick={() => onToggleDeleted(!showDeleted)}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm border flex items-center gap-2 ${showDeleted
            ? 'bg-rose-50 border-rose-200 text-rose-600'
            : 'bg-white border-stone-200 text-stone-400 hover:text-stone-600'
            }`}
        >
          <Trash2 size={14} />
          {showDeleted ? '隱藏垃圾桶' : '檢視垃圾桶'}
        </button>
      </div>

      {/* Project Grid / List */}
      {viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 overflow-y-auto pb-20">
          {projectsWithFinancials.map((project) => (
            <div
              key={project.id}
              onClick={() => onDetailClick(project)}
              className="group bg-white rounded-[2.5rem] border border-stone-200 p-1 cursor-pointer hover:shadow-xl hover:scale-[1.01] hover:border-stone-300 transition-all duration-300 flex flex-col relative"
            >
              {/* Deleted Overlay */}
              {project.deletedAt && (
                <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm rounded-[2.5rem] flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-rose-600 font-black text-xl uppercase tracking-widest mb-4">已刪除專案</p>
                  <div className="flex gap-2 pointer-events-auto">
                    <button onClick={(e) => { e.stopPropagation(); onRestoreClick(project.id); }} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-emerald-700">
                      <RotateCcw size={14} /> 復原
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onHardDeleteClick(project.id); }} className="bg-rose-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-rose-700">
                      <XCircle size={14} /> 永久刪除
                    </button>
                  </div>
                </div>
              )}

              {/* Project Image & Status */}
              <div className="relative h-48 rounded-[2rem] overflow-hidden bg-stone-100 mb-2">
                <img
                  src={project.coverImage || `https://source.unsplash.com/random/800x600?construction&sig=${project.id}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 grayscale group-hover:grayscale-0"
                  alt="cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-4 left-6 text-white w-[calc(100%-3rem)]">
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-[10px] font-black bg-white/20 backdrop-blur-md px-2 py-0.5 rounded text-white/90 uppercase tracking-widest border border-white/10">{project.id}</span>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${project.status === 'Active' ? 'bg-emerald-500 text-white' : 'bg-stone-500 text-white'}`}>{project.status}</span>
                  </div>
                  <h3 className="text-xl font-black leading-tight mb-1 truncate">{project.name}</h3>
                  <p className="text-xs font-bold opacity-70 flex items-center gap-1 truncate">
                    <Users size={12} /> {project.computedFinancials.manDays} 人天投入 • {project.location?.address || '無地址'}
                  </p>
                </div>
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  {!isReadOnly && !project.deletedAt && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); onEditClick(project); }}
                        className="p-2 bg-white/90 backdrop-blur text-stone-600 rounded-xl hover:bg-blue-50 hover:text-blue-600 shadow-sm transition-all"
                        title="編輯專案"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteClick(project.id); }}
                        className="p-2 bg-white/90 backdrop-blur text-stone-600 rounded-xl hover:bg-rose-50 hover:text-rose-600 shadow-sm transition-all"
                        title="刪除專案"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                  {project.computedFinancials.healthStatus !== 'Healthy' && !project.deletedAt && (
                    <div className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm backdrop-blur-md ${project.computedFinancials.healthStatus === 'Critical' ? 'bg-rose-500/90 text-white' : 'bg-amber-500/90 text-white'
                      }`}>
                      <AlertTriangle size={12} />
                      {project.computedFinancials.healthStatus === 'Critical' ? '超支' : '警戒'}
                    </div>
                  )}
                </div>
              </div>

              {/* Financial Dashboard Card */}
              <div className="p-5 flex-1 flex flex-col gap-4">

                {/* Budget Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] uppercase font-black text-stone-400 tracking-widest">預算執行率 (Costs vs Budget)</span>
                    <span className="text-xs font-bold text-stone-600">
                      {project.budget ? Math.round((project.computedFinancials.totalCost / project.budget) * 100) : 0}%
                    </span>
                  </div>
                  <div className="h-3 w-full bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${project.computedFinancials.healthStatus === 'Critical' ? 'bg-rose-500' :
                        project.computedFinancials.healthStatus === 'Warning' ? 'bg-amber-500' :
                          'bg-stone-800'
                        }`}
                      style={{ width: `${project.budget ? Math.min((project.computedFinancials.totalCost / project.budget) * 100, 100) : 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-stone-400">
                    <span>已用 ${project.computedFinancials.totalCost.toLocaleString()}</span>
                    <span>預算 ${project.budget?.toLocaleString() || 0}</span>
                  </div>
                </div>

                {/* Profit Grid */}
                <div className="grid grid-cols-2 gap-2 mt-auto">
                  <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100">
                    <span className="text-[9px] uppercase font-black text-emerald-600/60 block mb-0.5">預估毛利 Profit</span>
                    <span className={`text-lg font-black tracking-tight ${project.computedFinancials.profit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                      ${project.computedFinancials.profit.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-stone-50 p-3 rounded-2xl border border-stone-100">
                    <span className="text-[9px] uppercase font-black text-stone-400 block mb-0.5">毛利率 Margin</span>
                    <span className={`text-lg font-black tracking-tight ${project.computedFinancials.profitMargin >= 20 ? 'text-emerald-600' : 'text-stone-600'}`}>
                      {project.computedFinancials.profitMargin.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">{project.client}</span>
                  <div className="flex items-center gap-1 text-xs font-bold text-stone-400 group-hover:text-stone-900 transition-colors">
                    查看財務明細 <ArrowUpRight size={14} />
                  </div>
                </div>
              </div>
            </div>
          ))}
          {projectsWithFinancials.length === 0 && (
            <div className="col-span-full py-20 bg-white rounded-3xl border border-stone-200 border-dashed flex flex-col items-center justify-center gap-4 text-stone-300">
              <Search size={48} className="opacity-20" />
              <p className="text-sm font-black uppercase tracking-[0.2em] opacity-50">找不到符合條件的案件</p>
              <button onClick={() => { setSearchTerm(''); setStatusFilter('all'); }} className="text-[10px] font-black text-orange-600 hover:underline underline-offset-4">清除篩選條件</button>
            </div>
          )}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full text-left min-w-[1000px]">
            <thead className="bg-stone-50 border-b border-stone-200 text-[10px] font-black text-stone-400 uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">專案名稱</th>
                <th className="px-6 py-4">狀態</th>
                <th className="px-6 py-4 text-right">預算</th>
                <th className="px-6 py-4 text-right">已支出</th>
                <th className="px-6 py-4 text-right">預估毛利</th>
                <th className="px-6 py-4 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {projectsWithFinancials.map(p => (
                <tr key={p.id} onClick={() => onDetailClick(p)} className="hover:bg-orange-50/20 cursor-pointer">
                  <td className="px-6 py-4">
                    <span className="block font-bold text-stone-900">{p.name}</span>
                    <span className="text-[10px] text-stone-500">{p.id}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${p.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-stone-100 text-stone-500'}`}>{p.status}</span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-sm font-bold text-stone-600">${p.budget?.toLocaleString() || '-'}</td>
                  <td className="px-6 py-4 text-right font-mono text-sm font-bold text-rose-600">${p.computedFinancials.totalCost.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right font-mono text-sm font-bold text-emerald-600">${p.computedFinancials.profit.toLocaleString()}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); onEditClick(p); }}
                        className="p-2 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-blue-600 transition-colors"
                        title="編輯"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteClick(p.id); }}
                        className="p-2 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-rose-600 transition-colors"
                        title="刪除"
                      >
                        <Trash2 size={14} />
                      </button>
                      <button className="p-2 hover:bg-stone-100 rounded-lg text-stone-300 hover:text-stone-900 transition-colors">
                        <ArrowUpRight size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ProjectList;
