import React, { useState, useEffect } from 'react';
import { moduleService } from '../services/moduleService';
import { ModuleConfig, ModuleId, MODULE_PRESETS } from '../moduleConfig';
import { Check, X, AlertCircle, Download, Upload, RefreshCw, Sparkles, Shield, ChevronDown, ChevronUp } from 'lucide-react';

interface ModuleManagerProps {
    userRole: string;
}

const ModuleManager: React.FC<ModuleManagerProps> = ({ userRole }) => {
    const [modules, setModules] = useState<ModuleConfig[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [showDependencyWarning, setShowDependencyWarning] = useState<{ show: boolean; message: string; module: ModuleId | null }>({ show: false, message: '', module: null });
    const [expandedModules, setExpandedModules] = useState<Set<ModuleId>>(new Set());

    // 只有 SuperAdmin 可以管理模組
    if (userRole !== 'SuperAdmin') {
        return (
            <div className="p-8 lg:p-12">
                <div className="max-w-2xl mx-auto bg-rose-50 border border-rose-200 rounded-[2rem] p-12 text-center">
                    <Shield size={48} className="mx-auto text-rose-500 mb-4" />
                    <h2 className="text-xl font-black text-rose-900 mb-2">權限不足</h2>
                    <p className="text-sm text-rose-600 font-medium">僅系統管理員可以管理功能模組</p>
                </div>
            </div>
        );
    }

    useEffect(() => {
        loadModules();

        // 監聽模組變更
        const unsubscribe = moduleService.onChange(() => {
            loadModules();
        });

        return unsubscribe;
    }, []);

    const loadModules = () => {
        setModules(moduleService.getAllModules());
    };

    const handleToggleModule = (moduleId: ModuleId) => {
        const module = modules.find(m => m.id === moduleId);

        if (!module) return;

        // 核心模組不可關閉
        if (module.isCore) {
            setShowDependencyWarning({
                show: true,
                message: '核心模組無法停用',
                module: moduleId
            });
            setTimeout(() => setShowDependencyWarning({ show: false, message: '', module: null }), 3000);
            return;
        }

        const result = moduleService.toggleModule(moduleId, false);

        if (!result.success) {
            setShowDependencyWarning({
                show: true,
                message: result.message,
                module: moduleId
            });
        } else {
            loadModules();
        }
    };

    const handleForceToggle = (moduleId: ModuleId) => {
        moduleService.toggleModule(moduleId, true);
        setShowDependencyWarning({ show: false, message: '', module: null });
        loadModules();
    };

    const handleApplyPreset = (presetKey: keyof typeof MODULE_PRESETS) => {
        if (confirm(`確定要載入「${MODULE_PRESETS[presetKey].name}」配置嗎？\n\n${MODULE_PRESETS[presetKey].description}`)) {
            moduleService.applyPreset(presetKey);
            loadModules();
        }
    };

    const handleExport = () => {
        const config = moduleService.exportConfig();
        const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `module-config-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const config = JSON.parse(event.target?.result as string);
                        const result = moduleService.importConfig(config.modules || config);
                        alert(result.message);
                        if (result.success) loadModules();
                    } catch (e) {
                        alert('匯入失敗：檔案格式錯誤');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    };

    const handleReset = () => {
        if (confirm('確定要重設為預設配置（完整版）嗎？')) {
            moduleService.resetToDefault();
            loadModules();
        }
    };

    const toggleExpanded = (moduleId: ModuleId) => {
        const newExpanded = new Set(expandedModules);
        if (newExpanded.has(moduleId)) {
            newExpanded.delete(moduleId);
        } else {
            newExpanded.add(moduleId);
        }
        setExpandedModules(newExpanded);
    };

    const stats = moduleService.getStats();
    const categories = [
        { id: 'all', name: '全部模組', count: modules.length },
        { id: 'core', name: '核心模組', count: modules.filter(m => m.category === 'core').length },
        { id: 'management', name: '管理模組', count: modules.filter(m => m.category === 'management').length },
        { id: 'analytics', name: '分析模組', count: modules.filter(m => m.category === 'analytics').length },
        { id: 'automation', name: '自動化模組', count: modules.filter(m => m.category === 'automation').length }
    ];

    const filteredModules = selectedCategory === 'all'
        ? modules
        : modules.filter(m => m.category === selectedCategory);

    return (
        <div className="p-4 lg:p-8 pb-32 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg">
                        <Sparkles size={24} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl lg:text-3xl font-black text-stone-900 tracking-tight">模組管理中心</h1>
                        <p className="text-xs text-stone-500 font-bold uppercase tracking-widest">Module Configuration</p>
                    </div>
                </div>
                <p className="text-sm text-stone-600 font-medium mt-4 leading-relaxed">
                    管理系統功能模組，為不同工程公司客製化所需功能。啟用或停用模組將立即生效。
                </p>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-3xl p-6 border border-stone-100 shadow-sm">
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">總模組數</p>
                    <p className="text-3xl font-black text-stone-900">{stats.total}</p>
                </div>
                <div className="bg-emerald-50 rounded-3xl p-6 border border-emerald-100">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">已啟用</p>
                    <p className="text-3xl font-black text-emerald-700">{stats.enabled}</p>
                </div>
                <div className="bg-stone-50 rounded-3xl p-6 border border-stone-200">
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">已停用</p>
                    <p className="text-3xl font-black text-stone-600">{stats.disabled}</p>
                </div>
                <div className="bg-orange-50 rounded-3xl p-6 border border-orange-100">
                    <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-2">核心模組</p>
                    <p className="text-3xl font-black text-orange-700">{stats.core}</p>
                </div>
            </div>

            {/* Preset Templates */}
            <div className="bg-white rounded-[2rem] border border-stone-200 shadow-sm p-6 mb-8">
                <h2 className="text-sm font-black text-stone-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Sparkles size={16} className="text-orange-500" />
                    快速配置範本
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {Object.entries(MODULE_PRESETS).map(([key, preset]) => (
                        <button
                            key={key}
                            onClick={() => handleApplyPreset(key as keyof typeof MODULE_PRESETS)}
                            className="bg-stone-50 hover:bg-orange-50 border border-stone-200 hover:border-orange-200 rounded-2xl p-4 text-left transition-all group"
                        >
                            <p className="text-sm font-black text-stone-900 mb-1 group-hover:text-orange-600">{preset.name}</p>
                            <p className="text-[10px] text-stone-500 font-medium leading-relaxed">{preset.description}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mb-6">
                <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-4 py-3 bg-white border border-stone-200 rounded-2xl text-xs font-black text-stone-700 hover:bg-stone-50 transition-all shadow-sm"
                >
                    <Download size={16} />
                    匯出配置
                </button>
                <button
                    onClick={handleImport}
                    className="flex items-center gap-2 px-4 py-3 bg-white border border-stone-200 rounded-2xl text-xs font-black text-stone-700 hover:bg-stone-50 transition-all shadow-sm"
                >
                    <Upload size={16} />
                    匯入配置
                </button>
                <button
                    onClick={handleReset}
                    className="flex items-center gap-2 px-4 py-3 bg-white border border-stone-200 rounded-2xl text-xs font-black text-stone-700 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 transition-all shadow-sm"
                >
                    <RefreshCw size={16} />
                    重設為預設
                </button>
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-2">
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${selectedCategory === cat.id
                                ? 'bg-stone-900 text-white shadow-lg'
                                : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
                            }`}
                    >
                        {cat.name} ({cat.count})
                    </button>
                ))}
            </div>

            {/* Dependency Warning */}
            {showDependencyWarning.show && (
                <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start justify-between gap-4 animate-in slide-in-from-top-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-black text-amber-900 mb-1">相依性警告</p>
                            <p className="text-xs text-amber-700 font-medium">{showDependencyWarning.message}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => showDependencyWarning.module && handleForceToggle(showDependencyWarning.module)}
                            className="px-3 py-2 bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-700 transition-all"
                        >
                            自動處理
                        </button>
                        <button
                            onClick={() => setShowDependencyWarning({ show: false, message: '', module: null })}
                            className="p-2 text-amber-600 hover:bg-amber-100 rounded-xl transition-all"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* Module List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredModules.map(module => {
                    const Icon = module.icon;
                    const isExpanded = expandedModules.has(module.id);
                    const hasDependencies = module.dependencies.length > 0;
                    const dependencyModules = module.dependencies.map(depId =>
                        modules.find(m => m.id === depId)
                    ).filter(Boolean);

                    return (
                        <div
                            key={module.id}
                            className={`bg-white rounded-3xl border-2 shadow-sm transition-all ${module.enabled
                                    ? 'border-emerald-200 bg-emerald-50/30'
                                    : 'border-stone-100 hover:border-stone-200'
                                }`}
                        >
                            <div className="p-6">
                                <div className="flex items-start justify-between gap-4 mb-4">
                                    <div className="flex items-start gap-4 flex-1">
                                        <div className={`p-3 rounded-2xl shrink-0 ${module.enabled
                                                ? 'bg-emerald-500 text-white'
                                                : 'bg-stone-100 text-stone-400'
                                            }`}>
                                            <Icon size={24} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-lg font-black text-stone-900">{module.name}</h3>
                                                {module.isCore && (
                                                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-lg text-[9px] font-black uppercase tracking-wider">
                                                        核心
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-stone-500 font-medium leading-relaxed mb-2">
                                                {module.description}
                                            </p>
                                            <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest">
                                                {module.category === 'core' && '核心模組'}
                                                {module.category === 'management' && '管理模組'}
                                                {module.category === 'analytics' && '分析模組'}
                                                {module.category === 'automation' && '自動化模組'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Toggle Switch */}
                                    <button
                                        onClick={() => handleToggleModule(module.id)}
                                        disabled={module.isCore}
                                        className={`relative w-14 h-7 rounded-full transition-all shrink-0 ${module.enabled
                                                ? 'bg-emerald-500'
                                                : 'bg-stone-300'
                                            } ${module.isCore ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                    >
                                        <div
                                            className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${module.enabled ? 'translate-x-7' : 'translate-x-0'
                                                } flex items-center justify-center`}
                                        >
                                            {module.enabled ? (
                                                <Check size={12} className="text-emerald-600" />
                                            ) : (
                                                <X size={12} className="text-stone-400" />
                                            )}
                                        </div>
                                    </button>
                                </div>

                                {/* Dependencies */}
                                {hasDependencies && (
                                    <div className="mt-4 pt-4 border-t border-stone-100">
                                        <button
                                            onClick={() => toggleExpanded(module.id)}
                                            className="flex items-center gap-2 text-xs font-bold text-stone-600 hover:text-stone-900 transition-colors w-full"
                                        >
                                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                            相依模組 ({module.dependencies.length})
                                        </button>
                                        {isExpanded && (
                                            <div className="mt-3 space-y-2 animate-in slide-in-from-top-2">
                                                {dependencyModules.map(dep => dep && (
                                                    <div key={dep.id} className="flex items-center gap-2 text-xs">
                                                        <div className={`w-2 h-2 rounded-full ${dep.enabled ? 'bg-emerald-500' : 'bg-stone-300'}`} />
                                                        <span className="font-medium text-stone-700">{dep.name}</span>
                                                        {!dep.enabled && (
                                                            <span className="text-[9px] text-rose-600 font-bold">(未啟用)</span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ModuleManager;
