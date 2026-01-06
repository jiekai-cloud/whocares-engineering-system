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
import ModuleManager from './components/ModuleManager';
import { Menu, LogOut, Layers, Cloud, CloudOff, RefreshCw, AlertCircle, CheckCircle, ShieldCheck, Database, Zap, Sparkles, Globe, Activity, ShieldAlert, Bell, User as LucideUser, Trash2, ShoppingBag, Receipt, Pencil, X, ExternalLink, Download } from 'lucide-react';
import NotificationPanel from './components/NotificationPanel';
import { MOCK_PROJECTS, MOCK_DEPARTMENTS, MOCK_TEAM_MEMBERS } from './constants';
import { Project, ProjectStatus, Customer, TeamMember, User, Department, ProjectComment, ActivityLog, Vendor, ChecklistTask, PaymentStage, DailyLogEntry, Lead } from './types';
import { googleDriveService, DEFAULT_CLIENT_ID } from './services/googleDriveService';
import { moduleService } from './services/moduleService';
import { ModuleId } from './moduleConfig';

// Build Trigger: 2026-01-05 Module System Integration
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
  const [isAISettingsOpen, setIsAISettingsOpen] = useState(false);
  const [aiApiKey, setAiApiKey] = useState(localStorage.getItem('GEMINI_API_KEY') || '');

  const saveAiApiKey = () => {
    localStorage.setItem('GEMINI_API_KEY', aiApiKey);
    setIsAISettingsOpen(false);
    alert('AI 金鑰已儲存，服務將在下次解析時生效。');
    window.location.reload();
  };

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

  // Helper: Normalize, Correct, and Deduplicate Projects
  // This ensures that whether data comes from LocalStorage or Cloud, it strictly follows our ID rules
  const normalizeProjects = useCallback((projects: Project[]): Project[] => {
    // 0. ID CORRECTION: Enforce correct IDs based on Project Name or known Legacy IDs
    let processed = projects.map(p => {
      // Rule 1: Fix Zhishan (User requested 001)
      if (p.name.includes('至善') || p.id === 'BNI2601911') return { ...p, id: 'BNI2601001' };
      // Rule 2: Fix Guishan (002)
      if (p.name.includes('龜山')) return { ...p, id: 'BNI2601002' };
      // Rule 3: Fix Guangfu North (004) - Fixes missing project by catching legacy ID
      if (p.name.includes('光復北路') || p.id === 'BNI2601908') return { ...p, id: 'BNI2601004' };
      // Rule 4: Fix Guangfu South (005) - Fixes legacy ID persistence
      if (p.name.includes('光復南路') || p.id === 'OC2601909') return { ...p, id: 'OC2601005' };
      return p;
    });

    // Migration: Update old project ID format to new format
    const sourcePrefixes: Record<string, string> = {
      'BNI': 'BNI', '台塑集團': 'FPC', '士林電機': 'SE', '信義居家': 'SY',
      '企業': 'CORP', '新建工程': 'NEW', '網路客': 'OC', '住宅': 'AB',
      'JW': 'JW', '台灣美光晶圓': 'MIC'
    };

    processed = processed.map(p => {
      let updatedProject = { ...p };
      // CLEANUP: Fix incorrectly migrated IDs (format: PREFIX0101XXX)
      const brokenFormatMatch = updatedProject.id.match(/^([A-Z]+)0101(\d{3})$/);
      if (brokenFormatMatch) {
        const [, prefix, serial] = brokenFormatMatch;
        const year = new Date().getFullYear();
        const yearShort = year.toString().slice(-2);
        updatedProject.id = `${prefix}${yearShort}01${serial}`;
      }
      // Specific fix: JW2601907 should be JW2601003
      if (p.id === 'JW2601907') updatedProject.id = 'JW2601003';

      // Old format migration
      const oldFormatMatch = updatedProject.id.match(/^([A-Z]+)(20\d{2})(\d{3,4})$/);
      if (oldFormatMatch) {
        const [, prefix, year, serial] = oldFormatMatch;
        const yearShort = year.slice(-2);
        const serialPadded = serial.padStart(3, '0');
        updatedProject.id = `${prefix}${yearShort}01${serialPadded}`;
      }
      return updatedProject;
    });

    // Deduplicate projects by ID
    const projectMap = new Map<string, Project>();
    processed.forEach(p => {
      if (!projectMap.has(p.id)) {
        projectMap.set(p.id, p);
      } else {
        const existing = projectMap.get(p.id)!;
        // Conflict Resolution: Prefer "Canonical Name"
        const isCurrentCanonical = MOCK_PROJECTS.some(mp => mp.id === p.id && mp.name === p.name);
        const isExistingCanonical = MOCK_PROJECTS.some(mp => mp.id === existing.id && mp.name === existing.name);
        if (isCurrentCanonical && !isExistingCanonical) {
          projectMap.set(p.id, p);
        } else if (!isExistingCanonical) {
          // If neither is canonical, prefer the one with later update time, or just keep existing
          const existingTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
          const currentTime = p.updatedAt ? new Date(p.updatedAt).getTime() : 0;
          if (currentTime > existingTime) projectMap.set(p.id, p);
        }
      }
    });

    return Array.from(projectMap.values());
  }, []);

  const updateStateWithMerge = useCallback((cloudData: any) => {
    if (!cloudData) return;

    // Apply rigorous normalization to cloud data BEFORE merging
    // This prevents "bad" IDs from the cloud (e.g. BNI2601911) from bypassing local checks and creating duplicates
    const cleanCloudProjects = normalizeProjects(cloudData.projects || []);

    setProjects(prev => mergeData(prev, cleanCloudProjects));
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
  }, [mergeData, normalizeProjects]);

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

        // 0. Force Restore Critical Projects (Missing from localStorage)
        // This handles cases where localStorage has 'valid' but incomplete data
        const criticalRestorationIds = ['BNI2601001', 'BNI2601002', 'BNI2601004', 'OC2601005'];

        // 1. Recover Soft-Deleted Projects (Undo delete)
        initialProjects = initialProjects.map((p: any) => {
          if (criticalRestorationIds.includes(p.id) && p.deletedAt) {
            console.log(`Force recovering soft-deleted project: ${p.id}`);
            const { deletedAt, ...rest } = p; // Remove deletedAt
            return { ...rest, updatedAt: new Date().toISOString() };
          }
          return p;
        });

        // 2. Restore Missing Projects (Completely missing)
        const missingProjects = MOCK_PROJECTS.filter(mockP =>
          criticalRestorationIds.includes(mockP.id) &&
          !initialProjects.some((p: Project) =>
            // Check against both ID and potentially un-migrated ID/Name to be safe, 
            // but normalizeProjects will handle the ID fix later.
            // Here we just want to ensure we inject if absolutely missing.
            p.id === mockP.id || (p.name === mockP.name)
          )
        );

        if (missingProjects.length > 0) {
          console.log('Restoring missing critical projects:', missingProjects.map(p => p.name));
          initialProjects = [...initialProjects, ...missingProjects];
        }

        // 3. Normalize and Deduplicate
        // Use the same shared logic as cloud sync
        const deduplicatedProjects = normalizeProjects(initialProjects);

        // CRITICAL FIX: Update State FIRST before attempting to save to localStorage
        // This ensures that even if storage is full (QuotaExceededError), the user still sees their data.
        setProjects(deduplicatedProjects.map((p: Project) => ({
          ...p,
          expenses: p.expenses || [],
          workAssignments: p.workAssignments || [],
          files: p.files || [],
          phases: p.phases || [],
          dailyLogs: p.dailyLogs || [],
          checklist: p.checklist || [],
          payments: p.payments || []
        })));

        const customersData = parseSafely('bt_customers', []);
        setCustomers(customersData);

        const initialTeam = parseSafely('bt_team', MOCK_TEAM_MEMBERS);
        setTeamMembers(initialTeam.map((m: any) => ({
          ...m,
          specialty: m.specialty || [],
          certifications: m.certifications || [],
          departmentIds: m.departmentIds || [m.departmentId]
        })));

        const vendorsData = parseSafely('bt_vendors', []);
        setVendors(vendorsData);

        const leadsData = parseSafely('bt_leads', []);
        setLeads(leadsData);

        const logsData = parseSafely('bt_logs', []);
        setActivityLogs(logsData);

        // Try to save back to localStorage (migration/deduplication results)
        // Wrapped in try-catch so it doesn't block the UI if it fails
        try {
          localStorage.setItem('bt_projects', JSON.stringify(deduplicatedProjects));
          console.log(`Saved ${deduplicatedProjects.length} deduplicated projects to localStorage`);
        } catch (e) {
          console.warn('Failed to save deduplicated projects to localStorage (Quota or Error)', e);
        }

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
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status, statusChangedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : p));
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
  const handleAddTestProject = () => {
    const today = new Date().toISOString().split('T')[0];
    const testId = `TEST-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${Math.floor(100 + Math.random() * 900)}`;

    const testProject: Project = {
      id: testId,
      departmentId: viewingDeptId === 'all' ? 'DEPT-1' : viewingDeptId,
      name: '系統測試案件 - 萬大路室內裝修工程',
      category: '室內裝修',
      source: '系統測試',
      client: '測試客戶 (林先生)',
      location: '台北市萬華區萬大路 123 號 5 樓',
      manager: user?.name || '測試經理',
      startDate: today,
      endDate: new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0],
      createdDate: today,
      budget: 1200000,
      spent: 0,
      progress: 15,
      status: ProjectStatus.CONSTRUCTING,
      tasks: [
        { id: 'T-1', title: '現場放樣與水電確認', completed: true, priority: 'High', dueDate: today },
        { id: 'T-2', title: '拆除牆面與清運', completed: true, priority: 'Medium', dueDate: today },
        { id: 'T-3', title: '泥作粉刷工程', completed: false, priority: 'Medium', dueDate: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0] }
      ],
      phases: [
        { id: 'P-1', name: '準備階段', startDate: today, endDate: today, status: 'Completed', progress: 100 },
        { id: 'P-2', name: '拆除工程', startDate: today, endDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0], status: 'Current', progress: 50 },
        { id: 'P-3', name: '泥作工程', startDate: new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0], endDate: new Date(Date.now() + 86400000 * 10).toISOString().split('T')[0], status: 'Upcoming', progress: 0 }
      ],
      checklist: [
        { id: 'C-1', category: '合約與文件', task: '合約用印與簽署', completed: true },
        { id: 'C-2', category: '合約與文件', task: '室內裝修審查申請', completed: false }
      ],
      payments: [
        { id: 'PY-1', stage: '開工案', amount: 360000, dueDate: today, status: 'Paid', datePaid: today },
        { id: 'PY-2', stage: '泥作完成', amount: 360000, dueDate: new Date(Date.now() + 86400000 * 15).toISOString().split('T')[0], status: 'Pending' }
      ],
      updatedAt: new Date().toISOString(),
      financials: { labor: 0, material: 0, subcontractor: 0, other: 0 }
    };

    setProjects([testProject, ...projects]);
    addActivityLog('新增測試案件', testProject.name, testProject.id, 'project');
    setSelectedProjectId(testProject.id);
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
          <img src="./pwa-icon.png" alt="Loading" className="w-24 h-24 object-contain animate-pulse" />
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

  // 同步專用視角 (用於初始化新設備)
  if (user.role === 'SyncOnly') {
    return (
      <div className="h-screen w-screen bg-stone-950 flex flex-col items-center justify-center p-8 overflow-hidden font-sans relative">
        <div className="absolute inset-0 bg-stone-900/50 backdrop-blur-3xl z-0"></div>
        <div className="relative z-10 w-full max-w-lg bg-white rounded-[3rem] p-12 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border border-stone-200">
          <div className="text-center space-y-4 mb-10">
            <div className="w-20 h-20 bg-emerald-500 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/20 mb-6">
              <Cloud size={40} className="text-white animate-bounce" />
            </div>
            <h1 className="text-3xl font-black text-stone-900 tracking-tight">系統同步中心</h1>
            <p className="text-stone-500 text-sm font-bold uppercase tracking-widest">Initial Cloud Synchronization</p>
          </div>

          <div className="space-y-6">
            <div className={`p-6 rounded-3xl border transition-all ${isCloudConnected ? 'bg-emerald-50 border-emerald-100' : 'bg-stone-50 border-stone-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isCloudConnected ? 'bg-emerald-500 text-white' : 'bg-stone-200 text-stone-400'}`}>
                    {isCloudConnected ? <CheckCircle size={24} /> : <CloudOff size={24} />}
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-stone-400 mb-1">連線狀態</p>
                    <p className={`text-sm font-black ${isCloudConnected ? 'text-emerald-700' : 'text-stone-600'}`}>
                      {isCloudConnected ? '已連結至 Google Drive' : '尚未連結雲端'}
                    </p>
                  </div>
                </div>
                {!isCloudConnected && (
                  <button onClick={handleConnectCloud} className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95">
                    立即連結
                  </button>
                )}
              </div>
            </div>

            {isCloudConnected && (
              <div className="p-6 bg-stone-50 rounded-3xl border border-stone-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-stone-200 shadow-sm">
                      <RefreshCw size={24} className={`text-stone-400 ${isSyncing ? 'animate-spin' : ''}`} />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-stone-400 mb-1">同步進度</p>
                      <p className="text-sm font-black text-stone-900">
                        {isSyncing ? '正在下載數據...' : lastCloudSync ? `最後同步: ${lastCloudSync}` : '等待下載'}
                      </p>
                    </div>
                  </div>
                  <button
                    disabled={isSyncing}
                    onClick={handleCloudSync}
                    className="p-3 bg-white border border-stone-200 rounded-2xl text-stone-600 hover:text-orange-600 hover:border-orange-200 transition-all shadow-sm disabled:opacity-50"
                  >
                    <Download size={20} />
                  </button>
                </div>
              </div>
            )}

            {cloudError && (
              <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 animate-in shake duration-500">
                <AlertCircle className="text-rose-500 shrink-0" size={18} />
                <p className="text-rose-600 text-xs font-bold">{cloudError}</p>
              </div>
            )}
          </div>

          <div className="mt-12 space-y-4">
            <p className="text-center text-[10px] text-stone-400 font-bold leading-relaxed px-6">
              ✨ 同步完成後，請點擊下方按鈕登出。
              <br />之後即可使用您的個人員工編號直接登入本設備。
            </p>
            <button
              onClick={handleLogout}
              className="w-full py-5 bg-stone-900 hover:bg-stone-800 text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all shadow-2xl shadow-stone-950/20 flex items-center justify-center gap-3"
            >
              登出並完成初始化
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

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
          <div className="flex items-center gap-2 sm:gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-stone-600 hover:bg-stone-100 rounded-lg"><Menu size={24} /></button>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-2xl shadow-lg ${user.role === 'Guest' ? 'bg-stone-900 text-orange-400' : 'bg-stone-900 text-white'}`}>
                <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${user.role === 'Guest' ? 'bg-orange-500' : 'bg-emerald-400'}`}></div>
                <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">{user.role === 'Guest' ? '訪客唯讀模式' : '生產環境 已上線'}</span>
                <span className="text-[10px] font-black uppercase tracking-widest sm:hidden">PROD</span>
              </div>

              {user.role !== 'Guest' && (
                <div className="flex items-center">
                  {cloudError ? (
                    <button onClick={handleConnectCloud} className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 bg-rose-50 text-rose-600 rounded-2xl border border-rose-200 animate-pulse"><AlertCircle size={14} /><span className="text-[10px] font-black uppercase tracking-[0.1em] hidden sm:inline">{cloudError}</span></button>
                  ) : isCloudConnected ? (
                    <div className="flex items-center gap-1 sm:gap-2.5 px-2 sm:px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100 shadow-sm">
                      <div className="relative"><CheckCircle size={14} className="text-emerald-500" />{isSyncing && <RefreshCw size={10} className="absolute -top-1 -right-1 text-emerald-600 animate-spin bg-white rounded-full p-0.5" />}</div>
                      <div className="flex flex-col"><span className="text-[9px] font-black uppercase tracking-widest leading-none hidden sm:inline">{isSyncing ? '同步中...' : '雲端同步就緒'}</span></div>
                    </div>
                  ) : (
                    <button onClick={handleConnectCloud} className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 bg-stone-100 text-stone-400 rounded-2xl border border-stone-200 hover:text-orange-600"><CloudOff size={14} /></button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setIsNotificationOpen(true)}
              className="relative p-2.5 bg-white text-stone-900 rounded-2xl border border-stone-200 shadow-sm hover:ring-2 hover:ring-orange-100 hover:border-orange-200 transition-all active:scale-95 flex items-center justify-center shrink-0"
            >
              <Bell size={18} className="text-stone-600" />
              {activityLogs.length > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-orange-600 rounded-full border-2 border-white animate-pulse"></span>
              )}
            </button>

            <button
              onClick={() => setIsAISettingsOpen(true)}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border transition-all hover:scale-105 active:scale-95 bg-emerald-50 text-emerald-700 border-emerald-100 shadow-sm"
            >
              <Sparkles size={12} className="text-emerald-500" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                AI 智慧服務已啟用
              </span>
            </button>

            <div className="hidden sm:flex items-center gap-2 bg-stone-100 px-3 py-1.5 rounded-xl border border-stone-200">
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
              onUpdateTasks={(tasks) => setProjects(prev => prev.map(p => p.id === selectedProjectId ? { ...p, tasks, updatedAt: new Date().toISOString() } : p))}
              onUpdateProgress={(progress) => setProjects(prev => prev.map(p => p.id === selectedProjectId ? { ...p, progress, updatedAt: new Date().toISOString() } : p))}
              onUpdateExpenses={(expenses) => setProjects(prev => prev.map(p => p.id === selectedProjectId ? { ...p, expenses, updatedAt: new Date().toISOString() } : p))}
              onUpdateWorkAssignments={(assignments) => setProjects(prev => prev.map(p => p.id === selectedProjectId ? { ...p, workAssignments: assignments, updatedAt: new Date().toISOString() } : p))}
              onUpdatePreConstruction={(prep) => setProjects(prev => prev.map(p => p.id === selectedProjectId ? { ...p, preConstruction: prep, updatedAt: new Date().toISOString() } : p))}
              onUpdateContractUrl={(url) => setProjects(prev => prev.map(p => p.id === selectedProjectId ? { ...p, contractUrl: url, updatedAt: new Date().toISOString() } : p))}
              onLossClick={() => handleUpdateStatus(selectedProjectId!, ProjectStatus.LOST)}
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

              {activeTab === 'dashboard' && moduleService.isModuleEnabled(ModuleId.DASHBOARD) && <Dashboard
                projects={filteredData.projects}
                leads={leads}
                onConvertLead={handleConvertLead}
                onProjectClick={(id) => { setSelectedProjectId(id); setActiveTab('projects'); }}
              />}
              {activeTab === 'projects' && moduleService.isModuleEnabled(ModuleId.PROJECTS) && <ProjectList
                projects={filteredData.projects}
                user={user}
                onAddClick={() => { setEditingProject(null); setIsModalOpen(true); }}
                onAddTestClick={handleAddTestProject}
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
              {activeTab === 'modules' && <ModuleManager userRole={user.role} />}
              {activeTab === 'team' && moduleService.isModuleEnabled(ModuleId.TEAM) && <TeamList
                members={filteredData.teamMembers}
                departments={MOCK_DEPARTMENTS}
                projects={filteredData.projects}
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
              {activeTab === 'customers' && moduleService.isModuleEnabled(ModuleId.CUSTOMERS) && <CustomerList
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
              {activeTab === 'dispatch' && moduleService.isModuleEnabled(ModuleId.DISPATCH) && <DispatchManager projects={filteredData.projects} teamMembers={filteredData.teamMembers} onAddDispatch={(pid, ass) => setProjects(prev => prev.map(p => p.id === pid ? { ...p, workAssignments: [ass, ...(p.workAssignments || [])], updatedAt: new Date().toISOString() } : p))} onDeleteDispatch={(pid, aid) => setProjects(prev => prev.map(p => p.id === pid ? { ...p, workAssignments: (p.workAssignments || []).filter(a => a.id !== aid), updatedAt: new Date().toISOString() } : p))} />}
              {activeTab === 'analytics' && moduleService.isModuleEnabled(ModuleId.ANALYTICS) && <Analytics projects={filteredData.projects} />}

              {activeTab === 'vendors' && moduleService.isModuleEnabled(ModuleId.VENDORS) && (
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
                            <LucideUser size={14} /> {v.contact}
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
        {/* AI API Key Settings Modal */}
        {isAISettingsOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="px-8 py-6 bg-stone-900 flex justify-between items-center text-white">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500 rounded-xl">
                    <Sparkles size={20} className="text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg leading-tight">AI 服務核心配置</h2>
                    <p className="text-[10px] text-orange-200 font-bold uppercase tracking-widest">Gemini API Configuration</p>
                  </div>
                </div>
                <button onClick={() => setIsAISettingsOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest flex justify-between">
                    <span>Gemini API Key</span>
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                      獲取金鑰 <ExternalLink size={10} />
                    </a>
                  </label>
                  <input
                    type="password"
                    placeholder="貼上您的 API 金鑰..."
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-5 py-4 text-sm font-bold text-black outline-none focus:ring-4 focus:ring-orange-500/10 placeholder:text-stone-300 transition-all font-mono"
                    value={aiApiKey}
                    onChange={(e) => setAiApiKey(e.target.value)}
                  />
                  <p className="text-[10px] text-stone-400 font-bold leading-relaxed px-1">
                    金鑰將安全地儲存在您的瀏覽器本地 (LocalStorage)，不會上傳至伺服器或 GitHub，且僅用於此設備的 AI 解析功能。
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => { localStorage.removeItem('GEMINI_API_KEY'); setAiApiKey(''); alert('已清除金鑰'); window.location.reload(); }} className="flex-1 py-4 border border-stone-200 text-stone-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-stone-50 transition-all">清除</button>
                  <button onClick={saveAiApiKey} className="flex-[2] bg-stone-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-stone-100 hover:bg-black active:scale-[0.98] transition-all">儲存配置</button>
                </div>
              </div>
            </div>
          </div>
        )}
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
              const statusChangedAt = data.status !== p.status ? new Date().toISOString() : (p.statusChangedAt || p.updatedAt || p.createdDate);
              return { ...p, ...data, id: updatedId, statusChangedAt, updatedAt: new Date().toISOString() };
            }
            return p;
          }));
        } else {
          // 案件編號產生規則: [來源代碼][年份縮寫(YY)][月份(MM)][流水號(001)]
          const prefix = sourcePrefixes[data.source || 'BNI'] || 'PJ';
          const now = new Date();
          const yearShort = now.getFullYear().toString().slice(-2);
          const month = (now.getMonth() + 1).toString().padStart(2, '0');

          // 找尋全系統的最大流水號（不分來源、不分年份），確保流水號連貫
          let sequence = 1;
          if (projects.length > 0) {
            // 從所有專案中提取最後三碼流水號，找出最大值
            const sequences = projects
              .map(p => {
                // Modified Regex: Strictly match PREFIX + (YY|YYYY) + MM + SEQ(3)
                // This ensures we ignore 6-digit legacy IDs like YYMMDD (e.g. 251217 -> 217)
                const match = p.id.match(/[A-Z]+(?:20\d{2}|\d{2})\d{2}(\d{3})$/);
                return match ? parseInt(match[1], 10) : 0;
              })
              // Filter out sequences >= 100 to avoid artifacts from legacy YYMMDD dates (e.g. 251217 -> 217)
              // Valid sequences are currently low (001-006)
              .filter(num => !isNaN(num) && num > 0 && num < 100);

            if (sequences.length > 0) {
              sequence = Math.max(...sequences) + 1;
            }
          }

          const newId = `${prefix}${yearShort}${month}${sequence.toString().padStart(3, '0')}`;
          addActivityLog('建立新專案', data.name, newId, 'project');
          setProjects(prev => [{ ...data, id: newId, status: ProjectStatus.NEGOTIATING, statusChangedAt: new Date().toISOString(), progress: 0, workAssignments: [], expenses: [], comments: [], files: [], phases: [], updatedAt: new Date().toISOString() } as any, ...prev]);
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
