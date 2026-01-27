import React, { useMemo, useState, forwardRef, useImperativeHandle } from 'react';
import { Project, TeamMember, AttendanceRecord, ProjectStatus, User } from '../types';
import { Briefcase, Calendar, Plus, Search, Filter, ArrowUpRight, TrendingUp, DollarSign, Users, AlertTriangle, Wallet, LayoutGrid, List, FileSpreadsheet, RotateCcw, XCircle, Pencil, Trash2 } from 'lucide-react';

// Ag-Grid Imports
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ModuleRegistry, AllCommunityModule, IFilterParams } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

// Register Ag-Grid Modules
ModuleRegistry.registerModules([AllCommunityModule]);

interface ProjectListProps {
  projects: Project[];
  user: User;
  onAddClick: () => void;
  onEditClick: (project: Project) => void;
  onDeleteClick: (id: string) => void;
  onRestoreClick: (id: string) => void;
  onHardDeleteClick: (id: string) => void;
  onDetailClick: (project: Project) => void;
  showDeleted: boolean;
  onToggleDeleted: (val: boolean) => void;
  teamMembers: TeamMember[];
  attendanceRecords: AttendanceRecord[];
}

interface ProjectWithFinancials extends Project {
  computedFinancials: {
    laborCost: number;
    materialCost: number;
    introducerFee: number;
    totalCost: number;
    profit: number;
    profitMargin: number;
    healthStatus: string;
    manDays: number;
    revenue: number;
  };
  calculatedYear?: string; // Added for Ag-Grid Year Filtering
}

