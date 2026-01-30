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
import InventoryModal from './components/InventoryModal';
import InventoryList from './components/InventoryList';
import LocationManagerModal from './components/LocationManagerModal';
import TransferModal from './components/TransferModal';
import ScanTransferModal from './components/ScanTransferModal';
import LeadToProjectModal from './components/LeadToProjectModal';
import Login from './components/Login';
import OrderManagerModal from './components/OrderManagerModal';
import AttendanceSystem from './components/AttendanceSystem';
import PayrollSystem from './components/PayrollSystem';
import ApprovalSystem from './components/ApprovalSystem';
import ModuleManager from './components/ModuleManager';
import OnboardingTour from './components/OnboardingTour';
import { Menu, LogOut, Layers, Cloud, CloudOff, RefreshCw, AlertCircle, CheckCircle, ShieldCheck, Database, Zap, Sparkles, Globe, Activity, ShieldAlert, Bell, User as LucideUser, Trash2, ShoppingBag, Receipt, Pencil, X, ExternalLink, Download, Phone } from 'lucide-react';
import NotificationPanel from './components/NotificationPanel';
import { MOCK_PROJECTS, MOCK_DEPARTMENTS, MOCK_TEAM_MEMBERS } from './constants';
import { Project, ProjectStatus, Customer, TeamMember, User, SystemContext, ProjectComment, ActivityLog, Vendor, ChecklistTask, PaymentStage, DailyLogEntry, Lead, InventoryItem, InventoryCategory, InventoryLocation, InventoryTransaction, PurchaseOrder, AttendanceRecord, PayrollRecord, ApprovalRequest, ApprovalTemplate } from './types';
import { googleDriveService, DEFAULT_CLIENT_ID } from './services/googleDriveService';
import { moduleService } from './services/moduleService';
import { ModuleId, DEFAULT_ENABLED_MODULES, ALL_MODULES } from './moduleConfig';
import { storageService } from './services/storageService';

