import React, { useState, useEffect } from 'react';
import {
    Box, Ruler, Hash, Archive, Truck, AlertTriangle,
    QrCode, Plus, Trash2, Printer, Wrench, Calendar, User, FileText,
    Package, X, Tag, DollarSign, MapPin, Save, Pencil
} from 'lucide-react';
import { InventoryItem, InventoryCategory, MaintenanceRecord } from '../types';

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
        simpleName: '', // 簡稱
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
        notes: '',
        maintenanceRecords: []
    });

    const [newMaintenance, setNewMaintenance] = useState<Partial<MaintenanceRecord>>({
        type: '維修',
        date: new Date().toISOString().split('T')[0],
        description: '',
        cost: 0,
        performer: ''
    });

    const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

    const handleAddMaintenance = () => {
        if (!newMaintenance.description || !newMaintenance.date) return;

        if (editingRecordId) {
            // Update existing record
            setFormData(prev => ({
                ...prev,
                maintenanceRecords: prev.maintenanceRecords?.map(r =>
                    r.id === editingRecordId ? {
                        ...r,
                        date: newMaintenance.date!,
                        type: newMaintenance.type as any || '維修',
                        description: newMaintenance.description!,
                        cost: Number(newMaintenance.cost) || 0,
                        performer: newMaintenance.performer || '',
                    } : r
                )
            }));
            setEditingRecordId(null);
        } else {
            // Add new record
            const record: MaintenanceRecord = {
                id: Date.now().toString(),
                date: newMaintenance.date!,
                type: newMaintenance.type as any || '維修',
                description: newMaintenance.description!,
                cost: Number(newMaintenance.cost) || 0,
                performer: newMaintenance.performer || '',
            };

            setFormData(prev => ({
                ...prev,
                maintenanceRecords: [record, ...(prev.maintenanceRecords || [])]
            }));
        }

        // Reset form
        setNewMaintenance({
            type: '維修',
            date: new Date().toISOString().split('T')[0],
            description: '',
            cost: 0,
            performer: ''
        });
    };

    const handleEditMaintenance = (record: MaintenanceRecord) => {
        setNewMaintenance({
            type: record.type,
            date: record.date,
            description: record.description,
            cost: record.cost,
            performer: record.performer
        });
        setEditingRecordId(record.id);
    };

    const handleCancelEdit = () => {
        setNewMaintenance({
            type: '維修',
            date: new Date().toISOString().split('T')[0],
            description: '',
            cost: 0,
            performer: ''
        });
        setEditingRecordId(null);
    };

    const handleRemoveMaintenance = (id: string) => {
        setFormData(prev => ({
            ...prev,
            maintenanceRecords: prev.maintenanceRecords?.filter(r => r.id !== id)
        }));
    };

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
        ...(formData.category === '工具' ? [{ id: 'maintenance', label: '維修紀錄', icon: Wrench }] : []),
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

                                <div className="md:col-span-2">
                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">簡稱 (選填)</label>
                                    <div className="relative">
                                        <Tag size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                        <input
                                            placeholder="例如: PU膠, 止洩帶..."
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-black font-bold"
                                            value={formData.simpleName || ''}
                                            onChange={e => setFormData({ ...formData, simpleName: e.target.value })}
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

                    {activeTab === 'maintenance' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                            {/* Add New Record Form */}
                            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                                <h3 className="text-sm font-black text-slate-700 mb-4 flex items-center gap-2">
                                    {editingRecordId ? <Pencil size={16} className="text-blue-500" /> : <Plus size={16} className="text-blue-500" />}
                                    {editingRecordId ? '編輯紀錄' : '新增紀錄'}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">日期</label>
                                        <div className="relative">
                                            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                                            <input
                                                type="date"
                                                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                                                value={newMaintenance.date}
                                                onChange={e => setNewMaintenance({ ...newMaintenance, date: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">類型</label>
                                        <select
                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                                            value={newMaintenance.type}
                                            onChange={e => setNewMaintenance({ ...newMaintenance, type: e.target.value as any })}
                                        >
                                            <option value="維修">維修</option>
                                            <option value="保養">保養</option>
                                            <option value="檢測">檢測</option>
                                            <option value="其他">其他</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">內容說明</label>
                                        <div className="relative">
                                            <FileText size={14} className="absolute left-3 top-3 text-slate-300" />
                                            <textarea
                                                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 resize-none h-20"
                                                placeholder="請輸入維修或保養內容..."
                                                value={newMaintenance.description}
                                                onChange={e => setNewMaintenance({ ...newMaintenance, description: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">費用</label>
                                        <div className="relative">
                                            <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                                            <input
                                                type="number"
                                                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                                                value={newMaintenance.cost}
                                                onChange={e => setNewMaintenance({ ...newMaintenance, cost: Number(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">執行人員/廠商</label>
                                        <div className="relative">
                                            <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                                            <input
                                                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="輸入名稱..."
                                                value={newMaintenance.performer}
                                                onChange={e => setNewMaintenance({ ...newMaintenance, performer: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAddMaintenance}
                                    className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-200 active:scale-95"
                                >
                                    {editingRecordId ? '更新紀錄' : '新增紀錄'}
                                </button>
                                {editingRecordId && (
                                    <button
                                        type="button"
                                        onClick={handleCancelEdit}
                                        className="mt-2 w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl transition-all"
                                    >
                                        取消編輯
                                    </button>
                                )}
                            </div>

                            {/* List Records */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest ml-1">歷史紀錄</h3>
                                {(!formData.maintenanceRecords || formData.maintenanceRecords.length === 0) ? (
                                    <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                                        <Wrench className="mx-auto mb-2 opacity-20" size={32} />
                                        <p className="font-bold text-sm">尚無維修紀錄</p>
                                    </div>
                                ) : (
                                    formData.maintenanceRecords.map((record) => (
                                        <div key={record.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow">
                                            <div className={`p-3 rounded-xl ${record.type === '維修' ? 'bg-rose-50 text-rose-500' :
                                                record.type === '保養' ? 'bg-green-50 text-green-500' :
                                                    'bg-blue-50 text-blue-500'
                                                }`}>
                                                <Wrench size={20} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start mb-1">
                                                    <div>
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">{record.date}</span>
                                                        <h4 className="font-bold text-slate-800">{record.description}</h4>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="block font-bold text-slate-900">${record.cost.toLocaleString()}</span>
                                                        <span className="text-xs text-slate-500 font-medium">{record.performer}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${record.type === '維修' ? 'bg-rose-100 text-rose-600' :
                                                        record.type === '保養' ? 'bg-green-100 text-green-600' :
                                                            'bg-slate-100 text-slate-600'
                                                        }`}>
                                                        {record.type}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <button
                                                    onClick={() => handleEditMaintenance(record)}
                                                    className="text-slate-300 hover:text-blue-500 transition-colors p-1"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleRemoveMaintenance(record.id)}
                                                    className="text-slate-300 hover:text-rose-500 transition-colors p-1"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
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
