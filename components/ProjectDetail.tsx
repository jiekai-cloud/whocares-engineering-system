
import React, { useState, useMemo, useRef } from 'react';
import {
  ArrowLeft, CheckCircle2, Clock, DollarSign, Pencil, Sparkles, Trash2, Activity,
  MessageSquare, Send, Receipt, X, ZoomIn, FileText, ImageIcon, Upload, MapPin,
  Navigation, ShoppingBag, Utensils, Building2, ExternalLink, CalendarDays, Loader2, Check, DownloadCloud, ShieldAlert,
  Layers, Camera, HardHat, CheckCircle, ShieldCheck, Edit2
} from 'lucide-react';
import { Project, ProjectStatus, Task, ProjectComment, Expense, WorkAssignment, TeamMember, ProjectFile, ProjectPhase, User, ChecklistTask, PaymentStage } from '../types';
import { suggestProjectSchedule, searchNearbyResources, analyzeProjectFinancials, parseScheduleFromImage } from '../services/geminiService';
import GanttChart from './GanttChart';
import MapLocation from './MapLocation';
import { cloudFileService } from '../services/cloudFileService';

const PHOTO_CATEGORIES = [
  { id: 'all', label: '全部照片', icon: Layers },
  { id: 'survey', label: '會勘照片及影片', icon: Camera },
  { id: 'construction', label: '施工照片', icon: HardHat },
  { id: 'completion', label: '完工照片', icon: CheckCircle },
  { id: 'inspection', label: '檢驗照片', icon: ShieldCheck }
];

interface ProjectDetailProps {
  project: Project;
  user: User;
  teamMembers: TeamMember[];
  onBack: () => void;
  onEdit: (project: Project) => void;
  onDelete: (id: string) => void;
  onLossClick: (project: Project) => void;
  onUpdateTasks: (tasks: Task[]) => void;
  onUpdateProgress: (progress: number) => void;
  onUpdateStatus: (status: ProjectStatus) => void;
  onAddComment: (text: string) => void;
  onUpdateExpenses: (expenses: Expense[], newSpent: number) => void;
  onUpdateWorkAssignments: (assignments: WorkAssignment[], newSpent: number) => void;
  onUpdateFiles?: (files: ProjectFile[]) => void;
  onUpdatePhases?: (phases: ProjectPhase[]) => void;
  onAddDailyLog: (log: { content: string, photoUrls: string[] }) => void;
  onUpdateChecklist: (checklist: ChecklistTask[]) => void;
  onUpdatePayments: (payments: PaymentStage[]) => void;
}

