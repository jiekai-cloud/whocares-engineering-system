import React, { useMemo, useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ProjectList from './components/ProjectList';
import DispatchManager from './components/DispatchManager';
import CustomerList from './components/CustomerList';
import TeamList from './components/TeamList';
import Analytics from './components/Analytics';
import Settings from './components/Settings';
import HelpCenter from './components/HelpCenter';
import AIAssistant from './components/AIAssistant';
import ProjectModal from './components/ProjectModal';
import ProjectDetail from './components/ProjectDetail';
import CustomerModal from './components/CustomerModal';
import TeamModal from './components/TeamModal';
import VendorModal from './components/VendorModal';
import LeadToProjectModal from './components/LeadToProjectModal';
import Login from './components/Login';
import { Menu, LogOut, Layers, Cloud, CloudOff, RefreshCw, AlertCircle, CheckCircle, ShieldCheck, Database, Zap, Sparkles, Globe, Activity, ShieldAlert, Bell, User as UserIcon, Trash2, ShoppingBag, Receipt, Pencil } from 'lucide-react';
import NotificationPanel from './components/NotificationPanel';
import { MOCK_PROJECTS, MOCK_DEPARTMENTS, MOCK_TEAM_MEMBERS } from './constants';
import { Project, ProjectStatus, Customer, TeamMember, User, Department, ProjectComment, ActivityLog, Vendor, ChecklistTask, PaymentStage, DailyLogEntry, Lead } from './types';
import { googleDriveService, DEFAULT_CLIENT_ID } from './services/googleDriveService';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [viewingDeptId, setViewingDeptId] = useState<string>('all');

  const [projects, setProjects] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => {
    // Seed some mock leads if empty for demo
    try {
      const savedLeads = JSON.parse(localStorage.getItem('bt_leads') || '[]');
      if (!Array.isArray(savedLeads) || savedLeads.length === 0) {
        const mockLeads: Lead[] = [
          {
            id: 'L-1',
            customerName: '張小姐',
            phone: '0912-345-678',
            address: '台北市士林區',
            diagnosis: '浴室外牆產生壁癌，疑似冷熱水管滲漏導致水氣滲透。',
            photos: ['https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=800'],
            timestamp: '2026-01-02 09:30',
            status: 'new'
          },
          {
            id: 'L-2',
            customerName: '科技辦公室行政',
            phone: '02-2345-6789',
            address: '新北市中和區',
            diagnosis: '頂樓女兒牆裂縫與防水層老化，雨後天花板有明顯滴水現象。',
            photos: ['https://images.unsplash.com/photo-1516714435131-44d6b64dc392?auto=format&fit=crop&q=80&w=800'],
            timestamp: '2026-01-02 10:15',
            status: 'new'
          }
        ];
        setLeads(mockLeads);
        localStorage.setItem('bt_leads', JSON.stringify(mockLeads));
      } else {
        setLeads(savedLeads);
      }
    } catch (e) {
      console.error('Leads initialization error', e);
      setLeads([]);
    }
  }, []);

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  // 系統狀態
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [lastCloudSync, setLastCloudSync] = useState<string | null>(null);
  const [lastLocalSave, setLastLocalSave] = useState<string>(new Date().toLocaleTimeString());
  const [isInitializing, setIsInitializing] = useState(true);
  const [initialSyncDone, setInitialSyncDone] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  // 同步控制與合併邏輯
  const lastRemoteModifiedTime = React.useRef<string | null>(null);
  const isSyncingRef = React.useRef(false);
  const syncTimeoutRef = React.useRef<any>(null);

  const mergeData = useCallback(<T extends { id: string, updatedAt?: string, deletedAt?: string }>(local: T[], remote: T[]): T[] => {
    const merged = [...local];
    remote.forEach(remoteItem => {
      const localIndex = merged.findIndex(item => item.id === remoteItem.id);
      if (localIndex === -1) {
        merged.push(remoteItem);
      } else {
        const localItem = merged[localIndex];
        const localTime = localItem.updatedAt ? new Date(localItem.updatedAt).getTime() : 0;
        const remoteTime = remoteItem.updatedAt ? new Date(remoteItem.updatedAt).getTime() : 0;

        // Soft Delete Logic: 如果任一方有 deletedAt 且時間較新，該物件應保持刪除狀態
        // 但此處簡化邏輯：只要遠端 updated_at 較新，就採信遠端 (包含 deletedAt)
        // 因為 deletedAt 设置时也会更新 updatedAt
        if (remoteTime > localTime) {
          merged[localIndex] = remoteItem;
        }
      }
    });
    return merged;
  }, []);

  const updateStateWithMerge = useCallback((cloudData: any) => {
    if (!cloudData) return;

    setProjects(prev => mergeData(prev, cloudData.projects || []));
    setCustomers(prev => mergeData(prev, cloudData.customers || []));
    setTeamMembers(prev => mergeData(prev, cloudData.teamMembers || []));
    setVendors(prev => mergeData(prev, cloudData.vendors || []));
    setLeads(prev => mergeData(prev, cloudData.leads || []));

    // Activity logs 採取單純合併去重
    setActivityLogs(prev => {
      const combined = [...(cloudData.activityLogs || []), ...prev];
      const seen = new Set();
      return combined.filter(log => {
        if (seen.has(log.id)) return false;
        seen.add(log.id);
        return true;
      }).slice(0, 100);
    });
  }, [mergeData]);

  // 正式上線初始化邏輯
  useEffect(() => {
    const startup = async () => {
      // 0. 設定安全超時 (避免任何異常導致永久卡死)
      const safetyTimeout = setTimeout(() => {
        setIsInitializing(false);
        console.warn('啟動超時：進入自動跳過模式');
      }, 5000);

      try {
        // 1. 恢復本地會話
        const savedUser = localStorage.getItem('bt_user');
        if (savedUser) {
          try {
            const parsedUser = JSON.parse(savedUser);
            setUser(parsedUser);
            setViewingDeptId(parsedUser.role === 'SuperAdmin' || parsedUser.role === 'Guest' ? 'all' : (parsedUser.departmentId || 'DEPT-1'));
          } catch (e) {
            console.error('使用者會話格式錯誤');
            localStorage.removeItem('bt_user');
          }
        }

        // 2. 載入本地緩存數據 (優先進入系統)
        const parseSafely = (key: string, fallback: any) => {
          try {
            const data = localStorage.getItem(key);
            if (!data) return fallback;
            const parsed = JSON.parse(data);
            return Array.isArray(parsed) ? parsed : fallback;
          } catch (e) {
            console.error(`Error parsing ${key}`, e);
            return fallback;
          }
        };

        const initialProjects = parseSafely('bt_projects', MOCK_PROJECTS);
        setProjects(initialProjects.map((p: Project) => ({
          ...p,
          expenses: p.expenses || [],
          workAssignments: p.workAssignments || [],
          files: p.files || [],
          phases: p.phases || [],
          dailyLogs: p.dailyLogs || [],
          checklist: p.checklist || [],
          payments: p.payments || []
        })));

        setCustomers(parseSafely('bt_customers', []));

        const initialTeam = parseSafely('bt_team', MOCK_TEAM_MEMBERS);
        setTeamMembers(initialTeam.map((m: any) => ({
          ...m,
          specialty: m.specialty || [],
          certifications: m.certifications || [],
          departmentIds: m.departmentIds || [m.departmentId]
        })));

        setVendors(parseSafely('bt_vendors', []));
        setLeads(parseSafely('bt_leads', []));
        setActivityLogs(parseSafely('bt_logs', []));

        // 3. 優先解鎖介面 (不等待雲端)
        setInitialSyncDone(true);
        setTimeout(() => {
          setIsInitializing(false);
          clearTimeout(safetyTimeout);
        }, 800);
        console.log('System initialized successfully');

        // 4. 背景嘗試續連雲端
        try {
          await googleDriveService.init(DEFAULT_CLIENT_ID);
          if (localStorage.getItem('bt_cloud_connected') === 'true' && user?.role !== 'Guest') {
            await autoConnectCloud();
          }
        } catch (e) {
          console.warn('Google SDK 初始化背景執行中');
        }
      } catch (err) {
        console.error('啟動流程發生嚴重異常', err);
        setIsInitializing(false);
      }
    };
    startup();
  }, []);

  const autoConnectCloud = async () => {
    try {
      await googleDriveService.authenticate('none');
      setIsCloudConnected(true);
      setCloudError(null);

      const metadata = await googleDriveService.getFileMetadata();
      if (metadata) {
        lastRemoteModifiedTime.current = metadata.modifiedTime;
        const cloudData = await googleDriveService.loadFromCloud();
        if (cloudData) {
          updateStateWithMerge(cloudData);
          setLastCloudSync(new Date().toLocaleTimeString());
        }
      }
    } catch (e) {
      setCloudError('會話已過期');
    }
  };

  // 使用 Ref 追蹤最新數據與同步狀態，避免頻繁觸發 useEffect 重新整理
  const dataRef = React.useRef({ projects, customers, teamMembers, activityLogs, vendors, leads });

  React.useEffect(() => {
    dataRef.current = { projects, customers, teamMembers, activityLogs, vendors, leads };
  }, [projects, customers, teamMembers, activityLogs, vendors, leads]);

  const addActivityLog = useCallback((action: string, targetName: string, targetId: string, type: ActivityLog['type']) => {
    if (!user) return;
    const newLog: ActivityLog = {
      id: Date.now().toString(),
      userId: user.employeeId || 'unknown',
      userName: user.name,
      userAvatar: user.picture,
      action,
      targetId,
      targetName,
      type,
      timestamp: new Date().toISOString()
    };
    setActivityLogs(prev => [newLog, ...prev].slice(0, 50)); // 保留最近 50 筆
  }, [user]);

  const handleCloudSync = useCallback(async () => {
    if (!isCloudConnected || isSyncingRef.current || user?.role === 'Guest') return;

    isSyncingRef.current = true;
    setIsSyncing(true);
    try {
      // 在存檔前先檢查雲端是否有更新
      const metadata = await googleDriveService.getFileMetadata();
      if (metadata && lastRemoteModifiedTime.current && metadata.modifiedTime !== lastRemoteModifiedTime.current) {
        console.log('[Sync] Detected newer cloud version, merging before save...');
        const cloudData = await googleDriveService.loadFromCloud();
        if (cloudData) {
          updateStateWithMerge(cloudData);
        }
      }

      const success = await googleDriveService.saveToCloud({
        projects,
        customers,
        teamMembers,
        vendors,
        leads,
        activityLogs,
        lastUpdated: new Date().toISOString(),
        userEmail: user?.email
      });

      if (success) {
        const newMetadata = await googleDriveService.getFileMetadata();
        if (newMetadata) lastRemoteModifiedTime.current = newMetadata.modifiedTime;
        setLastCloudSync(new Date().toLocaleTimeString());
        setCloudError(null);
      } else {
        const status = googleDriveService.getLastErrorStatus();
        setCloudError(`同步失敗(${status || '?'})`);
      }
    } catch (err) {
      setCloudError('連線異常');
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [isCloudConnected, user?.email, user?.role, projects, customers, teamMembers, vendors, leads, activityLogs, updateStateWithMerge]);

  const handleConnectCloud = async () => {
    if (user?.role === 'Guest') return;
    try {
      setIsSyncing(true);
      setCloudError(null);
      await googleDriveService.authenticate('consent');
      localStorage.setItem('bt_cloud_connected', 'true');
      setIsCloudConnected(true);

      const cloudData = await googleDriveService.loadFromCloud();
      if (cloudData && cloudData.projects && confirm('雲端發現現有數據，是否要切換為雲端版本？')) {
        setProjects(cloudData.projects);
        setCustomers(cloudData.customers);
        setTeamMembers(cloudData.teamMembers);
        setActivityLogs(cloudData.activityLogs || []);
        setVendors(cloudData.vendors || []);
        setLastCloudSync(new Date().toLocaleTimeString());
      } else {
        await handleCloudSync();
      }
    } catch (err: any) {
      setCloudError('驗證失敗');
    } finally {
      setIsSyncing(false);
    }
  };

  // 安全儲存到 localStorage，處理 QuotaExceededError
  const safeLocalStorageSave = useCallback((key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014) {
        console.warn(`[Storage] QuotaExceededError for ${key}, attempting cleanup...`);
        // 嘗試清理策略
        try {
          // 1. 優先清除 Activity Logs (非必要資料)
          // 只保留最近 5 筆，或者直接清空，視情況而定
          const logsKey = 'bt_logs';
          const currentLogs = localStorage.getItem(logsKey);
          if (currentLogs) {
            // 嘗試只保留極少量日誌
            const parsedLogs = JSON.parse(currentLogs);
            if (Array.isArray(parsedLogs) && parsedLogs.length > 0) {
              localStorage.setItem(logsKey, JSON.stringify(parsedLogs.slice(0, 5)));
              console.log('[Storage] Aggressively trimmed activity logs to 5 entries');
            } else {
              localStorage.removeItem(logsKey);
            }
          }

          // 2. 再次嘗試儲存
          localStorage.setItem(key, JSON.stringify(data));
          return true;
        } catch (retryError) {
          console.error('[Storage] Retry failed. storage is full.');
          // CRITICAL CHANGE: 絕對不執行 localStorage.clear()，避免遺失專案資料。
          // 僅在 console 報錯，並依賴雲端同步作為備份。
          return false;
        }
      }
      console.error(`[Storage] Unexpected error saving ${key}:`, e);
      return false;
    }
  }, []);

  useEffect(() => {
    if (!initialSyncDone || !user) return;

    // 定期本地保存 (訪客不保存)
    if (user.role !== 'Guest') {
      // 使用安全儲存函式，處理 QuotaExceededError
      safeLocalStorageSave('bt_projects', projects);
      safeLocalStorageSave('bt_customers', customers);
      safeLocalStorageSave('bt_team', teamMembers);
      safeLocalStorageSave('bt_logs', activityLogs.slice(0, 30)); // 限制 logs 最多 30 筆
      safeLocalStorageSave('bt_vendors', vendors);
      safeLocalStorageSave('bt_leads', leads);
      setLastLocalSave(new Date().toLocaleTimeString());
    }

    // 智慧雲端自動同步 (當資料變更後 10 秒才觸發)
    if (isCloudConnected && !cloudError && user.role !== 'Guest') {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(() => {
        handleCloudSync();
      }, 3000);
    }
  }, [projects, customers, teamMembers, activityLogs, vendors, isCloudConnected, cloudError, initialSyncDone, handleCloudSync, user?.role, leads, safeLocalStorageSave]);

  // 背景心跳監測 (Heartbeat Polling) - 每 45 秒檢查一次雲端是否有新更動
  useEffect(() => {
    if (!isCloudConnected || user?.role === 'Guest' || !initialSyncDone) return;

    const heartbeat = setInterval(async () => {
      if (isSyncingRef.current) return;

      try {
        const metadata = await googleDriveService.getFileMetadata();
        if (metadata && metadata.modifiedTime !== lastRemoteModifiedTime.current) {
          console.log('[Heartbeat] Cloud data updated by another user, syncing...');
          const cloudData = await googleDriveService.loadFromCloud();
          if (cloudData) {
            updateStateWithMerge(cloudData);
            lastRemoteModifiedTime.current = metadata.modifiedTime;
            setLastCloudSync(new Date().toLocaleTimeString());
          }
        }
      } catch (e) {
        console.warn('Heartbeat check failed');
      }
    }, 45000);

    return () => clearInterval(heartbeat);
  }, [isCloudConnected, user?.role, initialSyncDone, updateStateWithMerge]);

  const handleUpdateStatus = (projectId: string, status: ProjectStatus) => {
    if (user?.role === 'Guest') return;
    const project = projects.find(p => p.id === projectId);
    if (project) {
      addActivityLog(`變更專案狀態：${status} `, project.name, projectId, 'project');
    }
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status, updatedAt: new Date().toISOString() } : p));
  };

  const handleAddComment = (projectId: string, text: string) => {
    if (!user || user.role === 'Guest') return;
    const project = projects.find(p => p.id === projectId);
    const newComment: ProjectComment = {
      id: Date.now().toString(),
      authorName: user.name,
      authorAvatar: user.picture,
      authorRole: user.role === 'SuperAdmin' ? '管理總監' : '成員',
      text,
      timestamp: new Date().toLocaleString('zh-TW', { hour12: false })
    };
    if (project) {
      addActivityLog(`在案件中留言`, project.name, projectId, 'project');
    }
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, comments: [newComment, ...(p.comments || [])], updatedAt: new Date().toISOString() } : p));
  };

  const handleAddDailyLog = (projectId: string, logData: { content: string, photoUrls: string[] }) => {
    if (!user || user.role === 'Guest') return;
    const project = projects.find(p => p.id === projectId);
    const newLog: DailyLogEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      content: logData.content,
      photoUrls: logData.photoUrls,
      authorId: user.employeeId || 'unknown',
      authorName: user.name,
      authorAvatar: user.picture
    };
    setProjects(prev => prev.map(p => p.id === projectId ? {
      ...p,
      dailyLogs: [newLog, ...(p.dailyLogs || [])],
      updatedAt: new Date().toISOString()
    } : p));
  };

  const handleUpdateChecklist = (projectId: string, checklist: ChecklistTask[]) => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, checklist, updatedAt: new Date().toISOString() } : p));
  };

  const handleUpdatePayments = (projectId: string, payments: PaymentStage[]) => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, payments, updatedAt: new Date().toISOString() } : p));
  };

  const handleConvertLead = (leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    const newProject: Project = {
      id: `AI${new Date().toISOString().slice(2, 10).replace(/-/g, '')}${Math.floor(100 + Math.random() * 900)}`,
      departmentId: viewingDeptId === 'all' ? 'DEPT-1' : viewingDeptId,
      name: `${lead.customerName} - 智慧抓漏會勘件`,
      category: '室內裝修',
      source: 'AI會勘系統',
      client: lead.customerName,
      referrer: 'Tiiny Web App',
      manager: user?.name || '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      createdDate: new Date().toISOString().split('T')[0],
      budget: 0,
      spent: 0,
      progress: 0,
      status: ProjectStatus.NEGOTIATING,
      tasks: [],
      phases: [],
      checklist: [],
      payments: [],
      updatedAt: new Date().toISOString(),
      inspectionData: {
        diagnosis: lead.diagnosis,
        suggestedFix: '待現場覆核後提供完整對策',
        originalPhotos: lead.photos,
        aiAnalysis: '初步特徵符合漏水徵兆，內容由智慧抓漏系統 v8.1 自動生成。',
        timestamp: lead.timestamp
      },
      financials: { labor: 0, material: 0, subcontractor: 0, other: 0 }
    };

    setProjects([newProject, ...projects]);
    setLeads(leads.map(l => l.id === leadId ? { ...l, status: 'converted' } : l));
    addActivityLog('將會勘線索轉為專案', newProject.name, newProject.id, 'project');
    setActiveTab('projects');
    setSelectedProjectId(newProject.id);
  };

  const handleMarkLogAsRead = (logId: string) => {
    setActivityLogs(prev => prev.map(log => log.id === logId ? { ...log, isRead: true } : log));
  };

  const handleMarkAllLogsAsRead = () => {
    setActivityLogs(prev => prev.map(log => ({ ...log, isRead: true })));
  };

  const handleLogout = () => {
    if (confirm('確定要安全登出生產系統嗎？')) {
      setUser(null);
      localStorage.removeItem('bt_user');
      setActiveTab('dashboard');
    }
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const filteredData = useMemo(() => {
    const filterByDept = (item: any) => {
      // 過濾已被軟刪除的項目
      if (item.deletedAt) return false;

      if (viewingDeptId === 'all') return true;
      // 支援多部門過濾
      if (item.departmentIds && Array.isArray(item.departmentIds) && item.departmentIds.length > 0) {
        return item.departmentIds.includes(viewingDeptId);
      }
      return item.departmentId === viewingDeptId;
    };
    return {
      projects: projects.filter(filterByDept),
      customers: customers.filter(filterByDept),
      teamMembers: teamMembers.filter(filterByDept),
      vendors: vendors.filter(filterByDept)
    };
  }, [projects, customers, teamMembers, vendors, viewingDeptId]);

  if (isInitializing) {
    return (
      <div className="h-screen w-screen bg-[#1c1917] flex flex-col items-center justify-center space-y-8 animate-in fade-in">
        <div className="relative">
          <img src="/pwa-icon.png" alt="Loading" className="w-24 h-24 object-contain animate-pulse" />
        </div>
        <div className="text-center space-y-3">
          <h2 className="text-white font-black text-2xl uppercase tracking-[0.2em]">Quality of Life</h2>
          <div className="flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce"></span>
            <p className="text-stone-500 text-[10px] font-black uppercase tracking-[0.2em]">Development Corporation</p>
          </div>
          <button
            onClick={() => setIsInitializing(false)}
            className="mt-4 text-stone-600 text-[10px] font-bold underline underline-offset-4 hover:text-orange-500 opacity-50 hover:opacity-100 transition-all"
          >
            直接進入系統 (跳過等待)
          </button>
        </div>
      </div>
    );
  }

  if (!user) return <Login onLoginSuccess={(u, d) => {
    const fullUser: User = { ...u, departmentId: d };
    setUser(fullUser);
    setViewingDeptId('all'); // 全員皆可查看所有專案
    localStorage.setItem('bt_user', JSON.stringify(fullUser));
  }} />;

  return (
    <div className="flex h-screen w-screen bg-[#fafaf9] overflow-hidden">
      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-[100] lg:hidden animate-in fade-in duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static transition-transform duration-500 z-[101] w-64 h-full shrink-0`}>
        <Sidebar activeTab={activeTab} setActiveTab={(t) => { setActiveTab(t); setSelectedProjectId(null); setIsSidebarOpen(false); }} user={user} onMenuClose={() => setIsSidebarOpen(false)} />
      </div>

      <main className="flex-1 flex flex-col h-full w-full min-0 relative">
        <header className="h-16 shrink-0 bg-white/80 backdrop-blur-xl border-b border-stone-200 px-4 lg:px-8 flex items-center justify-between no-print z-40">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-stone-600 hover:bg-stone-100 rounded-lg"><Menu size={24} /></button>

            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl shadow-lg ${user.role === 'Guest' ? 'bg-stone-900 text-orange-400' : 'bg-stone-900 text-white'}`}>
                <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${user.role === 'Guest' ? 'bg-orange-500' : 'bg-emerald-400'}`}></div>
                <span className="text-[10px] font-black uppercase tracking-widest">{user.role === 'Guest' ? '訪客唯讀模式' : '生產環境 已上線'}</span>
              </div>

              {user.role !== 'Guest' && (
                <div className="flex items-center">
                  {cloudError ? (
                    <button onClick={handleConnectCloud} className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-2xl border border-rose-200 animate-pulse"><AlertCircle size={14} /><span className="text-[10px] font-black uppercase tracking-[0.1em]">{cloudError}</span></button>
                  ) : isCloudConnected ? (
                    <div className="flex items-center gap-2.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100 shadow-sm">
                      <div className="relative"><CheckCircle size={14} className="text-emerald-500" />{isSyncing && <RefreshCw size={10} className="absolute -top-1 -right-1 text-emerald-600 animate-spin bg-white rounded-full p-0.5" />}</div>
                      <div className="flex flex-col"><span className="text-[9px] font-black uppercase tracking-widest leading-none">{isSyncing ? '同步中...' : '雲端同步就緒'}</span></div>
                    </div>
                  ) : (
                    <button onClick={handleConnectCloud} className="flex items-center gap-2 px-3 py-1.5 bg-stone-100 text-stone-400 rounded-2xl border border-stone-200 hover:text-orange-600"><CloudOff size={14} /><span className="text-[10px] font-black uppercase tracking-widest">離線保護模式</span></button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsNotificationOpen(true)}
              className="relative p-2.5 bg-white text-stone-900 rounded-2xl border border-stone-200 shadow-sm hover:ring-2 hover:ring-orange-100 hover:border-orange-200 transition-all active:scale-95 flex items-center justify-center shrink-0"
            >
              <Bell size={18} className="text-stone-600" />
              {activityLogs.length > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-orange-600 rounded-full border-2 border-white animate-pulse"></span>
              )}
            </button>

            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-2xl border border-orange-100">
              <Sparkles size={12} className="text-orange-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest">AI 智慧分析已掛載</span>
            </div>

            <div className="flex items-center gap-2 bg-stone-100 px-3 py-1.5 rounded-xl border border-stone-200">
              <Layers size={14} className="text-stone-400" />
              <select className="bg-transparent text-[11px] font-black text-stone-900 outline-none" value={viewingDeptId} onChange={(e) => setViewingDeptId(e.target.value)}>
                <option value="all">全公司視野</option>
                {MOCK_DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>

            <button onClick={handleLogout} className="p-2 text-stone-400 hover:text-rose-600 transition-colors"><LogOut size={20} /></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto touch-scroll">
          {selectedProject ? (
            <ProjectDetail
              project={selectedProject} user={user} teamMembers={teamMembers}
              onBack={() => setSelectedProjectId(null)}
              onEdit={(p) => { setEditingProject(p); setIsModalOpen(true); }}
              onDelete={(id) => {
                if (confirm('確定要刪除嗎？')) {
                  // Soft Delete: 標記刪除而非移除
                  setProjects(prev => prev.map(p => p.id === id ? { ...p, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : p));
                  setSelectedProjectId(null);
                }
              }}
              onUpdateStatus={(status) => handleUpdateStatus(selectedProject.id, status)}
              onAddComment={(text) => handleAddComment(selectedProject.id, text)}
              onUpdateFiles={(files) => setProjects(prev => prev.map(p => p.id === selectedProjectId ? { ...p, files, updatedAt: new Date().toISOString() } : p))}
              onUpdatePhases={(phases) => setProjects(prev => prev.map(p => p.id === selectedProjectId ? { ...p, phases, updatedAt: new Date().toISOString() } : p))}
              onAddDailyLog={(log) => handleAddDailyLog(selectedProjectId, log)}
              onUpdateChecklist={(checklist) => handleUpdateChecklist(selectedProjectId, checklist)}
              onUpdatePayments={(payments) => handleUpdatePayments(selectedProjectId, payments)}
              onUpdateTasks={(tasks) => setProjects(prev => prev.map(p => p.id === selectedProject.id ? { ...p, tasks, updatedAt: new Date().toISOString() } : p))}
              onUpdateProgress={(progress) => setProjects(prev => prev.map(p => p.id === selectedProject.id ? { ...p, progress, updatedAt: new Date().toISOString() } : p))}
              onUpdateExpenses={(expenses) => setProjects(prev => prev.map(p => p.id === selectedProject.id ? { ...p, expenses, updatedAt: new Date().toISOString() } : p))}
              onUpdateWorkAssignments={(assignments) => setProjects(prev => prev.map(p => p.id === selectedProject.id ? { ...p, workAssignments: assignments, updatedAt: new Date().toISOString() } : p))}
              onLossClick={() => handleUpdateStatus(selectedProject.id, ProjectStatus.LOST)}
            />
          ) : (
            <div className="pb-32">
              {activeTab === 'dashboard' && !isCloudConnected && user.role !== 'Guest' && (
                <div className="mx-4 lg:mx-8 mt-6 p-5 bg-orange-600 text-white rounded-[2rem] shadow-2xl flex items-center justify-between gap-6 animate-in slide-in-from-top-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-white/20 p-3 rounded-2xl"><ShieldCheck size={28} /></div>
                    <div>
                      <p className="text-sm font-black uppercase tracking-[0.1em]">啟動數據安全備份</p>
                      <p className="text-[11px] opacity-80 font-bold mt-1">為了確保數據不遺失，請立即連結您的 Google Drive。</p>
                    </div>
                  </div>
                  <button onClick={handleConnectCloud} className="bg-white text-orange-600 px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-stone-50 transition-all flex items-center gap-3"><Zap size={16} fill="currentColor" /> 立即連結雲端</button>
                </div>
              )}

              {activeTab === 'dashboard' && <Dashboard
                projects={filteredData.projects}
                leads={leads}
                onConvertLead={handleConvertLead}
                onProjectClick={(id) => { setSelectedProjectId(id); setActiveTab('projects'); }}
              />}
              {activeTab === 'projects' && <ProjectList
                projects={filteredData.projects}
                user={user}
                onAddClick={() => { setEditingProject(null); setIsModalOpen(true); }}
                onEditClick={(p) => { setEditingProject(p); setIsModalOpen(true); }}
                onDeleteClick={(id) => {
                  if (confirm('刪除操作將移動至回收桶，確定嗎？')) {
                    const p = projects.find(x => x.id === id);
                    if (p) addActivityLog('刪除了專案', p.name, id, 'project');
                    setProjects(prev => prev.map(p => p.id === id ? { ...p, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : p));
                  }
                }}
                onDetailClick={(p) => setSelectedProjectId(p.id)}
                onLossClick={() => { }}
              />}
              {activeTab === 'settings' && (
                <Settings
                  user={user} projects={projects} customers={customers} teamMembers={teamMembers}
                  onResetData={() => { if (confirm('注意：這將清除所有數據，確定嗎？')) { localStorage.clear(); window.location.reload(); } }}
                  onImportData={(data) => {
                    try {
                      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
                      if (parsed.projects) setProjects(parsed.projects);
                      if (parsed.customers) setCustomers(parsed.customers);
                      if (parsed.teamMembers) setTeamMembers(parsed.teamMembers);
                      if (parsed.vendors) setVendors(parsed.vendors);
                      alert('資料匯入成功！');
                    } catch (e) { alert('匯入失敗：格式錯誤'); }
                  }}
                  isCloudConnected={isCloudConnected}
                  onConnectCloud={handleConnectCloud}
                  onDownloadBackup={() => {
                    googleDriveService.exportAsFile({ projects, customers, teamMembers, vendors });
                  }}
                  onDisconnectCloud={() => { setIsCloudConnected(false); localStorage.removeItem('bt_cloud_connected'); }}
                  lastSyncTime={lastCloudSync}
                />
              )}
              {activeTab === 'team' && <TeamList
                members={filteredData.teamMembers}
                departments={MOCK_DEPARTMENTS}
                onAddClick={() => { setEditingMember(null); setIsTeamModalOpen(true); }}
                onEditClick={(m) => { setEditingMember(m); setIsTeamModalOpen(true); }}
                onDeleteClick={(id) => {
                  if (confirm('確定移除此成員？')) {
                    const m = teamMembers.find(x => x.id === id);
                    if (m) addActivityLog('移除了成員', m.name, id, 'team');
                    setTeamMembers(prev => prev.map(m => m.id === id ? { ...m, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : m));
                  }
                }}
              />}
              {activeTab === 'customers' && <CustomerList
                customers={filteredData.customers}
                onAddClick={() => { setEditingCustomer(null); setIsCustomerModalOpen(true); }}
                onEditClick={(c) => { setEditingCustomer(c); setIsCustomerModalOpen(true); }}
                onDeleteClick={(id) => {
                  if (confirm('確定移除此客戶？')) {
                    const c = customers.find(x => x.id === id);
                    if (c) addActivityLog('移除了客戶', c.name, id, 'customer');
                    setCustomers(prev => prev.map(c => c.id === id ? { ...c, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : c));
                  }
                }}
              />}
              {activeTab === 'dispatch' && <DispatchManager projects={filteredData.projects} teamMembers={filteredData.teamMembers} onAddDispatch={(pid, ass) => setProjects(prev => prev.map(p => p.id === pid ? { ...p, workAssignments: [ass, ...(p.workAssignments || [])], updatedAt: new Date().toISOString() } : p))} onDeleteDispatch={(pid, aid) => setProjects(prev => prev.map(p => p.id === pid ? { ...p, workAssignments: (p.workAssignments || []).filter(a => a.id !== aid), updatedAt: new Date().toISOString() } : p))} />}
              {activeTab === 'analytics' && <Analytics projects={filteredData.projects} />}

              {activeTab === 'vendors' && (
                <div className="p-4 lg:p-8 space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-black text-stone-900 tracking-tight">廠商與工班管理</h2>
                    <button
                      onClick={() => {
                        setEditingVendor(null);
                        setIsVendorModalOpen(true);
                      }}
                      className="bg-stone-900 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg shadow-stone-200 active:scale-95 transition-all"
                    >
                      + 新增廠商
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {vendors.map(v => (
                      <div key={v.id} className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex justify-between items-start mb-4">
                          <div className="bg-stone-100 px-2 py-0.5 rounded text-[8px] font-black text-stone-500 uppercase">{v.id}</div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button
                              onClick={() => {
                                setEditingVendor(v);
                                setIsVendorModalOpen(true);
                              }}
                              className="text-stone-300 hover:text-blue-600 p-1"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`確定要刪除廠商 ${v.name} 嗎？`)) {
                                  setVendors(prev => prev.map(vend => vend.id === v.id ? { ...vend, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : vend));
                                }
                              }}
                              className="text-stone-300 hover:text-rose-500 p-1"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <h3 className="text-lg font-black text-stone-900 mb-1">{v.name}</h3>
                        <p className="text-[10px] font-black text-blue-600 uppercase mb-4 tracking-widest">{v.type}</p>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs font-medium text-stone-500">
                            <UserIcon size={14} /> {v.contact}
                          </div>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Sparkles key={i} size={10} className={i < v.rating ? 'text-amber-400' : 'text-stone-200'} />
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                    {vendors.length === 0 && (
                      <div className="col-span-full py-20 bg-stone-50 rounded-[2.5rem] border-2 border-dashed border-stone-100 flex flex-col items-center justify-center text-stone-300 gap-4">
                        <ShoppingBag size={48} />
                        <p className="text-[10px] font-black uppercase tracking-widest">尚無廠商資料</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {activeTab === 'help' && <HelpCenter />}
            </div>
          )}
        </div>

        {!selectedProjectId && (
          <div className="fixed bottom-8 right-8 z-[45] flex flex-col items-end gap-3 no-print">
            <div className="bg-white/90 backdrop-blur-2xl border border-stone-200 p-4 rounded-[2rem] shadow-2xl flex items-center gap-6 animate-in slide-in-from-right-12">
              <div className="flex items-center gap-3 border-r border-stone-100 pr-6">
                <Activity size={18} className="text-emerald-500" />
                <div className="flex flex-col"><span className="text-[9px] font-black text-stone-400 uppercase tracking-widest leading-none">系統狀態</span><span className="text-[10px] font-bold text-stone-900">核心正常</span></div>
              </div>
              <div className="flex items-center gap-3">
                <Database size={16} className="text-blue-500" />
                <div className="flex flex-col"><span className="text-[9px] font-black text-stone-400 uppercase tracking-widest leading-none">數據緩存</span><span className="text-[10px] font-bold text-stone-900">{lastLocalSave}</span></div>
              </div>
            </div>
          </div>
        )}

        <div className="no-print"><AIAssistant projects={filteredData.projects} /></div>
      </main>

      {isModalOpen && user.role !== 'Guest' && <ProjectModal onClose={() => setIsModalOpen(false)} onConfirm={(data) => {
        const sourcePrefixes: Record<string, string> = {
          'BNI': 'BNI',
          '台塑集團': 'FPC',
          '士林電機': 'SE',
          '信義居家': 'SY',
          '企業': 'CORP',
          '新建工程': 'NEW',
          '網路客': 'OC',
          '住宅': 'AB',
          'JW': 'JW',
          '台灣美光晶圓': 'MIC'
        };

        if (editingProject) {
          addActivityLog('更新了專案資訊', data.name, editingProject.id, 'project');
          setProjects(prev => prev.map(p => {
            if (p.id === editingProject.id) {
              let updatedId = p.id;
              // 如果來源變更，更新 ID 的字首
              if (data.source && data.source !== p.source) {
                const oldPrefix = sourcePrefixes[p.source] || 'PJ';
                const newPrefix = sourcePrefixes[data.source] || 'PJ';
                updatedId = p.id.replace(oldPrefix, newPrefix);
              }
              return { ...p, ...data, id: updatedId, updatedAt: new Date().toISOString() };
            }
            return p;
          }));
        } else {
          // 案件編號產生規則: [來源代碼][年份(YYYY)][流水號(001)]
          const prefix = sourcePrefixes[data.source || 'BNI'] || 'PJ';
          const year = new Date().getFullYear().toString();

          // 找尋全系統當年度的最末流水號 (不分來源)
          const sameYearProjects = projects.filter(p => p.id.includes(year));
          let sequence = 1;
          if (sameYearProjects.length > 0) {
            // 從所有專案中提取最後三碼流水號
            const sequences = sameYearProjects.map(p => {
              const match = p.id.match(/\d{3}$/);
              return match ? parseInt(match[0]) : 0;
            });
            sequence = Math.max(...sequences) + 1;
          }

          const newId = `${prefix}${year}${sequence.toString().padStart(3, '0')}`;
          addActivityLog('建立新專案', data.name, newId, 'project');
          setProjects(prev => [{ ...data, id: newId, status: ProjectStatus.NEGOTIATING, progress: 0, workAssignments: [], expenses: [], comments: [], files: [], phases: [], updatedAt: new Date().toISOString() } as any, ...prev]);
        }
        setIsModalOpen(false);
      }} initialData={editingProject} teamMembers={teamMembers} />}

      {isCustomerModalOpen && user?.role !== 'Guest' && <CustomerModal
        onClose={() => setIsCustomerModalOpen(false)}
        onConfirm={(data) => {
          if (editingCustomer) {
            addActivityLog('更新客戶資料', data.name, editingCustomer.id, 'customer');
            setCustomers(prev => prev.map(c => c.id === editingCustomer.id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c));
          } else {
            const newId = 'C' + Date.now().toString().slice(-6);
            addActivityLog('新增客戶', data.name, newId, 'customer');
            setCustomers(prev => [{ ...data, id: newId, createdDate: new Date().toISOString().split('T')[0], updatedAt: new Date().toISOString() } as any, ...prev]);
          }
          setIsCustomerModalOpen(false);
          setEditingCustomer(null);
        }}
        initialData={editingCustomer}
      />}

      {isTeamModalOpen && user?.role !== 'Guest' && <TeamModal
        onClose={() => { setIsTeamModalOpen(false); setEditingMember(null); }}
        onConfirm={(data) => {
          if (editingMember) {
            addActivityLog('更新成員資料', data.name, editingMember.id, 'team');
            setTeamMembers(prev => prev.map(m => m.id === editingMember.id ? { ...m, ...data, updatedAt: new Date().toISOString() } : m));
          } else {
            const newId = 'T' + Date.now().toString().slice(-6);
            addActivityLog('新增團隊成員', data.name, newId, 'team');
            setTeamMembers(prev => [{ ...data, id: newId, status: 'Available', activeProjectsCount: 0, systemRole: data.systemRole || 'Staff', departmentId: data.departmentId || 'DEPT-1', updatedAt: new Date().toISOString() } as any, ...prev]);
          }
          setIsTeamModalOpen(false);
          setEditingMember(null);
        }}
        initialData={editingMember}
        currentUser={user!}
      />}

      <VendorModal
        isOpen={isVendorModalOpen}
        onClose={() => { setIsVendorModalOpen(false); setEditingVendor(null); }}
        onSave={(data) => {
          const timestampedData = { ...data, updatedAt: new Date().toISOString() };
          if (editingVendor) {
            addActivityLog('更新廠商資料', data.name, editingVendor.id, 'vendor');
            setVendors(prev => prev.map(v => v.id === data.id ? timestampedData : v));
          } else {
            addActivityLog('新增合作廠商', data.name, data.id, 'vendor');
            setVendors(prev => [timestampedData, ...prev]);
          }
          setIsVendorModalOpen(false);
          setEditingVendor(null);
        }}
        vendor={editingVendor}
      />

      {/* Activity Log Side Panel Overlay */}
      {isNotificationOpen && (
        <>
          <div
            className="fixed inset-0 bg-stone-900/20 backdrop-blur-sm z-[110] animate-in fade-in duration-300"
            onClick={() => setIsNotificationOpen(false)}
          />
          <div className="fixed top-0 right-0 bottom-0 w-full max-w-[400px] z-[120] shadow-2xl">
            <NotificationPanel
              logs={activityLogs}
              onClose={() => setIsNotificationOpen(false)}
              onProjectClick={(id) => {
                setSelectedProjectId(id);
                setIsNotificationOpen(false);
                setActiveTab('projects');
              }}
              onMarkAsRead={handleMarkLogAsRead}
              onMarkAllAsRead={handleMarkAllLogsAsRead}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default App;
