
import React, { useState } from 'react';
import { HardHat, ShieldCheck, Sparkles, User, Lock, ArrowRight, Layers, Check, AlertCircle, Hash, Info, UserCheck, Cloud, Building2 } from 'lucide-react';
import { MOCK_DEPARTMENTS } from '../constants';
import { storageService } from '../services/storageService';
import { SystemContext } from '../types';

interface LoginProps {
  onLoginSuccess: (userData: any, department: SystemContext) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDept, setSelectedDept] = useState<SystemContext>('FourthDept');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!employeeId || !password) {
      setError('請輸入員工編號與密碼');
      return;
    }

    setIsLoading(true);

    // 模擬驗證流程 (延遲一下增加儀式感)
    await new Promise(resolve => setTimeout(resolve, 800));

    const cleanId = employeeId.trim();
    const cleanPassword = password.trim();

    // 1. 檢查管理員 (最高權限，可進入任何部門，但這裡先預設進入選定的部門)
    if (cleanId.toLowerCase() === 'admin' && cleanPassword === '1234') {
      onLoginSuccess({
        id: 'ADMIN-ROOT',
        name: "管理總監",
        email: "admin@lifequality.ai",
        picture: `https://ui-avatars.com/api/?name=Admin&background=ea580c&color=fff`,
        role: 'SuperAdmin',
        department: selectedDept
      }, selectedDept);
      return;
    }

    // 1.5 增加通用測試/同步專用帳號
    if (cleanId.toLowerCase() === 'test' && cleanPassword === 'test') {
      onLoginSuccess({
        id: 'SYNC-ONLY',
        name: "系統初始化員",
        email: "sync@lifequality.ai",
        picture: `https://ui-avatars.com/api/?name=Sync&background=0ea5e9&color=fff`,
        role: 'SyncOnly',
        department: selectedDept
      }, selectedDept);
      return;
    }

    // 2. 檢查團隊成員 (根據部門載入不同的清單)
    let team = [];
    try {
      // 根據部門決定 Storage Key 前綴
      const prefix = selectedDept === 'ThirdDept' ? 'dept3_' : selectedDept === 'FourthDept' ? 'dept4_' : '';
      const teamKey = `${prefix}bt_team`;

      team = await storageService.getItem<any[]>(teamKey, []);
      if (!Array.isArray(team)) team = [];
    } catch (e) {
      console.error('Error loading team during login', e);
      team = [];
    }

    const member = team.find((m: any) => m && m.employeeId === cleanId.toUpperCase());

    if (member) {
      const expectedPassword = member.password || '1234';
      if (cleanPassword === expectedPassword) {
        // 強制使用該員工設定的部門
        const finalRole = member.systemRole || (member.role === '工務主管' || member.role === '專案經理' ? 'DeptAdmin' : 'Staff');

        onLoginSuccess({
          id: member.id,
          name: member.name,
          email: member.email,
          picture: member.avatar,
          role: finalRole,
          roleName: member.role,
          department: selectedDept
        }, selectedDept);
      } else {
        setError('密碼輸入錯誤');
        setIsLoading(false);
      }
    } else {
      setError(`找不到該員工編號 (新設備請先以 test 下載 琥凱爾工程 第四工程部 團隊清單)`);
      setIsLoading(false);
    }
  };

  const handleQuickAccess = () => {
    setIsLoading(true);
    setTimeout(() => {
      onLoginSuccess({
        id: 'GUEST-USER',
        name: "體驗帳戶",
        email: "guest@lifequality.ai",
        picture: `https://ui-avatars.com/api/?name=Guest&background=1e293b&color=fff`,
        role: 'Guest',
        department: selectedDept
      }, selectedDept);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4 lg:p-8 relative overflow-hidden font-sans">
      {/* 動態背景裝飾 */}
      <div className={`absolute top-[-15%] left-[-10%] w-[60%] h-[60%] blur-[150px] rounded-full animate-pulse transition-colors duration-1000 ${selectedDept === 'FirstDept' ? 'bg-orange-600/10' : selectedDept === 'ThirdDept' ? 'bg-blue-600/10' : 'bg-purple-600/10'}`}></div>
      <div className={`absolute bottom-[-15%] right-[-10%] w-[60%] h-[60%] blur-[150px] rounded-full animate-pulse [animation-delay:2s] transition-colors duration-1000 ${selectedDept === 'FirstDept' ? 'bg-amber-600/10' : selectedDept === 'ThirdDept' ? 'bg-cyan-600/10' : 'bg-fuchsia-600/10'}`}></div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 bg-stone-900/40 backdrop-blur-3xl border border-white/10 rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] relative z-10 overflow-hidden">

        {/* 左側：品牌形象區 */}
        <div className={`hidden lg:flex lg:col-span-5 flex-col justify-between p-16 bg-gradient-to-br transition-all duration-1000 border-r border-white/5 relative ${selectedDept === 'FirstDept' ? 'from-stone-900 to-stone-950' : selectedDept === 'ThirdDept' ? 'from-slate-900 to-slate-950' : 'from-purple-950 to-purple-900'}`}>
          <div className="relative z-10">
            <div className="bg-white/10 w-16 h-16 rounded-3xl flex items-center justify-center border border-white/10 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.4)] mb-10 group hover:scale-110 transition-transform duration-500 overflow-hidden">
              <img src="./pwa-icon.png" alt="Logo" className="w-10 h-10 object-contain" />
            </div>
            <h1 className="text-4xl font-black text-white leading-tight tracking-tighter mb-6">
              生活品質<br />
              <span className={`transition-colors duration-500 ${selectedDept === 'FirstDept' ? 'text-orange-500' : selectedDept === 'ThirdDept' ? 'text-blue-500' : 'text-purple-500'}`}>工程管理系統</span>
            </h1>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full mb-8">
              <Sparkles size={14} className={selectedDept === 'FirstDept' ? 'text-amber-400' : selectedDept === 'ThirdDept' ? 'text-cyan-400' : 'text-fuchsia-400'} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">2026 Professional Edition</span>
            </div>
            <div className="space-y-4">
              <div onClick={() => setSelectedDept('FourthDept')} className={`cursor-pointer p-4 rounded-2xl border transition-all ${selectedDept === 'FourthDept' ? 'bg-purple-500/20 border-purple-500/50' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-white">琥凱爾工程<br />第四工程部</span>
                  {selectedDept === 'FourthDept' && <Check size={16} className="text-purple-500" />}
                </div>
                <p className="text-xs text-stone-400">特殊工程、技術開發、創新應用</p>
              </div>
            </div>
          </div>
        </div>

        {/* 右側：登錄操作區 */}
        <div className="lg:col-span-7 p-8 lg:p-20 flex flex-col justify-center">
          <form onSubmit={handleLogin} className="space-y-8 max-w-md mx-auto w-full">
            <div className="text-center lg:text-left space-y-2">
              <h1 className="text-3xl font-black text-stone-900 tracking-tight">Quality of Life</h1>
              <p className="text-stone-500 font-bold uppercase tracking-widest text-xs mt-2">
                Login to <span className={selectedDept === 'FirstDept' ? 'text-orange-600' : selectedDept === 'ThirdDept' ? 'text-blue-600' : 'text-purple-600'}>
                  {selectedDept === 'FirstDept' ? 'First Dept.' : selectedDept === 'ThirdDept' ? 'Third Dept.' : 'Fourth Dept.'}
                </span>
              </p>

              {/* Mobile Selector */}
              <div className="lg:hidden flex gap-2 mt-4 p-1 bg-stone-100 rounded-xl">
                <button type="button" onClick={() => setSelectedDept('FourthDept')} className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${selectedDept === 'FourthDept' ? 'bg-white shadow text-purple-600' : 'text-stone-400'}`}>琥凱爾工程<br />第四工程部</button>
              </div>
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="text-rose-500 shrink-0" size={18} />
                <p className="text-rose-200 text-xs font-bold">{error}</p>
              </div>
            )}

            {/* 帳號密碼 */}
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-stone-500 text-[10px] font-black uppercase tracking-[0.25em] pl-1 flex items-center gap-2">
                  <Hash size={14} className={selectedDept === 'FirstDept' ? 'text-orange-500' : selectedDept === 'ThirdDept' ? 'text-blue-500' : 'text-purple-500'} /> 員工編號 Employee ID
                </label>
                <div className="group relative">
                  <input
                    type="text"
                    placeholder="輸入員工編號"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white font-bold outline-none focus:ring-2 focus:ring-opacity-50 transition-all placeholder:text-stone-700 uppercase"
                    style={{ '--tw-ring-color': selectedDept === 'FirstDept' ? 'rgb(234 88 12)' : selectedDept === 'ThirdDept' ? 'rgb(37 99 235)' : 'rgb(168 85 247)' } as any}
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-stone-500 text-[10px] font-black uppercase tracking-[0.25em] pl-1 flex items-center gap-2">
                  <Lock size={14} className={selectedDept === 'FirstDept' ? 'text-orange-500' : selectedDept === 'ThirdDept' ? 'text-blue-500' : 'text-purple-500'} /> 登入密碼 Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white font-bold outline-none focus:ring-2 focus:ring-opacity-50 transition-all placeholder:text-stone-700"
                  style={{ '--tw-ring-color': selectedDept === 'FirstDept' ? 'rgb(234 88 12)' : selectedDept === 'ThirdDept' ? 'rgb(37 99 235)' : 'rgb(168 85 247)' } as any}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-5 rounded-2xl flex items-center justify-center gap-3 font-black text-sm tracking-[0.2em] uppercase transition-all shadow-2xl active:scale-[0.98] ${isLoading
                  ? 'bg-stone-800 text-stone-600 cursor-not-allowed'
                  : selectedDept === 'FirstDept'
                    ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-orange-900/20'
                    : selectedDept === 'ThirdDept'
                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20'
                      : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/20'
                  }`}
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    驗證中
                  </>
                ) : (
                  <>
                    進入系統
                    <ArrowRight size={20} />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleQuickAccess}
                disabled={isLoading}
                className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-black text-[11px] uppercase tracking-[0.3em] text-stone-500 hover:text-white border border-white/5 hover:border-white/10 hover:bg-white/5 transition-all duration-300"
              >
                <Sparkles size={14} className="text-amber-500" />
                訪客模式預覽 (唯讀)
              </button>

              <div className="pt-6 relative">
                <div className="absolute inset-x-0 top-0 flex items-center justify-center">
                  <span className="bg-[#1c1917] px-4 text-[9px] font-black text-stone-600 uppercase tracking-[0.3em]">First Time Login</span>
                </div>
                <div className="pt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setEmployeeId('test');
                      setPassword('test');
                    }}
                    className="w-full py-6 bg-gradient-to-r from-stone-800 to-stone-900 hover:from-stone-700 hover:to-stone-800 border border-white/5 rounded-[2rem] flex flex-col items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] group"
                  >
                    <div className="flex items-center gap-2">
                      <Cloud size={20} className="text-stone-400 group-hover:text-white transition-colors" />
                      <span className="text-sm font-black text-stone-300 group-hover:text-white tracking-widest uppercase">新設備同步初始化</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
