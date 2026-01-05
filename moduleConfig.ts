/**
 * 模組化系統配置
 * 
 * 此檔案定義系統中所有可用的功能模組及其配置
 */

import { Users, LayoutDashboard, FolderKanban, UserCircle, Building2, CalendarClock, BarChart3, Sparkles, Cloud, ClipboardList, Settings } from 'lucide-react';

/**
 * 模組識別碼列舉
 */
export enum ModuleId {
    // ===== 核心模組（不可關閉）=====
    AUTH = 'auth',
    DASHBOARD = 'dashboard',
    SETTINGS = 'settings',

    // ===== 可選功能模組 =====
    PROJECTS = 'projects',           // 專案管理
    CUSTOMERS = 'customers',          // 客戶管理 (CRM)
    TEAM = 'team',                    // 團隊管理
    VENDORS = 'vendors',              // 廠商管理
    DISPATCH = 'dispatch',            // 派遣調度
    ANALYTICS = 'analytics',          // 數據分析
    AI_ASSISTANT = 'ai_assistant',    // AI 智慧助手
    CLOUD_SYNC = 'cloud_sync',        // 雲端同步
    LEADS = 'leads'                   // 會勘線索管理
}

/**
 * 模組配置介面
 */
export interface ModuleConfig {
    id: ModuleId;
    name: string;
    description: string;
    icon: any; // Lucide React Icon Component
    isCore: boolean; // 核心模組不可關閉
    dependencies: ModuleId[]; // 依賴的其他模組
    enabled: boolean;
    category: 'core' | 'management' | 'analytics' | 'automation'; // 模組分類
}

/**
 * 所有模組的完整配置
 */
export const ALL_MODULES: ModuleConfig[] = [
    // ===== 核心模組 =====
    {
        id: ModuleId.AUTH,
        name: '登入系統',
        description: '使用者認證與授權管理',
        icon: UserCircle,
        isCore: true,
        dependencies: [],
        enabled: true,
        category: 'core'
    },
    {
        id: ModuleId.DASHBOARD,
        name: '儀表板',
        description: '總覽與關鍵指標顯示',
        icon: LayoutDashboard,
        isCore: true,
        dependencies: [],
        enabled: true,
        category: 'core'
    },
    {
        id: ModuleId.SETTINGS,
        name: '系統設定',
        description: '系統配置與模組管理',
        icon: Settings,
        isCore: true,
        dependencies: [],
        enabled: true,
        category: 'core'
    },

    // ===== 管理模組 =====
    {
        id: ModuleId.PROJECTS,
        name: '專案管理',
        description: '工程專案追蹤、進度管理、施工日誌',
        icon: FolderKanban,
        isCore: false,
        dependencies: [],
        enabled: true,
        category: 'management'
    },
    {
        id: ModuleId.CUSTOMERS,
        name: '客戶管理',
        description: 'CRM 客戶關係管理系統',
        icon: UserCircle,
        isCore: false,
        dependencies: [],
        enabled: true,
        category: 'management'
    },
    {
        id: ModuleId.TEAM,
        name: '團隊管理',
        description: '員工資料、人力資源管理',
        icon: Users,
        isCore: false,
        dependencies: [],
        enabled: true,
        category: 'management'
    },
    {
        id: ModuleId.VENDORS,
        name: '廠商管理',
        description: '合作廠商與工班資料管理',
        icon: Building2,
        isCore: false,
        dependencies: [],
        enabled: true,
        category: 'management'
    },
    {
        id: ModuleId.DISPATCH,
        name: '派遣調度',
        description: '人力派遣與工作分配',
        icon: CalendarClock,
        isCore: false,
        dependencies: [ModuleId.PROJECTS, ModuleId.TEAM],
        enabled: true,
        category: 'management'
    },

    // ===== 分析模組 =====
    {
        id: ModuleId.ANALYTICS,
        name: '數據分析',
        description: '報表與數據視覺化分析',
        icon: BarChart3,
        isCore: false,
        dependencies: [ModuleId.PROJECTS],
        enabled: true,
        category: 'analytics'
    },

    // ===== 自動化模組 =====
    {
        id: ModuleId.AI_ASSISTANT,
        name: 'AI 智慧助手',
        description: '名片掃描、智慧會勘系統',
        icon: Sparkles,
        isCore: false,
        dependencies: [],
        enabled: true,
        category: 'automation'
    },
    {
        id: ModuleId.CLOUD_SYNC,
        name: '雲端同步',
        description: 'Google Drive 資料備份與同步',
        icon: Cloud,
        isCore: false,
        dependencies: [],
        enabled: true,
        category: 'automation'
    },
    {
        id: ModuleId.LEADS,
        name: '會勘線索',
        description: 'AI 會勘系統產生的潛在客戶',
        icon: ClipboardList,
        isCore: false,
        dependencies: [ModuleId.AI_ASSISTANT],
        enabled: true,
        category: 'automation'
    }
];

/**
 * 預設模組配置範本
 */
export const MODULE_PRESETS = {
    // 完整版 - 所有模組啟用
    FULL: {
        name: '完整版',
        description: '包含所有功能模組，適合大型工程公司',
        modules: ALL_MODULES.map(m => m.id)
    },

    // 標準版 - 核心功能
    STANDARD: {
        name: '標準版',
        description: '核心管理功能，適合中小型工程公司',
        modules: [
            ModuleId.AUTH,
            ModuleId.DASHBOARD,
            ModuleId.SETTINGS,
            ModuleId.PROJECTS,
            ModuleId.CUSTOMERS,
            ModuleId.TEAM,
            ModuleId.CLOUD_SYNC
        ]
    },

    // 輕量版 - 僅專案管理
    LITE: {
        name: '輕量版',
        description: '僅專案管理核心功能',
        modules: [
            ModuleId.AUTH,
            ModuleId.DASHBOARD,
            ModuleId.SETTINGS,
            ModuleId.PROJECTS
        ]
    },

    // 專業版 - 專案 + 分析
    PROFESSIONAL: {
        name: '專業版',
        description: '專案管理加上數據分析功能',
        modules: [
            ModuleId.AUTH,
            ModuleId.DASHBOARD,
            ModuleId.SETTINGS,
            ModuleId.PROJECTS,
            ModuleId.CUSTOMERS,
            ModuleId.TEAM,
            ModuleId.ANALYTICS,
            ModuleId.CLOUD_SYNC
        ]
    }
};

/**
 * 預設啟用的模組（完整版）
 */
export const DEFAULT_ENABLED_MODULES = ALL_MODULES.map(m => m.id);
