/**
 * 模組管理服務
 * 
 * 處理模組的啟用/停用、依賴驗證、配置持久化等功能
 */

import { ModuleId, ModuleConfig, ALL_MODULES, DEFAULT_ENABLED_MODULES, MODULE_PRESETS } from '../moduleConfig';

const MODULE_CONFIG_KEY = 'bt_module_config';

/**
 * 模組管理服務類別
 */
class ModuleService {
    private enabledModules: Set<ModuleId>;
    private listeners: Array<(modules: ModuleId[]) => void> = [];

    constructor() {
        this.enabledModules = this.loadModuleConfig();
    }

    /**
     * 從 localStorage 載入模組配置
     */
    private loadModuleConfig(): Set<ModuleId> {
        try {
            const saved = localStorage.getItem(MODULE_CONFIG_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                return new Set(parsed);
            }
        } catch (e) {
            console.warn('Failed to load module config, using defaults', e);
        }
        // 預設啟用所有模組
        return new Set(DEFAULT_ENABLED_MODULES);
    }

    /**
     * 儲存模組配置到 localStorage
     */
    private saveModuleConfig(): void {
        try {
            const config = Array.from(this.enabledModules);
            localStorage.setItem(MODULE_CONFIG_KEY, JSON.stringify(config));
            this.notifyListeners();
        } catch (e) {
            console.error('Failed to save module config', e);
        }
    }

    /**
     * 獲取所有模組配置
     */
    getAllModules(): ModuleConfig[] {
        return ALL_MODULES.map(module => ({
            ...module,
            enabled: this.enabledModules.has(module.id)
        }));
    }

    /**
     * 獲取已啟用的模組列表
     */
    getEnabledModules(): ModuleId[] {
        return Array.from(this.enabledModules);
    }

    /**
     * 檢查模組是否啟用
     */
    isModuleEnabled(moduleId: ModuleId): boolean {
        return this.enabledModules.has(moduleId);
    }

    /**
     * 獲取依賴於指定模組的其他模組
     */
    getDependentModules(moduleId: ModuleId): ModuleConfig[] {
        return ALL_MODULES.filter(module =>
            module.dependencies.includes(moduleId) &&
            this.enabledModules.has(module.id)
        );
    }

    /**
     * 驗證模組依賴關係
     * @returns 如果可以關閉返回 true，否則返回依賴此模組的模組列表
     */
    validateDisable(moduleId: ModuleId): { canDisable: boolean; dependents: ModuleConfig[] } {
        const module = ALL_MODULES.find(m => m.id === moduleId);

        // 核心模組不可關閉
        if (module?.isCore) {
            return { canDisable: false, dependents: [] };
        }

        // 檢查是否有其他已啟用的模組依賴此模組
        const dependents = this.getDependentModules(moduleId);

        return {
            canDisable: dependents.length === 0,
            dependents
        };
    }

    /**
     * 驗證模組啟用的依賴關係
     * @returns 如果可以啟用返回 true，否則返回缺少的依賴模組
     */
    validateEnable(moduleId: ModuleId): { canEnable: boolean; missingDependencies: ModuleConfig[] } {
        const module = ALL_MODULES.find(m => m.id === moduleId);

        if (!module) {
            return { canEnable: false, missingDependencies: [] };
        }

        // 檢查所有依賴是否都已啟用
        const missingDeps = module.dependencies
            .filter(depId => !this.enabledModules.has(depId))
            .map(depId => ALL_MODULES.find(m => m.id === depId)!)
            .filter(Boolean);

        return {
            canEnable: missingDeps.length === 0,
            missingDependencies: missingDeps
        };
    }

    /**
     * 啟用模組
     * @param moduleId 要啟用的模組 ID
     * @param autoEnableDependencies 是否自動啟用依賴的模組
     */
    enableModule(moduleId: ModuleId, autoEnableDependencies: boolean = true): { success: boolean; message: string } {
        const validation = this.validateEnable(moduleId);

        if (!validation.canEnable && !autoEnableDependencies) {
            const depNames = validation.missingDependencies.map(d => d.name).join('、');
            return {
                success: false,
                message: `無法啟用：缺少相依模組 ${depNames}`
            };
        }

        // 自動啟用依賴模組
        if (autoEnableDependencies && validation.missingDependencies.length > 0) {
            validation.missingDependencies.forEach(dep => {
                this.enabledModules.add(dep.id);
            });
        }

        this.enabledModules.add(moduleId);
        this.saveModuleConfig();

        return {
            success: true,
            message: '模組已啟用'
        };
    }

