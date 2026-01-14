
import React, { useState, useMemo, useRef } from 'react';
import {
  ArrowLeft, CheckCircle2, Clock, DollarSign, Pencil, Sparkles, Trash2, Activity,
  MessageSquare, Send, Receipt, X, ZoomIn, FileText, ImageIcon, Upload, MapPin,
  Navigation, ShoppingBag, Utensils, Building2, ExternalLink, CalendarDays, Loader2, Check, DownloadCloud, ShieldAlert,
  Layers, Camera, HardHat, CheckCircle, ShieldCheck, Edit2, Wrench, ClipboardList, Construction, FileImage, Zap, Lock, ChevronDown,
  ChevronLeft, ChevronRight, Plus, Minus, ZoomOut, AlertTriangle, Wallet
} from 'lucide-react';
import { Project, ProjectStatus, Task, ProjectComment, Expense, WorkAssignment, TeamMember, ProjectFile, ProjectPhase, User, ChecklistTask, PaymentStage } from '../types';
import { suggestProjectSchedule, searchNearbyResources, analyzeProjectFinancials, parseScheduleFromImage, generatePreConstructionPrep, scanReceipt, analyzeQuotationItems } from '../services/geminiService';
import GanttChart from './GanttChart';
import MapLocation from './MapLocation';
import DefectImprovement from './DefectImprovement';
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
  onDeleteComment: (commentId: string) => void;
  onUpdateExpenses: (expenses: Expense[]) => void;
  onUpdateWorkAssignments: (assignments: WorkAssignment[]) => void;
  onUpdatePreConstruction: (prep: any) => void;
  onUpdateFiles?: (files: ProjectFile[]) => void;
  onUpdatePhases?: (phases: ProjectPhase[]) => void;
  onAddDailyLog: (log: { content: string, photoUrls: string[] }) => void;
  onDeleteDailyLog: (logId: string) => void;
  onUpdateChecklist: (checklist: ChecklistTask[]) => void;
  onUpdatePayments: (payments: PaymentStage[]) => void;
  onUpdateContractUrl: (url: string) => void;
  onUpdateDefectRecords: (records: any[]) => void;
}