const ProjectDetail: React.FC<ProjectDetailProps> = ({
  project, user, teamMembers, onBack, onEdit, onDelete, onLossClick,
  onUpdateTasks, onUpdateProgress, onUpdateStatus, onAddComment,
  onUpdateExpenses, onUpdateWorkAssignments, onUpdateFiles, onUpdatePhases,
  onAddDailyLog, onUpdateChecklist, onUpdatePayments
}) => {
  const [newComment, setNewComment] = useState('');
  const [activeView, setActiveView] = useState<'tasks' | 'financials' | 'logs' | 'photos' | 'schedule' | 'map'>('logs');
  const [selectedImage, setSelectedImage] = useState<ProjectFile | null>(null);
  const [isReportMode, setIsReportMode] = useState(false);
  const [isAIScheduling, setIsAIScheduling] = useState(false);
  const [isSearchingNearby, setIsSearchingNearby] = useState(false);
  const [nearbyResults, setNearbyResults] = useState<{ text: string, links: any[] } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedUploadCategory, setSelectedUploadCategory] = useState('survey');
  const [currentPhotoFilter, setCurrentPhotoFilter] = useState('all');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scheduleFileInputRef = useRef<HTMLInputElement>(null);

  // Schedule Options State
  const [scheduleStartDate, setScheduleStartDate] = useState(project.startDate || new Date().toISOString().split('T')[0]);
  const [workOnHolidays, setWorkOnHolidays] = useState(false);
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);

  const [isAnalyzingFinancials, setIsAnalyzingFinancials] = useState(false);
  const [financialAnalysis, setFinancialAnalysis] = useState<string | null>(null);

  const profit = useMemo(() => {
    // Labor cost is now derived purely from dispatch records
    const labor = (project.workAssignments || []).reduce((acc, curr) => acc + curr.totalCost, 0);
    const material = (project.expenses || []).reduce((acc, curr) => acc + curr.amount, 0);
    const totalSpent = labor + material;
    return project.budget - totalSpent;
  }, [project.budget, project.expenses, project.workAssignments]);

  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [expenseFormData, setExpenseFormData] = useState<Partial<Expense>>({
    date: new Date().toISOString().split('T')[0],
    category: '委託工程',
    status: '已核銷',
    name: '',
    amount: 0,
    supplier: ''
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !onUpdateFiles) return;

    setIsUploading(true);
    const files = Array.from(e.target.files);
    const newFiles: ProjectFile[] = [];

    try {
      for (const file of files) {
        const result = await cloudFileService.uploadFile(file);
        if (result) {
          newFiles.push({
            id: result.id,
            url: result.url,
            name: file.name,
            type: file.type.startsWith('video/') ? 'video' : 'image',
            category: selectedUploadCategory,
            uploadedAt: new Date().toISOString(),
            uploadedBy: user.name,
            size: file.size
          });
        }
      }
      onUpdateFiles([...(project.files || []), ...newFiles]);
    } catch (err) {
      console.error('上傳失敗:', err);
      alert('上傳失敗，請稍後再試');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleScheduleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsAIScheduling(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        // Remove data URL prefix if present
        const base64Data = base64String.split(',')[1] || base64String;

        try {
          const newPhases = await parseScheduleFromImage(base64Data, scheduleStartDate, workOnHolidays);
          if (newPhases && newPhases.length > 0) {
            const phasesWithIds = newPhases.map((p: any) => ({
              ...p,
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
            }));
            onUpdatePhases([...(project.phases || []), ...phasesWithIds]);
            alert(`已從文件中成功匯入 ${newPhases.length} 個排程項目！`);
          } else {
            alert('無法從文件中識別出排程項目，請確認圖片清晰度。');
          }
        } catch (error) {
          console.error("Schedule parsing error:", error);
          alert('解析失敗，請稍後再試。');
        } finally {
          setIsAIScheduling(false);
          if (scheduleFileInputRef.current) scheduleFileInputRef.current.value = '';
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("File reading error:", error);
      setIsAIScheduling(false);
    }
  };

  const isReadOnly = user.role === 'Guest';
  const statusOptions = Object.values(ProjectStatus);
  const expenses = project.expenses || [];
  const assignments = project.workAssignments || [];
  const files = project.files || [];

  const totalLaborCost = assignments.reduce((acc, curr) => acc + curr.totalCost, 0);
  const totalExpenseCost = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const currentSpent = totalLaborCost + totalExpenseCost;
  const margin = project.budget - currentSpent;

  const handleNearbySearch = async (resourceType: string) => {
    if (!project.location) return;
    setIsSearchingNearby(true);
    setNearbyResults(null);
    try {
      const result = await searchNearbyResources(
        project.location.address,
        project.location.lat,
        project.location.lng,
        resourceType
      );
      setNearbyResults(result);
    } catch (error) {
      console.error("AI 搜尋附近資源失敗:", error);
    } finally {
      setIsSearchingNearby(false);
    }
  };

  return (
    <div className="flex flex-col lg:h-full animate-in slide-in-from-right-4 duration-500 lg:overflow-hidden">
      {/* 固定標頭資訊 */}
      <div className="p-4 lg:p-8 space-y-4 shrink-0 bg-white/50 border-b border-stone-100">
        <div className="flex justify-between items-center no-print">
          <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold text-sm">
            <ArrowLeft size={16} /> <span className="hidden sm:inline">返回</span>
          </button>
          <div className="flex gap-2">
            {!isReadOnly && (
              <>
                <button onClick={() => setIsReportMode(true)} className="flex items-center gap-2 bg-white border border-blue-200 text-blue-600 px-3 py-1.5 rounded-xl text-[10px] font-black"><FileText size={14} /> 報表</button>
                <button onClick={() => onEdit(project)} className="bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-[10px] font-black"><Pencil size={14} /> 編輯</button>
              </>
            )}
            {isReadOnly && (
              <div className="flex items-center gap-2 bg-stone-100 text-stone-400 px-3 py-1.5 rounded-xl text-[10px] font-black border border-stone-200">
                <ShieldAlert size={14} /> 訪客唯讀權限
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="bg-slate-900 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase">{project.id}</span>
            <span className="bg-blue-50 text-blue-600 text-[9px] font-black px-1.5 py-0.5 rounded border border-blue-100 uppercase">{project.category}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight tracking-tight">{project.name}</h1>
          <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500 font-bold uppercase">
            <span className="flex items-center gap-1"><MapPin size={12} className="text-slate-400" /> {project.location?.address || '無地址'}</span>
            <div className="flex items-center gap-1">
              <Activity size={12} />
              <select
                disabled={isReadOnly}
                className={`bg-transparent outline-none appearance-none text-blue-600 font-black ${isReadOnly ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                value={project.status}
                onChange={(e) => onUpdateStatus(e.target.value as ProjectStatus)}
              >
                {statusOptions.map(opt => <option key={opt} value={opt} className="text-black font-bold">{opt}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 導覽標籤列 */}
      <div className="px-4 py-3 bg-white border-b border-stone-100 shrink-0 no-print">
        <div className="flex gap-2 overflow-x-auto no-scrollbar touch-scroll pb-1">
          {[
            { id: 'logs', label: '討論區', icon: MessageSquare },
            { id: 'inspection', label: 'AI 會勘', icon: Sparkles },
            { id: 'tasks', label: '待辦任務', icon: CheckCircle2 },
            { id: 'schedule', label: '施工排程', icon: CalendarDays },
            { id: 'financials', label: '帳務管理', icon: DollarSign },
            { id: 'map', label: '案場定位', icon: Navigation },
            { id: 'photos', label: '照片庫', icon: ImageIcon }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id as any)}
              className={`px-4 py-2 rounded-xl text-[11px] font-black transition-all flex items-center gap-2 whitespace-nowrap shadow-sm border ${activeView === item.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-stone-100 hover:border-stone-300'}`}
            >
              <item.icon size={14} /> {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 視圖內容區 */}
      <div className="flex-1 lg:min-h-0 flex flex-col p-4 sm:p-6 lg:overflow-hidden">
        {activeView === 'inspection' && (
          <div className="space-y-6 animate-in fade-in">
            {project.inspectionData ? (
              <>
                <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-8 rounded-[2.5rem] text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Sparkles size={120} />
                  </div>
                  <div className="relative z-10">
                    <div className="bg-white/10 w-fit px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 backdrop-blur-md">智慧抓漏系統診斷</div>
                    <h3 className="text-3xl font-black mb-2 leading-tight">AI 診斷結果</h3>
                    <p className="text-indigo-200 text-sm font-medium opacity-80 mb-6">診斷時間：{project.inspectionData.timestamp}</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-sm">
                        <h4 className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-3">病灶判定 Diagnosis</h4>
                        <p className="text-sm leading-relaxed">{project.inspectionData.diagnosis}</p>
                      </div>
                      <div className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-sm">
                        <h4 className="text-[10px] font-black text-emerald-300 uppercase tracking-widest mb-3">建議對策 Suggestion</h4>
                        <p className="text-sm leading-relaxed">{project.inspectionData.suggestedFix}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-4">
                    <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-2">現場採樣照片 Original Samples</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {project.inspectionData.originalPhotos.map((url, i) => (
                        <div key={i} className="aspect-square rounded-2xl overflow-hidden border border-stone-100 shadow-sm group relative">
                          <img src={url} alt={`會勘照片 ${i + 1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          <div className="absolute inset-0 bg-indigo-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ZoomIn className="text-white" size={24} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-2">AI 深度分析 AI Inference</h4>
                    <div className="bg-white border border-stone-200 p-6 rounded-3xl shadow-sm">
                      <div className="flex items-center gap-2 mb-4 text-indigo-600">
                        <Activity size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest">特徵識別</span>
                      </div>
                      <p className="text-xs text-stone-600 leading-relaxed italic">"{project.inspectionData.aiAnalysis}"</p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-32 flex flex-col items-center justify-center text-stone-300 gap-4 opacity-50">
                <Sparkles size={64} className="animate-pulse" />
                <div className="text-center">
                  <p className="text-xs font-black uppercase tracking-widest">此專案尚未有關聯的 AI 會勘數據</p>
                  <p className="text-[10px] font-bold mt-1">您可以手動輸入會勘資料或等待系統自動串聯</p>
                </div>
              </div>
            )}
          </div>
        )}
        {activeView === 'logs' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:h-full lg:overflow-hidden animate-in fade-in">
            {/* 左側：施工日誌時間軸 */}
            <div className="lg:col-span-8 flex flex-col bg-white rounded-3xl border border-stone-200 shadow-sm lg:overflow-hidden">
              <div className="px-6 py-4 border-b border-stone-100 bg-stone-50/50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Activity size={16} className="text-orange-600" />
                  <h3 className="font-black text-xs uppercase tracking-widest">專案討論區</h3>
                </div>
                <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{project.dailyLogs?.length || 0} 筆紀錄</span>
              </div>

              <div className="flex-1 lg:overflow-y-auto p-6 space-y-8 touch-scroll no-scrollbar">
                {project.dailyLogs && project.dailyLogs.length > 0 ? (
                  project.dailyLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((log, idx) => (
                    <div key={log.id} className="relative pl-8 group">
                      {/* Timeline Line */}
                      <div className="absolute left-[11px] top-2 bottom-0 w-0.5 bg-stone-100 group-last:bg-transparent"></div>
                      {/* Timeline Dot */}
                      <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full border-4 border-white bg-orange-500 shadow-sm z-10 transition-transform group-hover:scale-110"></div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-stone-900">{new Date(log.date).toLocaleDateString('zh-TW')}</span>
                            <span className="text-[10px] bg-stone-100 px-2 py-0.5 rounded-full font-bold text-stone-500 uppercase">{log.authorName}</span>
                          </div>
                        </div>

                        <div className="bg-stone-50/50 hover:bg-stone-50 p-4 rounded-2xl border border-stone-100 transition-colors">
                          <p className="text-xs font-medium text-stone-700 leading-relaxed whitespace-pre-wrap">{log.content}</p>

                          {log.photoUrls && log.photoUrls.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
                              {log.photoUrls.map((url, pIdx) => (
                                <div key={pIdx} className="aspect-square rounded-xl overflow-hidden border border-stone-200 shadow-sm group/photo relative cursor-zoom-in" onClick={() => setSelectedImage({ id: url, url, name: '施工照片', type: 'image', size: 0, uploadDate: log.date } as any)}>
                                  <img src={url} alt="施工現場" className="w-full h-full object-cover transition-transform duration-500 group-hover/photo:scale-110" />
                                  <div className="absolute inset-0 bg-black/0 group-hover/photo:bg-black/20 transition-colors flex items-center justify-center">
                                    <ZoomIn size={20} className="text-white opacity-0 group-hover/photo:opacity-100 transition-opacity" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-stone-300 gap-4 opacity-50 py-20">
                    <CalendarDays size={48} />
                    <div className="text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest">目前尚無討論紀錄</p>
                      <p className="text-[9px] font-bold mt-1">開始記錄專案細節以建立完整的履歷</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 右側：紀錄輸入區 & 留言版摘要 */}
            <div className="lg:col-span-4 flex flex-col gap-6 lg:overflow-hidden">
              {/* 新增紀錄表單 */}
              {!isReadOnly && (
                <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm shrink-0">
                  <h4 className="font-black text-stone-900 uppercase text-[10px] tracking-widest mb-4 flex items-center gap-2">
                    <Pencil size={14} className="text-blue-600" /> 發起討論 / 紀錄
                  </h4>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.target as HTMLFormElement;
                    const content = (form.elements.namedItem('content') as HTMLTextAreaElement).value;
                    const photoUrl = (form.elements.namedItem('photoUrl') as HTMLInputElement).value;
                    if (!content.trim()) return;
                    onAddDailyLog({ content, photoUrls: photoUrl ? [photoUrl] : [] });
                    form.reset();
                  }} className="space-y-4">
                    <textarea
                      name="content"
                      required
                      placeholder="輸入討論內容或紀錄..."
                      className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3 text-xs font-bold text-stone-900 outline-none focus:ring-2 focus:ring-blue-600/20 placeholder:text-stone-300 resize-none h-32"
                    ></textarea>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest ml-1">現場照片網址 (選填)</label>
                      <input
                        name="photoUrl"
                        type="url"
                        placeholder="https://example.com/photo.jpg"
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-[10px] font-bold text-stone-900 outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-stone-200"
                    >
                      提交內容
                    </button>
                  </form>
                </div>
              )}

              {/* 留言中心 */}
              <div className="flex-1 bg-white rounded-3xl border border-stone-200 shadow-sm flex flex-col lg:overflow-hidden">
                <div className="px-6 py-4 border-b border-stone-100 bg-stone-50/50 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={16} className="text-blue-600" />
                    <h3 className="font-black text-xs uppercase tracking-widest">團隊討論區</h3>
                  </div>
                </div>
                <div className="flex-1 lg:overflow-y-auto p-4 space-y-4 no-scrollbar">
                  {(project.comments || []).map((comment) => (
                    <div key={comment.id} className="flex gap-2">
                      <div className="w-6 h-6 rounded-lg bg-stone-100 flex items-center justify-center font-black text-stone-400 text-[8px] shrink-0 uppercase border border-stone-200">
                        {comment.authorName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-medium text-stone-700 bg-stone-50 p-2.5 rounded-xl rounded-tl-none border border-stone-100 leading-relaxed italic">
                          "{comment.text}"
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                {!isReadOnly && (
                  <div className="p-4 border-t border-stone-100">
                    <form
                      onSubmit={(e) => { e.preventDefault(); if (!newComment.trim()) return; onAddComment(newComment); setNewComment(''); }}
                      className="flex gap-2"
                    >
                      <input
                        type="text"
                        placeholder="留言..."
                        className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-[10px] font-bold outline-none"
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                      />
                      <button type="submit" disabled={!newComment.trim()} className="p-2 bg-blue-600 text-white rounded-xl disabled:opacity-20 transition-all active:scale-90"><Send size={14} /></button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeView !== 'logs' && (
          <div className="flex-1 lg:overflow-y-auto touch-scroll space-y-4 pr-1 no-scrollbar">
            {activeView === 'financials' && (
              <div className="space-y-6 animate-in fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Activity size={48} className="text-blue-900" />
                    </div>
                    <p className="text-[9px] font-black text-stone-400 uppercase mb-2 tracking-widest">預算執行率</p>
                    <p className="text-2xl font-black text-stone-900">{((currentSpent / project.budget) * 100).toFixed(1)}%</p>
                    <div className="w-full bg-stone-100 h-1.5 rounded-full mt-3 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-1000 ${(currentSpent / project.budget) > 1 ? 'bg-rose-500' :
                          (currentSpent / project.budget) > 0.8 ? 'bg-amber-500' : 'bg-blue-600'
                          }`}
                        style={{ width: `${Math.min((currentSpent / project.budget) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* AI Analysis & Financial Overview Section */}
                <div className="space-y-6 mb-6">
                  <div className="bg-stone-900 border border-stone-800 rounded-3xl p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full filter blur-[80px] -translate-y-1/2 translate-x-1/2"></div>

                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                      <div>
                        <h3 className="text-xl font-black text-white mb-2">專案財務總覽</h3>
                        <p className="text-stone-400 text-sm font-medium">即時追蹤預算執行率與自動化成本分析。</p>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={async () => {
                            setIsAnalyzingFinancials(true);
                            try {
                              const result = await analyzeProjectFinancials(project);
                              setFinancialAnalysis(result.text || '無法生成報告');
                            } catch (e) {
                              alert('分析失敗，請稍後再試');
                            } finally {
                              setIsAnalyzingFinancials(false);
                            }
                          }}
                          disabled={isAnalyzingFinancials}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-900/30 transition-all active:scale-95 disabled:opacity-50"
                        >
                          {isAnalyzingFinancials ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                          AI 財務診斷
                        </button>
                        {!isReadOnly && <button className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"><Pencil size={18} /></button>}
                      </div>
                    </div>
                  </div>

                  {financialAnalysis && (
                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-3xl p-6 animate-in fade-in slide-in-from-top-4">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl shrink-0">
                          <Activity size={24} />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-black text-indigo-900 text-sm uppercase tracking-wider mb-3">AI 財務營運預測報告</h4>
                          <div className="prose prose-sm prose-indigo max-w-none text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">
                            {financialAnalysis}
                          </div>
                        </div>
                        <button onClick={() => setFinancialAnalysis(null)} className="text-indigo-300 hover:text-indigo-500"><X size={20} /></button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><DollarSign size={20} /></div>
                        <span className="text-[10px] font-black text-stone-300 uppercase tracking-widest">BUDGET</span>
                      </div>
                      <p className="text-2xl font-black text-stone-900 tracking-tight">NT$ {project.budget.toLocaleString()}</p>
                      <p className="text-[11px] font-bold text-stone-400 mt-1">專案總預算</p>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><HardHat size={20} /></div>
                        <span className="text-[10px] font-black text-stone-300 uppercase tracking-widest">LABOR COST</span>
                      </div>
                      <p className="text-2xl font-black text-stone-900 tracking-tight">
                        NT$ {((project.workAssignments || []).reduce((acc, curr) => acc + curr.totalCost, 0)).toLocaleString()}
                      </p>
                      <p className="text-[11px] font-bold text-stone-400 mt-1">累積施工成本 (自動計算)</p>
                    </div>

                    {[
                      { label: '委託工程 (分包)', key: '委託工程', icon: Building2, color: 'text-purple-600', bg: 'bg-purple-50' },
                      { label: '機具材料', key: '機具材料', icon: ShoppingBag, color: 'text-amber-600', bg: 'bg-amber-50' },
                    ].map(cat => {
                      const amount = (project.expenses || []).filter(e => e.category === cat.key).reduce((acc, curr) => acc + curr.amount, 0);
                      const Icon = cat.icon;
                      return (
                        <div key={cat.label} className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
                          <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 ${cat.bg} ${cat.color} rounded-2xl`}><Icon size={20} /></div>
                            <span className="text-[10px] font-black text-stone-300 uppercase tracking-widest">EXPENSE</span>
                          </div>
                          <p className="text-2xl font-black text-stone-900 tracking-tight">NT$ {amount.toLocaleString()}</p>
                          <p className="text-[11px] font-bold text-stone-400 mt-1">{cat.label}</p>
                        </div>
                      );
                    })}

                    <div className={`p-6 rounded-3xl border shadow-sm ${profit >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                      <div className="flex justify-between items-start mb-4">
                        <div className={`p-3 rounded-2xl ${profit >= 0 ? 'bg-white text-emerald-600' : 'bg-white text-rose-600'}`}>
                          <Activity size={20} />
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${profit >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>NET PROFIT</span>
                      </div>
                      <p className={`text-2xl font-black tracking-tight ${profit >= 0 ? 'text-emerald-900' : 'text-rose-900'}`}>
                        NT$ {Math.abs(profit).toLocaleString()}
                      </p>
                      <p className={`text-[11px] font-bold mt-1 ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {profit >= 0 ? '目前預估毛利' : '目前預估虧損'}
                      </p>
                    </div>
                  </div>

                  {/* 收款階段管理 */}
                  <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden min-h-[300px]">
                    <div className="px-6 py-4 border-b border-stone-100 bg-stone-50/50 flex items-center justify-between">
                      <h4 className="text-[10px] font-black text-stone-900 uppercase tracking-widest flex items-center gap-2">
                        <DollarSign size={14} className="text-emerald-600" /> 應收款與收款階段
                      </h4>
                      {!isReadOnly && (
                        <button
                          onClick={() => {
                            const label = prompt('階段名稱 (例如：訂金、期中款)');
                            const amountStr = prompt('金額 (數字)');
                            if (label && amountStr) {
                              const newPayment: PaymentStage = {
                                id: Date.now().toString(),
                                label,
                                amount: parseInt(amountStr),
                                status: 'pending',
                                date: new Date().toISOString().split('T')[0],
                                notes: ''
                              };
                              onUpdatePayments([...(project.payments || []), newPayment]);
                            }
                          }}
                          className="bg-emerald-600 text-white px-3 py-1.5 rounded-xl text-[10px] font-black hover:bg-emerald-700 transition-all active:scale-95"
                        >
                          + 新增收款階段
                        </button>
                      )}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-stone-50/50">
                            <th className="px-6 py-3 text-[9px] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100">階段名稱</th>
                            <th className="px-6 py-3 text-[9px] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100">預計收款日</th>
                            <th className="px-6 py-3 text-[9px] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100 text-right">金額</th>
                            <th className="px-6 py-3 text-[9px] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100">狀態</th>
                            {!isReadOnly && <th className="px-6 py-3 text-[9px] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100 text-center">操作</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-50">
                          {(project.payments || []).length > 0 ? (project.payments || []).map((p) => (
                            <tr key={p.id} className="hover:bg-stone-50/30 transition-colors">
                              <td className="px-6 py-4 text-xs font-black text-stone-900">{p.label}</td>
                              <td className="px-6 py-4 text-xs font-bold text-stone-500">{p.date}</td>
                              <td className="px-6 py-4 text-xs font-black text-stone-900 text-right">NT$ {p.amount.toLocaleString()}</td>
                              <td className="px-6 py-4">
                                <button
                                  disabled={isReadOnly}
                                  onClick={() => {
                                    const nextStatus = p.status === 'paid' ? 'pending' : 'paid';
                                    onUpdatePayments((project.payments || []).map(pay => pay.id === p.id ? { ...pay, status: nextStatus } : pay));
                                  }}
                                  className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border transition-all ${p.status === 'paid'
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                    : 'bg-amber-50 text-amber-600 border-amber-100'
                                    }`}
                                >
                                  {p.status === 'paid' ? '已收訖' : '待收款'}
                                </button>
                              </td>
                              {!isReadOnly && (
                                <td className="px-6 py-4 text-center">
                                  <button onClick={() => onUpdatePayments((project.payments || []).filter(pay => pay.id !== p.id))} className="text-stone-300 hover:text-rose-500 transition-colors"><Trash2 size={14} /></button>
                                </td>
                              )}
                            </tr>
                          )) : (
                            <tr>
                              <td colSpan={5} className="px-6 py-20 text-center text-stone-300">
                                <p className="text-[10px] font-black uppercase tracking-widest">目前尚未設定收款階段</p>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>


                  {/* 支出管理 (Expenses) */}
                  <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden min-h-[300px]">
                    <div className="px-6 py-4 border-b border-stone-100 bg-stone-50/50 flex items-center justify-between">
                      <h4 className="text-[10px] font-black text-stone-900 uppercase tracking-widest flex items-center gap-2">
                        <Receipt size={14} className="text-rose-600" /> 專案支出明細
                      </h4>
                      {!isReadOnly && (
                        <button
                          onClick={() => setIsAddingExpense(true)}
                          className="bg-stone-900 text-white px-3 py-1.5 rounded-xl text-[10px] font-black hover:bg-stone-800 transition-all active:scale-95"
                        >
                          + 新增支出
                        </button>
                      )}
                    </div>

                    {isAddingExpense && (
                      <div className="p-6 bg-stone-50 border-b border-stone-100 space-y-4 animate-in slide-in-from-top-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[9px] font-black text-stone-400 uppercase tracking-widest mb-1.5">支出類別</label>
                            <select
                              className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer"
                              value={expenseFormData.category}
                              onChange={e => setExpenseFormData({ ...expenseFormData, category: e.target.value as any })}
                            >
                              <option value="委託工程">委託工程 (Subcontract)</option>
                              <option value="零用金">零用金 (Petty Cash)</option>
                              <option value="機具材料">機具材料 (Materials)</option>
                              <option value="行政人事成本">行政人事成本 (Admin / HR)</option>
                              <option value="其他">其他 (Other)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[9px] font-black text-stone-400 uppercase tracking-widest mb-1.5">發生日期</label>
                            <input
                              type="date"
                              className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                              value={expenseFormData.date}
                              onChange={e => setExpenseFormData({ ...expenseFormData, date: e.target.value })}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-[9px] font-black text-stone-400 uppercase tracking-widest mb-1.5">支出項目名稱</label>
                            <input
                              type="text"
                              className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                              placeholder="例如：水泥沙、工資..."
                              value={expenseFormData.name}
                              onChange={e => setExpenseFormData({ ...expenseFormData, name: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-black text-stone-400 uppercase tracking-widest mb-1.5">金額</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs">$</span>
                              <input
                                type="number"
                                className="w-full bg-white border border-stone-200 rounded-xl pl-6 pr-3 py-2 text-xs font-bold outline-none"
                                value={expenseFormData.amount}
                                onChange={e => setExpenseFormData({ ...expenseFormData, amount: Number(e.target.value) })}
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[9px] font-black text-stone-400 uppercase tracking-widest mb-1.5">
                              {expenseFormData.category === '委託工程' ? '承攬廠商名稱 (必填)' : '支付對象 (選填)'}
                            </label>
                            <input
                              type="text"
                              className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                              placeholder={expenseFormData.category === '委託工程' ? '請輸入廠商名稱...' : '廠商或請款人...'}
                              value={expenseFormData.supplier}
                              onChange={e => setExpenseFormData({ ...expenseFormData, supplier: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                          <button onClick={() => setIsAddingExpense(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-stone-500 hover:bg-stone-100">取消</button>
                          <button
                            onClick={() => {
                              if (!expenseFormData.name || !expenseFormData.amount) return alert('請填寫完整資訊');
                              if (expenseFormData.category === '委託工程' && !expenseFormData.supplier) return alert('委託工程必須填寫承攬廠商名稱');
                              const newExp: Expense = {
                                id: Date.now().toString(),
                                ...expenseFormData as Expense
                              };
                              const newExpenses = [newExp, ...(project.expenses || [])];
                              // Calculate new total spent: sum(expenses) + sum(labor assignments)
                              const newExpTotal = newExpenses.reduce((sum, e) => sum + e.amount, 0);
                              const currentLabor = (project.workAssignments || []).reduce((acc, curr) => acc + curr.totalCost, 0);
                              onUpdateExpenses(newExpenses, newExpTotal + currentLabor);

                              setIsAddingExpense(false);
                              setExpenseFormData({
                                date: new Date().toISOString().split('T')[0],
                                category: '委託工程',
                                status: '已核銷',
                                name: '',
                                amount: 0,
                                supplier: ''
                              });
                            }}
                            className="px-4 py-2 rounded-xl text-xs font-bold bg-stone-900 text-white hover:bg-slate-800 shadow-lg active:scale-95 transition-all"
                          >
                            確認新增
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-stone-50/50">
                            <th className="px-6 py-3 text-[9px] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100">日期</th>
                            <th className="px-6 py-3 text-[9px] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100">類別</th>
                            <th className="px-6 py-3 text-[9px] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100">項目說明</th>
                            <th className="px-6 py-3 text-[9px] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100 text-right">金額</th>
                            <th className="px-6 py-3 text-[9px] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100">對象</th>
                            {!isReadOnly && <th className="px-6 py-3 text-[9px] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100 text-center">操作</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-50">
                          {(project.expenses || []).length > 0 ? (project.expenses || []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((exp) => (
                            <tr key={exp.id} className="hover:bg-stone-50/30 transition-colors">
                              <td className="px-6 py-4 text-xs font-bold text-stone-500">{exp.date}</td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider ${exp.category === '委託工程' ? 'bg-indigo-50 text-indigo-600' :
                                  exp.category === '機具材料' ? 'bg-amber-50 text-amber-600' :
                                    exp.category === '行政人事成本' ? 'bg-purple-50 text-purple-600' :
                                      exp.category === '零用金' ? 'bg-teal-50 text-teal-600' :
                                        'bg-stone-100 text-stone-600'
                                  }`}>
                                  {exp.category}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-xs font-black text-stone-900">{exp.name}</td>
                              <td className="px-6 py-4 text-xs font-black text-stone-900 text-right">NT$ {exp.amount.toLocaleString()}</td>
                              <td className="px-6 py-4 text-[10px] font-bold text-stone-500">{exp.supplier || '-'}</td>
                              {!isReadOnly && (
                                <td className="px-6 py-4 text-center">
                                  <button
                                    onClick={() => {
                                      if (confirm('確定刪除此筆支出？')) {
                                        const newExpenses = (project.expenses || []).filter(e => e.id !== exp.id);
                                        const newExpTotal = newExpenses.reduce((sum, e) => sum + e.amount, 0);
                                        const currentLabor = (project.workAssignments || []).reduce((acc, curr) => acc + curr.totalCost, 0);
                                        onUpdateExpenses(newExpenses, newExpTotal + currentLabor);
                                      }
                                    }}
                                    className="text-stone-300 hover:text-rose-500 transition-colors"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              )}
                            </tr>
                          )) : (
                            <tr><td colSpan={6} className="px-6 py-12 text-center text-stone-300"><p className="text-[10px] font-black uppercase tracking-widest">尚無支出紀錄</p></td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {activeView === 'map' && (
              <div className="bg-white rounded-3xl border border-stone-200 p-6 space-y-6 animate-in fade-in shadow-sm">
                <h3 className="font-black text-stone-900 uppercase text-xs flex items-center gap-2"><MapPin size={16} className="text-blue-600" /> 地理定位</h3>
                <div className="aspect-video bg-stone-50 rounded-2xl flex items-center justify-center text-stone-300 border border-stone-100"><MapPin size={40} className="text-blue-600 opacity-20" /></div>
                <div className="space-y-3">
                  <h4 className="text-[9px] font-black text-stone-400 uppercase tracking-widest">附近資源搜尋</h4>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleNearbySearch('五金行')}
                      disabled={isSearchingNearby || isReadOnly}
                      className="bg-blue-50 text-blue-600 px-3 py-2 rounded-xl text-[10px] font-black border border-blue-100 disabled:opacity-50 flex items-center gap-2"
                    >
                      {isSearchingNearby ? <Loader2 size={12} className="animate-spin" /> : '五金行'}
                    </button>
                    <button
                      onClick={() => handleNearbySearch('建材行')}
                      disabled={isSearchingNearby || isReadOnly}
                      className="bg-amber-50 text-amber-600 px-3 py-2 rounded-xl text-[10px] font-black border border-amber-100 disabled:opacity-50 flex items-center gap-2"
                    >
                      {isSearchingNearby ? <Loader2 size={12} className="animate-spin" /> : '建材行'}
                    </button>
                  </div>

                  {nearbyResults && (
                    <div className="mt-4 p-4 bg-stone-50 rounded-2xl border border-stone-100 space-y-3 animate-in fade-in">
                      <p className="text-[11px] font-medium text-stone-700 leading-relaxed whitespace-pre-wrap">{nearbyResults.text}</p>
                      <div className="flex flex-wrap gap-2">
                        {nearbyResults.links.map((link, i) => (
                          <a
                            key={i}
                            href={link.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 bg-white border border-stone-200 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-blue-600 hover:border-blue-300 transition-colors shadow-sm"
                          >
                            <ExternalLink size={10} /> {link.title}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeView === 'tasks' && (
              <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden animate-in fade-in">
                <div className="px-6 py-4 border-b border-stone-100 bg-stone-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    <h3 className="font-black text-xs uppercase tracking-widest">待辦任務清單</h3>
                  </div>
                  {!isReadOnly && (
                    <button
                      onClick={() => {
                        const title = prompt('任務內容：');
                        if (title) {
                          const newTask: Task = {
                            id: Date.now().toString(),
                            title,
                            assignee: user.name,
                            status: 'Todo',
                            priority: 'Medium',
                            dueDate: new Date().toISOString().split('T')[0]
                          };
                          onUpdateTasks([newTask, ...(project.tasks || [])]);
                        }
                      }}
                      className="bg-stone-900 text-white px-3 py-1.5 rounded-xl text-[10px] font-black hover:bg-stone-800 transition-all active:scale-95"
                    >
                      + 新增任務
                    </button>
                  )}
                </div>
                <div className="divide-y divide-stone-50">
                  {project.tasks && project.tasks.length > 0 ? project.tasks.map(task => (
                    <div key={task.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                      <div className="flex items-center gap-3">
                        <button
                          disabled={isReadOnly}
                          onClick={() => {
                            const newStatus = task.status === 'Done' ? 'Todo' : 'Done';
                            onUpdateTasks(project.tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
                          }}
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${task.status === 'Done' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-stone-300 text-transparent hover:border-emerald-400'}`}
                        >
                          <Check size={12} strokeWidth={4} />
                        </button>
                        <div>
                          <p className={`text-sm font-bold text-stone-700 ${task.status === 'Done' ? 'line-through opacity-50' : ''}`}>{task.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded uppercase">{task.assignee}</span>
                            {task.dueDate && <span className="text-[9px] text-stone-400 flex items-center gap-1"><CalendarDays size={10} /> {task.dueDate}</span>}
                          </div>
                        </div>
                      </div>
                      {!isReadOnly && (
                        <button onClick={() => onUpdateTasks(project.tasks.filter(t => t.id !== task.id))} className="text-stone-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all px-2">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  )) : (
                    <div className="py-20 flex flex-col items-center justify-center text-stone-300 gap-4 opacity-50">
                      <CheckCircle2 size={48} />
                      <p className="text-[10px] font-black uppercase tracking-widest">目前沒有待辦任務</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeView === 'schedule' && (
              <div className="space-y-6 animate-in fade-in">
                <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-stone-100 bg-stone-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CalendarDays size={16} className="text-blue-600" />
                      <h3 className="font-black text-xs uppercase tracking-widest">施工進度排程</h3>
                      <button onClick={() => setIsAIScheduling(true)} className="ml-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-2 py-1 rounded-lg text-[9px] font-black flex items-center gap-1"><Sparkles size={10} /> AI 排程助手</button>
                    </div>
                    {!isReadOnly && (
                      <button
                        onClick={() => {
                          const name = prompt('階段名稱：');
                          if (name) {
                            const newPhase: ProjectPhase = {
                              id: Date.now().toString(),
                              name,
                              status: 'Upcoming',
                              progress: 0,
                              startDate: new Date().toISOString().split('T')[0],
                              endDate: new Date().toISOString().split('T')[0]
                            };
                            if (onUpdatePhases) onUpdatePhases([...(project.phases || []), newPhase]);
                          }
                        }}
                        className="bg-stone-900 text-white px-3 py-1.5 rounded-xl text-[10px] font-black hover:bg-stone-800 transition-all active:scale-95"
                      >
                        + 新增階段
                      </button>
                    )}
                  </div>
                  <div className="p-6 space-y-6">
                    {project.phases && project.phases.length > 0 ? (
                      <div className="space-y-8">
                        {/* 甘特圖概覽 */}
                        <div className="bg-stone-50/50 p-4 rounded-[2rem] border border-stone-100">
                          <h4 className="text-[9px] font-black text-stone-400 uppercase tracking-widest mb-4 ml-2">時程視覺化概覽</h4>
                          <GanttChart phases={project.phases} />
                        </div>

                        <div className="flex justify-between items-center mb-6">
                          <h3 className="font-black text-stone-900 uppercase text-xs flex items-center gap-2">
                            <CalendarDays size={16} className="text-blue-600" /> 施工進度排程
                          </h3>
                          <div className="flex flex-wrap items-center gap-3">
                            {/* Schedule Settings */}
                            <div className="flex items-center gap-3 bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-100">
                              <div className="flex flex-col">
                                <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest mb-0.5">開始日期</label>
                                <input
                                  type="date"
                                  value={scheduleStartDate}
                                  onChange={(e) => {
                                    const newDate = e.target.value;
                                    setScheduleStartDate(newDate);

                                    // Cascade update phases
                                    if (project.phases && project.phases.length > 0 && newDate) {
                                      const phases = project.phases;
                                      const currentEarliest = phases.reduce((min, p) => p.startDate < min ? p.startDate : min, phases[0].startDate);

                                      const diff = new Date(newDate).getTime() - new Date(currentEarliest).getTime();

                                      if (diff !== 0) {
                                        const updatedPhases = phases.map(p => {
                                          const s = new Date(p.startDate);
                                          const e = new Date(p.endDate);
                                          return {
                                            ...p,
                                            startDate: new Date(s.getTime() + diff).toISOString().split('T')[0],
                                            endDate: new Date(e.getTime() + diff).toISOString().split('T')[0]
                                          };
                                        });
                                        onUpdatePhases(updatedPhases);
                                      }
                                    }
                                  }}
                                  className="text-[10px] font-bold bg-transparent border-none outline-none p-0 text-stone-700 w-24"
                                />
                              </div>
                              <div className="w-px h-6 bg-stone-200"></div>
                              <div className="flex items-center gap-2">
                                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                  <div className={`w-3 h-3 rounded flex items-center justify-center border transition-all ${workOnHolidays ? 'bg-orange-600 border-orange-600' : 'bg-white border-stone-300'}`}>
                                    {workOnHolidays && <Check size={10} className="text-white" strokeWidth={4} />}
                                  </div>
                                  <input
                                    type="checkbox"
                                    checked={workOnHolidays}
                                    onChange={(e) => setWorkOnHolidays(e.target.checked)}
                                    className="hidden"
                                  />
                                  <span className="text-[10px] font-bold text-stone-600">假日施工</span>
                                </label>
                              </div>
                            </div>

                            <input type="file" ref={scheduleFileInputRef} className="hidden" accept="image/*" onChange={handleScheduleUpload} />
                            <button
                              onClick={() => scheduleFileInputRef.current?.click()}
                              disabled={isAIScheduling || isReadOnly}
                              className="bg-stone-100 text-stone-600 px-3 py-1.5 rounded-xl text-[10px] font-black hover:bg-stone-200 transition-all flex items-center gap-2"
                            >
                              <Upload size={12} /> 上傳合約/報價單 (AI排程)
                            </button>
                            <button
                              onClick={async () => {
                                setIsAIScheduling(true);
                                try {
                                  // Implementation for pure text generation exists, but here we added file upload
                                  const result = await suggestProjectSchedule(project);
                                  // ... handle text result if needed, or rely on file upload ...
                                  // For now, let's keep the old button too or replace? 
                                  // The user asked to ADD upload capability.
                                  alert(result.text);
                                } catch (e) { } finally { setIsAIScheduling(false); }
                              }}
                              disabled={isAIScheduling || isReadOnly}
                              className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-xl text-[10px] font-black hover:bg-blue-100 transition-all flex items-center gap-2"
                            >
                              {isAIScheduling ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                              AI 建議排程
                            </button>
                            <button
                              onClick={() => {
                                const container = document.getElementById('gantt-chart-container');
                                const svg = container?.querySelector('svg');
                                if (svg) {
                                  // Get current dimensions
                                  const { width, height } = svg.getBoundingClientRect();
                                  const headerHeight = 160; // Extra space for branding info

                                  const canvas = document.createElement('canvas');
                                  const ctx = canvas.getContext('2d');
                                  if (!ctx) return;

                                  canvas.width = width * 2;
                                  canvas.height = (height + headerHeight) * 2;
                                  ctx.scale(2, 2);

                                  // Background
                                  ctx.fillStyle = 'white';
                                  ctx.fillRect(0, 0, width, height + headerHeight);

                                  const logoImg = new Image();
                                  const chartImg = new Image();
                                  let loadedCount = 0;

                                  const onAllLoaded = () => {
                                    loadedCount++;
                                    if (loadedCount < 2) return;

                                    // 1. Draw Logo
                                    const logoSize = 60;
                                    ctx.drawImage(logoImg, 40, 25, logoSize, logoSize);

                                    // 2. Draw Company Info
                                    ctx.fillStyle = '#ea580c'; // Orange-600
                                    ctx.font = '900 20px "Inter", sans-serif';
                                    ctx.fillText('生活品質工程管理系統', 115, 52);

                                    ctx.fillStyle = '#78716c'; // Stone-500
                                    ctx.font = '800 12px "Inter", sans-serif';
                                    ctx.fillText('Quality of Life Development Corp.', 115, 75);

                                    // 3. Draw Project Details Divider
                                    ctx.strokeStyle = '#e7e5e4'; // Stone-200
                                    ctx.lineWidth = 1;
                                    ctx.beginPath();
                                    ctx.moveTo(40, 105);
                                    ctx.lineTo(width - 40, 105);
                                    ctx.stroke();

                                    // 4. Project metadata
                                    ctx.fillStyle = '#1c1917'; // Stone-900
                                    ctx.font = '900 15px "Inter", sans-serif';
                                    ctx.fillText(`案件名稱：${project.name}`, 40, 132);

                                    ctx.font = '700 12px "Inter", sans-serif';
                                    ctx.fillStyle = '#44403c'; // Stone-700
                                    ctx.fillText(`施工地址：${project.location}`, 40, 153);

                                    // 5. Draw Chart
                                    ctx.drawImage(chartImg, 0, headerHeight, width, height);

                                    // 6. Download
                                    const a = document.createElement('a');
                                    a.download = `施工進度表-${project.name}.jpg`;
                                    a.href = canvas.toDataURL('image/jpeg', 0.9);
                                    a.click();
                                  };

                                  logoImg.onload = onAllLoaded;
                                  chartImg.onload = onAllLoaded;

                                  // Set sources
                                  logoImg.src = './pwa-icon.png';
                                  const svgData = new XMLSerializer().serializeToString(svg);
                                  chartImg.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
                                } else {
                                  alert('無法找到圖表，請稍後再試');
                                }
                              }}
                              className="bg-stone-900 text-white px-3 py-1.5 rounded-xl text-[10px] font-black hover:bg-stone-700 transition-all flex items-center gap-2"
                            >
                              <DownloadCloud size={12} /> 匯出圖表
                            </button>
                          </div>
                        </div>

                        {/* List */}
                        <div className="space-y-6">
                          {project.phases.map(phase => (
                            <div key={phase.id} className="space-y-2 group">
                              {editingPhaseId === phase.id ? (
                                <div className="flex flex-col gap-2 bg-stone-50 p-3 rounded-xl border border-stone-200">
                                  <input
                                    type="text"
                                    defaultValue={phase.name}
                                    id={`edit-name-${phase.id}`}
                                    className="text-xs font-bold bg-white border border-stone-200 rounded px-2 py-1 outline-none focus:border-blue-500"
                                    placeholder="項目名稱"
                                  />
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="date"
                                      defaultValue={phase.startDate}
                                      id={`edit-start-${phase.id}`}
                                      className="text-[10px] bg-white border border-stone-200 rounded px-2 py-1 outline-none focus:border-blue-500"
                                    />
                                    <span className="text-stone-400">-</span>
                                    <input
                                      type="date"
                                      defaultValue={phase.endDate}
                                      id={`edit-end-${phase.id}`}
                                      className="text-[10px] bg-white border border-stone-200 rounded px-2 py-1 outline-none focus:border-blue-500"
                                    />
                                    <div className="flex items-center gap-1 ml-auto">
                                      <button
                                        onClick={() => {
                                          const nameInput = document.getElementById(`edit-name-${phase.id}`) as HTMLInputElement;
                                          const startInput = document.getElementById(`edit-start-${phase.id}`) as HTMLInputElement;
                                          const endInput = document.getElementById(`edit-end-${phase.id}`) as HTMLInputElement;

                                          if (nameInput.value && startInput.value && endInput.value) {
                                            onUpdatePhases(project.phases.map(p => p.id === phase.id ? {
                                              ...p,
                                              name: nameInput.value,
                                              startDate: startInput.value,
                                              endDate: endInput.value
                                            } : p));
                                            setEditingPhaseId(null);
                                          }
                                        }}
                                        className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                                      >
                                        <Check size={14} />
                                      </button>
                                      <button
                                        onClick={() => setEditingPhaseId(null)}
                                        className="p-1.5 bg-stone-100 text-stone-500 rounded-lg hover:bg-stone-200 transition-colors"
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex justify-between items-center text-xs font-bold text-stone-700">
                                  <span>{phase.name}</span>
                                  <div className="flex items-center gap-3">
                                    <span className="text-stone-400 text-[10px]">{phase.startDate} - {phase.endDate}</span>
                                    {!isReadOnly && (
                                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                          onClick={() => setEditingPhaseId(phase.id)}
                                          className="p-1.5 hover:bg-blue-50 text-blue-400 hover:text-blue-600 rounded-lg transition-all"
                                        >
                                          <Edit2 size={14} />
                                        </button>
                                        <button
                                          onClick={() => {
                                            if (confirm(`確定要刪除「${phase.name}」項目嗎？`)) {
                                              onUpdatePhases(project.phases.filter(p => p.id !== phase.id));
                                            }
                                          }}
                                          className="p-1.5 hover:bg-rose-50 text-rose-400 hover:text-rose-600 rounded-lg transition-all"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                              <div className="h-2 bg-stone-100 rounded-full overflow-hidden relative cursor-pointer" onClick={() => {
                                if (!isReadOnly && onUpdatePhases) {
                                  const newProgress = prompt('輸入新進度 (0-100):', phase.progress.toString());
                                  if (newProgress !== null) {
                                    const p = Math.min(100, Math.max(0, parseInt(newProgress) || 0));
                                    onUpdatePhases(project.phases.map(ph => ph.id === phase.id ? { ...ph, progress: p, status: p === 100 ? 'Completed' : p > 0 ? 'Current' : 'Upcoming' } : ph));
                                  }
                                }
                              }}>
                                <div className={`h-full rounded-full transition-all duration-500 ${phase.status === 'Completed' ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${phase.progress}%` }}></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="py-12 flex flex-col items-center justify-center text-stone-300 gap-3 opacity-50">
                        <CalendarDays size={32} />
                        <p className="text-[10px] font-black uppercase tracking-widest">尚無排程資料</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeView === 'map' && (
              <div className="h-full overflow-hidden">
                <MapLocation
                  address={project.location?.address || project.client || ''}
                  lat={project.location?.lat}
                  lng={project.location?.lng}
                  projectName={project.name}
                />
              </div>
            )}

            {activeView === 'photos' && (
              <div className="space-y-6 animate-in fade-in">
                {!isReadOnly && (
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-stone-50 p-6 rounded-[2rem] border border-stone-100">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isUploading ? 'bg-orange-100 text-orange-600 animate-spin' : 'bg-stone-200 text-stone-500 shadow-inner'}`}>
                        {isUploading ? <Sparkles size={20} /> : <ImageIcon size={20} />}
                      </div>
                      <div>
                        <p className="text-[11px] font-black text-stone-900 uppercase tracking-widest leading-none mb-1">{isUploading ? '正在同步至雲端...' : '專案媒體庫'}</p>
                        <p className="text-[10px] text-stone-400 font-bold">{isUploading ? '正在建立加密連結並上傳檔案' : `目前共有 ${(project.files || []).length} 個檔案`}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      <div className="relative">
                        <select
                          value={selectedUploadCategory}
                          onChange={(e) => setSelectedUploadCategory(e.target.value)}
                          className="appearance-none bg-white border border-stone-200 rounded-xl px-4 py-2 pr-10 text-[10px] font-black text-stone-700 outline-none focus:ring-2 focus:ring-orange-500/20 transition-all cursor-pointer"
                        >
                          {PHOTO_CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.label}</option>
                          ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
                          <Layers size={12} />
                        </div>
                      </div>

                      <input type="file" multiple accept="image/*,video/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 ${isUploading ? 'bg-stone-100 text-stone-400' : 'bg-orange-600 text-white hover:bg-orange-700 shadow-orange-100'}`}
                      >
                        {isUploading ? <Zap size={14} className="animate-pulse" /> : <Upload size={14} />}
                        {isUploading ? '正在上傳...' : '上傳照片'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Photo Filter Tabs */}
                <div className="flex overflow-x-auto no-scrollbar gap-2 pb-2">
                  {PHOTO_CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setCurrentPhotoFilter(cat.id)}
                      className={`shrink-0 px-4 py-2 rounded-xl text-[10px] font-black transition-all flex items-center gap-2 border ${currentPhotoFilter === cat.id
                        ? 'bg-stone-900 text-white border-stone-900 shadow-lg'
                        : 'bg-white text-stone-500 border-stone-200 hover:border-stone-300'
                        }`}
                    >
                      <cat.icon size={14} />
                      {cat.label}
                      <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[8px] ${currentPhotoFilter === cat.id ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-400'}`}>
                        {(cat.id === 'all' ? project.files || [] : (project.files || []).filter(f => f.category === cat.id)).length}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {(project.files || []).filter(f => (f.type === 'image' || f.type === 'video') && (currentPhotoFilter === 'all' || f.category === currentPhotoFilter)).map(file => (
                    <div key={file.id} className="aspect-square bg-stone-100 rounded-2xl overflow-hidden relative group border border-stone-200 shadow-sm cursor-zoom-in" onClick={() => setSelectedImage(file)}>
                      {file.type === 'video' ? (
                        <video src={file.url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" onMouseOver={e => (e.target as HTMLVideoElement).play()} onMouseOut={e => { (e.target as HTMLVideoElement).pause(); (e.target as HTMLVideoElement).currentTime = 0; }} muted loop />
                      ) : (
                        <img src={file.url} alt={file.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      )}

                      {file.type === 'video' && (
                        <div className="absolute top-2 left-2 bg-stone-900/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[8px] text-white font-black flex items-center gap-1">
                          <Zap size={8} /> VIDEO
                        </div>
                      )}

                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-white text-[10px] font-bold truncate">{file.name}</p>
                        <p className="text-white/60 text-[9px]">{new Date(file.uploadedAt).toLocaleDateString()}</p>
                      </div>
                      {!isReadOnly && onUpdateFiles && (
                        <button onClick={(e) => { e.stopPropagation(); if (confirm('刪除此檔案？')) onUpdateFiles(project.files!.filter(f => f.id !== file.id)); }} className="absolute top-2 right-2 p-1.5 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-rose-500 transition-colors opacity-0 group-hover:opacity-100">
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                  {!isUploading && (project.files || []).filter(f => (f.type === 'image' || f.type === 'video') && (currentPhotoFilter === 'all' || f.category === currentPhotoFilter)).length === 0 && (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center text-stone-300 gap-4 opacity-50">
                      <ImageIcon size={48} />
                      <p className="text-[10px] font-black uppercase tracking-widest">照片庫是空的</p>
                    </div>
                  )}

                  {isUploading && (
                    <div className="aspect-square bg-stone-50 rounded-2xl border-2 border-dashed border-stone-200 flex flex-col items-center justify-center gap-2 animate-pulse">
                      <Upload size={24} className="text-stone-300" />
                      <span className="text-[8px] font-black text-stone-400 uppercase tracking-widest">同步中...</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox / Media Preview Modal */}
      {
        selectedImage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-12 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
            <button onClick={() => setSelectedImage(null)} className="absolute top-8 right-8 text-white/40 hover:text-white transition-colors z-[110] bg-white/10 p-3 rounded-full hover:bg-white/20">
              <X size={32} />
            </button>

            <div className="relative w-full h-full flex flex-col items-center justify-center animate-in zoom-in-95 duration-300">
              <div className="flex-1 w-full flex items-center justify-center min-h-0">
                {selectedImage.type === 'video' ? (
                  <video src={selectedImage.url} className="max-w-full max-h-full rounded-2xl shadow-2xl" controls autoPlay />
                ) : (
                  <img src={selectedImage.url} alt={selectedImage.name} className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" />
                )}
              </div>

              <div className="mt-8 text-center space-y-2">
                <h3 className="text-white text-lg font-black tracking-tight">{selectedImage.name}</h3>
                <div className="flex items-center justify-center gap-4">
                  <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">{new Date(selectedImage.uploadedAt).toLocaleString()}</p>
                  <span className="w-1 h-1 bg-white/20 rounded-full" />
                  <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">上傳者: {selectedImage.uploadedBy}</p>
                  <span className="w-1 h-1 bg-white/20 rounded-full" />
                  <p className="text-orange-500 text-[10px] font-black uppercase tracking-widest">{PHOTO_CATEGORIES.find(c => c.id === selectedImage.category)?.label || '未分類'}</p>
                </div>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default ProjectDetail;
