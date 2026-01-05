
import React, { useEffect, useState } from 'react';
import { LayoutDashboard, FolderKanban, Users, BarChart3, Settings, HelpCircle, HardHat, Contact2, ClipboardSignature, X, ShoppingBag, Sparkles } from 'lucide-react';
import { moduleService } from '../services/moduleService';
import { ModuleId } from '../moduleConfig';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: any;
  onMenuClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, user, onMenuClose }) => {
  const [enabledModules, setEnabledModules] = useState<ModuleId[]>([]);

  useEffect(() => {
    // Load initial modules
    setEnabledModules(moduleService.getEnabledModules());

    // Listen for module changes
    const unsubscribe = moduleService.onChange((modules) => {
      setEnabledModules(modules);
    });

    return unsubscribe;
  }, []);

  // Map tab IDs to module IDs
  const tabToModuleMap: Record<string, ModuleId> = {
    'dashboard': ModuleId.DASHBOARD,
    'projects': ModuleId.PROJECTS,
    'dispatch': ModuleId.DISPATCH,
    'customers': ModuleId.CUSTOMERS,
    'team': ModuleId.TEAM,
    'vendors': ModuleId.VENDORS,
    'analytics': ModuleId.ANALYTICS
  };

  const allMenuItems = [
    { id: 'dashboard', label: '總覽面板', icon: LayoutDashboard, moduleId: ModuleId.DASHBOARD },
    { id: 'projects', label: '專案管理', icon: FolderKanban, moduleId: ModuleId.PROJECTS },
    { id: 'dispatch', label: '派工紀錄', icon: ClipboardSignature, moduleId: ModuleId.DISPATCH },
    { id: 'customers', label: '客戶資料', icon: Contact2, moduleId: ModuleId.CUSTOMERS },
    { id: 'team', label: '團隊成員', icon: Users, moduleId: ModuleId.TEAM },
    { id: 'vendors', label: '廠商管理', icon: ShoppingBag, moduleId: ModuleId.VENDORS },
    { id: 'analytics', label: '數據分析', icon: BarChart3, moduleId: ModuleId.ANALYTICS },
  ];

  // Filter menu items based on enabled modules
  const menuItems = allMenuItems.filter(item =>
    enabledModules.includes(item.moduleId)
  );

  const bottomItems = [
    { id: 'settings', label: '設定', icon: Settings },
    { id: 'help', label: '協助中心', icon: HelpCircle },
  ];

  // Add Module Manager for SuperAdmin
  if (user.role === 'SuperAdmin') {
    bottomItems.unshift({ id: 'modules', label: '模組管理', icon: Sparkles });
  }

  return (
    <aside className="h-full w-full bg-stone-900 text-white flex flex-col shadow-2xl">
      <div className="p-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3">
            <img src="./pwa-icon.png" alt="Logo" className="w-10 h-10 object-contain" />
            <div className="flex flex-col">
              <span className="text-[11px] font-black tracking-tight leading-none text-orange-400 uppercase">Quality of Life</span>
              <span className="text-[10px] font-bold text-stone-500">Development Corp.</span>
            </div>
          </div>
        </div>
        {onMenuClose && (
          <button
            onClick={onMenuClose}
            className="lg:hidden p-2 text-stone-500 hover:text-white hover:bg-stone-800 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto no-scrollbar">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 ${activeTab === item.id
              ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/40'
              : 'text-stone-400 hover:bg-stone-800 hover:text-white'
              }`}
          >
            <item.icon size={18} />
            <span className="font-bold text-xs">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-stone-800 shrink-0 bg-stone-900/50 backdrop-blur-sm">
        {bottomItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-stone-500 hover:bg-stone-800 hover:text-white transition-colors ${activeTab === item.id ? 'text-white' : ''}`}
          >
            <item.icon size={18} />
            <span className="font-bold text-xs">{item.label}</span>
          </button>
        ))}

        <div className="mt-4 px-4 py-3 bg-stone-800/50 border border-white/5 rounded-2xl flex items-center gap-3">
          <img
            src={user.picture}
            alt="Avatar"
            className="w-8 h-8 rounded-xl border border-white/10 object-cover"
          />
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-black truncate">{user.name}</p>
            <p className="text-[9px] text-stone-500 font-black uppercase tracking-widest truncate">Administrator</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