const ProjectDetail: React.FC<ProjectDetailProps> = (props) => {
  const {
    project, user, teamMembers, onBack, onEdit, onDelete, onLossClick,
    onUpdateTasks, onUpdateProgress, onUpdateStatus, onAddComment, onDeleteComment,
    onUpdateExpenses, onUpdateWorkAssignments, onUpdateFiles, onUpdatePhases,
    onAddDailyLog, onDeleteDailyLog, onUpdateChecklist, onUpdatePayments, onUpdateContractUrl,
    onUpdateDefectRecords
  } = props;
  const [newComment, setNewComment] = useState('');
  const [activeView, setActiveView] = useState<'tasks' | 'financials' | 'logs' | 'photos' | 'schedule' | 'map' | 'inspection' | 'prep' | 'defects'>('logs');
  const [selectedImage, setSelectedImage] = useState<ProjectFile | null>(null);
  const [isReportMode, setIsReportMode] = useState(false);
  const [isCompletionReportMode, setIsCompletionReportMode] = useState(false);
  const [isAIScheduling, setIsAIScheduling] = useState(false);
  const [isSearchingNearby, setIsSearchingNearby] = useState(false);
  const [nearbyResults, setNearbyResults] = useState<{ text: string, links: any[] } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedUploadCategory, setSelectedUploadCategory] = useState('survey');
  const [currentPhotoFilter, setCurrentPhotoFilter] = useState('all');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const lastPinchDistRef = useRef<number | null>(null);

  const currentFilteredFiles = useMemo(() => {
    return (project.files || []).filter(f =>
      (f.type === 'image' || f.type === 'video') &&
      (currentPhotoFilter === 'all' || f.category === currentPhotoFilter)
    );
  }, [project.files, currentPhotoFilter]);

  const scopeDrawingFiles = useMemo(() => {
    const urls = [
      ...(project.preConstruction?.scopeDrawingUrl ? [project.preConstruction.scopeDrawingUrl] : []),
      ...(project.preConstruction?.scopeDrawings || [])
    ];
    return urls.map((url, idx) => ({
      id: `scope-${idx}`,
      url: String(url),
      name: `施工範圍圖 (${idx + 1})`,
      category: '施工範圍圖',
      type: 'image',
      uploadedAt: project.preConstruction?.updatedAt,
      uploadedBy: 'System'
    } as ProjectFile));
  }, [project.preConstruction]);

  const navigationList = useMemo(() => {
    if (selectedImage?.category === '施工範圍圖') return scopeDrawingFiles;
    return currentFilteredFiles;
  }, [selectedImage, scopeDrawingFiles, currentFilteredFiles]);

  const handleNextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!selectedImage) return;
    const currentIndex = navigationList.findIndex(f => f.id === selectedImage.id || f.url === selectedImage.url);
    if (currentIndex !== -1 && currentIndex < navigationList.length - 1) {
      setSelectedImage(navigationList[currentIndex + 1]);
      setZoomLevel(1);
      setPosition({ x: 0, y: 0 });
    }
  };

  const handlePrevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!selectedImage) return;
    const currentIndex = navigationList.findIndex(f => f.id === selectedImage.id || f.url === selectedImage.url);
    if (currentIndex > 0) {
      setSelectedImage(navigationList[currentIndex - 1]);
      setZoomLevel(1);
      setPosition({ x: 0, y: 0 });
    }
  };

  const handleZoomIn = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setZoomLevel(prev => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setZoomLevel(prev => {
      const newZoom = Math.max(prev - 0.5, 1);
      if (newZoom === 1) setPosition({ x: 0, y: 0 });
      return newZoom;
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      e.preventDefault();
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoomLevel > 1) {
      e.preventDefault();
      setPosition({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && zoomLevel > 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      dragStartRef.current = { x: touch.clientX - position.x, y: touch.clientY - position.y };
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      lastPinchDistRef.current = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging && zoomLevel > 1) {
      const touch = e.touches[0];
      setPosition({
        x: touch.clientX - dragStartRef.current.x,
        y: touch.clientY - dragStartRef.current.y
      });
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );

      if (lastPinchDistRef.current !== null) {
        const delta = dist - lastPinchDistRef.current;
        const ZOOM_SPEED = 0.01;
        setZoomLevel(prev => {
          const newZoom = Math.min(Math.max(prev + delta * ZOOM_SPEED, 1), 5);
          if (newZoom === 1) setPosition({ x: 0, y: 0 });
          return newZoom;
        });
      }
      lastPinchDistRef.current = dist;
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    lastPinchDistRef.current = null;
  };

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedImage) return;
      if (e.key === 'ArrowRight') handleNextImage();
      if (e.key === 'ArrowLeft') handlePrevImage();
      if (e.key === 'Escape') setSelectedImage(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImage, currentFilteredFiles]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scheduleFileInputRef = useRef<HTMLInputElement>(null);
  const scopeDrawingInputRef = useRef<HTMLInputElement>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);
  const quotationInputRef = useRef<HTMLInputElement>(null);
  const [isGeneratingPrep, setIsGeneratingPrep] = useState(false);
  const [isScanningReceipt, setIsScanningReceipt] = useState(false);
  const [isAnalyzingQuotation, setIsAnalyzingQuotation] = useState(false);
  const [isMandatoryUploadOpen, setIsMandatoryUploadOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<ProjectStatus | null>(null);
  const contractFileInputRef = useRef<HTMLInputElement>(null);
  const headerContractInputRef = useRef<HTMLInputElement>(null);

  // Schedule Options State
  const [scheduleStartDate, setScheduleStartDate] = useState(project.startDate || new Date().toISOString().split('T')[0]);
  const [workOnHolidays, setWorkOnHolidays] = useState(false);
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);

  const [isAnalyzingFinancials, setIsAnalyzingFinancials] = useState(false);
  const [financialAnalysis, setFinancialAnalysis] = useState<string | null>(null);
  const [isLaborDetailsExpanded, setIsLaborDetailsExpanded] = useState(false); // 派工明細展開狀態
  const [editingAssignment, setEditingAssignment] = useState<WorkAssignment | null>(null); // 編輯中的派工
  const [expandedExpenseCategory, setExpandedExpenseCategory] = useState<string | null>(null);


  // Daily Log Upload State
  const [logContent, setLogContent] = useState('');
  const [logPhotos, setLogPhotos] = useState<string[]>([]);
  const [isUploadingLog, setIsUploadingLog] = useState(false);
  const logFileInputRef = useRef<HTMLInputElement>(null);

  const handleDeleteAssignment = (assignmentId: string) => {
    if (window.confirm('確定要刪除這筆派工紀錄嗎？此動作無法復原。')) {
      const newAssignments = (project.workAssignments || []).filter(a => a.id !== assignmentId);
      props.onUpdateWorkAssignments(newAssignments);
    }
  };

  const handleSaveAssignment = (updated: WorkAssignment) => {
    const newAssignments = (project.workAssignments || []).map(a =>
      a.id === updated.id ? { ...updated, totalCost: Number(updated.wagePerDay) * Number(updated.days) } : a
    );
    props.onUpdateWorkAssignments(newAssignments);
    setEditingAssignment(null);
  };

  const handleLogPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    setIsUploadingLog(true);
    const files = Array.from(e.target.files);
    const newWorkerPhotoUrls: string[] = [];

    try {
      for (const file of files) {
        const result = await cloudFileService.uploadFile(file);
        if (result && result.url) {
          newWorkerPhotoUrls.push(result.url);
        }
      }
      setLogPhotos(prev => [...prev, ...newWorkerPhotoUrls]);
    } catch (err) {
      console.error('上傳失敗:', err);
      alert('照片上傳失敗，請稍後再試');
    } finally {
      setIsUploadingLog(false);
      if (logFileInputRef.current) logFileInputRef.current.value = '';
    }
  };

  // Local state for Pre-construction Prep to ensure smooth typing
  const [localMaterials, setLocalMaterials] = useState(project.preConstruction?.materialsAndTools || '');
  const [localNotice, setLocalNotice] = useState(project.preConstruction?.notice || '');

  React.useEffect(() => {
    setLocalMaterials(project.preConstruction?.materialsAndTools || '');
    setLocalNotice(project.preConstruction?.notice || '');
  }, [project.id, project.updatedAt]);

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

  const handleAIFromContract = async () => {
    if (!project.contractUrl) return;
    setIsAIScheduling(true);
    try {
      const resp = await fetch(project.contractUrl);
      const blob = await resp.blob();
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        try {
          const newPhases = await parseScheduleFromImage(base64, scheduleStartDate, workOnHolidays);
          if (newPhases && newPhases.length > 0) {
            const phasesWithIds = newPhases.map((p: any) => ({
              ...p,
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
            }));
            if (onUpdatePhases) onUpdatePhases([...(project.phases || []), ...phasesWithIds]);
            alert(`已根據合約成功產生 ${newPhases.length} 個排程項目！`);
          }
        } catch (err) {
          alert('AI 解析失敗');
        } finally {
          setIsAIScheduling(false);
        }
      };
      reader.readAsDataURL(blob);
    } catch (e) {
      console.error(e);
      alert('無法讀取文件，請嘗試重新上傳或手動上傳。');
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
    <div className="flex flex-col lg:h-full animate-in slide-in-from-right-4 duration-500 lg:overflow-hidden relative">
      {isReadOnly && (
        <div className="bg-amber-500 text-white px-8 py-2 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 z-[60] shadow-sm">
          <ShieldAlert size={14} /> 您目前以訪客模式登入，僅供檢視，無法修改資料。
        </div>
      )}
      {/* 固定標頭資訊 */}
      <div className="p-4 lg:p-8 space-y-4 shrink-0 bg-white/50 border-b border-stone-100">
        <div className="flex justify-between items-center no-print">
          <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold text-sm">
            <ArrowLeft size={16} /> <span className="hidden sm:inline">返回</span>
          </button>
          <div className="flex gap-2 overflow-x-auto no-scrollbar desktop-scrollbar touch-scroll sm:overflow-visible pb-1 sm:pb-0">
            {!isReadOnly && (
              <div className="flex gap-2 whitespace-nowrap">
                <button onClick={() => setIsReportMode(true)} className="flex items-center gap-2 bg-white border border-blue-200 text-blue-600 px-3 py-1.5 rounded-xl text-[10px] font-black shrink-0"><FileText size={14} /> 績效報表</button>
                <button onClick={() => setIsCompletionReportMode(true)} className="flex items-center gap-2 bg-white border border-emerald-200 text-emerald-600 px-3 py-1.5 rounded-xl text-[10px] font-black shrink-0"><CheckCircle size={14} /> 完工報告書</button>
                <button onClick={() => onEdit(project)} className="bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-[10px] font-black shrink-0"><Pencil size={14} /> 編輯</button>
              </div>
            )}
            {isReadOnly && (
              <div className="flex items-center gap-2 bg-stone-100 text-stone-400 px-3 py-1.5 rounded-xl text-[10px] font-black border border-stone-200 whitespace-nowrap shrink-0">
                <ShieldAlert size={14} /> 訪客唯讀權限
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="bg-slate-900 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase">{project.id}</span>
              <span className="bg-blue-50 text-blue-600 text-[9px] font-black px-1.5 py-0.5 rounded border border-blue-100 uppercase">{project.category}</span>
              {project.contractUrl && (
                <span className="bg-emerald-50 text-emerald-600 text-[9px] font-black px-1.5 py-0.5 rounded border border-emerald-100 uppercase flex items-center gap-1">
                  <ShieldCheck size={10} /> 已簽約
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight tracking-tight">{project.name}</h1>
            <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500 font-bold uppercase">
              <span className="flex items-center gap-1"><MapPin size={12} className="text-slate-400" /> {project.location?.address || '無地址'}</span>
              <span className="bg-stone-100 px-2 py-0.5 rounded-full">負責人：{project.quotationManager || '未指定'}</span>
              <div className="flex items-center gap-1">
                <Activity size={12} />
                <select
                  disabled={isReadOnly}
                  className={`bg-transparent outline-none appearance-none text-blue-600 font-black ${isReadOnly ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                  value={project.status}
                  onChange={(e) => {
                    const newStatus = e.target.value as ProjectStatus;
                    if (newStatus === ProjectStatus.SIGNED_WAITING_WORK && !project.contractUrl) {
                      setPendingStatus(newStatus);
                      setIsMandatoryUploadOpen(true);
                    } else {
                      onUpdateStatus(newStatus);
                    }
                  }}
                >
                  {statusOptions.map(opt => <option key={opt} value={opt} className="text-black font-bold">{opt}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Import/View Contract Button */}
          <div className="shrink-0">
            {project.contractUrl ? (
              <a
                href={project.contractUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-emerald-50 text-emerald-600 border border-emerald-200 px-4 py-2.5 rounded-xl font-black text-[11px] hover:bg-emerald-100 transition-colors shadow-sm"
              >
                <FileText size={16} />
                <span>查看報價單/合約</span>
                <ExternalLink size={12} />
              </a>
            ) : (
              !isReadOnly && (
                <>
                  <input
                    type="file"
                    className="hidden"
                    ref={headerContractInputRef}
                    accept="application/pdf,image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      try {
                        const result = await cloudFileService.uploadFile(file);
                        if (result && result.url) {
                          onUpdateContractUrl(result.url);
                          // Also try to analyze schedule automatically if it's an image
                          if (file.type.startsWith('image/')) {
                            // Optional: Trigger analysis or prompt user
                          }
                          alert('檔案上傳成功！');
                        }
                      } catch (err) {
                        console.error('上傳失敗', err);
                        alert('上傳失敗，請重試');
                      } finally {
                        if (headerContractInputRef.current) headerContractInputRef.current.value = '';
                      }
                    }}
                  />
                  <button
                    onClick={() => headerContractInputRef.current?.click()}
                    className="flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-2xl font-black text-[11px] hover:bg-slate-800 transition-all active:scale-95 shadow-md hover:shadow-lg"
                  >
                    <Upload size={16} />
                    <span>匯入報價單或合約</span>
                  </button>
                </>
              )
            )}
          </div>
        </div>
      </div>

      {/* 導覽標籤列 */}
      <div className="px-0 sm:px-4 py-3 bg-white border-b border-stone-100 shrink-0 no-print relative">
        <div className="flex gap-2 overflow-x-auto no-scrollbar desktop-scrollbar touch-scroll pb-1 px-4 sm:px-0 flex-nowrap w-full">
          {[
            { id: 'logs', label: '討論區', icon: MessageSquare },
            { id: 'inspection', label: 'AI 會勘', icon: Sparkles },
            { id: 'tasks', label: '待辦任務', icon: CheckCircle2 },
            { id: 'schedule', label: '施工排程', icon: CalendarDays },
            { id: 'financials', label: '帳務管理', icon: DollarSign },
            { id: 'prep', label: '施工前準備', icon: Construction },
            { id: 'map', label: '案場定位', icon: Navigation },
            { id: 'photos', label: '照片庫', icon: ImageIcon },
            { id: 'defects', label: '缺失改善', icon: AlertTriangle }
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
                  [...project.dailyLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((log, idx) => (
                    <div key={log.id} className="relative pl-8 group">
                      {/* Timeline Line */}
                      <div className="absolute left-[11px] top-2 bottom-0 w-0.5 bg-stone-100 group-last:bg-transparent"></div>
                      {/* Timeline Dot */}
                      <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full border-4 border-white bg-orange-500 shadow-sm z-10 transition-transform group-hover:scale-110"></div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-stone-900">
                              {log.date ? new Date(log.date).toLocaleString('zh-TW', { hour12: false }) : '無日期'}
                            </span>
                            <span className="text-[10px] bg-stone-100 px-2 py-0.5 rounded-full font-bold text-stone-500 uppercase">{log.authorName}</span>
                          </div>
                          {!isReadOnly && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('確定要刪除這條紀錄嗎？')) {
                                  onDeleteDailyLog(log.id);
                                }
                              }}
                              className="p-1.5 text-stone-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
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
                    if (!logContent.trim()) return;
                    onAddDailyLog({ content: logContent, photoUrls: logPhotos });
                    setLogContent('');
                    setLogPhotos([]);
                  }} className="space-y-4">
                    <textarea
                      value={logContent}
                      onChange={(e) => setLogContent(e.target.value)}
                      required
                      placeholder="輸入討論內容或紀錄..."
                      className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3 text-xs font-bold text-stone-900 outline-none focus:ring-2 focus:ring-blue-600/20 placeholder:text-stone-300 resize-none h-32"
                    ></textarea>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest ml-1">現場照片 (可多選)</label>
                        <span className="text-[9px] text-stone-400">{logPhotos.length} 張照片</span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {logPhotos.map((url, idx) => (
                          <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-stone-200 group">
                            <img src={url} alt={`Photo ${idx}`} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setLogPhotos(prev => prev.filter((_, i) => i !== idx))}
                              className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => logFileInputRef.current?.click()}
                          disabled={isUploadingLog}
                          className="w-16 h-16 rounded-lg border-2 border-dashed border-stone-200 flex flex-col items-center justify-center gap-1 text-stone-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all disabled:opacity-50"
                        >
                          {isUploadingLog ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
                          <span className="text-[9px] font-bold">{isUploadingLog ? '上傳中' : '新增'}</span>
                        </button>
                      </div>
                      <input
                        type="file"
                        ref={logFileInputRef}
                        className="hidden"
                        accept="image/*"
                        multiple
                        onChange={handleLogPhotoUpload}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isUploadingLog || !logContent.trim()}
                      className="w-full py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-stone-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUploadingLog ? '照片上傳中...' : '提交內容'}
                    </button>
                  </form>
                </div>
              )}


            </div>
          </div>
        )}



        {
          activeView === 'defects' && (
            <div className="lg:h-full lg:overflow-hidden animate-in fade-in">
              <DefectImprovement project={project} onUpdate={onUpdateDefectRecords} isReadOnly={isReadOnly} />
            </div>
          )
        }

        {
          activeView !== 'logs' && (
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
                        <p className="text-2xl font-black text-stone-900 tracking-tight">NT$ {(project.budget || 0).toLocaleString()}</p>
                        <p className="text-[11px] font-bold text-stone-400 mt-1">專案總預算</p>
                      </div>

                      <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><HardHat size={20} /></div>
                          <span className="text-[10px] font-black text-stone-300 uppercase tracking-widest">LABOR COST</span>
                        </div>
                        <p className="text-2xl font-black text-stone-900 tracking-tight">
                          NT$ {((project.workAssignments || []).reduce((acc, curr) => acc + (curr?.totalCost || 0), 0) || 0).toLocaleString()}
                        </p>
                        <p className="text-[11px] font-bold text-stone-400 mt-1">累積施工成本 (自動計算)</p>


                        {/* 派工明細表 - 可折疊 */}
                        {(project.workAssignments || []).length > 0 && (
                          <>
                            <button
                              onClick={() => setIsLaborDetailsExpanded(!isLaborDetailsExpanded)}
                              className="w-full mt-4 pt-4 border-t border-stone-100 flex items-center justify-between hover:bg-stone-50 -mx-2 px-2 py-2 rounded-xl transition-colors"
                            >
                              <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest">
                                派工明細 ({(project.workAssignments || []).length} 筆)
                              </p>
                              <ChevronDown
                                size={16}
                                className={`text-stone-400 transition-transform ${isLaborDetailsExpanded ? 'rotate-180' : ''}`}
                              />
                            </button>

                            {isLaborDetailsExpanded && (
                              <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar mt-3 animate-in slide-in-from-top-2 duration-200">
                                {(project.workAssignments || []).map((assignment, idx) => (
                                  <div key={assignment.id || idx} className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-100">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <p className="text-xs font-black text-stone-900 truncate">{assignment.memberName}</p>
                                        {assignment.isSpiderMan && (
                                          <span className="text-[7px] font-black text-blue-600 bg-blue-50 px-1 py-0.5 rounded border border-blue-100 flex-shrink-0">🕷️</span>
                                        )}
                                      </div>
                                      <p className="text-[9px] text-stone-400 font-medium">{assignment.date}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0 ml-2">
                                      <p className="text-xs font-black text-stone-900">NT$ {(assignment.totalCost || 0).toLocaleString()}</p>
                                      <p className="text-[8px] text-stone-400 font-medium">{assignment.wagePerDay}元 × {assignment.days}天</p>
                                    </div>
                                    <div className="flex items-center gap-1 ml-2 pl-2 border-l border-stone-100">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setEditingAssignment(assignment); }}
                                        className="p-1.5 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="編輯"
                                      >
                                        <Pencil size={12} />
                                      </button>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteAssignment(assignment.id); }}
                                        className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="刪除"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {[
                        { label: '委託工程 (分包)', key: '委託工程', icon: Building2, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
                        { label: '機具材料', key: '機具材料', icon: ShoppingBag, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
                        { label: '零用金雜支', key: '零用金', icon: Wallet, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-100' },
                      ].map(cat => {
                        const catExpenses = (project.expenses || []).filter(e => e.category === cat.key);
                        const amount = catExpenses.reduce((acc, curr) => acc + (curr?.amount || 0), 0);
                        const Icon = cat.icon;
                        const isExpanded = expandedExpenseCategory === cat.key;

                        return (
                          <div key={cat.label} className={`bg-white p-6 rounded-3xl border shadow-sm transition-all duration-300 ${isExpanded ? `${cat.border} ring-2 ring-blue-500/10` : 'border-stone-100'}`}>
                            <div className="flex justify-between items-start mb-4 cursor-pointer" onClick={() => setExpandedExpenseCategory(isExpanded ? null : cat.key)}>
                              <div className={`p-3 ${cat.bg} ${cat.color} rounded-2xl`}><Icon size={20} /></div>
                              <span className="text-[10px] font-black text-stone-300 uppercase tracking-widest flex items-center gap-1">
                                EXPENSE {isExpanded ? <ChevronDown size={12} className="rotate-180" /> : <ChevronDown size={12} />}
                              </span>
                            </div>
                            <div className="cursor-pointer" onClick={() => setExpandedExpenseCategory(isExpanded ? null : cat.key)}>
                              <p className="text-2xl font-black text-stone-900 tracking-tight">NT$ {(amount || 0).toLocaleString()}</p>
                              <p className="text-[11px] font-bold text-stone-400 mt-1">{cat.label} <span className="text-[9px] ml-1 opacity-50">({catExpenses.length} 筆)</span></p>
                            </div>

                            {/* 明細展開 */}
                            {isExpanded && (
                              <div className="mt-4 pt-4 border-t border-dashed border-stone-200 animate-in slide-in-from-top-2">
                                <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
                                  {catExpenses.length > 0 ? (
                                    catExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((exp, idx) => (
                                      <div key={exp.id || idx} className="flex flex-col gap-1 p-2 rounded-lg hover:bg-stone-50 transition-colors">
                                        <div className="flex justify-between items-center">
                                          <span className="text-[10px] font-black text-stone-700 truncate max-w-[60%]">{exp.name}</span>
                                          <span className="text-[10px] font-black text-stone-900">NT$ {exp.amount.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-[9px] text-stone-400">
                                          <span>{exp.date} {exp.supplier ? `· ${exp.supplier}` : ''}</span>
                                          {!isReadOnly && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm('確定刪除此筆支出？')) {
                                                  const newExpenses = (project.expenses || []).filter(e => e.id !== exp.id);
                                                  const newExpTotal = newExpenses.reduce((sum, e) => sum + e.amount, 0);
                                                  const currentLabor = (project.workAssignments || []).reduce((acc, curr) => acc + curr.totalCost, 0);
                                                  onUpdateExpenses(newExpenses, newExpTotal + currentLabor);
                                                }
                                              }}
                                              className="hover:text-rose-500"
                                            >
                                              <Trash2 size={10} />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-center py-2 text-[10px] text-stone-300">尚無明細資料</div>
                                  )}
                                </div>
                                <button
                                  onClick={() => {
                                    setExpenseFormData({ ...expenseFormData, category: cat.key as any });
                                    setIsAddingExpense(true);
                                  }}
                                  className="w-full mt-2 py-2 text-[10px] font-bold text-stone-400 border border-dashed border-stone-200 rounded-xl hover:bg-stone-50 hover:text-stone-600 transition-colors"
                                >
                                  + 新增{cat.label.split(' ')[0]}
                                </button>
                              </div>
                            )}
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
                          NT$ {(Math.abs(profit) || 0).toLocaleString()}
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
                                <td className="px-6 py-4 text-xs font-black text-stone-900 text-right">NT$ {(p.amount || 0).toLocaleString()}</td>
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
                        <div className="flex gap-2">
                          {!isReadOnly && (
                            <>
                              <input
                                type="file"
                                className="hidden"
                                ref={quotationInputRef}
                                accept="image/*"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    setIsAnalyzingQuotation(true);
                                    const reader = new FileReader();
                                    reader.onload = async (event) => {
                                      try {
                                        const base64 = (event.target?.result as string).split(',')[1];
                                        const items = await analyzeQuotationItems(base64);
                                        if (items && items.length > 0) {
                                          const newExpenses = items.map((item: any) => ({
                                            id: `EXP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                            date: new Date().toISOString().split('T')[0],
                                            category: item.category || '機具材料',
                                            status: '尚未請款',
                                            name: item.name,
                                            amount: 0, // Explicitly 0 as requested
                                            supplier: item.supplier || '',
                                            note: '來自報價單分析'
                                          }));
                                          onUpdateExpenses([...(project.expenses || []), ...newExpenses]);
                                          alert(`✅ 成功匯入 ${items.length} 筆項目！請記得補填金額。`);
                                        } else {
                                          alert('無法識別項目，請確認圖片清晰度。');
                                        }
                                      } catch (err) {
                                        console.error(err);
                                        alert('分析失敗，請稍後再試');
                                      } finally {
                                        setIsAnalyzingQuotation(false);
                                        if (quotationInputRef.current) quotationInputRef.current.value = '';
                                      }
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                              <button
                                onClick={() => quotationInputRef.current?.click()}
                                disabled={isAnalyzingQuotation}
                                className="bg-white border border-stone-200 text-stone-600 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-stone-50 transition-all flex items-center gap-2"
                              >
                                {isAnalyzingQuotation ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
                                {isAnalyzingQuotation ? '分析中...' : '匯入報價單'}
                              </button>
                              <button
                                onClick={() => setIsAddingExpense(true)}
                                className="bg-stone-900 text-white px-3 py-1.5 rounded-xl text-[10px] font-black hover:bg-stone-800 transition-all active:scale-95"
                              >
                                + 新增支出
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {isAddingExpense && (
                        <div className="p-6 bg-stone-50 border-b border-stone-100 space-y-4 animate-in slide-in-from-top-2">
                          <div className="flex justify-center mb-4">
                            <input
                              type="file"
                              className="hidden"
                              ref={receiptInputRef}
                              accept="image/*"
                              capture="environment"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setIsScanningReceipt(true);
                                  const reader = new FileReader();
                                  reader.onload = async (event) => {
                                    try {
                                      const base64 = (event.target?.result as string).split(',')[1];
                                      const result = await scanReceipt(base64);
                                      if (result) {
                                        setExpenseFormData({
                                          ...expenseFormData,
                                          ...result,
                                          amount: Number(result.amount) || 0
                                        });
                                      }
                                    } catch (err: any) {
                                      console.error('收據辨識錯誤:', err);
                                      alert(`辨識失敗: ${err.message || '請確認網路連線或稍後再試'}`);
                                    } finally {
                                      setIsScanningReceipt(false);
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => receiptInputRef.current?.click()}
                              disabled={isScanningReceipt}
                              className="bg-white border-2 border-dashed border-stone-200 text-stone-600 px-6 py-4 rounded-2xl text-[11px] font-black flex flex-col items-center gap-2 hover:bg-stone-100 hover:border-stone-400 transition-all w-full"
                            >
                              {isScanningReceipt ? <Loader2 size={24} className="animate-spin text-orange-600" /> : <Camera size={24} className="text-stone-400" />}
                              {isScanningReceipt ? 'AI 正在分析收據...' : '點擊此處上傳發票/收據照片，AI 自動填表'}
                            </button>
                          </div>

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
                            {(project.expenses || []).length > 0 ? [...(project.expenses || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((exp) => (
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
                                <td className="px-6 py-4 text-xs font-black text-stone-900 text-right">NT$ {(exp.amount || 0).toLocaleString()}</td>
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
                              {project.contractUrl ? (
                                <button
                                  onClick={handleAIFromContract}
                                  disabled={isAIScheduling}
                                  className="bg-blue-600 text-white px-3 py-1.5 rounded-xl text-[10px] font-black hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-100"
                                >
                                  {isAIScheduling ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                  使用已上傳合約 (AI排程)
                                </button>
                              ) : (
                                <button
                                  onClick={() => scheduleFileInputRef.current?.click()}
                                  disabled={isAIScheduling || isReadOnly}
                                  className="bg-stone-100 text-stone-600 px-3 py-1.5 rounded-xl text-[10px] font-black hover:bg-stone-200 transition-all flex items-center gap-2"
                                >
                                  <Upload size={12} /> 上傳合約/報價單 (AI排程)
                                </button>
                              )}
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
                                    // A4 Landscape dimensions at 200+ DPI
                                    const A4_WIDTH = 2480;
                                    const A4_HEIGHT = 1754;
                                    const MARGIN = 80;

                                    const canvas = document.createElement('canvas');
                                    const ctx = canvas.getContext('2d');
                                    if (!ctx) return;

                                    canvas.width = A4_WIDTH;
                                    canvas.height = A4_HEIGHT;

                                    // Background
                                    ctx.fillStyle = 'white';
                                    ctx.fillRect(0, 0, A4_WIDTH, A4_HEIGHT);

                                    const logoImg = new Image();
                                    const chartImg = new Image();
                                    let loadedCount = 0;

                                    const onAllLoaded = () => {
                                      loadedCount++;
                                      if (loadedCount < 2) return;

                                      // 1. Draw Logo
                                      const logoSize = 120;
                                      ctx.drawImage(logoImg, MARGIN, 80, logoSize, logoSize);

                                      // 2. Draw Company Info
                                      ctx.fillStyle = '#1c1917'; // Stone-900 (Black)
                                      ctx.font = '900 48px "Inter", sans-serif';
                                      const zhName = '台灣生活品質發展股份有限公司';
                                      ctx.fillText(zhName, MARGIN + 160, 135);

                                      // Measure Chinese width to align English name
                                      const zhWidth = ctx.measureText(zhName).width;

                                      ctx.fillStyle = '#78716c'; // Stone-500
                                      ctx.font = '800 28px "Inter", sans-serif';
                                      ctx.fillText('Quality of Life Development Corp. Taiwan', MARGIN + 160, 180, zhWidth);

                                      // 3. Draw Project Details Divider
                                      ctx.strokeStyle = '#e7e5e4'; // Stone-200
                                      ctx.lineWidth = 2;
                                      ctx.beginPath();
                                      ctx.moveTo(MARGIN, 240);
                                      ctx.lineTo(A4_WIDTH - MARGIN, 240);
                                      ctx.stroke();

                                      // 4. Project metadata
                                      ctx.fillStyle = '#1c1917'; // Stone-900
                                      ctx.font = '900 36px "Inter", sans-serif';
                                      ctx.fillText(`案件名稱：${project.name}`, MARGIN, 305);

                                      ctx.font = '700 24px "Inter", sans-serif';
                                      ctx.fillStyle = '#44403c'; // Stone-700
                                      ctx.fillText(`工程編號：${project.id}`, MARGIN, 345);
                                      ctx.fillText(`施工地址：${project.location?.address || '未提供地址'}`, MARGIN, 385);

                                      const chartAreaTop = 440; // Shift down slightly
                                      const availableHeight = A4_HEIGHT - chartAreaTop - MARGIN;
                                      const availableWidth = A4_WIDTH - (MARGIN * 2);

                                      // 5. Calculate Scale to fit A4
                                      const { width: svgW, height: svgH } = svg.getBoundingClientRect();
                                      const scaleX = availableWidth / svgW;
                                      const scaleY = availableHeight / svgH;
                                      const scale = Math.min(scaleX, scaleY, 2.5); // Cap scale to prevent blur

                                      const drawW = svgW * scale;
                                      const drawH = svgH * scale;
                                      const xOffset = MARGIN;

                                      ctx.drawImage(chartImg, xOffset, chartAreaTop, drawW, drawH);

                                      // 6. Footer (Page Info)
                                      ctx.fillStyle = '#a8a29e';
                                      ctx.font = '600 18px "Inter", sans-serif';
                                      ctx.textAlign = 'right';
                                      ctx.fillText(`產出日期：${new Date().toLocaleDateString()}`, A4_WIDTH - MARGIN, A4_HEIGHT - MARGIN / 2);

                                      // 7. Download
                                      const a = document.createElement('a');
                                      a.download = `施工進度表-${project.name}.jpg`;
                                      a.href = canvas.toDataURL('image/jpeg', 0.95);
                                      a.click();
                                    };

                                    logoImg.onload = onAllLoaded;
                                    chartImg.onload = onAllLoaded;
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

              {activeView === 'prep' && (
                <div className="p-4 lg:p-8 space-y-6 animate-in fade-in lg:overflow-y-auto no-scrollbar">
                  <div className="flex justify-between items-center sm:bg-white/50 sm:p-4 sm:rounded-2xl">
                    <div>
                      <h2 className="text-xl font-black text-stone-900 leading-none mb-1">施工前準備事項</h2>
                      <div className="flex items-center gap-3">
                        <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">材料核對 / 施工公告 / 範圍圖面</p>
                        {project.contractUrl && (
                          <a href={project.contractUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md font-black flex items-center gap-1 border border-blue-100 animate-pulse">
                            <ExternalLink size={10} /> 參考合約已就緒
                          </a>
                        )}
                      </div>
                    </div>
                    {!isReadOnly && (
                      <button
                        onClick={async () => {
                          setIsGeneratingPrep(true);
                          try {
                            const result = await generatePreConstructionPrep(project);
                            props.onUpdatePreConstruction({
                              ...project.preConstruction,
                              ...result,
                              updatedAt: new Date().toISOString()
                            });
                          } catch (e: any) {
                            alert(`AI 產生失敗: ${e.message || '未知錯誤'}`);
                          } finally {
                            setIsGeneratingPrep(false);
                          }
                        }}
                        disabled={isGeneratingPrep}
                        className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all disabled:opacity-50 shadow-lg shadow-slate-100"
                      >
                        {isGeneratingPrep ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} className="text-amber-400" />}
                        {isGeneratingPrep ? 'AI 規劃中...' : 'AI 輔助規劃'}
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* 材料及機具 */}
                    <div className="bg-white p-6 rounded-[2.5rem] border border-stone-100 shadow-sm space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shadow-inner">
                          <Wrench size={18} />
                        </div>
                        <div>
                          <span className="text-xs font-black text-stone-900 uppercase block">材料及機具清單</span>
                          <span className="text-[9px] text-stone-400 font-bold">MATERIALS & TOOLS</span>
                        </div>
                      </div>
                      <div className="relative group">
                        <textarea
                          readOnly={isReadOnly}
                          className={`w-full min-h-[250px] bg-stone-50/30 border border-stone-100 rounded-[1.5rem] p-5 text-sm font-bold text-stone-700 outline-none focus:ring-4 focus:ring-orange-500/5 transition-all no-scrollbar leading-relaxed ${isReadOnly ? 'cursor-not-allowed opacity-80' : ''}`}
                          placeholder="請描述此案所需材料與工具，或點擊上方「AI 輔助」自動生成..."
                          value={localMaterials}
                          onChange={(e) => setLocalMaterials(e.target.value)}
                          onBlur={() => props.onUpdatePreConstruction({ ...project.preConstruction, materialsAndTools: localMaterials, updatedAt: new Date().toISOString() })}
                        />
                        {isReadOnly && (
                          <div className="absolute top-4 right-4 text-stone-300 pointer-events-none">
                            <Lock size={16} />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 施工公告 */}
                    <div className="bg-white p-6 rounded-[2.5rem] border border-stone-100 shadow-sm space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
                          <ClipboardList size={18} />
                        </div>
                        <div>
                          <span className="text-xs font-black text-stone-900 uppercase block">施工正式公告</span>
                          <span className="text-[9px] text-stone-400 font-bold">OFFICIAL NOTICE</span>
                        </div>
                      </div>
                      <div className="relative group">
                        <textarea
                          readOnly={isReadOnly}
                          className={`w-full min-h-[250px] bg-stone-50/30 border border-stone-100 rounded-[1.5rem] p-5 text-sm font-bold text-stone-700 outline-none focus:ring-4 focus:ring-blue-500/5 transition-all no-scrollbar leading-relaxed ${isReadOnly ? 'cursor-not-allowed opacity-80' : ''}`}
                          placeholder="請輸入公告內容，或使用 AI 產生標準範本..."
                          value={localNotice}
                          onChange={(e) => setLocalNotice(e.target.value)}
                          onBlur={() => props.onUpdatePreConstruction({ ...project.preConstruction, notice: localNotice, updatedAt: new Date().toISOString() })}
                        />
                        {isReadOnly && (
                          <div className="absolute top-4 right-4 text-stone-300 pointer-events-none">
                            <Lock size={16} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 施工範圍圖面 */}
                  <div className="bg-white p-6 rounded-[2.5rem] border border-stone-100 shadow-sm space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner">
                          <FileImage size={18} />
                        </div>
                        <div>
                          <span className="text-xs font-black text-stone-900 uppercase block">施工範圍示意圖</span>
                          <span className="text-[9px] text-stone-400 font-bold">SCOPE DRAWING / MAP</span>
                        </div>
                      </div>
                      {!isReadOnly && (
                        <button
                          onClick={() => scopeDrawingInputRef.current?.click()}
                          className="px-4 py-2 border border-emerald-100 text-emerald-600 bg-emerald-50/30 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-50 transition-all flex items-center gap-2"
                        >
                          <Upload size={14} /> 上傳圖面
                        </button>
                      )}
                    </div>

                    <input
                      type="file"
                      className="hidden"
                      ref={scopeDrawingInputRef}
                      accept="image/*,.pdf"
                      multiple
                      onChange={async (e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length > 0) {
                          try {
                            const results = await Promise.all(files.map(f => cloudFileService.uploadFile(f)));
                            const validUrls = results
                              .filter((res): res is { id: string; url: string } => !!res)
                              .map(res => res.url);

                            if (validUrls.length > 0) {
                              props.onUpdatePreConstruction({
                                ...project.preConstruction,
                                scopeDrawings: [
                                  ...(project.preConstruction?.scopeDrawings || []),
                                  ...validUrls
                                ],
                                updatedAt: new Date().toISOString()
                              });
                            }
                          } catch (err) {
                            alert('圖面附件上傳失敗');
                            console.error(err);
                          }
                        }
                      }}
                    />

                    {/* Display Scope Drawings (Mixed Legacy & New) */}
                    {(() => {
                      const allDrawings = [
                        ...(project.preConstruction?.scopeDrawingUrl ? [project.preConstruction.scopeDrawingUrl] : []),
                        ...(project.preConstruction?.scopeDrawings || [])
                      ];
                      return allDrawings.length > 0 ? (
                        <div className="grid grid-cols-2 gap-4">
                          {allDrawings.map((rawUrl, index) => {
                            const url = String(rawUrl || '');
                            return (
                              <div key={index} className="relative aspect-video rounded-[1.5rem] overflow-hidden border border-stone-100 group bg-stone-50">
                                {url.toLowerCase().endsWith('.pdf') ? (
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full h-full flex flex-col items-center justify-center text-stone-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                  >
                                    <FileText size={32} />
                                    <span className="text-[10px] font-black mt-2 uppercase tracking-widest">PDF 文件</span>
                                  </a>
                                ) : (
                                  <img
                                    src={url}
                                    alt={`施工範圍圖-${index + 1}`}
                                    className="w-full h-full object-cover"
                                    onClick={() => setSelectedImage({ url, category: '施工範圍圖' })}
                                  />
                                )}
                                {!isReadOnly && (
                                  <button
                                    onClick={() => {
                                      if (!confirm('確認移除此圖面？')) return;
                                      // Logic to remove... a bit complex if mixing legacy and new.
                                      // For simplicity, if we remove, we update the state.
                                      // Determine if it was legacy or new?
                                      // Easier to just rebuild arrays.
                                      const legacyUrl = project.preConstruction?.scopeDrawingUrl;
                                      let newScopeDrawings = [...(project.preConstruction?.scopeDrawings || [])];

                                      if (url === legacyUrl) {
                                        // Remove legacy
                                        props.onUpdatePreConstruction({
                                          ...project.preConstruction,
                                          scopeDrawingUrl: undefined,
                                          updatedAt: new Date().toISOString()
                                        });
                                      } else {
                                        newScopeDrawings = newScopeDrawings.filter(u => String(u) !== url);
                                        props.onUpdatePreConstruction({
                                          ...project.preConstruction,
                                          scopeDrawings: newScopeDrawings,
                                          updatedAt: new Date().toISOString()
                                        });
                                      }
                                    }}
                                    className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500"
                                  >
                                    <X size={14} />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>

                      ) : (
                        <div className="aspect-video bg-stone-50/50 rounded-[2rem] border-2 border-dashed border-stone-100 flex flex-col items-center justify-center text-stone-300 gap-4">
                          <div className="w-16 h-16 rounded-3xl bg-white flex items-center justify-center shadow-sm">
                            <Construction size={32} className="opacity-20" />
                          </div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">尚未上傳範圍圖面</p>
                          {!isReadOnly && (
                            <button onClick={() => scopeDrawingInputRef.current?.click()} className="text-[10px] font-black text-emerald-600 border-b border-emerald-600/30 pb-0.5 hover:border-emerald-600 transition-all">
                              點擊此處立即上傳
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>
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
                          <p className="text-white/60 text-[9px]">{file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString() : '無日期'}</p>
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
          )
        }
      </div >

      {/* Lightbox / Media Preview Modal */}
      {
        selectedImage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
            {/* Close Button */}
            <button onClick={() => setSelectedImage(null)} className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors z-[110] bg-white/10 p-3 rounded-full hover:bg-white/20">
              <X size={24} />
            </button>

            {/* Navigation Buttons */}
            {navigationList.findIndex(f => f.id === selectedImage.id || f.url === selectedImage.url) > 0 && (
              <button
                onClick={handlePrevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white hover:bg-white/10 p-4 rounded-full transition-all z-[110]"
              >
                <ChevronLeft size={40} />
              </button>
            )}

            {navigationList.findIndex(f => f.id === selectedImage.id || f.url === selectedImage.url) < navigationList.length - 1 && (
              <button
                onClick={handleNextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white hover:bg-white/10 p-4 rounded-full transition-all z-[110]"
              >
                <ChevronRight size={40} />
              </button>
            )}

            {/* Main Content */}
            <div
              className="relative w-full h-full flex flex-col items-center justify-center p-4 lg:p-12 animate-in zoom-in-95 duration-300"
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <div className="flex-1 w-full flex items-center justify-center min-h-0 overflow-hidden relative">
                {selectedImage.type === 'video' ? (
                  <video src={selectedImage.url} className="max-w-full max-h-full rounded-2xl shadow-2xl" controls autoPlay />
                ) : (
                  <div
                    className="relative transition-transform duration-75 ease-out will-change-transform"
                    style={{
                      transform: `scale(${zoomLevel}) translate3d(${position.x / zoomLevel}px, ${position.y / zoomLevel}px, 0)`,
                      cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
                    }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  >
                    <img
                      src={selectedImage.url}
                      alt={selectedImage.name}
                      className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl pointer-events-none select-none"
                      draggable={false}
                    />
                  </div>
                )}
              </div>

              {/* Controls Toolbar */}
              <div className="mt-6 flex flex-col items-center gap-4 z-[110]">
                {/* Zoom Controls (Images Only) */}
                {selectedImage.type !== 'video' && (
                  <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                    <button onClick={handleZoomOut} className="text-white/70 hover:text-white transition-colors disabled:opacity-30" disabled={zoomLevel <= 1}>
                      <ZoomOut size={18} />
                    </button>
                    <span className="text-xs font-black text-white w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
                    <button onClick={handleZoomIn} className="text-white/70 hover:text-white transition-colors disabled:opacity-30" disabled={zoomLevel >= 3}>
                      <ZoomIn size={18} />
                    </button>
                  </div>
                )}

                {/* Image Info */}
                <div className="text-center space-y-3">
                  <h3 className="text-white text-lg font-black tracking-tight drop-shadow-md">{selectedImage.name}</h3>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <p className="text-white/60 text-[10px] font-black uppercase tracking-widest">
                      {navigationList.findIndex(f => f.id === selectedImage.id || f.url === selectedImage.url) + 1} / {navigationList.length}
                    </p>
                    <span className="w-1 h-1 bg-white/20 rounded-full" />
                    <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">
                      {selectedImage.uploadedAt ? new Date(selectedImage.uploadedAt).toLocaleString() : '無日期'}
                    </p>
                    <span className="w-1 h-1 bg-white/20 rounded-full" />
                    {!isReadOnly && onUpdateFiles && selectedImage.category !== '施工範圍圖' ? (
                      <div className="flex items-center gap-3">
                        <div className="relative group/cat">
                          <select
                            value={selectedImage.category}
                            onChange={(e) => {
                              const newCategory = e.target.value;
                              const updatedFiles = project.files?.map(f => f.id === selectedImage.id ? { ...f, category: newCategory } : f) || [];
                              onUpdateFiles(updatedFiles);
                              setSelectedImage({ ...selectedImage, category: newCategory });
                            }}
                            className="appearance-none bg-stone-800 text-orange-500 text-[10px] font-black uppercase tracking-widest border border-stone-700 rounded-xl px-4 py-1.5 pr-8 outline-none cursor-pointer hover:bg-stone-700 transition-all"
                          >
                            {PHOTO_CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                              <option key={cat.id} value={cat.id}>{cat.label}</option>
                            ))}
                          </select>
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-orange-500/50">
                            <Layers size={10} />
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            if (confirm('確定要從雲端刪除這張照片嗎？')) {
                              onUpdateFiles(project.files!.filter(f => f.id !== selectedImage.id));
                              setSelectedImage(null);
                            }
                          }}
                          className="p-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all border border-rose-500/20"
                          title="刪除"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ) : (
                      <p className="text-orange-500 text-[10px] font-black uppercase tracking-widest">{selectedImage.category === '施工範圍圖' ? '施工範圍圖' : (PHOTO_CATEGORIES.find(c => c.id === selectedImage.category)?.label || '未分類')}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }
      {/* Mandatory Contract Upload Modal */}
      {
        isMandatoryUploadOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-8 space-y-6">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                  <Upload size={32} />
                </div>

                <div className="text-center space-y-2">
                  <h3 className="text-xl font-black text-slate-900">上傳報價單或合約</h3>
                  <p className="text-sm text-slate-500 font-bold leading-relaxed">
                    將案件狀態更改為「{pendingStatus}」前，<br />
                    需先上傳正式報價單或合約文件作為後續參考。
                  </p>
                </div>

                <div className="space-y-3">
                  <input
                    type="file"
                    className="hidden"
                    ref={contractFileInputRef}
                    accept="image/*,.pdf"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          setIsUploading(true);
                          const url = await cloudFileService.uploadFile(file);
                          onUpdateContractUrl(url);
                          if (pendingStatus) onUpdateStatus(pendingStatus);
                          setIsMandatoryUploadOpen(false);
                        } catch (err) {
                          alert('上傳失敗，請再試一次');
                        } finally {
                          setIsUploading(false);
                        }
                      }
                    }}
                  />
                  <button
                    onClick={() => contractFileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-100 flex items-center justify-center gap-3 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                    {isUploading ? '正在上傳文件...' : '選擇檔案並上傳'}
                  </button>
                  <button
                    onClick={() => {
                      setIsMandatoryUploadOpen(false);
                      setPendingStatus(null);
                    }}
                    disabled={isUploading}
                    className="w-full py-4 text-slate-400 font-bold text-sm hover:text-slate-600 transition-all"
                  >
                    取消
                  </button>
                </div>
              </div>
              <div className="bg-stone-50 px-8 py-4 text-center">
                <p className="text-[10px] text-stone-400 font-black uppercase tracking-widest">
                  此文件將作為 AI 排程與施工前準備的關鍵依據
                </p>
              </div>
            </div>
          </div>
        )
      }
      {/* Project Report Modal */}
      {
        isReportMode && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
              {/* Header */}
              <div className="px-10 py-8 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">專案執行績效報告</h2>
                    <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">{project.name} | {project.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsReportMode(false)}
                  className="w-10 h-10 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center hover:bg-stone-200 hover:text-stone-900 transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-10 space-y-10 no-scrollbar">
                {/* Basic Info & Status */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-6 bg-stone-50 rounded-3xl border border-stone-100">
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">目前進度</p>
                    <p className="text-3xl font-black text-blue-600">{project.progress}%</p>
                    <div className="mt-4 h-2 bg-stone-200 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${project.progress}%` }}></div>
                    </div>
                  </div>
                  <div className="p-6 bg-stone-50 rounded-3xl border border-stone-100">
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">案件狀態</p>
                    <p className="text-2xl font-black text-slate-900">{project.status}</p>
                    <p className="text-[10px] text-stone-400 font-bold mt-2">最後更新: {project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : '尚未更新'}</p>
                  </div>
                  <div className="p-6 bg-stone-50 rounded-3xl border border-stone-100">
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">合約日期</p>
                    <p className="text-lg font-black text-slate-900">{project.startDate} 至</p>
                    <p className="text-lg font-black text-slate-900">{project.endDate}</p>
                  </div>
                </div>

                {/* Financial Performance */}
                <div className="space-y-6">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] border-l-4 border-orange-500 pl-4">財務損益分析 (Financial Performance)</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Budget Chart Simulation */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[10px] font-black text-stone-400 uppercase">預算執行狀況</p>
                          <p className="text-2xl font-black text-slate-900">${(currentSpent || 0).toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-stone-400 uppercase">總預算</p>
                          <p className="text-lg font-black text-stone-400">${(project.budget || 0).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="relative h-4 bg-stone-100 rounded-full overflow-hidden border border-stone-200">
                        <div
                          className={`h-full transition-all duration-1000 ${currentSpent > project.budget ? 'bg-rose-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(100, (currentSpent / project.budget) * 100)}%` }}
                        ></div>
                      </div>
                      <p className="text-[9px] font-black text-stone-400 text-center uppercase tracking-widest">
                        {currentSpent > project.budget ? '⚠️ 已超出預算' : `預算執行率: ${Math.round((currentSpent / project.budget) * 100)}%`}
                      </p>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100 relative overflow-hidden">
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-[10px] font-black text-emerald-600 uppercase">預估毛利</p>
                          {/* Profit Health Indicator */}
                          <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${(margin / (project.budget || 1)) > 0.3 ? 'bg-emerald-500 text-white' :
                            (margin / (project.budget || 1)) > 0.15 ? 'bg-amber-500 text-white' : 'bg-rose-500 text-white'
                            }`}>
                            <div className="w-1 h-1 rounded-full bg-white animate-pulse"></div>
                            {(margin / (project.budget || 1)) > 0.3 ? 'Safe' : (margin / (project.budget || 1)) > 0.15 ? 'Caution' : 'Critical'}
                          </div>
                        </div>
                        <p className="text-xl font-black text-emerald-700">${(margin || 0).toLocaleString()}</p>
                      </div>
                      <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100">
                        <p className="text-[10px] font-black text-blue-600 uppercase mb-1">利潤率</p>
                        <p className="text-xl font-black text-blue-700">{project.budget > 0 ? Math.round((margin / project.budget) * 100) : 0}%</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-widest border-b pb-2">支出構成明細 (Expense Breakdown)</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs font-bold text-stone-600">
                        <span>人工成本 (派工)</span>
                        <span className="font-black text-stone-900">${(totalLaborCost || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-bold text-stone-600">
                        <span>材料及其他支出</span>
                        <span className="font-black text-stone-900">${(totalExpenseCost || 0).toLocaleString()}</span>
                      </div>
                      <div className="pt-2 border-t flex justify-between items-center text-sm font-black text-stone-900">
                        <span>總支出</span>
                        <span>${(currentSpent || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-widest border-b pb-2">施工項次統計 (Phase Status)</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs font-bold text-stone-600">
                        <span>總施工項目</span>
                        <span className="font-black text-stone-900">{project.phases?.length || 0} 項</span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-bold text-stone-600">
                        <span>已完工項目</span>
                        <span className="font-black text-emerald-600">{project.phases?.filter(p => p.status === 'Completed').length || 0} 項</span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-bold text-stone-600">
                        <span>進行中項目</span>
                        <span className="font-black text-blue-600">{project.phases?.filter(p => p.status === 'In Progress').length || 0} 項</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Advice Section (AI Integrated Style) */}
                <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                  <div className="relative z-10 flex items-start gap-6">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-blue-400 shrink-0">
                      <Sparkles size={24} />
                    </div>
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-black tracking-tight">AI 專案診斷建議</h4>
                        <button
                          onClick={async () => {
                            const btn = document.getElementById('ai-analyze-btn');
                            if (btn) btn.innerHTML = '分析中...';
                            try {
                              const res = await analyzeProjectFinancials(project);
                              const adviceP = document.getElementById('ai-advice-text');
                              if (adviceP) adviceP.innerHTML = res.text;
                            } catch (e) {
                              alert('分析失敗');
                            } finally {
                              if (btn) btn.innerHTML = '重新診斷';
                            }
                          }}
                          id="ai-analyze-btn"
                          className="text-[9px] font-black uppercase tracking-widest bg-white/10 hover:bg-white/20 px-3 py-1 rounded-lg transition-all"
                        >
                          執行深度診斷
                        </button>
                      </div>
                      <div id="ai-advice-text" className="text-xs text-stone-300 leading-relaxed prose prose-invert prose-xs max-w-none">
                        根據目前的進度為 {project.progress}%，與預算執行率 {project.budget > 0 ? Math.round((currentSpent / project.budget) * 100) : 0}% 相比，
                        {currentSpent > project.budget ? '支出已超過預算，建議立即檢查「材料支出」與「委託工程」是否有異常。' :
                          (margin / (project.budget || 1)) < 0.2 ? '目前毛利稍微偏低，請留意後續工資成本的控管。' :
                            '目前案場營運狀況良好，資金執行率與進度匹配。'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="px-10 py-8 border-t border-stone-100 flex items-center justify-end gap-4 bg-stone-50/30">
                <button
                  onClick={() => window.print()}
                  className="px-6 py-3 bg-white border border-stone-200 text-stone-700 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-stone-50 transition-all flex items-center gap-2"
                >
                  <DownloadCloud size={14} /> 列印報告
                </button>
                <button
                  onClick={() => setIsReportMode(false)}
                  className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg"
                >
                  關閉報告
                </button>
              </div>
            </div>
          </div>
        )
      }
      {/* Completion Report Modal (完工報告書) */}
      {
        isCompletionReportMode && (
          <div className="fixed inset-0 z-[120] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300 overflow-y-auto no-scrollbar">
            <div className="bg-white w-full max-w-[210mm] min-h-screen sm:min-h-0 sm:rounded-[2.5rem] shadow-2xl relative flex flex-col print:shadow-none print:rounded-none">
              {/* Action Bar (Hidden when printing) */}
              <div className="sticky top-0 z-[130] bg-white/80 backdrop-blur-md px-8 py-4 border-b border-stone-100 flex items-center justify-between print:hidden">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                    <CheckCircle size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">完工報告書系統</h3>
                    <p className="text-[10px] text-stone-400 font-bold mt-1">Completion Report Preview</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => window.print()}
                    className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center gap-2"
                  >
                    <DownloadCloud size={14} /> 列印或匯出 PDF
                  </button>
                  <button
                    onClick={() => setIsCompletionReportMode(false)}
                    className="w-10 h-10 rounded-xl bg-stone-100 text-stone-400 flex items-center justify-center hover:bg-stone-200 hover:text-stone-900 transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Report Content */}
              <div className="flex-1 p-0 print:p-0">
                {/* PAGE 1: COVER */}
                <div className="w-full aspect-[1/1.4142] p-16 flex flex-col items-center justify-between relative print:break-after-page">
                  <div className="w-full text-center space-y-6 mt-12">
                    <h1 className="text-3xl font-black text-slate-900 tracking-[0.2em]">{project.location?.address}</h1>
                    <h2 className="text-4xl font-black text-slate-900 tracking-[0.1em]">{project.name}</h2>
                  </div>

                  <div className="relative w-96 h-96 flex items-center justify-center">
                    <div className="absolute inset-0 border-[1px] border-stone-100 rounded-full"></div>
                    <div className="absolute inset-8 border-[1px] border-stone-200 rounded-full"></div>
                    <div className="relative text-center space-y-4">
                      <span className="text-6xl font-black text-stone-800 tracking-[0.5em] block ml-4">完工</span>
                      <span className="text-6xl font-black text-stone-800 tracking-[0.5em] block ml-4">報告</span>
                      <span className="text-6xl font-black text-stone-800 tracking-[0.5em] block ml-4">書</span>
                    </div>
                  </div>

                  <div className="w-full max-w-md space-y-4 pb-12">
                    <div className="grid grid-cols-3 gap-4 border-b border-stone-100 pb-2">
                      <span className="text-stone-400 text-sm font-black uppercase tracking-widest">案件編號</span>
                      <span className="col-span-2 text-stone-900 text-lg font-black tracking-widest">{project.id}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 border-b border-stone-100 pb-2">
                      <span className="text-stone-400 text-sm font-black uppercase tracking-widest">承攬廠商</span>
                      <span className="col-span-2 text-stone-900 text-sm font-black">台灣生活品質發展股份有限公司</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 border-b border-stone-100 pb-2">
                      <span className="text-stone-400 text-sm font-black uppercase tracking-widest">負責人</span>
                      <span className="col-span-2 text-stone-900 text-sm font-black text-lg">陳信寬</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 border-b border-stone-100 pb-2">
                      <span className="text-stone-400 text-sm font-black uppercase tracking-widest">專案負責人</span>
                      <span className="col-span-2 text-stone-900 text-sm font-black text-lg">{project.engineeringManager}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <span className="text-stone-400 text-sm font-black uppercase tracking-widest">聯絡電話</span>
                      <span className="col-span-2 text-stone-900 text-sm font-black">0986-909157 / 0910-929-597</span>
                    </div>
                  </div>

                  <div className="absolute bottom-12 right-12 flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-[10px] font-black text-stone-900 uppercase">傑凱相關企業</p>
                      <p className="text-[8px] text-stone-400 font-bold uppercase tracking-tighter">Jiekai Affiliated Companies</p>
                    </div>
                    <img src="./pwa-icon.png" className="w-8 h-8 opacity-50 contrast-125" alt="Logo" />
                  </div>
                </div>

                {/* PAGE 2: TABLE OF CONTENTS */}
                <div className="w-full aspect-[1/1.4142] p-24 flex flex-col relative print:break-after-page">
                  <h3 className="text-3xl font-black text-slate-900 text-center mb-24 tracking-[0.5em] ml-4">目錄</h3>
                  <div className="space-y-8 flex-1 max-w-2xl mx-auto w-full">
                    {[
                      { label: '工程報單', page: '2' },
                      { label: '施工過程照片紀錄', page: '3' },
                      { label: '工程保固書', page: '10' },
                      { label: '附件一：合約影本', page: '12' },
                      { label: '附件二：工安管理資料影本', page: '24' },
                      { label: '附件三：使用材料簡介', page: '34' }
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-end gap-2 group">
                        <span className="text-lg font-black text-slate-900 shrink-0">{item.label}</span>
                        <div className="flex-1 border-b-[1.5px] border-dotted border-stone-300 mb-1.5 transition-colors group-hover:border-stone-900"></div>
                        <span className="text-lg font-black text-slate-900 shrink-0 font-mono">{item.page}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-auto flex justify-center pb-12">
                    <img src="./pwa-icon.png" className="w-10 h-10 opacity-20" alt="Logo" />
                  </div>
                </div>

                {/* PAGE 3+: PHOTO RECORDS (CHUNKED BY 2 PER PAGE) */}
                {Array.from({ length: Math.ceil(files.filter(f => f.category === 'construction').length / 2) }).map((_, pageIdx) => {
                  const pagePhotos = files.filter(f => f.category === 'construction').slice(pageIdx * 2, pageIdx * 2 + 2);
                  return (
                    <div key={pageIdx} className="w-full aspect-[1/1.4142] p-20 flex flex-col relative print:break-after-page border-t sm:border-t-0 border-stone-100">
                      <h3 className="text-2xl font-black text-slate-900 text-center mb-12 tracking-widest">施工過程照片紀錄</h3>
                      <div className="flex-1 flex flex-col gap-12">
                        {pagePhotos.map((photo, pIdx) => (
                          <div key={pIdx} className="flex-1 flex flex-col border border-slate-200 rounded-lg overflow-hidden bg-stone-50/30">
                            <div className="flex-1 relative overflow-hidden flex items-center justify-center p-2">
                              <img
                                src={photo.url}
                                className="max-w-full max-h-full object-contain shadow-sm"
                                alt={photo.name}
                              />
                            </div>
                            <div className="bg-white px-8 py-5 border-t border-slate-100 text-center">
                              <p className="text-sm font-black text-slate-800">{photo.name.replace(/\.[^/.]+$/, "")}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-8 flex justify-between items-center opacity-40">
                        <span className="text-[10px] font-black">{pageIdx + 3}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-tighter">Jiekai Affiliated Companies</span>
                          <img src="./pwa-icon.png" className="w-6 h-6" alt="Logo" />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* PAGE 10: ENGINEERING WARRANTY (工程保固書) */}
                <div className="w-full aspect-[1/1.4142] p-20 flex flex-col relative print:break-after-page border-t sm:border-t-0 border-stone-100">
                  <div className="flex-1 border-[1.5px] border-stone-800 p-12 flex flex-col space-y-10">
                    <h3 className="text-4xl font-black text-slate-900 text-center tracking-[0.5em] mb-12 underline underline-offset-8">工程保固書</h3>

                    <div className="space-y-6 text-base font-bold text-slate-800">
                      <p>一、工程名稱：{project.name}</p>
                      <p>二、工程地點：{project.location?.address}</p>
                      <p>三、承包廠商：台灣生活品質發展股份有限公司</p>
                      <p>四、工程範圍：工程項目詳細報價單</p>

                      <div className="pt-4 leading-relaxed space-y-4">
                        <p>五、保固責任：本工程已於民國一一四年十一月三日全部竣工完成，</p>
                        <p className="pl-12">並由承商負責保固，保固期限為壹年，自民國一一四年</p>
                        <p className="pl-12">十一月二日起至民國一一五年十一月一日止，保固期間</p>
                        <p className="pl-12">施工範圍內，倘發生結構損壞或漏水情形，由承商負責</p>
                        <p className="pl-12">無償修復(因不可抗力及材料自然老化之因素，或甲方</p>
                        <p className="pl-12">使用不當、未善盡保管之責所造成之損害除外)，並於</p>
                        <p className="pl-12">甲方通知後，七日內安排保固修繕，絕無異議。</p>
                      </div>
                    </div>

                    <div className="mt-auto grid grid-cols-2 gap-8 pt-12">
                      <div className="space-y-3 text-sm font-black text-slate-900">
                        <p>承攬廠商：台灣生活品質發展股份有限公司</p>
                        <p>負責人：陳信寬</p>
                        <p>工地負責人：陳信寬 &nbsp;&nbsp; 專案負責人：{project.engineeringManager}</p>
                        <p>公司地址：新北市中和區景平路 71-7 號 5 樓之 9</p>
                        <p>統一編號：60618756</p>
                        <p>公司電話：02-2242-1955 公司傳真：02-2242-1905</p>
                      </div>

                      <div className="relative flex flex-col items-center justify-center">
                        <div className="w-48 h-48 border-2 border-dashed border-rose-200 rounded-2xl flex items-center justify-center relative overflow-hidden group">
                          <div className="text-[10px] text-rose-300 font-black text-center group-hover:text-rose-400 transition-colors">
                            <p>保固書專用章用印處</p>
                            <p className="mt-1">無戳印則本保固書無效</p>
                          </div>
                          {/* Seal Simulation Overlay */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                            <div className="w-24 h-24 border-4 border-rose-600 rounded flex items-center justify-center text-rose-600 font-black text-xs rotate-12">公司大章</div>
                            <div className="w-12 h-12 border-2 border-rose-600 rounded flex items-center justify-center text-rose-600 font-black text-[8px] -rotate-12 absolute bottom-4 right-4">私章</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-end pt-12">
                      <div className="flex gap-4 text-xl font-black text-slate-900 tracking-widest">
                        <span>中</span>
                        <span>華</span>
                        <span>民</span>
                        <span>國</span>
                        <span className="w-12 border-b-2 border-stone-800 text-center">一一四</span>
                        <span>年</span>
                        <span className="w-8 border-b-2 border-stone-800 text-center">十</span>
                        <span>月</span>
                        <span className="w-8 border-b-2 border-stone-800 text-center">四</span>
                        <span>日</span>
                      </div>
                      <div className="flex items-center gap-3 opacity-60 scale-75 origin-right">
                        <div className="text-right">
                          <p className="text-[10px] font-black text-stone-900 uppercase">傑凱相關企業</p>
                          <p className="text-[8px] text-stone-400 font-bold uppercase tracking-tighter">Jiekai Affiliated Companies</p>
                        </div>
                        <img src="./pwa-icon.png" className="w-8 h-8" alt="Logo" />
                      </div>
                    </div>
                  </div>
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-black text-stone-300">10</div>
                </div>
                <div className="w-full aspect-[1/1.4142] p-16 flex flex-col relative print:break-after-page border-t sm:border-t-0 border-stone-100">
                  <div className="border-[1.5px] border-stone-900 h-full p-8 flex flex-col">
                    <div className="flex justify-between items-start mb-8">
                      <div className="space-y-1">
                        <h3 className="text-2xl font-black text-slate-900">報價單</h3>
                        <p className="text-stone-500 font-bold text-[10px] tracking-widest">QUOTATION SUMMARY</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black">台灣生活品質發展股份有限公司</p>
                        <p className="text-[8px] text-stone-500">台北市士林區中心北路五段500號7樓</p>
                        <p className="text-[8px] text-stone-500">TEL: 02-2242-1955</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-y-4 mb-8 text-[11px] font-bold text-slate-700">
                      <p>工程編號：{project.id}</p>
                      <p className="text-right font-black">Date: {new Date().toLocaleDateString()}</p>
                      <p className="col-span-2">工程名稱：{project.name}</p>
                      <p className="col-span-2">工程地址：{project.location?.address || '見詳述'}</p>
                    </div>

                    <div className="flex-1 border-t border-stone-900">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-stone-900 text-[10px] font-black uppercase tracking-widest">
                            <th className="py-2 px-1">項次</th>
                            <th className="py-2 px-1">品名項目</th>
                            <th className="py-2 px-1">單位</th>
                            <th className="py-2 px-1 text-right">金額</th>
                          </tr>
                        </thead>
                        <tbody className="text-[10px] font-bold">
                          {(project.phases || []).map((phase, idx) => (
                            <tr key={idx} className="border-b border-stone-100">
                              <td className="py-2 px-1 text-stone-400">{idx + 1}</td>
                              <td className="py-2 px-1 text-slate-800">{phase.name}</td>
                              <td className="py-2 px-1 text-stone-500">一式</td>
                              <td className="py-2 px-1 text-right font-black">${((project.budget || 0) / (project.phases?.length || 1)).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="space-y-1 mt-8 border-t-[1.5px] border-stone-900 pt-6">
                      <div className="flex justify-between items-center text-sm font-black">
                        <span className="text-stone-400">未稅金額</span>
                        <span>${Math.round((project.budget || 0) / 1.05).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm font-black">
                        <span className="text-stone-400">營業稅 5%</span>
                        <span>${Math.round((project.budget || 0) - ((project.budget || 0) / 1.05)).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-xl font-black pt-4">
                        <span>總計金額</span>
                        <span className="text-emerald-600">${(project.budget || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* 編輯派工 Modal */}
      {
        editingAssignment && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="bg-[#2c3e50] p-6 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                    <Pencil size={18} /> 編輯派工
                  </h3>
                  <p className="text-[10px] font-medium opacity-80 mt-1">修改工時、日期或薪資資料</p>
                </div>
                <button onClick={() => setEditingAssignment(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">施工人員</label>
                    <input
                      readOnly
                      value={editingAssignment.memberName}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm font-bold text-stone-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">日期</label>
                      <input
                        type="date"
                        value={editingAssignment.date}
                        onChange={e => setEditingAssignment({ ...editingAssignment, date: e.target.value })}
                        className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-[#2c3e50] outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">工時 (天)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={editingAssignment.days}
                        onChange={e => setEditingAssignment({ ...editingAssignment, days: Number(e.target.value) })}
                        className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-[#2c3e50] outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">日薪 (TWD)</label>
                    <input
                      type="number"
                      value={editingAssignment.wagePerDay}
                      onChange={e => setEditingAssignment({ ...editingAssignment, wagePerDay: Number(e.target.value) })}
                      className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-[#2c3e50] outline-none"
                    />
                  </div>

                  <label className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={editingAssignment.isSpiderMan || false}
                      onChange={e => {
                        const isChecked = e.target.checked;
                        const member = props.teamMembers.find(m => m.name === editingAssignment.memberName);
                        const allowance = member?.spiderManAllowance || 0;
                        let newWage = Number(editingAssignment.wagePerDay) || 0;

                        if (isChecked) {
                          newWage += allowance;
                        } else {
                          newWage -= allowance;
                        }

                        setEditingAssignment({ ...editingAssignment, isSpiderMan: isChecked, wagePerDay: newWage });
                      }}
                      className="w-5 h-5 rounded border-blue-300 text-blue-600 focus:ring-blue-600 transition-colors"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-black text-blue-900 group-hover:text-blue-700 transition-colors">🕷️ 蜘蛛人作業 (繩索吊掛)</span>
                      <div className="flex justify-between items-center mt-0.5">
                        <p className="text-[10px] text-blue-600">勾選後將自動加計津貼</p>
                        {(() => {
                          const member = props.teamMembers.find(m => m.name === editingAssignment.memberName);
                          const allowance = member?.spiderManAllowance || 0;
                          return allowance > 0 ? (
                            <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                              津貼: +${allowance}
                            </span>
                          ) : null;
                        })()}
                      </div>
                    </div>
                  </label>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setEditingAssignment(null)}
                    className="flex-1 px-4 py-3 rounded-xl font-bold text-stone-500 hover:bg-stone-50 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => handleSaveAssignment(editingAssignment)}
                    className="flex-1 px-4 py-3 bg-[#2c3e50] text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    儲存變更
                  </button>
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
