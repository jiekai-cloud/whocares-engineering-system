
import React, { useState } from 'react';
import { HardHat, ShieldCheck, Sparkles, User, Lock, ArrowRight, Layers, Check, AlertCircle, Hash, Info, UserCheck, Cloud } from 'lucide-react';
import { MOCK_DEPARTMENTS } from '../constants';

interface LoginProps {
  onLoginSuccess: (userData: any, departmentId: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!employeeId || !password) {
      setError('請輸入員工編號與密碼');
      return;
    }

    setIsLoading(true);

    // 模擬驗證流程
    setTimeout(() => {
      const cleanId = employeeId.trim();
      const cleanPassword = password.trim();

      // 1. 檢查管理員
      if (cleanId.toLowerCase() === 'admin' && cleanPassword === '1234') {
        onLoginSuccess({
          id: 'ADMIN-ROOT',
          name: "管理總監",
          email: "admin@lifequality.ai",
          picture: `https://ui-avatars.com/api/?name=Admin&background=ea580c&color=fff`,
          role: 'SuperAdmin'
        }, 'all');
        return;
      }

      // 1.5 增加通用測試/同步專用帳號 (用於新設備初始化)
      if (cleanId.toLowerCase() === 'test' && cleanPassword === 'test') {
        onLoginSuccess({
          id: 'SYNC-ONLY',
          name: "系統初始化員",
          email: "sync@lifequality.ai",
          picture: `https://ui-avatars.com/api/?name=Sync&background=0ea5e9&color=fff`,
          role: 'SyncOnly'
        }, 'all');
        return;
      }

      // 2. 檢查團隊成員
      let team = [];
      try {
        const savedTeam = localStorage.getItem('bt_team');
        team = savedTeam ? JSON.parse(savedTeam) : [];
        if (!Array.isArray(team)) team = [];
      } catch (e) {
        console.error('Error parsing team during login', e);
        team = [];
      }

      const member = team.find((m: any) => m && m.employeeId === cleanId.toUpperCase());

      if (member) {
        const expectedPassword = member.password || '1234';
        if (cleanPassword === expectedPassword) {
          // 強制使用該員工設定的部門和權限
          const finalRole = member.systemRole || (member.role === '工務主管' || member.role === '專案經理' ? 'DeptAdmin' : 'Staff');
          const finalDept = finalRole === 'SuperAdmin' ? 'all' : (member.departmentId || 'DEPT-1');

          onLoginSuccess({
            id: member.id,
            name: member.name,
            email: member.email,
            picture: member.avatar,
            role: finalRole,
            roleName: member.role
          }, finalDept);
        } else {
          setError('密碼輸入錯誤');
          setIsLoading(false);
        }
      } else {
        setError('找不到該員工編號 (新設備請先以 admin 登入)');
        setIsLoading(false);
      }
    }, 1000);
  };

  const handleQuickAccess = () => {
    setIsLoading(true);
    setTimeout(() => {
      onLoginSuccess({
        id: 'GUEST-USER',
        name: "體驗帳戶",
        email: "guest@lifequality.ai",
        picture: `https://ui-avatars.com/api/?name=Guest&background=1e293b&color=fff`,
        role: 'Guest'
      }, 'DEPT-1');
    }, 500);
  };

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4 lg:p-8 relative overflow-hidden font-sans">
      {/* 動態背景裝飾 */}
      <div className="absolute top-[-15%] left-[-10%] w-[60%] h-[60%] bg-orange-600/10 blur-[150px] rounded-full animate-pulse"></div>
      <div className="absolute bottom-[-15%] right-[-10%] w-[60%] h-[60%] bg-amber-600/10 blur-[150px] rounded-full animate-pulse [animation-delay:2s]"></div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 bg-stone-900/40 backdrop-blur-3xl border border-white/10 rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] relative z-10 overflow-hidden">

        {/* 左側：品牌形象區 (佔 5 格) */}
        <div className="hidden lg:flex lg:col-span-5 flex-col justify-between p-16 bg-gradient-to-br from-stone-900 to-stone-950 border-r border-white/5 relative">
          <div className="relative z-10">
            <div className="bg-white/10 w-16 h-16 rounded-3xl flex items-center justify-center border border-white/10 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.4)] mb-10 group hover:scale-110 transition-transform duration-500 overflow-hidden">
              <img src="./pwa-icon.png" alt="Logo" className="w-10 h-10 object-contain" />
            </div>
            <h1 className="text-4xl font-black text-white leading-tight tracking-tighter mb-6">
              生活品質<br />
              <span className="text-orange-500">工程管理系統</span>
            </h1>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full mb-8">
              <Sparkles size={14} className="text-amber-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">2026 Professional Edition</span>
            </div>
            <p className="text-stone-400 font-medium leading-relaxed text-sm max-w-xs">
              為現代工程人打造的數位大腦。整合預算控制、派工追蹤與 AI 智慧分析，全面提升施工效率。
            </p>
          </div>

          <div className="space-y-6 relative z-10">
            <div className="flex items-center gap-3 text-stone-300">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                <ShieldCheck size={20} className="text-orange-500" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-white">安全連線中心</p>
                <p className="text-[10px] text-stone-500 font-medium">資料受 256-bit 加密保護</p>
              </div>
            </div>
          </div>
        </div>

        {/* 右側：登錄操作區 (佔 7 格) */}
        <div className="lg:col-span-7 p-8 lg:p-20 flex flex-col justify-center">
          <form onSubmit={handleLogin} className="space-y-8 max-w-md mx-auto w-full">
            <div className="text-center lg:text-left space-y-2">
              <div className="lg:hidden flex justify-center mb-6">
                <div className="bg-white/10 w-12 h-12 rounded-2xl flex items-center justify-center border border-white/10 shadow-lg overflow-hidden">
                  <img src="./pwa-icon.png" alt="Logo" className="w-10 h-8 object-contain" />
                </div>
              </div>
              <h1 className="lg:hidden text-2xl font-black text-white tracking-tighter mb-2">生活品質工程管理系統</h1>
              <h1 className="text-3xl font-black text-stone-900 tracking-tight">Quality of Life</h1>
              <p className="text-stone-500 font-bold uppercase tracking-widest text-xs mt-2">Development Corporation</p>
              <p className="text-stone-500 text-sm">歡迎回來，請輸入帳號驗證您的身份。</p>
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
                  <Hash size={14} className="text-orange-500" /> 員工編號 Employee ID
                </label>
                <div className="group relative">
                  <input
                    type="text"
                    placeholder="輸入員工編號"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                    autoComplete="username"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white font-bold outline-none focus:ring-2 focus:ring-orange-600/50 focus:border-orange-600/50 transition-all placeholder:text-stone-700 uppercase"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-stone-500 text-[10px] font-black uppercase tracking-[0.25em] pl-1 flex items-center gap-2">
                  <Lock size={14} className="text-orange-500" /> 登入密碼 Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white font-bold outline-none focus:ring-2 focus:ring-orange-600/50 focus:border-orange-600/50 transition-all placeholder:text-stone-700"
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
                  : 'bg-orange-600 hover:bg-orange-500 text-white shadow-orange-900/20 hover:shadow-orange-600/30'
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
                    className="w-full py-6 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 hover:from-blue-600/30 hover:to-indigo-600/30 border border-blue-500/30 rounded-[2rem] flex flex-col items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] group"
                  >
                    <div className="flex items-center gap-2">
                      <Cloud size={20} className="text-blue-400 group-hover:animate-bounce" />
                      <span className="text-sm font-black text-white tracking-widest uppercase">新設備同步初始化</span>
                    </div>
                    <p className="text-[10px] text-blue-300/60 font-medium">使用 test / test 帳號快速啟動</p>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-2 pt-6">
              <p className="text-stone-700 text-[10px] font-black uppercase tracking-[0.3em]">
                © 2026 Life Quality Engineering Management
              </p>
              <div className="flex gap-4">
                <span className="text-stone-800 text-[9px] font-bold">服務條款</span>
                <span className="text-stone-800 text-[9px] font-bold">隱私政策</span>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