// Build Trigger: 2026-01-05 Module System Integration
const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [viewingDeptId, setViewingDeptId] = useState<string>('all');
  const [currentDept, setCurrentDept] = useState<SystemContext>('FourthDept');

  const [projects, setProjects] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>([]);
  const [approvalTemplates, setApprovalTemplates] = useState<ApprovalTemplate[]>([]);

  // Calculate permissions dynamically
  // Calculate permissions dynamically
  const currentUserPermissions = useMemo(() => {
    if (!user) return [];

    // Strict Match: ID -> Email -> Name
    const member = teamMembers.find(m =>
      m.employeeId.toLowerCase() === user.id.toLowerCase() ||
      (m.email && user.email && m.email.toLowerCase() === user.email.toLowerCase()) ||
      (m.name && user.name && m.name.toLowerCase() === user.name.toLowerCase())
    );

    // If we found a member and they have specific modules configured (even empty array), use it
    if (member && Array.isArray(member.accessibleModules)) {
      return member.accessibleModules;
    }

    // Default Fallback
    return DEFAULT_ENABLED_MODULES;
  }, [user, teamMembers]);

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

  const [inventoryLocations, setInventoryLocations] = useState<InventoryLocation[]>([]);
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [isLocationManagerOpen, setIsLocationManagerOpen] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isOrderManagerOpen, setIsOrderManagerOpen] = useState(false);
  const [transferItem, setTransferItem] = useState<InventoryItem | null>(null);
  const [editingInventoryItem, setEditingInventoryItem] = useState<InventoryItem | null>(null);

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
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [aiApiKey, setAiApiKey] = useState(localStorage.getItem('GEMINI_API_KEY') || '');
  const [isMasterTab, setIsMasterTab] = useState(false);
  const tabId = useMemo(() => Math.random().toString(36).substring(7), []);

  // Elect Master Tab to handle sync and prevent conflicts
  useEffect(() => {
    const electMaster = () => {
      const now = Date.now();
      const lockKey = 'bt_sync_lock';
      const lockData = JSON.parse(localStorage.getItem(lockKey) || '{}');

      // If no master or current master is stale (> 8s) or is us, we take/keep the lead
      if (!lockData.id || (now - lockData.timestamp > 8000) || lockData.id === tabId) {
        localStorage.setItem(lockKey, JSON.stringify({ id: tabId, timestamp: now }));
        if (!isMasterTab) setIsMasterTab(true);
      } else {
        if (isMasterTab) setIsMasterTab(false);
      }
    };

    electMaster();
    const interval = setInterval(electMaster, 5000);
    window.addEventListener('beforeunload', () => {
      const lockData = JSON.parse(localStorage.getItem('bt_sync_lock') || '{}');
      if (lockData.id === tabId) localStorage.removeItem('bt_sync_lock');
    });
    return () => clearInterval(interval);
  }, [tabId, isMasterTab]);

  const saveAiApiKey = () => {
    localStorage.setItem('GEMINI_API_KEY', aiApiKey);
    setIsAISettingsOpen(false);
    alert('AI 金鑰已儲存，服務將在下次解析時生效。');
    window.location.reload();
  };

  // Trigger Onboarding for new users or upon login
  useEffect(() => {
    if (user && !isInitializing) {
      const hasCompleted = localStorage.getItem('bt_onboarding_completed') === 'true';
      if (!hasCompleted) {
        // Delay a bit to let the dashboard render
        const timer = setTimeout(() => setIsOnboardingOpen(true), 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [user, isInitializing]);

  const handleCloseOnboarding = () => {
    setIsOnboardingOpen(false);
    localStorage.setItem('bt_onboarding_completed', 'true');
  };

  // Sync User Session with Team Data (Auto-update role/info if changed in TeamModal)
  useEffect(() => {
    if (user && teamMembers.length > 0) {
      // Robust matching: ID or Email
      const me = teamMembers.find(m =>
        m.employeeId.toLowerCase() === user.id.toLowerCase() ||
        (m.email && user.email && m.email.toLowerCase() === user.email.toLowerCase())
      );
      if (me) {
        // Also sync accessibleModules to user session for immediate UI update
        const userModules = user.accessibleModules || [];
        const memberModules = me.accessibleModules || [];

        // Compare modules array equality simply by joining sorted strings
        const modulesChanged = [...userModules].sort().join(',') !== [...memberModules].sort().join(',');

        const needsUpdate = me.systemRole !== user.role || me.name !== user.name || me.avatar !== user.picture || modulesChanged;

        if (needsUpdate) {
          console.log('[Session] Auto-updating user session from team data...');
          setUser(prev => prev ? ({
            ...prev,
            role: me.systemRole,
            name: me.name,
            picture: me.avatar,
            accessibleModules: me.accessibleModules // Critical: Sync modules
          }) : null);
        }
      }
    }
  }, [teamMembers, user?.id, user?.role, user?.name, user?.picture, user?.accessibleModules]);


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

        // If remote is newer, we want to update the object, but PRESERVE deep arrays if it's a project
        if (remoteTime > localTime) {
          // Special handling for Projects and Approvals (Objects with nested arrays)
          if ('dailyLogs' in localItem || 'workflowLogs' in localItem) {
            const l = localItem as any;
            const r = remoteItem as any;

            // Combine arrays without duplicates
            const combine = (arr1: any[] = [], arr2: any[] = []) => {
              const map = new Map();
              [...arr1, ...arr2].forEach(x => { if (x.id || x.timestamp || x.step) map.set(x.id || (x.timestamp + (x.step || '')), x); });
              return Array.from(map.values()).sort((a, b) =>
                new Date(b.timestamp || b.date || b.createdAt || 0).getTime() - new Date(a.timestamp || a.date || a.createdAt || 0).getTime()
              );
            };

            if ('dailyLogs' in localItem) {
              merged[localIndex] = {
                ...remoteItem,
                dailyLogs: combine(l.dailyLogs, r.dailyLogs),
                comments: combine(l.comments, r.comments),
                files: combine(l.files, r.files),
                expenses: combine(l.expenses, r.expenses),
                payments: combine(l.payments, r.payments),
                checklist: combine(l.checklist, r.checklist),
                workAssignments: combine(l.workAssignments, r.workAssignments)
              } as any;
            } else if ('workflowLogs' in localItem) {
              merged[localIndex] = {
                ...remoteItem,
                workflowLogs: combine(l.workflowLogs, r.workflowLogs)
              } as any;
            }
          } else {
            merged[localIndex] = remoteItem;
          }
        }
      }
    });
    return merged;
  }, []);

  // Helper: Normalize, Correct, and Deduplicate Projects
  // This ensures that whether data comes from LocalStorage or Cloud, it strictly follows our ID rules
  const normalizeProjects = useCallback((projects: Project[] | null | undefined): Project[] => {
    if (!projects || !Array.isArray(projects)) return [];

    // Filter out null/undefined or malformed project objects first
    const validProjects = projects.filter(p => p && typeof p === 'object' && (p.id || p.name));

    // 0. ID CORRECTION: Removed aggressive remapping rules to prevent sync oscillation.
    let processed = validProjects.map(p => {
      let updatedProject = { ...p };

      // MIGRATION: Fix legacy status '驗收中' to new '施工完成、待驗收'
      if (updatedProject.status === '驗收中' as any) updatedProject.status = ProjectStatus.INSPECTION;

      // Ensure fundamental arrays exist to prevent merge errors
      if (!updatedProject.dailyLogs) updatedProject.dailyLogs = [];
      if (!updatedProject.comments) updatedProject.comments = [];
      if (!updatedProject.files) updatedProject.files = [];
      if (!updatedProject.phases) updatedProject.phases = [];

      return updatedProject;
    });

    // Deduplicate and Deep Merge projects by ID
    const projectMap = new Map<string, Project>();
    processed.forEach(p => {
      if (!projectMap.has(p.id)) {
        projectMap.set(p.id, p);
      } else {
        const existing = projectMap.get(p.id)!;

        // SAFE MERGE STRATEGY: Preserve meaningful content (logs, comments) 
        // from both versions, and choose the most recent basic info.
        const mergeLogs = (l1: any[] = [], l2: any[] = []) => {
          const map = new Map();
          [...l1, ...l2].forEach(log => { if (log.id) map.set(log.id, log); });
          return Array.from(map.values()).sort((a, b) => new Date(b.timestamp || b.date).getTime() - new Date(a.timestamp || a.date).getTime());
        };

        const existingTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
        const currentTime = p.updatedAt ? new Date(p.updatedAt).getTime() : 0;

        // Start with the more recent overall object
        const merged: Project = currentTime > existingTime ? { ...p } : { ...existing };

        // Deep merge protected fields
        merged.dailyLogs = mergeLogs(existing.dailyLogs, p.dailyLogs);
        merged.comments = mergeLogs(existing.comments, p.comments); // Reuse logic for comments
        merged.files = mergeLogs(existing.files, p.files);
        merged.expenses = mergeLogs(existing.expenses, p.expenses);
        merged.checklist = mergeLogs(existing.checklist, p.checklist);
        merged.payments = mergeLogs(existing.payments, p.payments);

        // Final state: canonical/standard projects from MOCK should not overwrite user data fields if missing
        if (MOCK_PROJECTS.some(mp => mp.id === p.id)) {
          // If incoming 'p' is from MOCK (canonical), we update basic info but strictly preserve existing logs
          if (existing.dailyLogs && existing.dailyLogs.length > (p.dailyLogs?.length || 0)) {
            merged.dailyLogs = existing.dailyLogs;
          }
        }

        projectMap.set(p.id, merged);
      }
    });

    return Array.from(projectMap.values());
  }, []);

  const updateStateWithMerge = useCallback((cloudData: any) => {
    if (!cloudData) return;

    // Apply rigorous normalization to cloud data BEFORE merging
    const cleanCloudProjects = normalizeProjects(cloudData.projects || []);

    setProjects(prev => mergeData(prev, cleanCloudProjects));
    setCustomers(prev => mergeData(prev, cloudData.customers || []));
    setTeamMembers(prev => mergeData(prev, cloudData.teamMembers || []));
    setVendors(prev => mergeData(prev, cloudData.vendors || []));
    // Update inventory and locations from cloud
    if (cloudData.inventory) {
      setInventoryItems(prev => mergeData(prev, cloudData.inventory || []));
    }
    if (cloudData.locations) {
      setInventoryLocations(prev => mergeData(prev, cloudData.locations || []));
    }
    if (cloudData.purchaseOrders) {
      setPurchaseOrders(prev => mergeData(prev, cloudData.purchaseOrders || []));
    }
    if (cloudData.attendance) {
      setAttendanceRecords(prev => mergeData(prev, cloudData.attendance || []));
    }
    if (cloudData.payroll) {
      setPayrollRecords(prev => mergeData(prev, cloudData.payroll || []));
    }
    if (cloudData.approvalRequests) {
      setApprovalRequests(prev => mergeData(prev, cloudData.approvalRequests || []));
    }
    if (cloudData.approvalTemplates) {
      setApprovalTemplates(prev => mergeData(prev, cloudData.approvalTemplates || []));
    }
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

  const handleLogout = useCallback((forced = false) => {
    if (forced || confirm('確定要安全登出生產系統嗎？')) {
      // 1. Clear User Session
      setUser(null);
      localStorage.removeItem('bt_user');

      // 2. Clear Critical Data State to prevent leakage between departments
      setProjects([]);
      setCustomers([]);
      setTeamMembers([]);
      setVendors([]);
      setLeads([]);
      setInventoryItems([]);
      setPurchaseOrders([]);
      setActivityLogs([]);

      setActiveTab('dashboard');
      console.log('[System] Logout complete, memory cleared.');
    }
  }, []);

  const handleClockRecord = (type: 'work-start' | 'work-end', location: { lat: number; lng: number; address?: string }, customTimestamp?: string) => {
    if (!user) return;

    // User ID is reliable enough. TeamMember lookup is secondary.
    const employeeId = user.id;
    const isSupplement = !!customTimestamp;
    const recordTime = customTimestamp || new Date().toISOString();

    const newRecord: AttendanceRecord = {
      id: crypto.randomUUID(),
      employeeId: employeeId,
      name: user.name,
      type,
      timestamp: recordTime,
      location,
      departmentId: user.department === 'FirstDept' ? 'DEPT-4' : user.department === 'ThirdDept' ? 'DEPT-8' : 'DEPT-9'
    };

    setAttendanceRecords(prev => [...prev, newRecord]);

    // Update Team Member Status (Only if it's a real-time clock in, supplement shouldn't change current status ideally, but let's keep it simple)
    if (!isSupplement) {
      setTeamMembers(prev => prev.map(member => {
        // Match user to member by ID or Name
        if (member.id === user.id || member.employeeId === user.id || member.name === user.name) {
          return {
            ...member,
            status: type === 'work-start' ? 'Available' : 'OffDuty',
            currentWorkStatus: type === 'work-start' ? 'OnDuty' : 'OffDuty',
            updatedAt: new Date().toISOString()
          };
        }
        return member;
      }));
    }

    const action = type === 'work-start' ? '上班' : '下班';
    const displayTime = new Date(recordTime).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    alert(`${isSupplement ? '✅ 補打卡' : action + '打卡'}成功！\n${isSupplement ? '記錄類型：' + action : '狀態變更：' + (type === 'work-start' ? '上班中' : '未上班')}\n時間：${displayTime}\n地點：${location.address || 'GPS ' + location.lat.toFixed(4)}`);
  };

  const handleImportRecords = (newRecords: AttendanceRecord[]) => {
    setAttendanceRecords(prev => [...prev, ...newRecords]);
    addActivityLog('批量匯入打卡紀錄', `${newRecords.length} 筆`, 'IMPORT', 'system');
  };

  const handleImportLeaves = (newRequests: ApprovalRequest[]) => {
    setApprovalRequests(prev => [...prev, ...newRequests]);
    addActivityLog('批量匯入請假紀錄', `${newRequests.length} 筆`, 'IMPORT', 'system');
  };

  const handleSaveApprovalRequest = (request: ApprovalRequest) => {
    setApprovalRequests(prev => [request, ...prev]);
    addActivityLog('提交了簽核申請', request.title, request.id, 'system');
  };

  const handleSaveApprovalTemplate = (template: ApprovalTemplate) => {
    setApprovalTemplates(prev => {
      const exists = prev.find(t => t.id === template.id);
      if (exists) return prev.map(t => t.id === template.id ? template : t);
      return [...prev, template];
    });
    addActivityLog('更新了簽核流程設定', template.name, template.id, 'system');
  };

  const handleDeleteApprovalTemplate = (id: string) => {
    if (confirm('確定要刪除此簽核流程？這不會影響已提交的申請。')) {
      const t = approvalTemplates.find(x => x.id === id);
      setApprovalTemplates(prev => prev.filter(x => x.id !== id));
      if (t) addActivityLog('刪除了簽核流程', t.name, id, 'system');
    }
  };

  const handleApprovalAction = (requestId: string, action: 'approved' | 'rejected', comment?: string) => {
    if (!user) return;

    setApprovalRequests(prev => prev.map(req => {
      if (req.id !== requestId) return req;

      const template = approvalTemplates.find(t => t.id === req.templateId);
      if (!template) return req;

      const newLog = {
        step: req.currentStep,
        role: template.workflow[req.currentStep],
        approverId: user.id,
        approverName: user.name,
        status: action,
        comment,
        timestamp: new Date().toISOString()
      };

      const nextStep = req.currentStep + 1;
      const isFinished = action === 'rejected' || nextStep >= template.workflow.length;

      return {
        ...req,
        status: action === 'rejected' ? 'rejected' : (isFinished ? 'approved' : 'pending'),
        currentStep: isFinished ? req.currentStep : nextStep,
        workflowLogs: [...req.workflowLogs, newLog],
        updatedAt: new Date().toISOString(),
        completedAt: isFinished ? new Date().toISOString() : undefined
      };
    }));

    const actStr = action === 'approved' ? '核准' : '駁回';
    addActivityLog(`${actStr}了簽核申請`, requestId, requestId, 'system');
  };

  // Auto-redirect to Attendance page on login
  const hasRedirectedRef = React.useRef(false);
  useEffect(() => {
    if (user && !isInitializing && !hasRedirectedRef.current) {
      if (currentUserPermissions.includes(ModuleId.ATTENDANCE)) {
        setActiveTab('attendance');
        hasRedirectedRef.current = true;
      }
    }
    if (!user) {
      hasRedirectedRef.current = false;
    }
  }, [user, isInitializing, currentUserPermissions]);

  const autoConnectCloud = useCallback(async () => {
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
  }, [updateStateWithMerge]);

  const loadSystemData = useCallback(async (dept: SystemContext) => {
    console.log(`[System] Initializing context for: ${dept}`);

    // 1. Configure Cloud Context
    const prefix = dept === 'ThirdDept' ? 'dept3_' : dept === 'FourthDept' ? 'dept4_' : '';
    const driveFilename = dept === 'ThirdDept' ? 'life_quality_system_data_dept3.json' : dept === 'FourthDept' ? 'life_quality_system_data_dept4.json' : 'life_quality_system_data.json';
    googleDriveService.setFilename(driveFilename);

    // 2. Load Local Data (IndexedDB) with Prefix
    try {
      const defaultProjects = dept === 'FirstDept' ? MOCK_PROJECTS : [];
      const defaultTeam = dept === 'FirstDept' ? MOCK_TEAM_MEMBERS : [];

      // Load Projects
      let initialProjects = await storageService.getItem<Project[]>(`${prefix}bt_projects`, defaultProjects);

      // Restoration Logic (Legacy FirstDept Support)
      if (dept === 'FirstDept') {
        const criticalRestorationIds = ['BNI2601001', 'BNI2601002', 'BNI2601004', 'OC2601005', 'JW2601003'];

        try {
          if (initialProjects.length > 0) await storageService.setItem(`${prefix}bt_projects_backup`, initialProjects);
        } catch (e) { }

        try { initialProjects = JSON.parse(JSON.stringify(initialProjects)); } catch (e) { console.error('Deep clone failed', e); }

        initialProjects = initialProjects.map((p: any) => {
          if (criticalRestorationIds.includes(p.id) && p.deletedAt) {
            const { deletedAt, ...rest } = p;
            return { ...rest, updatedAt: new Date().toISOString() };
          }
          return p;
        });

        const missingProjects = MOCK_PROJECTS.filter(mockP =>
          criticalRestorationIds.includes(mockP.id) &&
          !initialProjects.some((p: Project) => p.id === mockP.id || p.name === mockP.name)
        );
        if (missingProjects.length > 0) {
          initialProjects = [...initialProjects, ...JSON.parse(JSON.stringify(missingProjects))];
        }
      }

      // Normalize
      const deduplicatedProjects = normalizeProjects(initialProjects);

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

      // Load other entities
      const [customersData, initialTeamData, vendorsData, leadsData, logsData, inventoryData, locationsData, purchaseOrdersData, attendanceData, payrollData, approvalRequestsData, approvalTemplatesData] = await Promise.all([
        storageService.getItem<Customer[]>(`${prefix}bt_customers`, []),
        storageService.getItem<TeamMember[]>(`${prefix}bt_team`, defaultTeam),
        storageService.getItem<Vendor[]>(`${prefix}bt_vendors`, []),
        storageService.getItem<Lead[]>(`${prefix}bt_leads`, []),
        storageService.getItem<any[]>(`${prefix}bt_logs`, []),
        storageService.getItem<InventoryItem[]>(`${prefix}bt_inventory`, []),
        storageService.getItem<InventoryLocation[]>(`${prefix}bt_locations`, [{ id: 'MAIN', name: '總倉庫', type: 'Main', isDefault: true }]),
        storageService.getItem<PurchaseOrder[]>(`${prefix}bt_orders`, []),
        storageService.getItem<AttendanceRecord[]>(`${prefix}bt_attendance`, []),
        storageService.getItem<PayrollRecord[]>(`${prefix}bt_payroll`, []),
        storageService.getItem<ApprovalRequest[]>(`${prefix}bt_approval_requests`, []),
        storageService.getItem<ApprovalTemplate[]>(`${prefix}bt_approval_templates`, [
          {
            id: 'TPL-LEAVE',
            name: '請假申請單',
            description: '各類假別申請流程',
            workflow: ['Manager', 'AdminStaff'],
            formFields: [
              { key: '假別', label: '假別類型', type: 'select', options: ['事假', '病假', '特休', '公假', '喪假', '婚假', '補休', '其他'], required: true },
              { key: 'startDate', label: '開始日期', type: 'date', required: true },
              { key: 'endDate', label: '結束日期', type: 'date', required: true },
              { key: 'reason', label: '詳細原因', type: 'text', required: true }
            ],
            updatedAt: new Date().toISOString()
          },
          {
            id: 'TPL-EXPENSE',
            name: '費用報支申請',
            description: '專案或行政費用報銷',
            workflow: ['Manager', 'DeptAdmin', 'AdminStaff'],
            formFields: [
              { key: '項目', label: '報支項目', type: 'text', required: true },
              { key: '金額', label: '報支金額', type: 'number', required: true },
              { key: '日期', label: '發生日期', type: 'date', required: true },
              { key: '備註', label: '備註說明', type: 'text', required: false }
            ],
            updatedAt: new Date().toISOString()
          }
        ])
          // Ensure TPL-CORRECTION exists if not present (Migration)
          .then(templates => {
            if (!templates.find(t => t.id === 'TPL-CORRECTION')) {
              templates.push({
                id: 'TPL-CORRECTION',
                name: '補打卡申請',
                description: '忘記打卡或打卡異常時使用',
                workflow: ['Manager', 'AdminStaff'],
                formFields: [
                  { key: 'date', label: '補打卡日期', type: 'date', required: true },
                  { key: 'time', label: '補打卡時間', type: 'time', required: true },
                  { key: 'type', label: '打卡類型', type: 'select', options: ['上班', '下班'], required: true },
                  { key: 'reason', label: '補打卡原因', type: 'text', required: true }
                ],
                updatedAt: new Date().toISOString()
              });
            }
            return templates;
          })
      ]);

      setCustomers(customersData);
      // Migration Logic: Strong Cleanup & Fixes
      let processedTeamData = [...initialTeamData];

      // 1. Purge Virtual Members (Force cleanup for ALL departments)
      const PURGE_NAMES = ['林志豪', '陳建宏', '黃國華', '李美玲', '李大維', '張家銘', '陳小美', '王雪芬'];
      const PURGE_PREFIXES = ['T-', 'CEO'];

      const originalCount = processedTeamData.length;
      processedTeamData = processedTeamData.filter((m: any) => {
        const isPurgeName = PURGE_NAMES.includes(m.name);
        const isPurgeId = typeof m.id === 'string' && PURGE_PREFIXES.some(prefix => m.id.startsWith(prefix) && m.id.length < 8); // Only purge short IDs (Mock usually short)
        return !isPurgeName && !isPurgeId;
      });

      if (processedTeamData.length < originalCount) {
        console.log(`[Migration] Purged ${originalCount - processedTeamData.length} virtual members. FORCE SAVING...`);
        // Force save to prevent them from coming back
        const storageKey = dept === 'FirstDept' ? 'bt_team' : (dept === 'ThirdDept' ? 'dept3_bt_team' : 'bt_team');
        storageService.saveItem(storageKey, processedTeamData);
      }

      // 2. Fix Data Integrity for Real Users
      processedTeamData.forEach((m: any) => {
        // Fix monthly salary display if missing
        if (m.salaryType === 'monthly' && m.monthlySalary === undefined) {
          m.monthlySalary = 0;
        }
        // Ensure daily workers have default work hours
        if ((m.salaryType === 'daily' || m.dailyRate > 0) && !m.workStartTime) {
          console.log(`[Migration] Setting default work hours for daily worker: ${m.name}`);
          m.workStartTime = '08:00';
          m.workEndTime = '17:00';
        }
      });

      // Emergency Restore for JK001 (If missing)
      if (!processedTeamData.some((m: any) => m.name === '陳信寬' || m.employeeId === 'JK001')) {
        processedTeamData.push({
          id: 'JK001',
          employeeId: 'JK001',
          name: '陳信寬',
          role: '工務主管',
          systemRole: 'DeptAdmin',
          departmentId: 'DEPT-4',
          departmentIds: ['DEPT-4'],
          phone: '',
          email: '',
          status: 'Available',
          activeProjectsCount: 0,
          avatar: '', // User can re-upload
          specialty: [],
          certifications: [],
          joinDate: new Date().toISOString().split('T')[0],
          salaryType: 'monthly',
          monthlySalary: 80000,
          dailyRate: 0,
          workStartTime: '09:00',
          workEndTime: '18:00'
        });
        console.log('[Migration] Emergency restored JK001 陳信寬');
        // Trigger save
        const storageKey = dept === 'FirstDept' ? 'bt_team' : (dept === 'ThirdDept' ? 'dept3_bt_team' : 'bt_team');
        storageService.saveItem(storageKey, processedTeamData);
      }

      setTeamMembers(processedTeamData.map((m: any) => ({
        ...m,
        specialty: m.specialty || [],
        certifications: m.certifications || [],
        departmentIds: m.departmentIds || [m.departmentId]
      })));
      setVendors(vendorsData);
      setLeads(leadsData);
      setInventoryItems(inventoryData);
      setInventoryLocations(locationsData);
      setPurchaseOrders(purchaseOrdersData);
      setAttendanceRecords(attendanceData);
      setPayrollRecords(payrollData);
      setApprovalRequests(approvalRequestsData);
      setApprovalTemplates(approvalTemplatesData);
      setActivityLogs(logsData);

      setInitialSyncDone(true);
      setIsInitializing(false);
      console.log('System initialized successfully');

      // Auto Connect
      try {
        await googleDriveService.init(DEFAULT_CLIENT_ID);
        if (localStorage.getItem('bt_cloud_connected') === 'true') {
          await autoConnectCloud();
        }
      } catch (e) {
        console.warn('Google SDK 初始化背景執行中');
      }

    } catch (err) {
      console.error('Initialization failed', err);
      setIsInitializing(false);
    }
  }, [normalizeProjects, autoConnectCloud]);



  // 使用 Ref 追蹤最新數據與同步狀態，避免頻繁觸發 useEffect 重新整理
  const dataRef = React.useRef({ projects, customers, teamMembers, activityLogs, vendors, leads, inventoryItems, inventoryLocations, purchaseOrders, attendanceRecords, payrollRecords, approvalRequests, approvalTemplates });
  React.useEffect(() => {
    dataRef.current = { projects, customers, teamMembers, activityLogs, vendors, leads, inventoryItems, inventoryLocations, purchaseOrders, attendanceRecords, payrollRecords, approvalRequests, approvalTemplates };
  }, [projects, customers, teamMembers, activityLogs, vendors, leads, inventoryItems, inventoryLocations, purchaseOrders, attendanceRecords, payrollRecords, approvalRequests, approvalTemplates]);

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
      timestamp: new Date().toISOString(),
      isRead: false
    };
    setActivityLogs(prev => [newLog, ...prev].slice(0, 50)); // 保留最近 50 筆
  }, [user]);


  const handleCloudSync = useCallback(async () => {
    if (!isCloudConnected || isSyncingRef.current || user?.role === 'Guest') return;

    isSyncingRef.current = true;
    setIsSyncing(true); // TRIGGER UI SPINNER

    try {
      if (cloudError === '會話已過期') {
        await googleDriveService.authenticate('none');
        setCloudError(null);
      }

      // 在存檔前先檢查雲端是否有更新
      const metadata = await googleDriveService.getFileMetadata(true);
      if (metadata && lastRemoteModifiedTime.current && metadata.modifiedTime !== lastRemoteModifiedTime.current) {
        console.log('[Sync] Detected newer cloud version...');
        const cloudData = await googleDriveService.loadFromCloud(true);

        if (cloudData) {
          // SANITY CHECK: Cloud Data Integrity
          // If cloud has 0 projects but we have many (>3), assume cloud is corrupt/wiped by accident.
          // Ignore cloud update, allowing local save to overwrite it.
          const localCount = dataRef.current.projects.length;
          const cloudCount = Array.isArray(cloudData.projects) ? cloudData.projects.length : 0;

          if (localCount > 3 && cloudCount === 0) {
            console.warn(`[Sync] ⚠️ DANGER: Cloud data appears empty (${cloudCount}) while local has ${localCount}. IGNORING CLOUD UPDATE to prevent data loss.`);
            // Do NOT call updateStateWithMerge(cloudData);
            // Proceed to upload local data to fix the cloud.
          } else {
            // Safe to merge
            console.log('[Sync] Merging cloud data...');
            updateStateWithMerge(cloudData);
            lastRemoteModifiedTime.current = metadata.modifiedTime;

            // CRITICAL FIX: Stop execution here! 
            // We must allow React to process the state update (updateStateWithMerge) 
            // and update dataRef.current in the next render cycle BEFORE we try to save back to cloud.
            // If we proceed now, we would be uploading STALE local data (dataRef.current), 
            // effectively undoing the merge we just requested and overwriting remote changes.
            console.log('[Sync] Cloud merge requested. Pausing upload to allow state update.');
            setCloudError(null);

            // Reset flags
            isSyncingRef.current = false;
            setIsSyncing(false);
            return;
          }
        }
      }

      // SAFETY CHECK: Prevent overwriting cloud with empty local state (Crisis Prevention)
      const localData = dataRef.current;

      // Enhanced Check: checking projects/team is empty is good, but let's be more specific.
      // If we have "defaults" only, maybe we shouldn't overwrite a populated cloud?
      if (!localData.projects || (localData.projects.length === 0 && localData.teamMembers.length <= 1)) {
        console.warn('[Sync] Aborted save: Local state appears empty or uninitialized. Preventing cloud overwrite.');
        isSyncingRef.current = false;
        setIsSyncing(false);
        return;
      }

      const success = await googleDriveService.saveToCloud({
        projects: localData.projects,
        customers: localData.customers,
        teamMembers: localData.teamMembers,
        vendors: localData.vendors,
        leads: localData.leads,
        inventory: localData.inventoryItems,
        locations: localData.inventoryLocations,
        purchaseOrders: localData.purchaseOrders,
        attendance: localData.attendanceRecords,
        payroll: localData.payrollRecords,
        approvalRequests: localData.approvalRequests,
        approvalTemplates: localData.approvalTemplates,
        activityLogs: localData.activityLogs,
        lastUpdated: new Date().toISOString(),
        userEmail: user?.email
      }, true);

      if (success) {
        const newMetadata = await googleDriveService.getFileMetadata(true);
        if (newMetadata) lastRemoteModifiedTime.current = newMetadata.modifiedTime;
        setLastCloudSync(new Date().toLocaleTimeString());
        setCloudError(null);

        // 如果是初始化帳號且同步成功，自動登出以引導使用個人帳戶
        if (user?.role === 'SyncOnly') {
          setTimeout(() => {
            alert('✅ 同步完成！系統即將登出，請使用您個人的員工編號正式登入。');
            handleLogout(true); // Force logout without confirmation
          }, 1500);
        }
      } else {
        const status = googleDriveService.getLastErrorStatus();
        setCloudError(`同步失敗(${status || '?'})`);
        if (isSyncing) alert(`上傳失敗 (${status})，請檢查網路或稍後再試。`);
      }
    } catch (e: any) {
      console.error('Cloud sync failed:', e);
      if (e.message === 'AUTH_INTERACTION_REQUIRED') {
        setCloudError('需要重新驗證');
      } else {
        setCloudError('同步發生錯誤');
      }
      if (isSyncing && e.message !== 'AUTH_INTERACTION_REQUIRED') alert('同步發生錯誤，請檢查網路連線。');
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false); // STOP UI SPINNER
    }
  }, [isCloudConnected, user?.email, user?.role, projects, customers, teamMembers, vendors, leads, inventoryItems, inventoryLocations, purchaseOrders, attendanceRecords, payrollRecords, activityLogs, updateStateWithMerge, cloudError, handleLogout, approvalRequests, approvalTemplates]);

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
        const teamData = cloudData.teamMembers || [];
        setProjects(cloudData.projects);
        setCustomers(cloudData.customers || []);
        setTeamMembers(teamData);
        setActivityLogs(cloudData.activityLogs || []);
        setVendors(cloudData.vendors || []);
        setInventoryItems(cloudData.inventory || []);
        setInventoryLocations(cloudData.locations || []);
        setPurchaseOrders(cloudData.purchaseOrders || []);
        setAttendanceRecords(cloudData.attendance || []);
        setPayrollRecords(cloudData.payroll || []);
        setLastCloudSync(new Date().toLocaleTimeString());

        // 重要：在自動登出前，強制將下載的資料存入 IndexedDB
        // 否則 useEffect 可能來不及在登出前存檔，導致登入時找不到帳號
        await Promise.all([
          storageService.setItem('bt_projects', cloudData.projects),
          storageService.setItem('bt_team', teamData),
          storageService.setItem('bt_customers', cloudData.customers || []),
          storageService.setItem('bt_vendors', cloudData.vendors || []),
          storageService.setItem('bt_leads', cloudData.leads || []),
          storageService.setItem('bt_inventory', cloudData.inventory || []),
          storageService.setItem('bt_locations', cloudData.locations || []),
          storageService.setItem('bt_orders', cloudData.purchaseOrders || []),
          storageService.setItem('bt_attendance', cloudData.attendance || []),
          storageService.setItem('bt_payroll', cloudData.payroll || []),
          storageService.setItem('bt_approval_requests', cloudData.approvalRequests || []),
          storageService.setItem('bt_approval_templates', cloudData.approvalTemplates || []),
          storageService.setItem('bt_logs', cloudData.activityLogs || [])
        ]);

        // 如果是初始化帳號，切換完數據後自動登出
        if (user?.role === 'SyncOnly') {
          setTimeout(() => {
            alert('✅ 數據同步完成！請使用您的「員工編號」正式登入。');
            handleLogout(true); // Force logout without confirmation
          }, 800);
        }
      } else {
      }
    } catch (err: any) {
      setCloudError('驗證失敗');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCloudRestore = async () => {
    try {
      setIsSyncing(true);
      const cloudData = await googleDriveService.loadFromCloud(false);
      if (cloudData) {
        updateStateWithMerge(cloudData);
        const metadata = await googleDriveService.getFileMetadata(false);
        if (metadata) lastRemoteModifiedTime.current = metadata.modifiedTime;
        alert('✅ 已從雲端強制同步最新數據。');
      } else {
        alert('❌ 雲端無可用數據。');
      }
    } catch (e) {
      alert('還原失敗，請檢查網路。');
    } finally {
      setIsSyncing(false);
    }
  };

  // 安全儲存到 localStorage，處理 QuotaExceededError
  // 儲存邏輯已移至 storageService

  useEffect(() => {
    if (!initialSyncDone || !user) return;

    // 定期保存至 IndexedDB (容量極大，維持完整資料)
    if (user.role !== 'Guest') {
      const saveToIndexedDB = async () => {
        const prefix = currentDept === 'ThirdDept' ? 'dept3_' : currentDept === 'FourthDept' ? 'dept4_' : '';
        try {
          await Promise.all([
            storageService.setItem(`${prefix}bt_projects`, projects),
            storageService.setItem(`${prefix}bt_customers`, customers),
            storageService.setItem(`${prefix}bt_team`, teamMembers),
            storageService.setItem(`${prefix}bt_vendors`, vendors),
            storageService.setItem(`${prefix}bt_leads`, leads),
            storageService.setItem(`${prefix}bt_inventory`, inventoryItems),
            storageService.setItem(`${prefix}bt_locations`, inventoryLocations),
            storageService.setItem(`${prefix}bt_orders`, purchaseOrders),
            storageService.setItem(`${prefix}bt_attendance`, attendanceRecords),
            storageService.setItem(`${prefix}bt_payroll`, payrollRecords),
            storageService.setItem(`${prefix}bt_approval_requests`, approvalRequests),
            storageService.setItem(`${prefix}bt_approval_templates`, approvalTemplates),
            storageService.setItem(`${prefix}bt_logs`, activityLogs.slice(0, 50))
          ]);
          setLastLocalSave(new Date().toLocaleTimeString());
        } catch (e) {
          console.error('Auto-save failed', e);
        }
      };
      saveToIndexedDB();
    }

    // 智慧雲端自動同步 (當資料變更後 10 秒才觸發)
    if (isCloudConnected && !cloudError && user.role !== 'Guest' && isMasterTab) {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(() => {
        handleCloudSync();
      }, 10000);
    }
  }, [projects, customers, teamMembers, activityLogs, vendors, isCloudConnected, cloudError, initialSyncDone, handleCloudSync, user?.role, leads, inventoryItems, inventoryLocations, purchaseOrders, attendanceRecords, payrollRecords, currentDept, approvalRequests, approvalTemplates, isMasterTab]);

  // 背景心跳監測 (Heartbeat Polling) - 每 45 秒檢查一次雲端是否有新更動
  useEffect(() => {
    if (!isCloudConnected || user?.role === 'Guest' || !initialSyncDone || !isMasterTab) return;

    const heartbeat = setInterval(async () => {
      if (isSyncingRef.current) return;

      try {
        const metadata = await googleDriveService.getFileMetadata(true);
        if (metadata && metadata.modifiedTime !== lastRemoteModifiedTime.current) {
          console.log('[Heartbeat] Cloud data updated by another user or tab, syncing...');
          const cloudData = await googleDriveService.loadFromCloud(true);
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
  }, [isCloudConnected, user?.role, initialSyncDone, updateStateWithMerge, isMasterTab]);

  // Startup Effect
  const hasStartedRef = React.useRef(false);
  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    let safetyTimeout: any;

    const startup = async () => {
      safetyTimeout = setTimeout(() => {
        setIsInitializing(false);
        console.warn('啟動超時：進入自動跳過模式');
      }, 5000);

      try {
        const savedUser = localStorage.getItem('bt_user');
        if (savedUser) {
          try {
            const parsedUser = JSON.parse(savedUser);
            setUser(parsedUser);
            const dept = parsedUser.department || 'FirstDept';
            setCurrentDept(dept);
            setViewingDeptId(parsedUser.role === 'SuperAdmin' || parsedUser.role === 'Guest' ? 'all' : (parsedUser.departmentId || 'DEPT-1'));
            loadSystemData(dept);
          } catch (e) {
            console.error('Saved user parse error', e);
            localStorage.removeItem('bt_user');
            setIsInitializing(false);
          }
        } else {
          setIsInitializing(false);
        }
      } catch (e) {
        setIsInitializing(false);
      }
    };
    startup();

    return () => clearTimeout(safetyTimeout);
  }, [loadSystemData]);

  // Dedicated useEffect for Manual Sync/Restore Listeners (Decoupled from Startup)
  useEffect(() => {
    const onManualSync = () => handleCloudSync();
    const onManualRestore = () => handleCloudRestore();
    window.addEventListener('TRIGGER_CLOUD_SYNC', onManualSync);
    window.addEventListener('TRIGGER_CLOUD_RESTORE', onManualRestore);

    return () => {
      window.removeEventListener('TRIGGER_CLOUD_SYNC', onManualSync);
      window.removeEventListener('TRIGGER_CLOUD_RESTORE', onManualRestore);
    };
  }, [handleCloudSync, handleCloudRestore]);

  const handleUpdateStatus = (projectId: string, status: ProjectStatus) => {
    if (user?.role === 'Guest') return;
    const project = projects.find(p => p.id === projectId);
    if (project) {
      addActivityLog(`變更專案狀態：${status} `, project.name, projectId, 'project');
    }
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status, statusChangedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : p));
  };

  const handleMarkLogAsRead = (logId: string) => {
    setActivityLogs(prev => prev.map(log => log.id === logId ? { ...log, isRead: true } : log));
  };

  // Listen for Trigger Cloud Restore (Crisis Management)
  useEffect(() => {
    const handleRestoreListener = async () => {
      if (!isCloudConnected) {
        alert('請先連結 Google Drive 才能執行雲端還原。');
        return;
      }

      setIsSyncing(true);
      try {
        console.warn('STARTING FORCE RESTORE FROM CLOUD...');
        const cloudData = await googleDriveService.loadFromCloud();
        if (cloudData) {
          // FORCE REPLACE LOCAL STATE
          setProjects(normalizeProjects(cloudData.projects || [])); // No merging, just replacing
          setCustomers(cloudData.customers || []);
          setTeamMembers(cloudData.teamMembers || []);
          setVendors(cloudData.vendors || []);
          setInventoryItems(cloudData.inventory || []);
          setInventoryLocations(cloudData.locations || []);
          // Force save to IndexedDB immediately to prevent reversion
          setTimeout(async () => {
            await Promise.all([
              storageService.setItem('bt_projects', cloudData.projects || []),
              storageService.setItem('bt_customers', cloudData.customers || []),
              storageService.setItem('bt_team', cloudData.teamMembers || []),
              storageService.setItem('bt_vendors', cloudData.vendors || []),
              storageService.setItem('bt_leads', cloudData.leads || []),
              storageService.setItem('bt_inventory', cloudData.inventory || []),
              storageService.setItem('bt_locations', cloudData.locations || []),
              storageService.setItem('bt_orders', cloudData.purchaseOrders || []),
              storageService.setItem('bt_attendance', cloudData.attendance || []),
              storageService.setItem('bt_payroll', cloudData.payroll || []),
              storageService.setItem('bt_approval_requests', cloudData.approvalRequests || []),
              storageService.setItem('bt_approval_templates', cloudData.approvalTemplates || [])
            ]);
            alert('✅ 雲端還原成功！\n\n所有本地資料已強制覆蓋為雲端版本。頁面將重新整理。');
            window.location.reload();
          }, 500);
        } else {
          alert('雲端沒有可用的備份資料。');
        }
      } catch (e) {
        console.error('Data Restore Failed', e);
        alert('還原失敗，請檢查網路連線或稍後再試。');
      } finally {
        setIsSyncing(false);
      }
    };

    window.addEventListener('TRIGGER_CLOUD_RESTORE', handleRestoreListener);
    return () => window.removeEventListener('TRIGGER_CLOUD_RESTORE', handleRestoreListener);
  }, [isCloudConnected, normalizeProjects]);



  const handleAddComment = (projectId: string, text: string) => {
    if (!user || user.role === 'Guest') return;
    const project = projects.find(p => p.id === projectId);
    const newComment: ProjectComment = {
      id: Date.now().toString(),
      authorName: user.name,
      authorAvatar: user.picture,
      authorRole: user.role === 'SuperAdmin' ? '管理總監' : '成員',
      text,
      timestamp: new Date().toLocaleString('zh-TW', { hour12: false }) || new Date().toISOString()
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


  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const [showDeleted, setShowDeleted] = useState(false);

  const filteredData = useMemo(() => {
    const filterByDept = (item: any) => {
      // 永久刪除的項目在所有視圖中完全隱藏
      if (item.isPurged) return false;
      // 過濾已被軟刪除的項目 (除非開啟查看垃圾桶)
      if (item.deletedAt && !showDeleted) return false;

      if (viewingDeptId === 'all') return true;
      // 支援多部門過濾
      if (item.departmentIds && Array.isArray(item.departmentIds) && item.departmentIds.length > 0) {
        return item.departmentIds.includes(viewingDeptId);
      }
      return item.departmentId === viewingDeptId;
    };
    const filterTeamMembers = (item: any) => {
      if (item.isPurged) return false;
      if (item.deletedAt && !showDeleted) return false;

      if (viewingDeptId === 'all') return true;

      const itemDepts = item.departmentIds && Array.isArray(item.departmentIds) && item.departmentIds.length > 0
        ? item.departmentIds
        : [item.departmentId];

      // 1. 基本規則：部門相符
      if (itemDepts.includes(viewingDeptId)) return true;

      // 2. 特殊規則：戰略指揮部 (DEPT-1) 的成員可以在第一/第三/第四工程部出現
      if (itemDepts.includes('DEPT-1') && (viewingDeptId === 'DEPT-4' || viewingDeptId === 'DEPT-8' || viewingDeptId === 'DEPT-9')) {
        return true;
      }

      return false;
    };

    return {
      projects: projects.filter(filterByDept),
      customers: customers.filter(filterByDept),
      teamMembers: teamMembers.filter(filterTeamMembers), // 使用特殊過濾邏輯
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
    setIsInitializing(true); // Show loading screen immediately
    const fullUser: User = { ...u, department: d };
    setUser(fullUser);
    setCurrentDept(d);
    // 修正部門 ID 對應：第一工程部(DEPT-4), 第三工程部(DEPT-8), 第四工程部(DEPT-9)
    const deptId = d === 'ThirdDept' ? 'DEPT-8' : d === 'FourthDept' ? 'DEPT-9' : 'DEPT-4';
    setViewingDeptId(u.role === 'SuperAdmin' ? 'all' : deptId);
    localStorage.setItem('bt_user', JSON.stringify(fullUser));
    // Data loading happens in background but UI is blocked by isInitializing
    loadSystemData(d);
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
              className="w-full py-5 bg-stone-900 hover:bg-stone-800 text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-stone-950/20 flex items-center justify-center gap-3"
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
    <div className="flex h-screen w-screen bg-[#fafaf9] overflow-hidden print:overflow-visible print:h-auto print:block">
      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-[100] lg:hidden animate-in fade-in duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static transition-transform duration-500 z-[101] w-64 h-full shrink-0 print:hidden`}>
        <Sidebar activeTab={activeTab} setActiveTab={(t) => { setActiveTab(t); setSelectedProjectId(null); setIsSidebarOpen(false); }} user={{ ...user, accessibleModules: currentUserPermissions }} onMenuClose={() => setIsSidebarOpen(false)} isSyncing={isSyncing} />
      </div>

      <main className="flex-1 flex flex-col h-full w-full min-0 relative print:h-auto print:overflow-visible print:block">
        <header className="h-16 shrink-0 bg-white/80 backdrop-blur-xl border-b border-stone-200 px-4 lg:px-8 flex items-center justify-between no-print z-40">
          <div className="flex items-center gap-2 sm:gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-stone-600 hover:bg-stone-100 rounded-lg"><Menu size={24} /></button>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-2xl shadow-lg ${user.role === 'Guest' ? 'bg-stone-900 text-orange-400' : 'bg-stone-900 text-white'}`}>
                <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${user.role === 'Guest' ? 'bg-orange-500' : 'bg-emerald-400'}`}></div>
                <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">{user.role === 'Guest' ? '訪客唯讀' : 'V3.0 SYNC-SHIELD'}</span>
                <span className="text-[10px] font-black uppercase tracking-widest sm:hidden">V3.0</span>
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
              onDeleteComment={(commentId) => setProjects(prev => prev.map(p => p.id === selectedProjectId ? { ...p, comments: p.comments?.filter(c => c.id !== commentId), updatedAt: new Date().toISOString() } : p))}
              onUpdateFiles={(files) => setProjects(prev => prev.map(p => p.id === selectedProjectId ? { ...p, files, updatedAt: new Date().toISOString() } : p))}
              onUpdatePhases={(phases) => setProjects(prev => prev.map(p => p.id === selectedProjectId ? { ...p, phases, updatedAt: new Date().toISOString() } : p))}
              onAddDailyLog={(log) => handleAddDailyLog(selectedProjectId, log)}
              onDeleteDailyLog={(logId) => setProjects(prev => prev.map(p => p.id === selectedProjectId ? { ...p, dailyLogs: p.dailyLogs?.filter(l => l.id !== logId), updatedAt: new Date().toISOString() } : p))}
              onUpdateChecklist={(checklist) => handleUpdateChecklist(selectedProjectId, checklist)}
              onUpdatePayments={(payments) => handleUpdatePayments(selectedProjectId, payments)}
              onUpdateTasks={(tasks) => setProjects(prev => prev.map(p => p.id === selectedProjectId ? { ...p, tasks, updatedAt: new Date().toISOString() } : p))}
              onUpdateProgress={(progress) => setProjects(prev => prev.map(p => p.id === selectedProjectId ? { ...p, progress, updatedAt: new Date().toISOString() } : p))}
              onUpdateExpenses={(expenses) => setProjects(prev => prev.map(p => p.id === selectedProjectId ? { ...p, expenses, updatedAt: new Date().toISOString() } : p))}
              onUpdateWorkAssignments={(assignments) => setProjects(prev => prev.map(p => p.id === selectedProjectId ? { ...p, workAssignments: assignments, updatedAt: new Date().toISOString() } : p))}
              onUpdatePreConstruction={(prep) => setProjects(prev => prev.map(p => p.id === selectedProjectId ? { ...p, preConstruction: prep, updatedAt: new Date().toISOString() } : p))}
              onUpdateContractUrl={(url) => setProjects(prev => prev.map(p => p.id === selectedProjectId ? { ...p, contractUrl: url, updatedAt: new Date().toISOString() } : p))}
              onUpdateDefectRecords={(records) => setProjects(prev => prev.map(p => p.id === selectedProjectId ? { ...p, defectRecords: records, updatedAt: new Date().toISOString() } : p))}
              onLossClick={() => handleUpdateStatus(selectedProjectId!, ProjectStatus.LOST)}
            />
          ) : (
            <div className="p-4 lg:p-8 animate-in fade-in duration-500">
              {activeTab === 'attendance' && (
                <AttendanceSystem
                  currentUser={{ ...user, accessibleModules: currentUserPermissions }}
                  records={attendanceRecords}
                  onRecord={handleClockRecord}
                />
              )}
              {activeTab === 'payroll' && (
                <PayrollSystem
                  records={attendanceRecords}
                  teamMembers={teamMembers}
                  currentUser={user}
                  approvalRequests={approvalRequests}
                  onCreateApproval={handleSaveApprovalRequest}
                  onImportRecords={handleImportRecords}
                  onImportLeaves={handleImportLeaves}
                />
              )}
              {activeTab === 'approvals' && moduleService.isModuleEnabled(ModuleId.APPROVALS) && (
                <ApprovalSystem
                  requests={approvalRequests}
                  templates={approvalTemplates}
                  teamMembers={teamMembers}
                  currentUser={{ ...user, accessibleModules: currentUserPermissions } as any}
                  onSaveRequest={handleSaveApprovalRequest}
                  onSaveTemplate={handleSaveApprovalTemplate}
                  onDeleteTemplate={handleDeleteApprovalTemplate}
                  onAction={handleApprovalAction}
                />
              )}
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
                cloudError={cloudError}
                lastCloudSync={lastCloudSync}
                isMasterTab={isMasterTab}
                onRetrySync={handleCloudSync}
                onConvertLead={handleConvertLead}
                onProjectClick={(id) => { setSelectedProjectId(id); setActiveTab('projects'); }}
                onStartTour={() => setIsOnboardingOpen(true)}
                currentDept={currentDept}
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
                onRestoreClick={(id) => {
                  const p = projects.find(x => x.id === id);
                  if (p) addActivityLog('復原了專案', p.name, id, 'project');
                  setProjects(prev => prev.map(p => p.id === id ? { ...p, deletedAt: undefined, updatedAt: new Date().toISOString() } : p));
                  alert('✅ 案件已復原！');
                }}
                onHardDeleteClick={(id) => {
                  if (confirm('警告：此操作將永久刪除案件，無法還原，確定嗎？')) {
                    const p = projects.find(x => x.id === id);
                    if (p) {
                      addActivityLog('永久刪除了專案', p.name, id, 'project');
                      // 不直接從陣列 filter，而是標記 isPurged 以維持同步一致性，防止從雲端復原
                      setProjects(prev => prev.map(item => item.id === id ? { ...item, isPurged: true, updatedAt: new Date().toISOString() } : item));
                      alert('✅ 案件已永久刪除。');
                    }
                  }
                }}
                onDetailClick={(p) => setSelectedProjectId(p.id)}
                onLossClick={() => { }}
                showDeleted={showDeleted}
                onToggleDeleted={setShowDeleted}
                teamMembers={teamMembers}
                attendanceRecords={attendanceRecords}
              />}
              {activeTab === 'settings' && (
                <Settings
                  user={user} projects={projects} customers={customers} teamMembers={teamMembers}
                  onResetData={() => { if (confirm('注意：這將清除所有數據，確定嗎？')) { localStorage.clear(); window.location.reload(); } }}
                  onImportData={(data, mode = 'overwrite') => {
                    try {
                      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
                      if (mode === 'overwrite') {
                        if (parsed.projects) setProjects(parsed.projects);
                        if (parsed.customers) setCustomers(parsed.customers);
                        if (parsed.teamMembers) setTeamMembers(parsed.teamMembers);
                        if (parsed.vendors) setVendors(parsed.vendors);
                        if (parsed.leads) setLeads(parsed.leads);
                        if (parsed.inventory) setInventoryItems(parsed.inventory);
                        if (parsed.locations) setInventoryLocations(parsed.locations);
                        if (parsed.purchaseOrders) setPurchaseOrders(parsed.purchaseOrders);
                        if (parsed.attendance) setAttendanceRecords(parsed.attendance);
                        if (parsed.payroll) setPayrollRecords(parsed.payroll);
                      } else {
                        // Safe Merge Mode
                        if (parsed.projects) setProjects(prev => mergeData(prev, parsed.projects));
                        if (parsed.customers) setCustomers(prev => mergeData(prev, parsed.customers || []));
                        if (parsed.teamMembers) setTeamMembers(prev => mergeData(prev, parsed.teamMembers || []));
                        if (parsed.vendors) setVendors(prev => mergeData(prev, parsed.vendors || []));
                        if (parsed.leads) setLeads(prev => mergeData(prev, parsed.leads || []));
                        if (parsed.inventory) setInventoryItems(prev => mergeData(prev, parsed.inventory || []));
                        if (parsed.locations) setInventoryLocations(prev => mergeData(prev, parsed.locations || []));
                        if (parsed.purchaseOrders) setPurchaseOrders(prev => mergeData(prev, parsed.purchaseOrders || []));
                        if (parsed.attendance) setAttendanceRecords(prev => mergeData(prev, parsed.attendance || []));
                        if (parsed.payroll) setPayrollRecords(prev => mergeData(prev, parsed.payroll || []));
                      }
                      alert('資料匯入成功！');
                    } catch (e: any) {
                      console.error('Import Failed:', e);
                      alert(`匯入失敗：${e.message || '格式錯誤'}`);
                    }
                  }}
                  isCloudConnected={isCloudConnected}
                  onConnectCloud={handleConnectCloud}
                  onDownloadBackup={() => {
                    googleDriveService.exportAsFile({
                      projects,
                      customers,
                      teamMembers,
                      vendors,
                      leads,
                      inventory: inventoryItems,
                      locations: inventoryLocations,
                      purchaseOrders,
                      attendance: attendanceRecords,
                      payroll: payrollRecords
                    });
                  }}
                  onRestoreLocalBackup={async () => {
                    try {
                      const backupData = await storageService.getItem<Project[]>('bt_projects_backup', []);
                      if (backupData && backupData.length > 0) {
                        if (confirm(`找到備份 ${backupData.length} 個專案。\n確定要還原嗎？\n(這將覆蓋當前顯示的專案)`)) {
                          setProjects(backupData);
                          await storageService.setItem('bt_projects', backupData);
                          alert('✅ 已從無限量空間還原備份！\n頁面即將重新整理。');
                          window.location.reload();
                        }
                      } else {
                        alert('找不到可用的本地備份。');
                      }
                    } catch (e) {
                      console.error('Backup recovery failed', e);
                      alert('還原失敗：備份內容可能已損毀');
                    }
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
                currentUserRole={user.role}
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
              {activeTab === 'dispatch' && moduleService.isModuleEnabled(ModuleId.DISPATCH) && <DispatchManager projects={filteredData.projects} teamMembers={filteredData.teamMembers} onProjectsUpdate={setProjects} onAddDispatch={(pid, ass) => setProjects(prev => prev.map(p => p.id === pid ? { ...p, workAssignments: [ass, ...(p.workAssignments || [])], updatedAt: new Date().toISOString() } : p))} onDeleteDispatch={(pid, aid) => setProjects(prev => prev.map(p => p.id === pid ? { ...p, workAssignments: (p.workAssignments || []).filter(a => a.id !== aid), updatedAt: new Date().toISOString() } : p))} />}
              {activeTab === 'analytics' && moduleService.isModuleEnabled(ModuleId.ANALYTICS) && <Analytics projects={filteredData.projects} />}

              {activeTab === 'inventory' && moduleService.isModuleEnabled(ModuleId.INVENTORY) && <InventoryList
                items={inventoryItems}
                locations={inventoryLocations}
                user={user}
                onAddClick={() => { setEditingInventoryItem(null); setIsInventoryModalOpen(true); }}
                onEditClick={(item) => { setEditingInventoryItem(item); setIsInventoryModalOpen(true); }}
                onDeleteClick={(id) => {
                  if (confirm('確定移除此庫存項目？')) {
                    const item = inventoryItems.find(i => i.id === id);
                    if (item) addActivityLog('移除庫存項目', item.name, id, 'system');
                    setInventoryItems(prev => prev.map(i => i.id === id ? { ...i, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : i));
                  }
                }}
                onManageLocations={() => setIsLocationManagerOpen(true)}
                onTransferClick={(item) => setTransferItem(item)}
                onScanClick={() => setIsScanModalOpen(true)}
                onOrdersClick={() => setIsOrderManagerOpen(true)}
              />}

              {activeTab === 'vendors' && moduleService.isModuleEnabled(ModuleId.VENDORS) && (
                <div className="p-4 lg:p-8 space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-black text-stone-900 tracking-tight">廠商與工班管理</h2>
                    {['SuperAdmin', 'Admin', 'DeptAdmin', 'AdminStaff', 'Manager'].includes(user?.role || '') && (
                      <button
                        onClick={() => {
                          setEditingVendor(null);
                          setIsVendorModalOpen(true);
                        }}
                        className="bg-stone-900 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg shadow-stone-200 active:scale-95 transition-all"
                      >
                        + 新增廠商
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {vendors.map(v => (
                      <div key={v.id} className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex justify-between items-start mb-4">
                          <div className="bg-stone-100 px-2 py-0.5 rounded text-[8px] font-black text-stone-500 uppercase">{v.id}</div>
                          {['SuperAdmin', 'Admin', 'DeptAdmin', 'AdminStaff', 'Manager'].includes(user?.role || '') && (
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
                          )}
                        </div>
                        <h3 className="text-lg font-black text-stone-900 mb-1">{v.name}</h3>
                        <p className="text-[10px] font-black text-blue-600 uppercase mb-4 tracking-widest">{v.type}</p>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs font-medium text-stone-500">
                            <LucideUser size={14} /> {v.contact}
                          </div>
                          {v.phone && (
                            <a href={`tel:${v.phone}`} className="flex items-center gap-2 text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline">
                              {/* @ts-ignore */}
                              <Phone size={14} /> {v.phone}
                            </a>
                          )}
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
              {activeTab === 'help' && <HelpCenter onStartTour={() => setIsOnboardingOpen(true)} />}
            </div>
          )}
        </div>

        {
          !selectedProjectId && activeTab === 'dashboard' && (
            <div className="fixed bottom-8 right-8 z-[45] flex flex-col items-end gap-3 no-print">
              <div className="bg-white/90 backdrop-blur-2xl border border-stone-200 p-4 rounded-[2rem] shadow-2xl flex items-center gap-6 animate-in slide-in-from-right-12">
                <div className="flex items-center gap-3 border-r border-stone-100 pr-6">
                  <Activity size={18} className="text-emerald-500" />
                  <div className="flex flex-col"><span className="text-[9px] font-black text-stone-400 uppercase tracking-widest leading-none">系統狀態</span><span className="text-[10px] font-bold text-stone-900">核心正常</span></div>
                </div>
                <div className="flex items-center gap-3">
                  <Database size={16} className="text-emerald-500" />
                  <div className="flex flex-col"><span className="text-[9px] font-black text-stone-400 uppercase tracking-widest leading-none">無限量緩存</span><span className="text-[10px] font-bold text-stone-900">{lastLocalSave}</span></div>
                </div>
              </div>
            </div>
          )
        }

        <div className="no-print">
          <AIAssistant
            projects={filteredData.projects}
            onAddProject={(initialData) => {
              setEditingProject({
                id: '',
                name: initialData.name || '新案件',
                status: ProjectStatus.NEGOTIATING,
                progress: 0,
                managers: [],
                customer: initialData.client ? { name: initialData.client, phone: '', id: 'temp' } as any : undefined,
                budget: initialData.budget || 0,
                description: initialData.notes || '',
                location: initialData.location ? { address: initialData.location } as any : undefined,
                categories: [],
                startDate: new Date().toISOString().split('T')[0],
              } as any);
              setIsModalOpen(true);
            }}
            onProjectClick={(projectId) => {
              setSelectedProjectId(projectId);
              setActiveTab('projects');
            }}
          />
        </div>
        {/* AI API Key Settings Modal */}
        {
          isAISettingsOpen && (
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
          )
        }
      </main >

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
          '台灣美光晶圓': 'MIC',
          'AI會勘系統': 'AI'
        };

        if (editingProject) {
          addActivityLog('更新了專案資訊', data.name, editingProject.id, 'project');
          setProjects(prev => {
            // Find the original project
            const originalProject = prev.find(p => p.id === editingProject.id);
            if (!originalProject) return prev;

            let updatedId = originalProject.id;
            // 如果來源變更，更新 ID 的字首
            if (data.source && data.source !== originalProject.source) {
              const oldPrefix = sourcePrefixes[originalProject.source] || 'PJ';
              const newPrefix = sourcePrefixes[data.source] || 'PJ';
              updatedId = originalProject.id.replace(oldPrefix, newPrefix);
            }
            const statusChangedAt = data.status !== originalProject.status ? new Date().toISOString() : (originalProject.statusChangedAt || originalProject.updatedAt || originalProject.createdDate);
            // 優先使用手動輸入的 ID，若無更動則使用自動更換字首後的 ID
            const finalId = data.id && data.id !== editingProject.id ? data.id : updatedId;

            // 如果 ID 沒有變更，直接更新原物件
            if (finalId === editingProject.id) {
              return prev.map(p => p.id === editingProject.id ? { ...p, ...data, statusChangedAt, updatedAt: new Date().toISOString() } : p);
            } else {
              // ID 有變更：執行「舊案刪除、新案建立」的邏輯 (Rename)
              // 1. 標記舊案為已刪除 (Tombstone)，讓雲端同步知道此 ID 已失效
              const tombstone = { ...originalProject, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };

              // 2. 建立新 ID 的案件，繼承原有關聯資料
              const newProject = { ...originalProject, ...data, id: finalId, statusChangedAt, updatedAt: new Date().toISOString() };

              // 3. 回傳新陣列：原地替換舊案為 Tombstone (或保留)，並加入新案
              // 為了列表穩定性，我們將舊案標記刪除，並將新案加入
              return [...prev.map(p => p.id === editingProject.id ? tombstone : p), newProject];
            }
          });
        } else {
          // 案件編號產生規則: [來源代碼][年份縮寫(YY)][月(MM)][流水號(001)]
          const prefix = sourcePrefixes[data.source || 'BNI'] || 'PJ';
          const projectDate = data.startDate ? new Date(data.startDate) : new Date();
          const yearShort = projectDate.getFullYear().toString().slice(-2);
          const month = (projectDate.getMonth() + 1).toString().padStart(2, '0');

          // 流水號計數改為「依字首+年份」獨立計數，且排除已永久刪除(isPurged)的案件以避免跳號
          let sequence = 1;
          if (projects.length > 0) {
            const targetPattern = new RegExp(`^${prefix}${yearShort}`);
            const sequences = projects
              .filter(p => !p.isPurged && targetPattern.test(p.id)) // 只計算同來源、同年份且未被永久刪除的案件
              .map(p => {
                const match = p.id.match(/(\d{3})$/);
                return match ? parseInt(match[1], 10) : 0;
              })
              .filter(num => !isNaN(num) && num > 0 && num < 1000);

            if (sequences.length > 0) {
              sequence = Math.max(...sequences) + 1;
            }
          }

          const generatedId = `${prefix}${yearShort}${month}${sequence.toString().padStart(3, '0')}`;
          const finalId = data.id || generatedId;
          addActivityLog('建立新專案', data.name, finalId, 'project');
          setProjects(prev => [{ ...data, id: finalId, status: ProjectStatus.NEGOTIATING, statusChangedAt: new Date().toISOString(), progress: 0, workAssignments: [], expenses: [], comments: [], files: [], phases: [], updatedAt: new Date().toISOString() } as any, ...prev]);
        }
        setIsModalOpen(false);
      }} initialData={editingProject} teamMembers={teamMembers} />}

      {
        isCustomerModalOpen && user?.role !== 'Guest' && <CustomerModal
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
        />
      }

      {
        isTeamModalOpen && user?.role !== 'Guest' && <TeamModal
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
        />
      }

      {
        isInventoryModalOpen && user?.role !== 'Guest' && <InventoryModal
          onClose={() => { setIsInventoryModalOpen(false); setEditingInventoryItem(null); }}
          onConfirm={(data) => {
            const timestamped = { ...data, updatedAt: new Date().toISOString() };
            if (editingInventoryItem) {
              addActivityLog('更新庫存', data.name || '', editingInventoryItem.id, 'system');
              setInventoryItems(prev => prev.map(i => i.id === editingInventoryItem.id ? { ...i, ...timestamped } as InventoryItem : i));
            } else {
              const newId = 'INV' + Date.now().toString().slice(-6);
              addActivityLog('新增庫存', data.name || '', newId, 'system');
              setInventoryItems(prev => [{ ...timestamped, id: newId, status: 'Normal' } as InventoryItem, ...prev]);
            }
            setIsInventoryModalOpen(false);
            setEditingInventoryItem(null);
          }}
          initialData={editingInventoryItem}
          // Pass available locations names for suggestion
          availableLocationNames={inventoryLocations.map(l => l.name)}
          relatedPurchaseOrders={purchaseOrders.filter(o => o.items.some(i => i.itemId === editingInventoryItem?.id))}
          relatedTransferLogs={activityLogs.filter(l => l.targetId === editingInventoryItem?.id && l.action === '庫存調撥')}
        />
      }

      {
        isOrderManagerOpen && user?.role !== 'Guest' && <OrderManagerModal
          onClose={() => setIsOrderManagerOpen(false)}
          orders={purchaseOrders}
          inventoryItems={inventoryItems}
          locations={inventoryLocations}
          onSaveOrder={(order) => {
            setPurchaseOrders(prev => [order, ...prev]);
            addActivityLog('建立採購單', order.supplier, order.id, 'system');
          }}
          onUpdateOrder={(order) => {
            setPurchaseOrders(prev => prev.map(o => o.id === order.id ? order : o));
            addActivityLog('更新採購單', order.supplier, order.id, 'system');
          }}
          onDeleteOrder={(orderId) => {
            const order = purchaseOrders.find(o => o.id === orderId);
            setPurchaseOrders(prev => prev.filter(o => o.id !== orderId));
            addActivityLog('刪除採購單', order?.supplier || '未知廠商', orderId, 'system');
          }}
          onReceiveItems={(orderId, itemIdxs) => {
            const order = purchaseOrders.find(o => o.id === orderId);
            if (!order) return;

            const updatedItems = [...order.items];
            let somethingChanged = false;

            itemIdxs.forEach(idx => {
              if (!updatedItems[idx].received) {
                updatedItems[idx].received = true;
                somethingChanged = true;

                // Update Inventory
                const invItemId = updatedItems[idx].itemId;
                const quantityToAdd = updatedItems[idx].quantity;
                const targetWarehouseId = order.targetWarehouseId;
                const targetWarehouseName = inventoryLocations.find(l => l.id === targetWarehouseId)?.name || '總倉庫';

                setInventoryItems(prev => prev.map(item => {
                  if (item.id === invItemId) {
                    // Find if location exists
                    const existingLocIdx = item.locations?.findIndex(l => l.name === targetWarehouseName);
                    let newLocations = [...(item.locations || [])];

                    if (existingLocIdx !== undefined && existingLocIdx >= 0) {
                      newLocations[existingLocIdx] = {
                        ...newLocations[existingLocIdx],
                        quantity: Number(newLocations[existingLocIdx].quantity) + quantityToAdd
                      };
                    } else {
                      newLocations.push({ name: targetWarehouseName, quantity: quantityToAdd });
                    }

                    const totalQuantity = newLocations.reduce((sum, loc) => sum + loc.quantity, 0);

                    return {
                      ...item,
                      quantity: totalQuantity,
                      locations: newLocations,
                      updatedAt: new Date().toISOString()
                    };
                  }
                  return item;
                }));
              }
            });

            if (somethingChanged) {
              const allReceived = updatedItems.every(i => i.received);
              const updatedOrder = {
                ...order,
                items: updatedItems,
                status: allReceived ? 'Completed' : 'Partial' as any
              };
              setPurchaseOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
              addActivityLog('採購單收貨', order.supplier, order.id, 'system');
            }
          }}
        />
      }

      {
        isLocationManagerOpen && <LocationManagerModal
          locations={inventoryLocations}
          onClose={() => setIsLocationManagerOpen(false)}
          onAdd={(data) => {
            const newId = 'LOC' + Date.now().toString().slice(-6);
            setInventoryLocations(prev => [...prev, { ...data, id: newId } as InventoryLocation]);
            addActivityLog('新增倉庫', data.name, newId, 'system');
          }}
          onDelete={(id) => {
            const loc = inventoryLocations.find(l => l.id === id);
            if (loc) {
              setInventoryLocations(prev => prev.filter(l => l.id !== id));
              addActivityLog('移除倉庫', loc.name, id, 'system');
            }
          }}
          onUpdate={(location) => {
            setInventoryLocations(prev => prev.map(l => l.id === location.id ? location : l));
            addActivityLog('更新倉庫資訊', location.name, location.id, 'system');
          }}
        />
      }

      {
        transferItem && <TransferModal
          item={transferItem}
          allLocations={inventoryLocations}
          onClose={() => setTransferItem(null)}
          onConfirm={(from, to, qty, notes) => {
            // Perform Transfer
            setInventoryItems(prev => prev.map(item => {
              if (item.id !== transferItem.id) return item;

              const newLocations = [...(item.locations || [])];

              // Decrease Source
              const sourceIdx = newLocations.findIndex(l => l.name === from);
              if (sourceIdx >= 0) {
                newLocations[sourceIdx] = {
                  ...newLocations[sourceIdx],
                  quantity: Math.max(0, newLocations[sourceIdx].quantity - qty)
                };
              }

              // Increase Dest
              const destIdx = newLocations.findIndex(l => l.name === to);
              if (destIdx >= 0) {
                newLocations[destIdx] = {
                  ...newLocations[destIdx],
                  quantity: newLocations[destIdx].quantity + qty
                };
              } else {
                newLocations.push({ name: to, quantity: qty });
              }

              // Update Item total quantity (should technically remain same, but recalc to be safe)
              const total = newLocations.reduce((sum, l) => sum + (l.quantity || 0), 0);

              addActivityLog('庫存調撥', `${item.name} (${qty} ${item.unit}) from ${from} to ${to}`, item.id, 'inventory');

              return {
                ...item,
                quantity: total,
                locations: newLocations,
                updatedAt: new Date().toISOString()
              };
            }));
            setTransferItem(null);
          }}
        />
      }

      {
        isScanModalOpen && <ScanTransferModal
          inventoryItems={inventoryItems}
          locations={inventoryLocations}
          onClose={() => setIsScanModalOpen(false)}
          onConfirm={(items, toLocation) => {
            // Batch Transfer Logic
            setInventoryItems(prev => {
              let newItems = [...prev];
              const logDetails: string[] = [];

              items.forEach(transfer => {
                const itemIndex = newItems.findIndex(i => i.id === transfer.inventoryItem.id);
                if (itemIndex >= 0) {
                  const item = newItems[itemIndex];
                  const newLocations = [...(item.locations || [])];

                  // Decrease Source
                  const sourceIdx = newLocations.findIndex(l => l.name === transfer.fromLocation);
                  if (sourceIdx >= 0) {
                    newLocations[sourceIdx] = {
                      ...newLocations[sourceIdx],
                      quantity: Math.max(0, newLocations[sourceIdx].quantity - transfer.quantity)
                    };
                  }

                  // Increase Dest
                  const destIdx = newLocations.findIndex(l => l.name === toLocation);
                  if (destIdx >= 0) {
                    newLocations[destIdx] = {
                      ...newLocations[destIdx],
                      quantity: newLocations[destIdx].quantity + transfer.quantity
                    };
                  } else {
                    newLocations.push({ name: toLocation, quantity: transfer.quantity });
                  }

                  // Recalculate total
                  const total = newLocations.reduce((sum, l) => sum + (l.quantity || 0), 0);
                  newItems[itemIndex] = {
                    ...item,
                    quantity: total,
                    locations: newLocations,
                    updatedAt: new Date().toISOString()
                  };

                  logDetails.push(`${item.name} (${transfer.quantity})`);
                }
              });

              if (logDetails.length > 0) {
                addActivityLog('批量調撥', `轉移至 ${toLocation}: ${logDetails.join(', ')}`, 'BATCH_TRANSFER', 'inventory');
              }

              return newItems;
            });
            setIsScanModalOpen(false);
          }}
        />
      }

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
      {
        isNotificationOpen && (
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
        )
      }
      <OnboardingTour isOpen={isOnboardingOpen} onClose={handleCloseOnboarding} />
    </div >
  );
};

export default App;
