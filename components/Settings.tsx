
import React, { useState, useMemo, FC } from 'react';
import {
  User, ChevronRight, Download, ShieldCheck,
  Cloud, CloudOff, RefreshCw, Database, HardDrive, FileJson, UploadCloud, RotateCcw, Zap, Info, AlertTriangle, Github, Globe, Copy, Check, ShieldAlert, LayoutDashboard
} from 'lucide-react';
import { Project, Customer, TeamMember, User as UserType } from '../types';
import { BACKUP_FILENAME } from '../services/googleDriveService';

interface SettingsProps {
  user: UserType;
  projects: Project[];
  customers: Customer[];
  teamMembers: TeamMember[];
  onResetData: () => void;
  onImportData: (data: any, mode?: 'overwrite' | 'merge') => void;
  isCloudConnected: boolean;
  onConnectCloud: () => void;
  onDisconnectCloud: () => void;
  lastSyncTime: string | null;
  onDownloadBackup?: () => void;
  onRestoreLocalBackup?: () => void;
}

const Settings: FC<SettingsProps> = ({
  user, projects, customers, teamMembers, onResetData, onImportData,
  isCloudConnected, onConnectCloud, onDisconnectCloud, lastSyncTime,
  onDownloadBackup, onRestoreLocalBackup
}) => {
  const [activeSection, setActiveSection] = useState('cloud');
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pendingData, setPendingData] = useState<any>(null);
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());
  const [restoreData, setRestoreData] = useState<any>(null);
  const [restoreOptions, setRestoreOptions] = useState({
    projects: true,
    dispatch: true,
    customers: true,
    vendors: true,
    teamMembers: true,
    inventory: true,
    attendance: true,
    payroll: true,
    leads: true
  });

  const [importMode, setImportMode] = useState<'overwrite' | 'merge'>('merge');
  const isReadOnly = user.role === 'Guest';
  const currentUrl = window.location.origin + window.location.pathname;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleManualExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      const backupData = {
        version: "2026.1.1",
        exportDate: new Date().toISOString(),
        projects,
        customers,
        teamMembers
      };
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `生活品質工程系統_備份_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setIsExporting(false);
    }, 800);
  };

  const sections = [
    { id: 'profile', label: '個人帳戶', icon: User },
    { id: 'cloud', label: '雲端同步', icon: Cloud },
    { id: 'deploy', label: '部署助手', icon: Github },
    { id: 'data', label: '資料安全', icon: ShieldCheck },
  ];

  // Add modules section for SuperAdmin
  if (user.role === 'SuperAdmin') {
    sections.push({ id: 'modules', label: '功能模組', icon: LayoutDashboard });
  }

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto animate-in fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-stone-900 tracking-tight">系統配置</h1>
        <p className="text-stone-500 text-sm font-medium">針對生產環境與 GitHub Pages 最佳化。</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="w-full lg:w-64 space-y-1 shrink-0">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full flex items-center justify-between px-4 py-4 rounded-2xl transition-all ${activeSection === section.id
                ? 'bg-stone-900 text-white shadow-xl shadow-stone-200'
                : 'text-stone-500 hover:bg-white hover:text-stone-900'
                }`}
            >
              <div className="flex items-center gap-3">
                <section.icon size={18} className={activeSection === section.id ? 'text-orange-400' : 'text-stone-400'} />
                <span className="font-black text-xs uppercase tracking-widest">{section.label}</span>
              </div>
              <ChevronRight size={14} className={activeSection === section.id ? 'opacity-100' : 'opacity-0'} />
            </button>
          ))}
        </div>

        <div className="flex-1 bg-white rounded-[2.5rem] border border-stone-200 shadow-sm overflow-hidden min-h-[550px]">
          <div className="p-6 lg:p-12">

            {activeSection === 'deploy' && (
              <div className="space-y-8 animate-in slide-in-from-right-4">
                <div className="flex items-center gap-5">
                  <div className="p-5 rounded-[2rem] bg-stone-900 text-white shadow-lg">
                    <Github size={32} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-stone-900 uppercase tracking-tight">GitHub Pages 部署助手</h3>
                    <p className="text-sm text-stone-500 font-medium">協助您完成雲端授權與發佈設定。</p>
                  </div>
                </div>

                <div className="bg-orange-50 border border-orange-100 p-8 rounded-[2rem] space-y-4">
                  <div className="flex items-start gap-3">
                    <Info className="text-orange-600 mt-1" size={18} />
                    <div className="space-y-2">
                      <p className="text-sm font-black text-orange-900">為什麼需要設定授權來源？</p>
                      <p className="text-xs text-orange-700 leading-relaxed font-bold">
                        為了防止他人惡意存取您的 Google Drive，Google 要求必須在後台手動核准您的網站網址。
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 space-y-3">
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">您的系統網址</p>
                    <div className="flex items-center gap-2 bg-white p-3 rounded-xl border border-orange-200 shadow-inner">
                      <Globe size={14} className="text-stone-400" />
                      <code className="text-xs font-black text-stone-900 flex-1 truncate">{currentUrl}</code>
                      <button
                        onClick={handleCopyUrl}
                        className="p-2 hover:bg-stone-50 rounded-lg text-orange-600 transition-all active:scale-90"
                      >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'cloud' && (
              <div className="space-y-8 animate-in slide-in-from-right-4">
                <div className="flex items-center gap-5">
                  <div className={`p-5 rounded-[2rem] ${isCloudConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-stone-100 text-stone-400'}`}>
                    {isCloudConnected ? <Cloud size={32} /> : <CloudOff size={32} />}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-stone-900 uppercase tracking-tight">Google Drive 雲端同步</h3>
                    <p className="text-sm text-stone-500 font-medium">跨設備數據存取的唯一核心路徑。</p>
                  </div>
                </div>

                {isReadOnly ? (
                  <div className="bg-stone-50 p-10 rounded-[2.5rem] border border-stone-200 text-center flex flex-col items-center gap-4">
                    <ShieldAlert size={48} className="text-stone-300" />
                    <div>
                      <h4 className="text-lg font-black text-stone-900 uppercase">權限受限</h4>
                      <p className="text-sm text-stone-500 max-w-sm mx-auto mt-2">訪客帳號無法進行雲端連線設定。</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {!isCloudConnected ? (
                      <div className="bg-stone-50 p-10 rounded-[2.5rem] border border-stone-200 text-center space-y-6">
                        <div className="mx-auto w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                          <Zap size={32} className="text-orange-500" />
                        </div>
                        <div>
                          <h4 className="text-lg font-black text-stone-900 uppercase">啟動智慧同步</h4>
                          <p className="text-sm text-stone-500 max-w-sm mx-auto mt-2">一旦啟用，您的所有更動都會立即加密儲存至您的 Google Drive 專屬檔案中。</p>
                        </div>
                        <button
                          onClick={onConnectCloud}
                          className="w-full max-w-xs mx-auto bg-orange-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-orange-100 hover:bg-orange-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                        >
                          授權並啟動同步
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-[2rem] flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <ShieldCheck size={28} className="text-emerald-500" />
                            <div>
                              <p className="text-sm font-black text-emerald-900">連線穩定</p>
                              <p className="text-xs text-emerald-600 font-bold">同步檔案：{BACKUP_FILENAME}</p>
                            </div>
                          </div>
                          <button
                            onClick={onDisconnectCloud}
                            className="text-xs font-black text-emerald-700 hover:text-rose-600 transition-colors underline underline-offset-4"
                          >
                            中斷連線
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {activeSection === 'data' && (
              <div className="space-y-8 animate-in slide-in-from-right-4">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-orange-50 text-orange-600 rounded-[1.5rem]">
                    <ShieldCheck size={32} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-stone-900 uppercase tracking-tight">資料安全中心</h3>
                    <p className="text-sm text-stone-500 font-medium">管理本地與雲端的數據持久化策略。</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-[2rem] border border-stone-200 shadow-sm space-y-4 group hover:border-orange-200 transition-all">
                    <div className="flex items-center gap-3">
                      <Download size={20} className="text-blue-500" />
                      <h4 className="text-sm font-black text-stone-900">導出 JSON 備份</h4>
                    </div>
                    <p className="text-[11px] text-stone-500 leading-relaxed font-bold">
                      將所有資料存為本地檔案，適合在無網路環境下進行遷移。
                    </p>
                    <button
                      onClick={() => {
                        if (onDownloadBackup) onDownloadBackup();
                        else handleManualExport();
                      }}
                      disabled={isExporting}
                      className="w-full bg-stone-900 text-white hover:bg-stone-800 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-stone-100 transition-all active:scale-95"
                    >
                      {isExporting ? <RefreshCw size={14} className="animate-spin" /> : <Download size={16} />}
                      導出完整數據包 (.json)
                    </button>
                  </div>

                  {!isReadOnly && (
                    <div className="bg-white p-6 rounded-[2rem] border border-stone-200 shadow-sm space-y-4 group hover:border-emerald-200 transition-all">
                      <div className="flex items-center gap-3">
                        <UploadCloud size={20} className="text-emerald-500" />
                        <h4 className="text-sm font-black text-stone-900">匯入現有資料</h4>
                      </div>
                      <p className="text-[11px] text-stone-500 leading-relaxed font-bold">
                        從現有的備份檔恢復數據。
                      </p>

                      <div className="flex bg-stone-100 p-1 rounded-xl mb-3">
                        <button
                          onClick={() => setImportMode('merge')}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-black tracking-widest transition-all ${importMode === 'merge' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400'}`}
                        >
                          合併 (Merge)
                        </button>
                        <button
                          onClick={() => setImportMode('overwrite')}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-black tracking-widest transition-all ${importMode === 'overwrite' ? 'bg-rose-600 text-white shadow-sm' : 'text-stone-400'}`}
                        >
                          覆蓋 (Overwrite)
                        </button>
                      </div>

                      <div className="relative">
                        <input
                          type="file"
                          accept=".json"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              try {
                                const jsonStr = event.target?.result as string;
                                const parsed = JSON.parse(jsonStr);
                                if (parsed.projects && Array.isArray(parsed.projects) && parsed.projects.length > 0) {
                                  setPendingData(parsed);
                                  // Default select all
                                  setSelectedProjectIds(new Set(parsed.projects.map((p: any) => p.id)));
                                } else {
                                  onImportData(jsonStr, importMode);
                                }
                              } catch (err) {
                                alert('檔案解析失敗：請確認上傳的是有效的 .json 備份檔');
                              }
                            };
                            reader.onerror = () => {
                              alert('檔案讀取錯誤，請重試');
                            };
                            reader.readAsText(file);
                            // Clear input so same file can be selected again
                            e.target.value = '';
                          }}
                        />
                        <button
                          className="w-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 text-emerald-700 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all pointer-events-none"
                        >
                          <RotateCcw size={14} />
                          選擇檔案匯入
                        </button>
                      </div>

                      {/* ID Correction Helper */}
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-[10px] text-orange-500 font-bold mb-2">案號修正助手：</p>
                        <button
                          onClick={() => {
                            try {
                              // Find projects with ID ending in 008
                              const affectedProjects = projects.filter(p => p.id.endsWith('008'));
                              if (affectedProjects.length === 0) {
                                alert('找不到編號為 008 的案件。');
                                return;
                              }

                              const targetId = affectedProjects[0].id.replace('008', '006');
                              const confirmFix = confirm(`確定要將案件 ${affectedProjects[0].id} 的編號更正為 ${targetId} 嗎？`);

                              if (confirmFix) {
                                const updatedProjects = projects.map(p => {
                                  if (p.id === affectedProjects[0].id) {
                                    return { ...p, id: targetId, updatedAt: new Date().toISOString() };
                                  }
                                  return p;
                                });
                                onImportData({ projects: updatedProjects }, 'overwrite');
                                alert('✅ 編號已成功更正為 006！');
                              }
                            } catch (e) {
                              alert('修正失敗：' + (e as Error).message);
                            }
                          }}
                          className="w-full bg-orange-50 hover:bg-orange-100 text-orange-600 py-2 rounded-lg text-xs font-bold transition-colors"
                        >
                          將案號 008 更正為 006
                        </button>
                      </div>

                      {/* Restore Data from Backup */}
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-[10px] text-blue-500 font-bold mb-2">從備份恢復：</p>

                        {!restoreData ? (
                          <div className="relative">
                            <input
                              type="file"
                              accept=".json"
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  try {
                                    const jsonStr = event.target?.result as string;
                                    const parsed = JSON.parse(jsonStr);
                                    setRestoreData(parsed);
                                  } catch (err) {
                                    alert('檔案解析失敗：請確認上傳的是有效的 .json 備份檔');
                                  }
                                };
                                reader.readAsText(file);
                                e.target.value = '';
                              }}
                            />
                            <button className="w-full bg-blue-50 hover:bg-blue-100 text-blue-600 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 pointer-events-none">
                              <Database size={14} />
                              選擇備份檔案
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="bg-blue-50 p-3 rounded-lg space-y-2">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={restoreOptions.projects}
                                  onChange={(e) => setRestoreOptions({ ...restoreOptions, projects: e.target.checked })}
                                  className="w-4 h-4"
                                />
                                <span className="text-xs font-bold">專案資料 ({restoreData.projects?.length || 0} 個)</span>
                              </label>

                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={restoreOptions.dispatch}
                                  onChange={(e) => setRestoreOptions({ ...restoreOptions, dispatch: e.target.checked })}
                                  className="w-4 h-4"
                                />
                                <span className="text-xs font-bold">派工紀錄 (包含在專案中)</span>
                              </label>

                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={restoreOptions.customers}
                                  onChange={(e) => setRestoreOptions({ ...restoreOptions, customers: e.target.checked })}
                                  className="w-4 h-4"
                                />
                                <span className="text-xs font-bold">客戶資料 ({restoreData.customers?.length || 0} 個)</span>
                              </label>

                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={restoreOptions.teamMembers}
                                  onChange={(e) => setRestoreOptions({ ...restoreOptions, teamMembers: e.target.checked })}
                                  className="w-4 h-4"
                                />
                                <span className="text-xs font-bold">團隊成員 ({restoreData.teamMembers?.length || 0} 位)</span>
                              </label>

                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={restoreOptions.vendors}
                                  onChange={(e) => setRestoreOptions({ ...restoreOptions, vendors: e.target.checked })}
                                  className="w-4 h-4"
                                />
                                <span className="text-xs font-bold">廠商資料 ({restoreData.vendors?.length || 0} 個)</span>
                              </label>

                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={restoreOptions.inventory}
                                  onChange={(e) => setRestoreOptions({ ...restoreOptions, inventory: e.target.checked })}
                                  className="w-4 h-4"
                                />
                                <span className="text-xs font-bold">庫存資料 ({restoreData.inventory?.length || 0} 項)</span>
                              </label>

                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={restoreOptions.attendance}
                                  onChange={(e) => setRestoreOptions({ ...restoreOptions, attendance: e.target.checked })}
                                  className="w-4 h-4"
                                />
                                <span className="text-xs font-bold">考勤紀錄 ({restoreData.attendance?.length || 0} 筆)</span>
                              </label>

                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={restoreOptions.payroll}
                                  onChange={(e) => setRestoreOptions({ ...restoreOptions, payroll: e.target.checked })}
                                  className="w-4 h-4"
                                />
                                <span className="text-xs font-bold">薪資資料 ({restoreData.payroll?.length || 0} 筆)</span>
                              </label>

                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setRestoreData(null);
                                  setRestoreOptions({
                                    projects: true,
                                    dispatch: true,
                                    customers: true,
                                    vendors: true,
                                    teamMembers: true,
                                    inventory: true,
                                    attendance: true,
                                    payroll: true,
                                    leads: true
                                  });
                                }}
                                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 py-2 rounded-lg text-xs font-bold transition-colors"
                              >
                                取消
                              </button>
                              <button
                                onClick={() => {
                                  try {
                                    const dataToRestore: any = {};
                                    let restoredItems: string[] = [];

                                    if (restoreOptions.projects && restoreData.projects) {
                                      dataToRestore.projects = restoreData.projects;
                                      restoredItems.push(`專案：${restoreData.projects.length} 個 (含派工紀錄)`);
                                    }
                                    if (restoreOptions.customers && restoreData.customers) {
                                      dataToRestore.customers = restoreData.customers;
                                      restoredItems.push(`客戶：${restoreData.customers.length} 個`);
                                    }
                                    if (restoreOptions.vendors && restoreData.vendors) {
                                      dataToRestore.vendors = restoreData.vendors;
                                      restoredItems.push(`廠商：${restoreData.vendors.length} 個`);
                                    }
                                    if (restoreOptions.teamMembers && restoreData.teamMembers) {
                                      dataToRestore.teamMembers = restoreData.teamMembers;
                                      restoredItems.push(`團隊成員：${restoreData.teamMembers.length} 位`);
                                    }
                                    if (restoreOptions.inventory && restoreData.inventory) {
                                      dataToRestore.inventory = restoreData.inventory;
                                      if (restoreData.locations) dataToRestore.locations = restoreData.locations;
                                      if (restoreData.purchaseOrders) dataToRestore.purchaseOrders = restoreData.purchaseOrders;
                                      restoredItems.push(`庫存與訂單：${restoreData.inventory.length} 項`);
                                    }
                                    if (restoreOptions.attendance && restoreData.attendance) {
                                      dataToRestore.attendance = restoreData.attendance;
                                      restoredItems.push(`考勤紀錄：${restoreData.attendance.length} 筆`);
                                    }
                                    if (restoreOptions.payroll && restoreData.payroll) {
                                      dataToRestore.payroll = restoreData.payroll;
                                      restoredItems.push(`薪資紀錄：${restoreData.payroll.length} 筆`);
                                    }
                                    if (restoreOptions.leads && restoreData.leads) {
                                      dataToRestore.leads = restoreData.leads;
                                      restoredItems.push(`潛客：${restoreData.leads.length} 個`);
                                    }

                                    if (Object.keys(dataToRestore).length === 0) {
                                      alert('請至少選擇一項要恢復的資料');
                                      return;
                                    }

                                    onImportData(dataToRestore, 'merge');
                                    alert(`✅ 恢復完成！\n\n${restoredItems.join('\n')}`);
                                    setRestoreData(null);
                                    setRestoreData(null);
                                    setRestoreOptions({
                                      projects: true,
                                      dispatch: true,
                                      customers: true,
                                      vendors: true,
                                      teamMembers: true,
                                      inventory: true,
                                      attendance: true,
                                      payroll: true,
                                      leads: true
                                    });
                                  } catch (error) {
                                    alert('恢復失敗：' + (error as Error).message);
                                  }
                                }}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
                              >
                                <RotateCcw size={14} />
                                開始恢復
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Selective Import Handling */}
                    </div>
                  )}
                </div>

                <div className="bg-stone-50 border border-stone-200 p-6 rounded-[2rem] shadow-sm space-y-3">
                  <div className="flex items-center gap-3">
                    <RotateCcw size={20} className="text-stone-600" />
                    <h4 className="text-sm font-black text-stone-900">本機自動備份還原</h4>
                  </div>
                  <p className="text-[11px] text-stone-500 leading-relaxed font-bold">
                    如果雲端同步發生錯誤，您可以嘗試還原到上一次啟動時的自動備份。
                  </p>
                  <button
                    onClick={onRestoreLocalBackup}
                    className="w-full bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                  >
                    <RefreshCw size={14} />
                    立即還原上次備份
                  </button>
                </div>

                {!isReadOnly && (
                  <div className="pt-4 flex justify-end">
                    <button
                      onClick={onResetData}
                      className="flex items-center gap-2 text-rose-600 text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 px-4 py-2 rounded-xl transition-all"
                    >
                      <AlertTriangle size={14} />
                      清除所有本地快取
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeSection === 'profile' && (
              <div className="flex flex-col items-center justify-center py-20 space-y-6">
                <img src={user.picture} className="w-24 h-24 rounded-[2rem] border-4 border-stone-100 shadow-xl" alt="user" />
                <div className="text-center">
                  <h3 className="text-xl font-black text-stone-900">{user.name}</h3>
                  <p className="text-sm text-stone-500 font-bold">{user.email}</p>
                </div>
                <div className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${isReadOnly ? 'bg-stone-900 text-orange-400' : 'bg-stone-100 text-stone-500'}`}>
                  權限角色：{isReadOnly ? '訪客 (唯讀)' : user.role}
                </div>
              </div>
            )}

            {activeSection === 'modules' && (
              <div className="space-y-8 animate-in slide-in-from-right-4">
                <div className="flex items-center gap-5">
                  <div className="p-5 rounded-[2rem] bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg">
                    <LayoutDashboard size={32} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-stone-900 uppercase tracking-tight">功能模組管理</h3>
                    <p className="text-sm text-stone-500 font-medium">為不同客戶設定所需功能</p>
                  </div>
                </div>

                <div className="bg-orange-50 border border-orange-100 p-8 rounded-[2rem] space-y-4 text-center">
                  <div className="flex items-start gap-3 justify-center">
                    <Info className="text-orange-600 mt-1" size={18} />
                    <div className="space-y-2">
                      <p className="text-sm font-black text-orange-900">進階模組管理功能</p>
                      <p className="text-xs text-orange-700 leading-relaxed font-bold max-w-lg">
                        請前往側邊欄的「模組管理」查看完整的模組配置介面，您可以在那裡啟用/停用功能模組、管理依賴關係，以及匯入/匯出配置。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Selective Import Modal */}
      {pendingData && (
        <div className="fixed inset-0 z-[100] bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 lg:p-12 animate-in fade-in">
          <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 lg:p-10 border-b border-stone-100 flex items-center justify-between bg-stone-50">
              <div>
                <h2 className="text-2xl font-black text-stone-900 uppercase tracking-tight flex items-center gap-3">
                  <Database className="text-orange-500" /> 選擇要復原的專案
                </h2>
                <p className="text-sm text-stone-500 font-bold mt-1">從備份檔中偵測到 {pendingData.projects.length} 個專案，請選取您要還原的項目。</p>
              </div>
              <button
                onClick={() => setPendingData(null)}
                className="p-3 hover:bg-white rounded-2xl text-stone-400 hover:text-stone-900 transition-all active:scale-90"
              >
                取消
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 lg:p-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingData.projects.map((project: any) => (
                  <label
                    key={project.id}
                    className={`flex items-center gap-4 p-5 rounded-3xl border-2 transition-all cursor-pointer ${selectedProjectIds.has(project.id)
                      ? 'border-orange-500 bg-orange-50/50 shadow-md'
                      : 'border-stone-100 hover:border-stone-200 bg-white'
                      }`}
                  >
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded-lg border-stone-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                      checked={selectedProjectIds.has(project.id)}
                      onChange={() => {
                        const next = new Set(selectedProjectIds);
                        if (next.has(project.id)) next.delete(project.id);
                        else next.add(project.id);
                        setSelectedProjectIds(next);
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black bg-stone-900 text-white px-2 py-0.5 rounded-md uppercase tracking-wider">{project.id}</span>
                        <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{project.source}</span>
                        {project.deletedAt && <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">(已刪除)</span>}
                      </div>
                      <h4 className="font-black text-stone-900 truncate">{project.name}</h4>
                      <p className="text-[10px] text-stone-500 font-bold mt-1">最後更新：{project.updatedAt ? new Date(project.updatedAt).toLocaleString() : '未知'}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="p-8 lg:p-10 bg-stone-50 border-t border-stone-100 flex items-center justify-between gap-6">
              <div className="flex gap-4">
                <button
                  onClick={() => setSelectedProjectIds(new Set(pendingData.projects.map((p: any) => p.id)))}
                  className="text-xs font-black text-stone-500 hover:text-stone-900 transition-colors"
                >
                  全部勾選
                </button>
                <button
                  onClick={() => setSelectedProjectIds(new Set())}
                  className="text-xs font-black text-stone-500 hover:text-stone-900 transition-colors"
                >
                  全部取消
                </button>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right mr-4">
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">目前選取</p>
                  <p className="text-lg font-black text-stone-900">{selectedProjectIds.size} 個項目</p>
                </div>
                <button
                  disabled={selectedProjectIds.size === 0}
                  onClick={() => {
                    const filteredData = {
                      ...pendingData,
                      projects: pendingData.projects.filter((p: any) => selectedProjectIds.has(p.id))
                    };
                    onImportData(filteredData, importMode);
                    setPendingData(null);
                  }}
                  className="bg-orange-600 text-white px-10 py-4 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-orange-100 hover:bg-orange-700 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center gap-3"
                >
                  <RefreshCw size={18} className={selectedProjectIds.size > 0 ? "animate-spin-slow" : ""} />
                  執行復原匯入
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