// Sub-component: Card View
const CardView = ({ projects, isReadOnly, onDetailClick, onEditClick, onDeleteClick, onRestoreClick, onHardDeleteClick, setSearchTerm, setStatusFilter }: any) => {
  return (
    <div className="h-full overflow-y-auto pb-20 pr-2">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {projects.map((project: ProjectWithFinancials) => (
          <div key={project.id} onClick={() => onDetailClick(project)} className="group bg-white rounded-[2.5rem] border border-stone-200 p-1 cursor-pointer hover:shadow-xl hover:scale-[1.01] hover:border-stone-300 transition-all duration-300 flex flex-col relative">
            {project.deletedAt && (
              <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm rounded-[2.5rem] flex flex-col items-center justify-center pointer-events-none">
                <p className="text-rose-600 font-black text-xl uppercase tracking-widest mb-4">已刪除專案</p>
                <div className="flex gap-2 pointer-events-auto">
                  <button onClick={(e) => { e.stopPropagation(); onRestoreClick(project.id); }} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-emerald-700"><RotateCcw size={14} /> 復原</button>
                  <button onClick={(e) => { e.stopPropagation(); onHardDeleteClick(project.id); }} className="bg-rose-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-rose-700"><XCircle size={14} /> 永久刪除</button>
                </div>
              </div>
            )}
            <div className="relative h-48 rounded-[2rem] overflow-hidden bg-stone-100 mb-2">
              <img src={project.coverImage || `https://source.unsplash.com/random/800x600?construction&sig=${project.id}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 grayscale group-hover:grayscale-0" alt="cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-4 left-6 text-white w-[calc(100%-3rem)]">
                <div className="flex justify-between items-end mb-1">
                  <span className="text-[10px] font-black bg-white/20 backdrop-blur-md px-2 py-0.5 rounded text-white/90 uppercase tracking-widest border border-white/10">{project.id}</span>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${project.status === 'Active' ? 'bg-emerald-500 text-white' : 'bg-stone-500 text-white'}`}>{project.status}</span>
                </div>
                <h3 className="text-xl font-black leading-tight mb-1 truncate">{project.name}</h3>
                <p className="text-xs font-bold opacity-70 flex items-center gap-1 truncate"><Users size={12} /> {project.computedFinancials.manDays} 人天投入 • {project.location?.address || '無地址'}</p>
              </div>
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                {!isReadOnly && !project.deletedAt && (
                  <>
                    <button onClick={(e) => { e.stopPropagation(); onEditClick(project); }} className="p-2 bg-white/90 backdrop-blur text-stone-600 rounded-xl hover:bg-blue-50 hover:text-blue-600 shadow-sm transition-all"><Pencil size={14} /></button>
                    <button onClick={(e) => { e.stopPropagation(); onDeleteClick(project.id); }} className="p-2 bg-white/90 backdrop-blur text-stone-600 rounded-xl hover:bg-rose-50 hover:text-rose-600 shadow-sm transition-all"><Trash2 size={14} /></button>
                  </>
                )}
                {project.computedFinancials.healthStatus !== 'Healthy' && !project.deletedAt && (
                  <div className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm backdrop-blur-md ${project.computedFinancials.healthStatus === 'Critical' ? 'bg-rose-500/90 text-white' : 'bg-amber-500/90 text-white'}`}>
                    <AlertTriangle size={12} /> {project.computedFinancials.healthStatus === 'Critical' ? '超支' : '警戒'}
                  </div>
                )}
              </div>
            </div>
            <div className="p-5 flex-1 flex flex-col gap-4">
              <div className="space-y-1.5">
                <div className="flex justify-between items-end"><span className="text-[10px] uppercase font-black text-stone-400 tracking-widest">預算執行率</span><span className="text-xs font-bold text-stone-600">{project.budget ? Math.round((project.computedFinancials.totalCost / project.budget) * 100) : 0}%</span></div>
                <div className="h-3 w-full bg-stone-100 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-1000 ${project.computedFinancials.healthStatus === 'Critical' ? 'bg-rose-500' : project.computedFinancials.healthStatus === 'Warning' ? 'bg-amber-500' : 'bg-stone-800'}`} style={{ width: `${project.budget ? Math.min((project.computedFinancials.totalCost / project.budget) * 100, 100) : 0}%` }} /></div>
                <div className="flex justify-between text-[10px] font-bold text-stone-400"><span>已用 ${project.computedFinancials.totalCost.toLocaleString()}</span><span>預算 ${project.budget?.toLocaleString() || 0}</span></div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-auto">
                <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100"><span className="text-[9px] uppercase font-black text-emerald-600/60 block mb-0.5">預估毛利 Profit</span><span className={`text-lg font-black tracking-tight ${project.computedFinancials.profit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>${project.computedFinancials.profit.toLocaleString()}</span></div>
                <div className="bg-stone-50 p-3 rounded-2xl border border-stone-100"><span className="text-[9px] uppercase font-black text-stone-400 block mb-0.5">毛利率 Margin</span><span className={`text-lg font-black tracking-tight ${project.computedFinancials.profitMargin >= 20 ? 'text-emerald-600' : 'text-stone-600'}`}>{project.computedFinancials.profitMargin.toFixed(1)}%</span></div>
              </div>
              <div className="pt-2 border-t border-stone-100 flex items-center justify-between"><span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">{project.client}</span><div className="flex items-center gap-1 text-xs font-bold text-stone-400 group-hover:text-stone-900 transition-colors">查看財務明細 <ArrowUpRight size={14} /></div></div>
            </div>
          </div>
        ))}
        {projects.length === 0 && (
          <div className="col-span-full py-20 bg-white rounded-3xl border border-stone-200 border-dashed flex flex-col items-center justify-center gap-4 text-stone-300">
            <Search size={48} className="opacity-20" />
            <p className="text-sm font-black uppercase tracking-[0.2em] opacity-50">找不到符合條件的案件</p>
            <button onClick={() => { setSearchTerm(''); setStatusFilter('all'); }} className="text-[10px] font-black text-orange-600 hover:underline underline-offset-4">清除篩選條件</button>
          </div>
        )}
      </div>
    </div>
  );
};

// Custom Year Filter Component
const YearFilter = forwardRef((props: IFilterParams, ref) => {
  const [year, setYear] = useState('All');

  useImperativeHandle(ref, () => ({
    isFilterActive() {
      return year !== 'All';
    },
    doesFilterPass(params: any) {
      return params.data.calculatedYear == year;
    },
    getModel() {
      return { value: year };
    },
    setModel(model: any) {
      setYear(model ? model.value : 'All');
    }
  }));

  const onChange = (event: any) => {
    setYear(event.target.value);
    props.filterChangedCallback();
  }

  return (
    <div className="p-4 w-[200px] flex flex-col gap-2">
      <div className="text-[10px] font-black text-stone-400 uppercase tracking-widest">選擇年份 Select Year</div>
      <select
        value={year}
        onChange={onChange}
        className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs font-bold outline-none cursor-pointer hover:border-blue-500 transition-colors"
        onPointerDown={(e) => e.stopPropagation()} // Prevent grid sorting when clicking
      >
        <option value="All">全部年份 (All)</option>
        <option value="2026">2026 年度</option>
        <option value="2025">2025 年度</option>
        <option value="2024">2024 年度</option>
        <option value="others">其他</option>
      </select>
    </div>
  );
});

// Sub-component: Ag-Grid Table View (Replaced)
const TableView = ({ projects, onDetailClick, onEditClick, onDeleteClick }: any) => {
  const columnDefs: ColDef<ProjectWithFinancials>[] = [
    {
      headerName: "專案名稱 / 編號",
      field: "name",
      minWidth: 300,
      flex: 2,
      cellRenderer: (params: any) => (
        <div className="flex flex-col justify-center h-full leading-tight">
          <span className="font-bold text-stone-900 text-sm mb-0.5">{params.data.name}</span>
          <span className="text-[10px] font-mono text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded w-fit">{params.data.id}</span>
        </div>
      )
    },
    {
      headerName: "會勘負責人",
      field: "quotationManager",
      minWidth: 150,
      flex: 1,
      cellRenderer: (params: any) => (
        <div className="flex items-center gap-2 h-full">
          <div className="w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center text-[10px] font-black text-stone-600 border border-stone-200">
            {(params.value || 'U')[0]}
          </div>
          <span className="text-xs font-bold text-stone-600">{params.value || '未指定'}</span>
        </div>
      )
    },
    {
      headerName: "狀態",
      field: "status",
      width: 120,
      cellRenderer: (params: any) => {
        const val = params.value;
        const colorClass = val === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
          val === 'Planning' ? 'bg-blue-50 text-blue-600 border-blue-100' :
            val === 'Completed' ? 'bg-stone-100 text-stone-500 border-stone-200' :
              'bg-slate-50 text-slate-500 border-slate-200';
        return (
          <div className="h-full flex items-center">
            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${colorClass}`}>{val}</span>
          </div>
        );
      }
    },
    {
      headerName: "年度",
      field: "calculatedYear",
      width: 100,
      filter: YearFilter,
      cellClass: "font-mono font-bold text-stone-500 text-xs flex justify-center items-center"
    },
    {
      headerName: "預算",
      field: "budget",
      width: 120,
      type: "numericColumn",
      valueFormatter: (params: any) => params.value ? `$${params.value.toLocaleString()}` : '-',
      cellClass: "font-mono font-bold text-stone-600 text-xs"
    },
    {
      headerName: "已支出",
      field: "computedFinancials.totalCost",
      width: 120,
      type: "numericColumn",
      valueFormatter: (params: any) => `$${params.value?.toLocaleString()}`,
      cellClass: "font-mono font-bold text-rose-600 text-xs"
    },
    {
      headerName: "預估毛利",
      field: "computedFinancials.profit",
      width: 120,
      type: "numericColumn",
      valueFormatter: (params: any) => `$${params.value?.toLocaleString()}`,
      cellClass: "font-mono font-bold text-emerald-600 text-xs"
    },
    {
      headerName: "毛利率",
      field: "computedFinancials.profitMargin",
      width: 100,
      type: "numericColumn",
      valueFormatter: (params: any) => `${params.value?.toFixed(1)}%`,
      cellClass: "font-mono font-bold text-emerald-600 text-xs"
    },
    {
      headerName: "操作",
      sortable: false,
      filter: false,
      width: 120,
      cellRenderer: (params: any) => (
        <div className="flex items-center justify-center gap-1 h-full">
          <button onClick={(e) => { e.stopPropagation(); onEditClick(params.data); }} className="p-2 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-blue-600 transition-colors"><Pencil size={14} /></button>
          <button onClick={(e) => { e.stopPropagation(); onDeleteClick(params.data.id); }} className="p-2 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-rose-600 transition-colors"><Trash2 size={14} /></button>
          <button className="p-2 hover:bg-stone-100 rounded-lg text-stone-300 hover:text-stone-900 transition-colors"><ArrowUpRight size={14} /></button>
        </div>
      )
    }
  ];

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    headerClass: "text-[10px] font-black text-stone-400 uppercase tracking-widest bg-stone-50 border-b border-stone-200",
  }), []);

  return (
    <div className="w-full bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
      <style>{`
            .ag-theme-quartz {
                --ag-header-height: 48px;
                --ag-row-height: 60px;
                --ag-header-background-color: #fafaf9;
                --ag-header-foreground-color: #a8a29e;
                --ag-border-color: #e7e5e4;
                --ag-font-family: inherit;
                --ag-font-size: 13px;
                width: 100%;
            }
            .ag-header-cell-text {
                font-weight: 900 !important;
                letter-spacing: 0.05em;
            }
        `}</style>
      <div className="ag-theme-quartz w-full relative">
        <AgGridReact
          rowData={projects}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          onRowClicked={(e) => onDetailClick(e.data)}
          rowClass="cursor-pointer hover:bg-orange-50/20 transition-colors"
          animateRows={true}
          pagination={true}
          paginationPageSize={15}
          suppressCellFocus={true}
          domLayout='autoHeight'
          rowHeight={68}
          headerHeight={50}
          localeText={{
            // Filter Conditions
            contains: '包含',
            notContains: '不包含',
            startsWith: '開頭為',
            endsWith: '結尾為',
            equals: '等於',
            notEqual: '不等於',
            blank: '空白',
            notBlank: '非空白',

            // Number Filter
            lessThan: '小於',
            greaterThan: '大於',
            lessThanOrEqual: '小於等於',
            greaterThanOrEqual: '大於等於',
            inRange: '範圍內',

            // Date Filter
            inRangeStart: '從',
            inRangeEnd: '到',

            // Common
            andCondition: '且',
            orCondition: '或',
            applyFilter: '套用',
            resetFilter: '重置',
            clearFilter: '清除',
            cancelFilter: '取消',
            filterOoo: '過濾...',
            empty: '沒有資料',
            noRowsToShow: '沒有可顯示的資料',

            // Menu
            pinColumn: '凍結欄位',
            pinLeft: '凍結至左側',
            pinRight: '凍結至右側',
            noPin: '取消凍結',
            autosizeThiscolumn: '自動調整此欄寬度',
            autosizeAllColumns: '自動調整所有欄寬度',
            resetColumns: '重置欄位',
          }}
        />
      </div>
    </div>
  );
};

// Sub-component: Kanban View
const KanbanView = ({ projectsByStatus, onDetailClick, onEditClick, onDeleteClick, getStatusColor }: any) => {
  return (
    <div className="h-full overflow-x-auto overflow-y-hidden">
      <div className="flex gap-4 h-full min-w-max px-2 pb-4">
        {Object.values(ProjectStatus).filter(s => projectsByStatus[s]?.length > 0 || ['Planning', 'Active', 'Completed'].includes(s)).map(status => (
          <div key={status} className="w-[340px] flex flex-col h-full bg-stone-100/50 rounded-2xl border border-stone-200/50 flex-shrink-0">
            <div className={`p-4 flex justify-between items-center rounded-t-2xl border-b z-10 sticky top-0 bg-white shadow-sm ${getStatusColor(status)}`}>
              <div className="font-bold text-sm truncate max-w-[200px]" title={status}>{status}</div>
              <span className="text-xs font-black bg-white/50 px-2 py-0.5 rounded-full">{projectsByStatus[status]?.length || 0}</span>
            </div>
            <div className="p-3 space-y-3 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-stone-200">
              {projectsByStatus[status]?.map((p: ProjectWithFinancials) => (
                <div key={p.id} onClick={() => onDetailClick(p)} className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm hover:shadow-lg hover:translate-y-[-2px] hover:border-orange-200 transition-all cursor-pointer group flex flex-col gap-3 relative">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-black text-stone-400 bg-stone-50 px-1.5 py-0.5 rounded uppercase tracking-wider">{p.id}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); onEditClick(p); }} className="p-1 hover:bg-stone-100 rounded text-stone-400 hover:text-blue-600"><Pencil size={12} /></button>
                      <button onClick={(e) => { e.stopPropagation(); onDeleteClick(p.id); }} className="p-1 hover:bg-stone-100 rounded text-stone-400 hover:text-rose-600"><Trash2 size={12} /></button>
                    </div>
                  </div>
                  {p.coverImage && (
                    <div className="h-24 w-full rounded-lg overflow-hidden relative">
                      <img src={p.coverImage} className="w-full h-full object-cover" alt="cover" />
                      {p.computedFinancials.healthStatus !== 'Healthy' && (
                        <div className={`absolute top-2 right-2 px-2 py-1 rounded text-[9px] font-black text-white flex items-center gap-1 ${p.computedFinancials.healthStatus === 'Critical' ? 'bg-rose-500' : 'bg-amber-500'}`}>
                          <AlertTriangle size={10} /> {p.computedFinancials.healthStatus}
                        </div>
                      )}
                    </div>
                  )}
                  <div><h4 className="font-bold text-stone-800 text-sm leading-snug line-clamp-2 group-hover:text-orange-600 transition-colors">{p.name}</h4><div className="text-[10px] text-stone-500 mt-1">{p.client}</div></div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[8px] font-bold text-stone-400 uppercase"><span>預算進度</span><span>{p.budget ? Math.round((p.computedFinancials.totalCost / p.budget) * 100) : 0}%</span></div>
                    <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${p.computedFinancials.healthStatus === 'Critical' ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${p.budget ? Math.min((p.computedFinancials.totalCost / p.budget) * 100, 100) : 0}%` }} /></div>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold text-stone-400 pt-2 border-t border-stone-50">
                    <div className="flex gap-2">
                      {p.computedFinancials.profitMargin > 0 && <span className="text-emerald-600">GP {p.computedFinancials.profitMargin.toFixed(0)}%</span>}
                    </div>
                    <div className="w-5 h-5 rounded-full bg-stone-100 flex items-center justify-center text-[9px] font-black text-stone-500">{(p.quotationManager || 'U')[0]}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

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
  const [viewMode, setViewMode] = useState<'card' | 'table' | 'kanban'>('table'); // Default Set to Table to show off AgGrid
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all'); // New Year Filter State
  // Removed custom sortConfig as Ag-Grid handles it internally

  const projectsWithFinancials = useMemo<ProjectWithFinancials[]>(() => {
    let filtered = projects.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchDeleted = showDeleted ? p.deletedAt : !p.deletedAt;
      return matchSearch && matchStatus && matchDeleted;
    });

    const mapped = filtered.map(project => {
      // 0. Priority: Manual "Attributed Year" field
      let pYear = '';  // Default empty to show everything
      if (project.year && project.year.trim() !== '') {
        pYear = project.year;
      } else {
        // 1. Try to match full 4-digit year in ID (e.g. BNI2024001 -> 2024)
        const yearFullMatch = project.id.match(/(20\d{2})/);
        if (yearFullMatch) {
          pYear = yearFullMatch[1];
        } else {
          // 2. Try to match 2-digit year after letters (e.g. JW2601003 -> 26 -> 2026)
          const yearShortMatch = project.id.match(/^[A-Za-z]+(\d{2})/);
          if (yearShortMatch) {
            pYear = `20${yearShortMatch[1]}`;
          } else if (project.startDate) {
            pYear = project.startDate.split('-')[0];
          } else {
            // Handle both createdAt and createdDate (legacy data)
            const d = project.createdAt || (project as any).createdDate;
            if (d) {
              pYear = new Date(d).getFullYear().toString();
            }
          }
        }
      }

      // ... Attendance Logic ...
      // 1. Calculate Real-time Labor Cost from Attendance
      let attLaborCost = 0;
      let attManDay = 0;

      if (project.location && project.location.lat && project.location.lng) {
        const pLat = project.location.lat;
        const pLng = project.location.lng;
        const THRESHOLD = 0.005; // approx 500m

        attendanceRecords.forEach(record => {
          if (record.location && record.type === 'work-start') {
            const dist = Math.sqrt(Math.pow(record.location.lat - pLat, 2) + Math.pow(record.location.lng - pLng, 2));
            if (dist < THRESHOLD) {
              const member = teamMembers.find(m => m.id === record.employeeId || m.name === record.name);
              const dailyCost = member?.dailyRate || 2500;
              attLaborCost += dailyCost;
              attManDay += 1;
            }
          }
        });
      }

      const finalLaborCost = Math.max(attLaborCost, project.actualLaborCost || 0);
      const materialCost = project.actualMaterialCost || 0;
      // 介紹費計入成本
      const introducerFee = (project.introducerFeeRequired && project.introducerFeeAmount) ? project.introducerFeeAmount : 0;
      const totalCost = finalLaborCost + materialCost + introducerFee;
      const budget = project.budget || 0;
      const contract = project.contractAmount || 0;
      const revenue = contract > 0 ? contract : budget;

      const profit = revenue > 0 ? (revenue - totalCost) : 0;
      const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

      let healthStatus = 'Healthy';
      if (budget > 0 && totalCost > budget) healthStatus = 'Critical';
      else if (budget > 0 && totalCost > budget * 0.9) healthStatus = 'Warning';

      return {
        ...project,
        calculatedYear: pYear, // Add calculated year to data item
        computedFinancials: {
          laborCost: finalLaborCost,
          materialCost,
          introducerFee,
          totalCost,
          profit,
          profitMargin,
          healthStatus,
          manDays: attManDay,
          revenue
        }
      };
    });

    // Apply year filter after mapping
    const yearFiltered = yearFilter === 'all'
      ? mapped
      : mapped.filter(p => p.calculatedYear === yearFilter);

    // Debug logging
    if (typeof window !== 'undefined') {
      console.log('[ProjectList Debug]', {
        totalProjects: projects.length,
        afterMapping: mapped.length,
        afterYearFilter: yearFiltered.length,
        currentYearFilter: yearFilter,
        yearDistribution: mapped.reduce((acc, p) => {
          const year = p.calculatedYear || 'unknown';
          acc[year] = (acc[year] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      });
    }

    // Sort logic removed, let Ag-Grid handle it
    return yearFiltered;

  }, [projects, attendanceRecords, teamMembers, searchTerm, statusFilter, showDeleted, yearFilter]);

  const projectsByStatus = useMemo(() => {
    const groups: Record<string, ProjectWithFinancials[]> = {};
    Object.values(ProjectStatus).forEach(status => {
      groups[status] = projectsWithFinancials.filter(p => p.status === status);
    });
    return groups;
  }, [projectsWithFinancials]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'Completed': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Planning': return 'bg-blue-50 text-blue-700 border-blue-200';
      default: return 'bg-stone-50 text-stone-600 border-stone-200';
    }
  };

  const isReadOnly = user.role === 'Guest';

  return (
    <div className="flex flex-col h-full bg-stone-50/50">
      <div className="flex-1 flex flex-col p-4 lg:p-8 overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-end gap-4 shrink-0 mb-6">
          <div><h1 className="text-3xl font-black text-stone-900 tracking-tight mb-2">專案財務戰情室</h1><p className="text-stone-500 font-bold flex items-center gap-2 text-xs uppercase tracking-wider"><TrendingUp size={16} className="text-emerald-500" /> Project Costing Dashboard</p></div>
          <div className="flex flex-wrap gap-2">
            {!isReadOnly && (<button onClick={onAddClick} className="bg-stone-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-stone-800 active:scale-95 transition-all shadow-xl shadow-stone-200 text-sm"><Plus size={18} /> 建立新專案</button>)}
            <div className="flex gap-1 bg-white border border-stone-200 rounded-xl p-1 shadow-sm">
              <button onClick={() => setViewMode('card')} className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${viewMode === 'card' ? 'bg-stone-900 text-white' : 'text-stone-400 hover:text-stone-600'}`}><LayoutGrid size={16} /> 卡片</button>
              <button onClick={() => setViewMode('table')} className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${viewMode === 'table' ? 'bg-stone-900 text-white' : 'text-stone-400 hover:text-stone-600'}`}><List size={16} /> AgGrid (Beta)</button>
              <button onClick={() => setViewMode('kanban')} className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${viewMode === 'kanban' ? 'bg-stone-900 text-white' : 'text-stone-400 hover:text-stone-600'}`}><Briefcase size={16} /> 看板</button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0 mb-8">
          <div className="bg-stone-900 text-white p-6 rounded-[2rem] shadow-xl"><div className="flex items-center gap-3 mb-2 opacity-80"><Briefcase size={18} /><span className="text-[10px] font-black uppercase tracking-widest">總進行中專案</span></div><div className="text-4xl font-black">{projects.filter(p => !p.deletedAt && p.status === 'Active').length}</div></div>
          <div className="bg-white p-6 rounded-[2rem] border border-stone-100 shadow-sm"><div className="flex items-center gap-3 mb-2 text-stone-400"><Wallet size={18} /><span className="text-[10px] font-black uppercase tracking-widest">總預期營收 Revenue</span></div>
            <div className="text-2xl xl:text-3xl font-black text-stone-800 tabular-nums tracking-tight truncate" title={projectsWithFinancials.reduce((acc, p) => acc + (p.computedFinancials.revenue || 0), 0).toLocaleString()}>${projectsWithFinancials.reduce((acc, p) => acc + (p.computedFinancials.revenue || 0), 0).toLocaleString()}</div>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-stone-100 shadow-sm"><div className="flex items-center gap-3 mb-2 text-stone-400"><DollarSign size={18} /><span className="text-[10px] font-black uppercase tracking-widest">實際總支出 Cost</span></div>
            <div className="text-2xl xl:text-3xl font-black text-rose-600 tabular-nums tracking-tight truncate">${projectsWithFinancials.reduce((acc, p) => acc + p.computedFinancials.totalCost, 0).toLocaleString()}</div>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-stone-100 shadow-sm"><div className="flex items-center gap-3 mb-2 text-stone-400"><TrendingUp size={18} /><span className="text-[10px] font-black uppercase tracking-widest">預估總毛利 Profit</span></div>
            <div className="text-2xl xl:text-3xl font-black text-emerald-600 tabular-nums tracking-tight truncate">${projectsWithFinancials.reduce((acc, p) => acc + p.computedFinancials.profit, 0).toLocaleString()}</div>
          </div>
        </div>

        {/* Year Filter - Prominent and Easy to Use */}
        <div className="shrink-0 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <Calendar size={20} className="text-orange-600" />
            <h3 className="text-sm font-black text-stone-900 uppercase tracking-widest">篩選年度 YEAR FILTER</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setYearFilter('all')}
              className={`px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-wider transition-all shadow-sm border-2 ${yearFilter === 'all'
                ? 'bg-stone-900 text-white border-stone-900 shadow-lg scale-105'
                : 'bg-white text-stone-400 border-stone-200 hover:border-stone-400 hover:text-stone-600'
                }`}
            >
              📊 全部年份
            </button>
            <button
              onClick={() => setYearFilter('2026')}
              className={`px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-wider transition-all shadow-sm border-2 ${yearFilter === '2026'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg scale-105'
                : 'bg-white text-stone-400 border-stone-200 hover:border-emerald-300 hover:text-emerald-600'
                }`}
            >
              🎯 2026 年度
            </button>
            <button
              onClick={() => setYearFilter('2025')}
              className={`px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-wider transition-all shadow-sm border-2 ${yearFilter === '2025'
                ? 'bg-blue-600 text-white border-blue-600 shadow-lg scale-105'
                : 'bg-white text-stone-400 border-stone-200 hover:border-blue-300 hover:text-blue-600'
                }`}
            >
              📅 2025 年度
            </button>
            <button
              onClick={() => setYearFilter('2024')}
              className={`px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-wider transition-all shadow-sm border-2 ${yearFilter === '2024'
                ? 'bg-amber-600 text-white border-amber-600 shadow-lg scale-105'
                : 'bg-white text-stone-400 border-stone-200 hover:border-amber-300 hover:text-amber-600'
                }`}
            >
              📆 2024 年度
            </button>
          </div>
          <div className="mt-2 text-xs font-bold text-stone-400">
            目前顯示: {yearFilter === 'all' ? '全部年份' : `${yearFilter} 年度`} | 共 {projectsWithFinancials.length} 個專案
          </div>
        </div>



        {/* Only show filters if NOT in Ag-Grid mode, as Ag-Grid has its own filters */}
        {viewMode !== 'table' && (
          <div className="flex flex-wrap gap-2 shrink-0 mb-6">
            <div className="flex items-center bg-white rounded-xl border border-stone-200 px-4 py-2.5 shadow-sm flex-1 min-w-[200px]"><Search size={14} className="text-stone-400 mr-2" /><input className="bg-transparent text-xs font-bold outline-none w-full text-stone-900" placeholder="搜尋專案名稱..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
            <select className="bg-white border border-stone-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none shadow-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="all">所有狀態</option>{Object.values(ProjectStatus).map(s => <option key={s} value={s}>{s}</option>)}</select>
            <button onClick={() => onToggleDeleted(!showDeleted)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm border flex items-center gap-2 ${showDeleted ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-white border-stone-200 text-stone-400 hover:text-stone-600'}`}><Trash2 size={14} /> {showDeleted ? '隱藏垃圾桶' : '檢視垃圾桶'}</button>
          </div>
        )}
        {viewMode === 'table' && (
          <div className="mb-4 flex justify-between items-center">
            <div className="text-xs font-bold text-stone-500">Ag-Grid 模式：點擊表頭排序，或使用表頭過濾器進行篩選</div>
            <button onClick={() => onToggleDeleted(!showDeleted)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm border flex items-center gap-2 ${showDeleted ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-white border-stone-200 text-stone-400 hover:text-stone-600'}`}><Trash2 size={14} /> {showDeleted ? '隱藏垃圾桶' : '檢視垃圾桶'}</button>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-hidden relative">
          {viewMode === 'card' && <CardView projects={projectsWithFinancials} isReadOnly={isReadOnly} onDetailClick={onDetailClick} onEditClick={onEditClick} onDeleteClick={onDeleteClick} onRestoreClick={onRestoreClick} onHardDeleteClick={onHardDeleteClick} setSearchTerm={setSearchTerm} setStatusFilter={setStatusFilter} />}
          {viewMode === 'table' && <TableView projects={projectsWithFinancials} onDetailClick={onDetailClick} onEditClick={onEditClick} onDeleteClick={onDeleteClick} />}
          {viewMode === 'kanban' && <KanbanView projectsByStatus={projectsByStatus} onDetailClick={onDetailClick} onEditClick={onEditClick} onDeleteClick={onDeleteClick} getStatusColor={getStatusColor} />}
        </div>
      </div>

    </div>
  );
};

export default ProjectList;
