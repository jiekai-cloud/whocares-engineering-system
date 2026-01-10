import React, { useState, useEffect } from 'react';
import {
    X, Package, MapPin, DollarSign, Tag, Save,
    Box, Ruler, Hash, Archive, Truck, AlertTriangle,
    QrCode, Plus, Trash2, Printer
} from 'lucide-react';
import { InventoryItem, InventoryCategory } from '../types';

interface InventoryModalProps {
    onClose: () => void;
    onConfirm: (data: Partial<InventoryItem>) => void;
    initialData?: InventoryItem | null;
    availableLocationNames?: string[];
}

const InventoryModal: React.FC<InventoryModalProps> = ({ onClose, onConfirm, initialData, availableLocationNames }) => {
    const [activeTab, setActiveTab] = useState<'info' | 'stock'>('info');

    const [formData, setFormData] = useState<Partial<InventoryItem>>({
        name: '',
        sku: '',
        barcode: '', // Custom Barcode / Asset ID
        category: '材料',
        quantity: 0,
        unit: '個',
        locations: [],
        locationsInput: '', // Temporary input for searching/adding locations
        minLevel: 0,
        costPrice: 0,
        sellingPrice: 0,
        supplier: '',
        status: 'Normal',
        notes: ''
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                locations: initialData.locations || (initialData.location ? [{ name: initialData.location, quantity: initialData.quantity }] : [])
            });
        }
    }, [initialData]);

    // Automatically calculate total quantity from locations
    useEffect(() => {
        if (formData.locations && formData.locations.length > 0) {
            const total = formData.locations.reduce((sum, loc) => sum + (Number(loc.quantity) || 0), 0);
            setFormData(prev => ({ ...prev, quantity: total }));
        }
    }, [formData.locations]);

    const handleAddLocation = () => {
        setFormData(prev => ({
            ...prev,
            locations: [...(prev.locations || []), { name: '', quantity: 0 }]
        }));
    };

    const handleRemoveLocation = (index: number) => {
        setFormData(prev => ({
            ...prev,
            locations: prev.locations?.filter((_, i) => i !== index)
        }));
    };

    const handleLocationChange = (index: number, field: 'name' | 'quantity', value: string | number) => {
        setFormData(prev => {
            const newLocs = [...(prev.locations || [])];
            newLocs[index] = { ...newLocs[index], [field]: value };
            return { ...prev, locations: newLocs };
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) return;
        onConfirm(formData);
    };

    const tabs = [
        { id: 'info', label: '基本資訊', icon: Package },
        { id: 'stock', label: '庫存設定', icon: Box },
        { id: 'barcode', label: '條碼管理', icon: QrCode },
    ];

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-8 py-6 bg-slate-900 flex justify-between items-center text-white">
                    <h2 className="font-bold flex items-center gap-3 text-lg">
                        <Package className="text-blue-400" />
                        {initialData ? '修改庫存項目' : '新增庫存項目'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2.5 hover:bg-slate-800 rounded-full transition-colors text-slate-400"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="bg-white border-b border-slate-100 flex overflow-x-auto no-scrollbar">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex-1 py-4 px-2 flex flex-col items-center gap-1.5 transition-all relative min-w-[80px] ${activeTab === tab.id ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            <tab.icon size={18} className={activeTab === tab.id ? 'text-blue-500' : ''} />
                            <span className="text-[10px] font-black uppercase tracking-tighter">{tab.label}</span>
                            {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 rounded-t-full" />}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
                    {activeTab === 'info' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">品項名稱 *</label>
                                    <div className="relative">
                                        <Tag size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                        <input
                                            required
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-black font-bold"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">料號 (SKU)</label>
                                    <div className="relative">
                                        <Hash size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                        <input
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-black font-bold"
                                            value={formData.sku || ''}
                                            onChange={e => setFormData({ ...formData, sku: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">類別</label>
                                    <select
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-black font-bold appearance-none"
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value as InventoryCategory })}
                                    >
                                        <option value="材料">材料</option>
                                        <option value="工具">工具</option>
                                        <option value="設備">設備</option>
                                        <option value="其他">其他</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">成本單價</label>
                                    <div className="relative">
                                        <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                        <input
                                            type="number"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-black font-bold"
                                            value={formData.costPrice}
                                            onChange={e => setFormData({ ...formData, costPrice: Number(e.target.value) })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">供應商</label>
                                    <div className="relative">
                                        <Truck size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                        <input
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-black font-bold"
                                            value={formData.supplier || ''}
                                            onChange={e => setFormData({ ...formData, supplier: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'stock' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">目前數量 *</label>
                                    <div className="relative">
                                        <Box size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                        <input
                                            required
                                            type="number"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-black font-bold"
                                            value={formData.quantity}
                                            onChange={e => setFormData({ ...formData, quantity: Number(e.target.value) })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">單位 (例如: 個, 捲, 箱)</label>
                                    <div className="relative">
                                        <Ruler size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                        <input
                                            required
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-black font-bold"
                                            value={formData.unit}
                                            onChange={e => setFormData({ ...formData, unit: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">安全庫存警示量</label>
                                    <div className="relative">
                                        <AlertTriangle size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                        <input
                                            type="number"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-black font-bold"
                                            value={formData.minLevel}
                                            onChange={e => setFormData({ ...formData, minLevel: Number(e.target.value) })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">儲位管理 (多地點)</label>
                                        <button
                                            type="button"
                                            onClick={handleAddLocation}
                                            className="text-[10px] font-black bg-blue-50 text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"
                                        >
                                            <Plus size={12} /> 新增儲位
                                        </button>
                                    </div>
                                    <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 max-h-[200px] overflow-y-auto">
                                        {(formData.locations?.length || 0) === 0 && (
                                            <p className="text-center text-xs text-slate-400 py-2 font-bold">暫無指定儲位，請新增。</p>
                                        )}
                                        {formData.locations?.map((loc, idx) => (
                                            <div key={idx} className="flex gap-2 items-center animate-in slide-in-from-left-4 duration-300">
                                                <div className="relative flex-1">
                                                    <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                                                    <input
                                                        placeholder="儲位名稱 (如: 倉庫A-01)"
                                                        list={`loc-suggestions-${idx}`}
                                                        className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                                                        value={loc.name}
                                                        onChange={(e) => handleLocationChange(idx, 'name', e.target.value)}
                                                    />
                                                    <datalist id={`loc-suggestions-${idx}`}>
                                                        {availableLocationNames?.map(name => <option key={name} value={name} />)}
                                                    </datalist>
                                                </div>
                                                <div className="w-24 relative">
                                                    <input
                                                        type="number"
                                                        placeholder="數量"
                                                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 text-center"
                                                        value={loc.quantity}
                                                        onChange={(e) => handleLocationChange(idx, 'quantity', Number(e.target.value))}
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveLocation(idx)}
                                                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-white rounded-xl transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">備註說明</label>
                                    <textarea
                                        className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] p-5 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-stone-900 font-medium text-sm min-h-[100px] resize-none"
                                        placeholder="備註..."
                                        value={formData.notes || ''}
                                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'barcode' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col items-center justify-center space-y-8 py-8">
                            <div className="bg-white p-8 rounded-3xl border-2 border-slate-100 shadow-xl flex flex-col items-center gap-4 max-w-sm w-full mx-auto">
                                <div className="w-full">
                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center">自訂條碼內容 (資產編號)</label>
                                    <div className="relative">
                                        <QrCode size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                        <input
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3 text-center font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            placeholder="輸入條碼編號..."
                                            value={formData.barcode || ''}
                                            onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="w-full aspect-square bg-slate-50 rounded-2xl flex items-center justify-center p-4">
                                    {/* Using bwip-js API for DataMatrix generation */}
                                    <img
                                        src={`https://bwipjs-api.metafloor.com/?bcid=datamatrix&text=${formData.barcode || formData.id || formData.sku || 'NEW-ITEM'}&scale=3&includetext&backgroundcolor=ffffff`}
                                        alt="DataMatrix"
                                        className="w-full h-full object-contain mix-blend-multiply"
                                        onError={(e) => {
                                            // Fallback if API fails
                                            (e.target as HTMLImageElement).style.display = 'none';
                                            (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-xs text-slate-400">無法預覽條碼</span>';
                                        }}
                                    />
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">DATA MATRIX</p>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight font-mono">{formData.barcode || formData.sku || formData.id || 'Pending ID'}</h3>
                                    <p className="text-xs font-bold text-slate-500 mt-2">{formData.name}</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-sm transition-all"
                            >
                                <Printer size={16} /> 列印標籤
                            </button>
                            <div className="bg-blue-50 p-4 rounded-2xl text-xs text-blue-600 font-bold leading-relaxed max-w-sm">
                                <p>ℹ️ DataMatrix 二維條碼</p>
                                <p className="opacity-80 font-medium mt-1">此格式適合標示小型零件與工具，可儲存高密度資訊且具備強大的容錯能力。</p>
                            </div>
                        </div>
                    )}

                    <div className="pt-8 flex gap-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 text-slate-400 font-bold hover:text-slate-600 transition-colors"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            className="flex-[2] bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <Save size={20} />
                            儲存庫存項目
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default InventoryModal;
