import React, { useState, useMemo } from 'react';
import {
    Search, Plus, Package, Ruler, Archive, AlertTriangle,
    MoreHorizontal, Pencil, Trash2, Tag, Box, Hash, Filter,
    ShieldAlert, ShoppingBag, Truck, LayoutList, MapPin, Building2, ArrowRightLeft, ScanBarcode, Wrench, Warehouse, ShoppingCart
} from 'lucide-react';
import { InventoryItem, User as UserType, InventoryCategory, InventoryLocation } from '../types';

interface InventoryListProps {
    items: InventoryItem[];
    locations?: InventoryLocation[];
    user?: UserType;
    onAddClick: () => void;
    onEditClick: (item: InventoryItem) => void;
    onDeleteClick: (id: string) => void;
    onManageLocations: () => void;
    onTransferClick: (item: InventoryItem) => void;
    onScanClick: () => void;
    onOrdersClick: () => void;
}

const InventoryList: React.FC<InventoryListProps> = ({ items, locations, user, onAddClick, onEditClick, onDeleteClick, onManageLocations, onTransferClick, onScanClick, onOrdersClick }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedLocation, setSelectedLocation] = useState<string>('all');
    const [showLowStockOnly, setShowLowStockOnly] = useState(false);
    const isReadOnly = user?.role === 'Guest';

    const filteredItems = useMemo(() => {
        return items.filter(item => {
            const matchesSearch =
                item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.simpleName && item.simpleName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (item.locations?.some(l => l.name.toLowerCase().includes(searchTerm.toLowerCase())) || item.location?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (item.supplier && item.supplier.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
            const matchesLocation = selectedLocation === 'all' || item.locations?.some(l => l.name === selectedLocation);
            const matchesLowStock = !showLowStockOnly || (item.minLevel !== undefined && item.quantity <= item.minLevel);

            return matchesSearch && matchesCategory && matchesLocation && matchesLowStock;
        });
    }, [items, searchTerm, selectedCategory, selectedLocation, showLowStockOnly]);

    const getCategoryStyle = (category: InventoryCategory) => {
        switch (category) {
            case '材料': return 'bg-blue-50 text-blue-700 border-blue-100';
            case '工具': return 'bg-amber-50 text-amber-700 border-amber-100';
            case '設備': return 'bg-purple-50 text-purple-700 border-purple-100';
            default: return 'bg-slate-50 text-slate-700 border-slate-100';
        }
    };

    const getStatusBadge = (item: InventoryItem) => {
        const isLow = item.minLevel !== undefined && item.quantity <= item.minLevel;
        const isOut = item.quantity <= 0;

        if (isOut) {
            return (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 text-[10px] font-black uppercase border border-rose-100">
                    <AlertTriangle size={12} /> 缺貨
                </span>
            );
        }
        if (isLow) {
            return (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-600 text-[10px] font-black uppercase border border-amber-100">
                    <AlertTriangle size={12} /> 低庫存
                </span>
            );
        }
        return (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase border border-emerald-100">
                <Box size={12} /> 正常
            </span>
        );
    };

    return (
        <div className="p-8 space-y-6 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">庫存與設備管理</h1>
                    <p className="text-slate-500 font-bold mt-1">追蹤材料數量、工具借用與設備狀態。</p>
                </div>
                <div className="flex items-center gap-3">
                    {!isReadOnly ? (
                        <>
                            <button
                                onClick={onOrdersClick}
                                className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 px-4 py-3.5 rounded-2xl flex items-center gap-2 transition-all font-bold text-sm"
                            >
                                <ShoppingCart size={18} />
                                <span className="hidden sm:inline">採購管理</span>
                            </button>
                            <button
                                onClick={onManageLocations}
                                className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 px-4 py-3.5 rounded-2xl flex items-center gap-2 transition-all font-bold text-sm"
                            >
                                <Building2 size={18} />
                                <span className="hidden sm:inline">倉庫管理</span>
                            </button>
                            <button
                                onClick={onScanClick}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-3.5 rounded-2xl flex items-center gap-2 transition-all font-bold shadow-lg shadow-emerald-200 active:scale-95"
                            >
                                <ScanBarcode size={20} />
                                <span className="hidden sm:inline">掃描調撥</span>
                            </button>
                            <button
                                onClick={onAddClick}
                                className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3.5 rounded-2xl flex items-center gap-2 transition-all shadow-xl shadow-slate-200 active:scale-95 font-black text-sm"
                            >
                                <Plus size={20} />
                                <span>新增項目</span>
                            </button>
                        </>
                    ) : (
                        <div className="bg-stone-50 text-stone-400 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-stone-200">
                            <ShieldAlert size={16} /> 訪客唯讀模式
                        </div>
                    )}
                </div>
            </div>

            {/* Warehouse Filter */}
            {locations && locations.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                    <button
                        onClick={() => setSelectedLocation('all')}
                        className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap flex items-center gap-2 border ${selectedLocation === 'all'
                            ? 'bg-slate-900 text-white border-slate-900 shadow-lg'
                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                            }`}
                    >
                        <LayoutList size={14} /> 全部倉庫
                    </button>
                    {locations.map(loc => (
                        <button
                            key={loc.id}
                            onClick={() => setSelectedLocation(loc.name)}
                            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap flex items-center gap-2 border ${selectedLocation === loc.name
                                ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200'
                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                }`}
                        >
                            <Warehouse size={14} /> {loc.name}
                        </button>
                    ))}
                </div>
            )}

            {/* Filter Bar */}
            <div className="flex flex-col xl:flex-row gap-4">
                <div className="flex-1 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <input
                            type="text"
                            placeholder="搜尋名稱、料號、供應商或儲位..."
                            className="w-full pl-12 pr-4 py-3 bg-transparent border-none focus:ring-0 outline-none text-sm text-slate-900 font-bold"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="hidden sm:flex items-center gap-1.5 border-l border-slate-100 pl-4 overflow-x-auto no-scrollbar whitespace-nowrap">
                        <Filter size={14} className="text-slate-300 mr-2" />
                        {['all', '材料', '工具', '設備', '其他'].map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${selectedCategory === cat
                                    ? 'bg-slate-900 text-white shadow-lg'
                                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                {cat === 'all' ? '全部類別' : cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Low Stock Toggle */}
                <button
                    onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                    className={`px-6 py-3 rounded-2xl border font-bold text-xs flex items-center gap-2 transition-all ${showLowStockOnly
                        ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm'
                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                        }`}
                >
                    <AlertTriangle size={16} className={showLowStockOnly ? 'text-amber-600' : 'text-slate-300'} />
                    僅顯示低庫存
                </button>
            </div>

            {/* Inventory List */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="hidden lg:grid lg:grid-cols-12 px-8 py-5 border-b border-slate-100 bg-slate-50/50">
                    <div className="col-span-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">品項名稱 / 料號</div>
                    <div className="col-span-2 text-[11px] font-black text-slate-400 uppercase tracking-widest">類別 / 儲位</div>
                    <div className="col-span-2 text-[11px] font-black text-slate-400 uppercase tracking-widest">庫存數量</div>
                    <div className="col-span-3 text-[11px] font-black text-slate-400 uppercase tracking-widest">供應商 / 成本</div>
                    <div className="col-span-1 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">操作</div>
                </div>

                <div className="divide-y divide-slate-100">
                    {filteredItems.length > 0 ? filteredItems.map((item) => (
                        <div key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                            <div className="p-6 lg:px-8 lg:py-5 lg:grid lg:grid-cols-12 lg:items-center gap-4">
                                {/* Basic Info */}
                                <div className="col-span-4 flex items-center gap-4 mb-4 lg:mb-0">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 border-white shadow-sm shrink-0 ${item.category === '工具' ? 'bg-amber-100 text-amber-600' :
                                        item.category === '設備' ? 'bg-purple-100 text-purple-600' :
                                            'bg-blue-100 text-blue-600'
                                        }`}>
                                        {item.category === '工具' ? <Ruler size={24} /> :
                                            item.category === '設備' ? <Truck size={24} /> :
                                                <Package size={24} />}
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-900 leading-tight group-hover:text-blue-600 transition-colors tracking-tight">
                                            {item.simpleName ? (
                                                <span className="flex flex-col">
                                                    <span className="text-lg">{item.simpleName}</span>
                                                    <span className="text-[10px] text-slate-400 font-normal line-clamp-1 mt-0.5">{item.name}</span>
                                                </span>
                                            ) : (
                                                item.name
                                            )}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            {item.sku && (
                                                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                    <Hash size={10} /> {item.sku}
                                                </span>
                                            )}
                                            {getStatusBadge(item)}
                                            {item.maintenanceRecords && item.maintenanceRecords.length > 0 && (
                                                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded flex items-center gap-1 border border-slate-200">
                                                    <Wrench size={10} className="text-slate-400" />
                                                    {item.maintenanceRecords[0].date}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Location & Category */}
                                <div className="col-span-2 space-y-1.5 mb-4 lg:mb-0">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border uppercase ${getCategoryStyle(item.category)}`}>
                                            {item.category}
                                        </span>
                                    </div>
                                    {item.locations && item.locations.length > 0 ? (
                                        <div className="flex flex-col gap-1">
                                            {item.locations.slice(0, 2).map((loc, idx) => (
                                                <div key={idx} className="flex items-center gap-1.5 text-slate-500">
                                                    <MapPin size={12} className="shrink-0" />
                                                    <span className="text-xs font-bold">{loc.name} <span className="text-slate-400">({loc.quantity})</span></span>
                                                </div>
                                            ))}
                                            {item.locations.length > 2 && (
                                                <span className="text-[10px] font-bold text-slate-400 pl-4">+ {item.locations.length - 2} 更多地點</span>
                                            )}
                                        </div>
                                    ) : item.location ? (
                                        <div className="flex items-center gap-1.5 text-slate-500">
                                            <MapPin size={12} className="shrink-0" />
                                            <span className="text-xs font-bold">{item.location}</span>
                                        </div>
                                    ) : (
                                        <span className="text-[10px] text-slate-300 font-bold italic">未指定儲位</span>
                                    )}
                                </div>

                                {/* Quantity */}
                                <div className="col-span-2 mb-4 lg:mb-0">
                                    <div className="flex items-end gap-1.5">
                                        <span className="text-2xl font-black text-slate-700">
                                            {selectedLocation === 'all'
                                                ? item.quantity
                                                : (item.locations?.find(l => l.name === selectedLocation)?.quantity || 0)
                                            }
                                        </span>
                                        <span className="text-xs font-bold text-slate-400 mb-1.5">{item.unit}</span>
                                    </div>
                                    {selectedLocation !== 'all' && (
                                        <div className="text-[10px] font-bold text-slate-400">
                                            (總庫存: {item.quantity})
                                        </div>
                                    )}
                                    {selectedLocation === 'all' && item.minLevel !== undefined && (
                                        <div className="text-[10px] font-bold text-slate-400">
                                            安全存量: {item.minLevel} {item.unit}
                                        </div>
                                    )}
                                </div>

                                {/* Supplier & Cost */}
                                <div className="col-span-3 space-y-1 mb-4 lg:mb-0">
                                    {item.supplier && (
                                        <div className="flex items-center gap-1.5 text-slate-600">
                                            <ShoppingBag size={12} className="text-slate-400" />
                                            <span className="text-xs font-bold">{item.supplier}</span>
                                        </div>
                                    )}
                                    {item.costPrice !== undefined && (
                                        <div className="text-xs font-bold text-slate-400">
                                            成本: <span className="text-slate-600">${item.costPrice.toLocaleString()}</span> / {item.unit}
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="col-span-1 flex items-center justify-end gap-1">
                                    {!isReadOnly ? (
                                        <>
                                            <button
                                                onClick={() => onEditClick(item)}
                                                className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-white hover:shadow-md hover:border-blue-100 border border-transparent rounded-xl transition-all"
                                            >
                                                <Pencil size={18} />
                                            </button>
                                            <button
                                                title="庫存調撥"
                                                onClick={() => onTransferClick(item)}
                                                className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-white hover:shadow-md hover:border-emerald-100 border border-transparent rounded-xl transition-all"
                                            >
                                                <ArrowRightLeft size={18} />
                                            </button>
                                            <button
                                                onClick={() => onDeleteClick(item.id)}
                                                className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-white hover:shadow-md hover:border-rose-100 border border-transparent rounded-xl transition-all"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </>
                                    ) : (
                                        <span className="text-[9px] font-black text-stone-200 uppercase italic tracking-widest">View Only</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="px-8 py-32 text-center text-slate-300">
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
                                    <Package size={40} className="text-slate-200" />
                                </div>
                                <div>
                                    <p className="text-lg font-black text-slate-400 uppercase tracking-tighter">查無庫存項目</p>
                                    <p className="text-sm font-bold text-slate-300 mt-1">請嘗試變更搜尋條件</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InventoryList;
