
import React, { useState, useMemo } from 'react';
import { Search, Plus, FileSpreadsheet, Pencil, Trash2, CalendarDays, FilterX, Activity, XCircle, ChevronLeft, ChevronRight, Hash, ShieldAlert, LayoutGrid, List, Zap, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { Project, ProjectStatus, User } from '../types';
import { exportProjectsToCSV } from '../utils/csvExport';

interface ProjectListProps {
  projects: Project[];
  user: User;
  onAddClick: () => void;
  onAddTestClick: () => void;
  onEditClick: (project: Project) => void;
  onDeleteClick: (id: string) => void;
  onLossClick: (project: Project) => void;
  onDetailClick: (project: Project) => void;
}

const ITEMS_PER_PAGE = 15;

const ProjectList: React.FC<ProjectListProps> = ({ projects, user, onAddClick, onAddTestClick, onEditClick, onDeleteClick, onLossClick, onDetailClick }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [sortBy, setSortBy] = useState<'id' | 'manager' | 'status' | 'progress' | 'budget' | null>('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const isReadOnly = user.role === 'Guest';

  // Sort toggle handler
  const handleSort = (field: 'id' | 'manager' | 'status' | 'progress' | 'budget') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Render sort indicator
  const SortIndicator = ({ field }: { field: string }) => {
    if (sortBy !== field) return <ChevronsUpDown size={12} className="text-stone-300" />;
    return sortOrder === 'asc' ? <ChevronUp size={12} className="text-orange-600" /> : <ChevronDown size={12} className="text-orange-600" />;
  };

  // 1. 強化搜尋與篩選邏輯（含排序）
  const filteredProjects = useMemo(() => {
    setCurrentPage(1); // 搜尋時重置分頁
    let result = projects.filter(p => {
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = selectedStatus === 'all' || p.status === selectedStatus;
      return matchSearch && matchStatus;
    });

    // Apply sorting
    if (sortBy) {
      result.sort((a, b) => {
        let aVal: any, bVal: any;

        switch (sortBy) {
          case 'id':
            aVal = a.id;
            bVal = b.id;
            break;
          case 'manager':
            aVal = a.manager || '';
            bVal = b.manager || '';
            break;
          case 'status':
            aVal = a.status;
            bVal = b.status;
            break;
          case 'progress':
            aVal = a.progress || 0;
            bVal = b.progress || 0;
            break;
          case 'budget':
            aVal = a.budget || 0;
            bVal = b.budget || 0;
            break;
        }

        if (sortOrder === 'asc') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });
    }

    return result;
  }, [projects, searchTerm, selectedStatus, sortBy, sortOrder]);

  // 2. 分頁邏輯
  const totalPages = Math.ceil(filteredProjects.length / ITEMS_PER_PAGE);
  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProjects.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProjects, currentPage]);

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.CONSTRUCTING: return 'bg-orange-100 text-orange-700 border-orange-200';
      case ProjectStatus.COMPLETED: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case ProjectStatus.LOST: return 'bg-stone-200 text-stone-500 border-stone-300';
      case ProjectStatus.CANCELLED: return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-stone-100 text-stone-700 border-stone-200';
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-4 animate-in fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-xl font-black text-stone-900">案件中心</h1>
          <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">目前共管理 {projects.length} 件工程項目</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto flex-wrap">
          {/* 視圖切換按鈕 */}
          <div className="flex gap-1 bg-white border border-stone-200 rounded-xl p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${viewMode === 'table' ? 'bg-stone-900 text-white' : 'text-stone-400 hover:text-stone-600'
                }`}
            >
              <List size={14} />
              <span className="hidden sm:inline">表格</span>
            </button>
            <button
              onClick={() => setViewMode('card')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${viewMode === 'card' ? 'bg-stone-900 text-white' : 'text-stone-400 hover:text-stone-600'
                }`}
            >
              <LayoutGrid size={14} />
              <span className="hidden sm:inline">卡片</span>
            </button>
          </div>

          <button onClick={() => exportProjectsToCSV(projects)} className="flex-1 sm:flex-none bg-white border border-stone-200 px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-stone-50 transition-all"><FileSpreadsheet size={14} /> <span className="hidden sm:inline">匯出 CSV</span></button>
          {!isReadOnly && (
            <>
              <button
                onClick={onAddTestClick}
                className="flex-1 sm:flex-none bg-white border border-stone-200 border-dashed text-stone-600 px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-stone-50 hover:border-stone-400 transition-all"
              >
                <Zap size={16} className="text-amber-500" /> 建立測試案件
              </button>
              <button
                onClick={onAddClick}
                className="flex-1 sm:flex-none bg-orange-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md hover:bg-orange-700 active:scale-95 transition-all"
              >
                <Plus size={16} /> 新增案件
              </button>
            </>
          )}
          {isReadOnly && (
            <div className="flex-1 sm:flex-none bg-stone-100 text-stone-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border border-stone-200 cursor-not-allowed">
              <ShieldAlert size={14} /> 訪客唯讀模式
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
        <div className="sm:col-span-2 flex items-center bg-white rounded-xl border border-stone-200 px-4 py-2.5 shadow-sm">
          <Search size={14} className="text-stone-400 mr-2" />
          <input className="bg-transparent text-xs font-bold outline-none w-full text-stone-900" placeholder="搜尋案名、業主或案號..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <div className="bg-white rounded-xl border border-stone-200 px-3 py-2.5 shadow-sm">
          <select className="bg-transparent text-[11px] font-black w-full outline-none" value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}>
            <option value="all">所有狀態分佈</option>
            {Object.values(ProjectStatus).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <button onClick={() => { setSearchTerm(''); setSelectedStatus('all'); }} className="bg-stone-900 py-2.5 rounded-xl text-[10px] font-black uppercase text-white hover:bg-black transition-all">清除所有篩選</button>
      </div>

      {viewMode === 'table' ? (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden overflow-x-auto touch-scroll">
          <table className="w-full text-left min-w-[850px]">
            <thead className="bg-stone-50 border-b border-stone-200 text-[10px] font-black text-stone-400 uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4 cursor-pointer hover:bg-stone-100 transition-colors" onClick={() => handleSort('id')}>
                  <div className="flex items-center gap-2">
                    案號 / 案件名稱
                    <SortIndicator field="id" />
                  </div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-stone-100 transition-colors" onClick={() => handleSort('manager')}>
                  <div className="flex items-center gap-2">
                    業主 / 負責人
                    <SortIndicator field="manager" />
                  </div>
                </th>
                <th className="px-6 py-4 text-center cursor-pointer hover:bg-stone-100 transition-colors" onClick={() => handleSort('status')}>
                  <div className="flex items-center justify-center gap-2">
                    當前狀態
                    <SortIndicator field="status" />
                  </div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-stone-100 transition-colors" onClick={() => handleSort('progress')}>
                  <div className="flex items-center gap-2">
                    進度
                    <SortIndicator field="progress" />
                  </div>
                </th>
                <th className="px-6 py-4 text-right cursor-pointer hover:bg-stone-100 transition-colors" onClick={() => handleSort('budget')}>
                  <div className="flex items-center justify-end gap-2">
                    合約預算
                    <SortIndicator field="budget" />
                  </div>
                </th>
                <th className="px-6 py-4 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-sm">
              {paginatedProjects.length > 0 ? paginatedProjects.map(p => (
                <tr key={p.id} onClick={() => onDetailClick(p)} className="hover:bg-orange-50/30 transition-colors cursor-pointer group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-stone-400 mb-0.5">{p.id}</span>
                      <span className="font-bold text-stone-900 group-hover:text-orange-600 transition-colors">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-stone-700 text-xs">{p.client}</span>
                      <span className="text-[10px] text-stone-400 font-medium">負責人：{p.manager}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-tighter ${getStatusColor(p.status)}`}>{p.status}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-[60px] bg-stone-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-orange-500 h-full rounded-full transition-all duration-500" style={{ width: `${p.progress}%` }}></div>
                      </div>
                      <span className="text-[10px] font-black text-stone-900 w-8">{p.progress}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-black text-xs text-stone-900">NT${p.budget.toLocaleString()}</td>
                  <td className="px-6 py-4 text-center">
                    {!isReadOnly ? (
                      <div className="flex justify-center gap-1">
                        <button onClick={(e) => { e.stopPropagation(); onEditClick(p); }} className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all"><Pencil size={14} className="text-stone-400 group-hover:text-blue-600" /></button>
                        <button onClick={(e) => { e.stopPropagation(); onDeleteClick(p.id); }} className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all"><Trash2 size={14} className="text-stone-400 group-hover:text-rose-600" /></button>
                      </div>
                    ) : (
                      <span className="text-[10px] font-black text-stone-300 uppercase italic">唯讀</span>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-30">
                      <Search size={40} />
                      <p className="text-xs font-black uppercase tracking-widest">找不到符合條件的案件</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedProjects.length > 0 ? paginatedProjects.map(p => (
            <div
              key={p.id}
              onClick={() => onDetailClick(p)}
              className="bg-white p-6 rounded-[2rem] border border-stone-200 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{p.id}</span>
                  <h3 className="font-black text-stone-900 leading-tight group-hover:text-orange-600 transition-colors uppercase">{p.name}</h3>
                </div>
                <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-tighter shrink-0 ${getStatusColor(p.status)}`}>
                  {p.status}
                </span>
              </div>

              <div className="flex-1 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-black text-stone-400 uppercase tracking-widest">
                    <span>進度</span>
                    <span>{p.progress}%</span>
                  </div>
                  <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-orange-500 h-full rounded-full transition-all duration-700" style={{ width: `${p.progress}%` }}></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 border-y border-stone-50">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest">業主</span>
                    <p className="text-xs font-bold text-stone-900 truncate">{p.client}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest">負責人</span>
                    <p className="text-xs font-bold text-stone-900 truncate">{p.quotationManager || p.manager}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest">預算</span>
                    <p className="font-black text-slate-900 leading-none">NT${p.budget.toLocaleString()}</p>
                  </div>
                  <div className="flex gap-1">
                    {!isReadOnly ? (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); onEditClick(p); }}
                          className="p-2 bg-stone-50 hover:bg-white hover:shadow-sm rounded-xl text-stone-400 hover:text-blue-600 transition-all"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDeleteClick(p.id); }}
                          className="p-2 bg-stone-50 hover:bg-white hover:shadow-sm rounded-xl text-stone-400 hover:text-rose-600 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    ) : (
                      <span className="text-[10px] font-black text-stone-300 uppercase italic">唯讀</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )) : (
            <div className="col-span-full py-20 bg-white rounded-3xl border border-stone-200 border-dashed flex flex-col items-center justify-center gap-4 text-stone-300">
              <Search size={48} className="opacity-20" />
              <p className="text-sm font-black uppercase tracking-[0.2em] opacity-50">找不到符合條件的案件</p>
              <button onClick={() => { setSearchTerm(''); setSelectedStatus('all'); }} className="text-[10px] font-black text-orange-600 hover:underline underline-offset-4">清除篩選條件</button>
            </div>
          )}
        </div>
      )}

      {/* 分頁控制列 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-6 py-4 rounded-2xl border border-stone-200 shadow-sm">
          <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
            顯示第 {(currentPage - 1) * ITEMS_PER_PAGE + 1} 至 {Math.min(currentPage * ITEMS_PER_PAGE, filteredProjects.length)} 案，共 {filteredProjects.length} 案
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="p-2 border border-stone-200 rounded-xl hover:bg-stone-50 disabled:opacity-30 transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-xl text-[10px] font-black transition-all ${currentPage === pageNum ? 'bg-orange-600 text-white shadow-lg shadow-orange-100' : 'text-stone-500 hover:bg-stone-50'}`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              {totalPages > 5 && <span className="text-stone-300">...</span>}
            </div>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="p-2 border border-stone-200 rounded-xl hover:bg-stone-50 disabled:opacity-30 transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectList;
