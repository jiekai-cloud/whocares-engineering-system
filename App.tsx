
import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import Login from './components/Login';
import { Menu, LogOut, Layers, Cloud, CloudOff, RefreshCw, AlertCircle, CheckCircle, ShieldCheck, Database, Zap, Sparkles, Globe, Activity, ShieldAlert, Bell } from 'lucide-react';
import NotificationPanel from './components/NotificationPanel';
import { MOCK_PROJECTS, MOCK_DEPARTMENTS } from './constants';
import { Project, ProjectStatus, Customer, TeamMember, User, Department, ProjectComment } from './types';
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

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  // 系統狀態
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [lastCloudSync, setLastCloudSync] = useState<string | null>(null);
  const [lastLocalSave, setLastLocalSave] = useState<string>(new Date().toLocaleTimeString());
  const [isInitializing, setIsInitializing] = useState(true);
  const [initialSyncDone, setInitialSyncDone] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

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
        const savedProjects = localStorage.getItem('bt_projects');
        const initialProjects = savedProjects ? JSON.parse(savedProjects) : MOCK_PROJECTS;
        setProjects(initialProjects.map((p: Project) => ({
          ...p,
          expenses: p.expenses || [],
          workAssignments: p.workAssignments || [],
          files: p.files || [],
          phases: p.phases || [],
          dailyLogs: p.dailyLogs || []
        })));
        setCustomers(JSON.parse(localStorage.getItem('bt_customers') || '[]'));
        setTeamMembers(JSON.parse(localStorage.getItem('bt_team') || '[]'));
        setActivityLogs(JSON.parse(localStorage.getItem('bt_logs') || '[]'));

        // 3. 優先解鎖介面 (不等待雲端)
        setInitialSyncDone(true);
        setTimeout(() => {
          setIsInitializing(false);
          clearTimeout(safetyTimeout);
        }, 800);

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

      const cloudData = await googleDriveService.loadFromCloud();
      if (cloudData) {
        if (cloudData.projects) setProjects(cloudData.projects);
        if (cloudData.customers) setCustomers(cloudData.customers);
        if (cloudData.teamMembers) setTeamMembers(cloudData.teamMembers);
        if (cloudData.activityLogs) setActivityLogs(cloudData.activityLogs);
        setLastCloudSync(new Date().toLocaleTimeString());
      }
    } catch (e) {
      setCloudError('會話已過期');
    }
  };

  // 使用 Ref 追蹤最新數據與同步狀態，避免頻繁觸發 useEffect 重新整理
  const dataRef = React.useRef({ projects, customers, teamMembers, activityLogs });
  const isSyncingRef = React.useRef(false);

  React.useEffect(() => {
    dataRef.current = { projects, customers, teamMembers, activityLogs };
  }, [projects, customers, teamMembers, activityLogs]);

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
      const success = await googleDriveService.saveToCloud({
        ...dataRef.current,
        lastUpdated: new Date().toISOString(),
        userEmail: user?.email
      });
      if (success) {
        setLastCloudSync(new Date().toLocaleTimeString());
        setCloudError(null);
      } else {
        const status = googleDriveService.getLastErrorStatus();
        setCloudError(`同步失敗 (${status || '?'})`);
      }
    } catch (err) {
      setCloudError('連線異常');
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [isCloudConnected, user?.email, user?.role]);

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

  useEffect(() => {
    if (!initialSyncDone || !user) return;

    // 定期本地保存 (訪客不保存)
    if (user.role !== 'Guest') {
      localStorage.setItem('bt_projects', JSON.stringify(projects));
      localStorage.setItem('bt_customers', JSON.stringify(customers));
      localStorage.setItem('bt_team', JSON.stringify(teamMembers));
      localStorage.setItem('bt_logs', JSON.stringify(activityLogs));
      setLastLocalSave(new Date().toLocaleTimeString());
    }

    // 智慧雲端增量同步 (當資料變更後 10 秒才觸發，避免頻繁儲存)
    if (isCloudConnected && !cloudError && user.role !== 'Guest') {
      const timer = setTimeout(() => {
        handleCloudSync();
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [projects, customers, teamMembers, activityLogs, isCloudConnected, cloudError, initialSyncDone, handleCloudSync, user?.role]);

  const handleUpdateStatus = (projectId: string, status: ProjectStatus) => {
    if (user?.role === 'Guest') return;
    const project = projects.find(p => p.id === projectId);
    if (project) {
      addActivityLog(`變更專案狀態：${status}`, project.name, projectId, 'project');
    }
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status } : p));
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
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, comments: [newComment, ...(p.comments || [])] } : p));
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

    if (project) {
      addActivityLog(`撰寫了施工日誌`, project.name, projectId, 'project');
    }

    setProjects(prev => prev.map(p => p.id === projectId ? {
      ...p,
      dailyLogs: [newLog, ...(p.dailyLogs || [])]
    } : p));
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
      teamMembers: teamMembers.filter(filterByDept)
    };
  }, [projects, customers, teamMembers, viewingDeptId]);

  if (isInitializing) {
    return (
      <div className="h-screen w-screen bg-[#1c1917] flex flex-col items-center justify-center space-y-8 animate-in fade-in">
        <div className="relative">
          <div className="w-20 h-20 bg-orange-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-orange-500/20 animate-pulse">
            <Globe className="text-white w-10 h-10" />
          </div>
          <div className="absolute inset-0 bg-orange-500 rounded-[2.5rem] blur-2xl opacity-20 animate-ping"></div>
        </div>
        <div className="text-center space-y-3">
          <h2 className="text-white font-black text-2xl uppercase tracking-[0.4em] ml-[0.4em]">Life Quality</h2>
          <div className="flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce"></span>
            <p className="text-stone-500 text-[10px] font-black uppercase tracking-[0.2em]">正在啟動智慧營造生產環境</p>
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
        <Sidebar activeTab={activeTab} setActiveTab={(t) => { setActiveTab(t); setIsSidebarOpen(false); }} user={user} onMenuClose={() => setIsSidebarOpen(false)} />
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
              onDelete={(id) => { if (confirm('確定要刪除嗎？')) { setProjects(prev => prev.filter(p => p.id !== id)); setSelectedProjectId(null); } }}
              onUpdateStatus={(status) => handleUpdateStatus(selectedProject.id, status)}
              onAddComment={(text) => handleAddComment(selectedProject.id, text)}
              onUpdateFiles={(files) => setProjects(prev => prev.map(p => p.id === selectedProjectId ? { ...p, files } : p))}
              onUpdatePhases={(phases) => setProjects(prev => prev.map(p => p.id === selectedProjectId ? { ...p, phases } : p))}
              onAddDailyLog={(log) => handleAddDailyLog(selectedProjectId, log)}
              onUpdateTasks={(tasks) => setProjects(prev => prev.map(p => p.id === selectedProject.id ? { ...p, tasks } : p))}
              onUpdateProgress={(progress) => setProjects(prev => prev.map(p => p.id === selectedProject.id ? { ...p, progress } : p))}
              onUpdateExpenses={(expenses) => setProjects(prev => prev.map(p => p.id === selectedProject.id ? { ...p, expenses } : p))}
              onUpdateWorkAssignments={(assignments) => setProjects(prev => prev.map(p => p.id === selectedProject.id ? { ...p, workAssignments: assignments } : p))}
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

              {activeTab === 'dashboard' && <Dashboard projects={filteredData.projects} onProjectClick={(p) => setSelectedProjectId(p.id)} />}
              {activeTab === 'projects' && <ProjectList projects={filteredData.projects} user={user} onAddClick={() => { setEditingProject(null); setIsModalOpen(true); }} onEditClick={(p) => { setEditingProject(p); setIsModalOpen(true); }} onDeleteClick={(id) => { if (confirm('刪除操作不可逆，確定嗎？')) { const p = projects.find(x => x.id === id); if (p) addActivityLog('刪除了專案', p.name, id, 'project'); setProjects(prev => prev.filter(p => p.id !== id)); } }} onDetailClick={(p) => setSelectedProjectId(p.id)} onLossClick={() => { }} />}
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
                      alert('資料匯入成功！');
                    } catch (e) { alert('匯入失敗：格式錯誤'); }
                  }}
                  isCloudConnected={isCloudConnected}
                  onConnectCloud={handleConnectCloud}
                  onDownloadBackup={() => {
                    googleDriveService.exportAsFile({ projects, customers, teamMembers });
                  }}
                  onDisconnectCloud={() => { setIsCloudConnected(false); localStorage.removeItem('bt_cloud_connected'); }}
                  lastSyncTime={lastCloudSync}
                />
              )}
              {activeTab === 'team' && <TeamList members={filteredData.teamMembers} departments={MOCK_DEPARTMENTS} onAddClick={() => { setEditingMember(null); setIsTeamModalOpen(true); }} onEditClick={(m) => { setEditingMember(m); setIsTeamModalOpen(true); }} onDeleteClick={(id) => { if (confirm('確定移除此成員？')) { const m = teamMembers.find(x => x.id === id); if (m) addActivityLog('移除了成員', m.name, id, 'team'); setTeamMembers(prev => prev.filter(m => m.id !== id)); } }} />}
              {activeTab === 'customers' && <CustomerList customers={filteredData.customers} onAddClick={() => { setEditingCustomer(null); setIsCustomerModalOpen(true); }} onEditClick={(c) => { setEditingCustomer(c); setIsCustomerModalOpen(true); }} onDeleteClick={(id) => { if (confirm('確定移除此客戶？')) { const c = customers.find(x => x.id === id); if (c) addActivityLog('移除了客戶', c.name, id, 'customer'); setCustomers(prev => prev.filter(c => c.id !== id)); } }} />}
              {activeTab === 'dispatch' && <DispatchManager projects={filteredData.projects} teamMembers={filteredData.teamMembers} onAddDispatch={(pid, ass) => setProjects(prev => prev.map(p => p.id === pid ? { ...p, workAssignments: [ass, ...(p.workAssignments || [])] } : p))} onDeleteDispatch={(pid, aid) => setProjects(prev => prev.map(p => p.id === pid ? { ...p, workAssignments: (p.workAssignments || []).filter(a => a.id !== aid) } : p))} />}
              {activeTab === 'analytics' && <Analytics projects={filteredData.projects} />}
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
              return { ...p, ...data, id: updatedId };
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
          setProjects(prev => [{ ...data, id: newId, status: ProjectStatus.NEGOTIATING, progress: 0, workAssignments: [], expenses: [], comments: [], files: [], phases: [] } as any, ...prev]);
        }
        setIsModalOpen(false);
      }} initialData={editingProject} teamMembers={teamMembers} />}

      {isCustomerModalOpen && user.role !== 'Guest' && <CustomerModal onClose={() => setIsCustomerModalOpen(false)} onConfirm={(data) => {
        if (editingCustomer) {
          addActivityLog('更新客戶資料', data.name, editingCustomer.id, 'customer');
          setCustomers(prev => prev.map(c => c.id === editingCustomer.id ? { ...c, ...data } : c));
        } else {
          const newId = 'C' + Date.now().toString().slice(-6);
          addActivityLog('新增客戶', data.name, newId, 'customer');
          setCustomers(prev => [{ ...data, id: newId, createdDate: new Date().toISOString().split('T')[0] } as any, ...prev]);
        }
        setIsCustomerModalOpen(false);
      }} initialData={editingCustomer} />}

      {isTeamModalOpen && user.role !== 'Guest' && <TeamModal onClose={() => setIsTeamModalOpen(false)} onConfirm={(data) => {
        if (editingMember) {
          addActivityLog('更新成員資料', data.name, editingMember.id, 'team');
          setTeamMembers(prev => prev.map(m => m.id === editingMember.id ? { ...m, ...data } : m));
        } else {
          const newId = 'T' + Date.now().toString().slice(-6);
          addActivityLog('新增團隊成員', data.name, newId, 'team');
          setTeamMembers(prev => [{ ...data, id: newId, status: 'Available', activeProjectsCount: 0, systemRole: data.systemRole || 'Staff', departmentId: data.departmentId || 'DEPT-1' } as any, ...prev]);
        }
        setIsTeamModalOpen(false);
      }} initialData={editingMember} />}

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
            />
          </div>
        </>
      )}
    </div>
  );
};

export default App;