    /**
     * 停用模組
     * @param moduleId 要停用的模組 ID
     * @param autoDisableDependents 是否自動停用依賴此模組的其他模組
     */
    disableModule(moduleId: ModuleId, autoDisableDependents: boolean = false): { success: boolean; message: string } {
        const validation = this.validateDisable(moduleId);

        if (!validation.canDisable && !autoDisableDependents) {
            const depNames = validation.dependents.map(d => d.name).join('、');
            return {
                success: false,
                message: `無法停用：${depNames} 依賴此模組`
            };
        }

        // 自動停用依賴此模組的其他模組
        if (autoDisableDependents && validation.dependents.length > 0) {
            validation.dependents.forEach(dep => {
                this.enabledModules.delete(dep.id);
            });
        }

        this.enabledModules.delete(moduleId);
        this.saveModuleConfig();

        return {
            success: true,
            message: '模組已停用'
        };
    }

    /**
     * 切換模組狀態
     */
    toggleModule(moduleId: ModuleId, autoResolve: boolean = true): { success: boolean; message: string } {
        const isEnabled = this.enabledModules.has(moduleId);

        if (isEnabled) {
            return this.disableModule(moduleId, autoResolve);
        } else {
            return this.enableModule(moduleId, autoResolve);
        }
    }

    /**
     * 應用預設配置範本
     */
    applyPreset(presetKey: keyof typeof MODULE_PRESETS): void {
        const preset = MODULE_PRESETS[presetKey];
        this.enabledModules = new Set(preset.modules);
        this.saveModuleConfig();
    }

    /**
     * 重設為預設配置（完整版）
     */
    resetToDefault(): void {
        this.enabledModules = new Set(DEFAULT_ENABLED_MODULES);
        this.saveModuleConfig();
    }

    /**
     * 匯出當前模組配置
     */
    exportConfig(): { modules: ModuleId[]; timestamp: string } {
        return {
            modules: Array.from(this.enabledModules),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 匯入模組配置
     */
    importConfig(config: ModuleId[]): { success: boolean; message: string } {
        try {
            // 驗證所有模組 ID 都是有效的
            const validModules = config.filter(id =>
                ALL_MODULES.some(m => m.id === id)
            );

            // 確保核心模組都啟用
            const coreModules = ALL_MODULES
                .filter(m => m.isCore)
                .map(m => m.id);

            const finalModules = new Set([...coreModules, ...validModules]);

            this.enabledModules = finalModules;
            this.saveModuleConfig();

            return {
                success: true,
                message: '配置已匯入'
            };
        } catch (e) {
            return {
                success: false,
                message: '匯入失敗：配置格式錯誤'
            };
        }
    }

    /**
     * 註冊變更監聽器
     */
    onChange(callback: (modules: ModuleId[]) => void): () => void {
        this.listeners.push(callback);
        // 返回取消註冊函式
        return () => {
            this.listeners = this.listeners.filter(cb => cb !== callback);
        };
    }

    /**
     * 通知所有監聽器
     */
    private notifyListeners(): void {
        const modules = Array.from(this.enabledModules);
        this.listeners.forEach(callback => callback(modules));
    }

    /**
     * 獲取模組統計資訊
     */
    getStats() {
        const total = ALL_MODULES.length;
        const enabled = this.enabledModules.size;
        const core = ALL_MODULES.filter(m => m.isCore).length;
        const optional = total - core;
        const optionalEnabled = enabled - core;

        return {
            total,
            enabled,
            disabled: total - enabled,
            core,
            optional,
            optionalEnabled,
            optionalDisabled: optional - optionalEnabled
        };
    }
}

// 單例模式 - 整個應用程式共用一個實例
export const moduleService = new ModuleService();
