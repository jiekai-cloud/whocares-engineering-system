import React, { useState, useEffect } from 'react';
import {
    ShoppingCart, Plus, Package, Truck, Calendar, X,
    DollarSign, User, CheckCircle, Clock, Search, Filter,
    ChevronDown, ChevronUp, AlertCircle, FileText, Check
} from 'lucide-react';
import { InventoryItem, InventoryLocation, PurchaseOrder, PurchaseOrderItem, OrderPayment } from '../types';

interface OrderManagerModalProps {
    onClose: () => void;
    orders: PurchaseOrder[];
    inventoryItems: InventoryItem[];
    locations: InventoryLocation[];
    onSaveOrder: (order: PurchaseOrder) => void;
    onUpdateOrder: (order: PurchaseOrder) => void;
    onReceiveItems: (orderId: string, itemIdxs: number[]) => void; // itemIdxs are indices of items in the order
}

const OrderManagerModal: React.FC<OrderManagerModalProps> = ({
    onClose, orders, inventoryItems, locations, onSaveOrder, onUpdateOrder, onReceiveItems
}) => {
    const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
    const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Form State
    const [formData, setFormData] = useState<Partial<PurchaseOrder>>({
        date: new Date().toISOString().split('T')[0],
        supplier: '',
        targetWarehouseId: '',
        items: [],
        payments: [],
        status: 'Pending',
        totalAmount: 0
    });

    const [newItemInput, setNewItemInput] = useState<{ itemId: string, quantity: number, cost: number }>({
        itemId: '',
        quantity: 1,
        cost: 0
    });

    const [newPaymentInput, setNewPaymentInput] = useState<{ amount: number, date: string, method: string, note: string }>({
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        method: 'Transfer',
        note: ''
    });

    // Helper functions
    const getWarehouseName = (id: string) => locations.find(l => l.id === id)?.name || id;

    const handleCreateClick = () => {
        setFormData({
            date: new Date().toISOString().split('T')[0],
            supplier: '',
            targetWarehouseId: locations.length > 0 ? locations[0].id : '', // Default to first location
            items: [],
            payments: [],
            status: 'Pending',
            totalAmount: 0
        });
        setView('create');
    };

    const handleAddItem = () => {
        if (!newItemInput.itemId || newItemInput.quantity <= 0) return;
        const invItem = inventoryItems.find(i => i.id === newItemInput.itemId);
        if (!invItem) return;

        const newItem: PurchaseOrderItem = {
            itemId: invItem.id,
            itemName: invItem.name,
            quantity: newItemInput.quantity,
            unit: invItem.unit,
            cost: newItemInput.cost,
            received: false
        };

        setFormData(prev => ({
            ...prev,
            items: [...(prev.items || []), newItem],
            totalAmount: (prev.totalAmount || 0) + (newItem.cost * newItem.quantity)
        }));

        setNewItemInput({ itemId: '', quantity: 1, cost: 0 });
    };

    const handleRemoveItem = (index: number) => {
        setFormData(prev => {
            const newItems = [...(prev.items || [])];
            const removedItem = newItems.splice(index, 1)[0];
            return {
                ...prev,
                items: newItems,
                totalAmount: (prev.totalAmount || 0) - (removedItem.cost * removedItem.quantity)
            };
        });
    };

    const handleSaveOrder = () => {
        if (!formData.supplier || !formData.targetWarehouseId || (formData.items?.length || 0) === 0) {
            alert('請填寫完整訂單資訊 (供應商、入庫倉庫、至少一項商品)');
            return;
        }

        const newOrder: PurchaseOrder = {
            id: 'PO' + Date.now().toString().slice(-8),
            date: formData.date!,
            supplier: formData.supplier!,
            targetWarehouseId: formData.targetWarehouseId!,
            items: formData.items!,
            payments: formData.payments || [],
            status: 'Pending',
            totalAmount: formData.totalAmount || 0,
            notes: formData.notes,
            updatedAt: new Date().toISOString()
        };

        onSaveOrder(newOrder);
        setView('list');
    };

    const handleViewDetail = (order: PurchaseOrder) => {
        setSelectedOrder(order);
        setView('detail');
    };

    const handleAddPayment = () => {
        if (!selectedOrder || newPaymentInput.amount <= 0) return;

        const updatedOrder = { ...selectedOrder };
        const newPayment: OrderPayment = {
            id: Date.now().toString(),
            ...newPaymentInput
        };

        updatedOrder.payments = [...(updatedOrder.payments || []), newPayment];

        onUpdateOrder(updatedOrder);
        setSelectedOrder(updatedOrder); // Update local view
        setNewPaymentInput({ amount: 0, date: new Date().toISOString().split('T')[0], method: 'Transfer', note: '' });
    };

    const [selectedReceiveIndices, setSelectedReceiveIndices] = useState<number[]>([]);

    const handleReceiveSubmit = () => {
        if (!selectedOrder || selectedReceiveIndices.length === 0) return;

        onReceiveItems(selectedOrder.id, selectedReceiveIndices);

        // Optimistic update for local view
        const updatedItems = [...selectedOrder.items];
        selectedReceiveIndices.forEach(idx => {
            updatedItems[idx].received = true;
        });

        // Check if all received
        const allReceived = updatedItems.every(i => i.received);

        const updatedOrder = {
            ...selectedOrder,
            items: updatedItems,
            status: allReceived ? 'Completed' : 'Partial' as any
        };

        setSelectedOrder(updatedOrder);
        setSelectedReceiveIndices([]);
    };

    const filteredOrders = orders.filter(o =>
        o.supplier.includes(searchTerm) || o.id.includes(searchTerm)
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`bg-white w-full ${view === 'list' ? 'max-w-4xl' : 'max-w-2xl'} flex flex-col rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 h-[85vh]`}>

                {/* Header */}
                <div className="px-8 py-6 bg-slate-900 flex justify-between items-center text-white shrink-0">
                    <h2 className="font-bold flex items-center gap-3 text-lg">
                        <ShoppingCart className="text-blue-400" />
                        {view === 'list' && '採購訂單管理'}
                        {view === 'create' && '新增採購單'}
                        {view === 'detail' && `訂單詳情: ${selectedOrder?.id}`}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2.5 hover:bg-slate-800 rounded-full transition-colors text-slate-400"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex flex-col bg-slate-50">

                    {/* View: List */}
                    {view === 'list' && (
                        <div className="flex-1 flex flex-col p-6 overflow-hidden">
                            <div className="flex gap-4 mb-6">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                    <input
                                        type="text"
                                        placeholder="搜尋供應商或單號..."
                                        className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <button
                                    onClick={handleCreateClick}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-200 transition-all active:scale-95"
                                >
                                    <Plus size={18} /> 新增訂單
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto no-scrollbar space-y-4">
                                {filteredOrders.length === 0 ? (
                                    <div className="text-center py-20 text-slate-400">
                                        <ShoppingCart className="mx-auto mb-4 opacity-20" size={64} />
                                        <p className="font-bold">尚無採購紀錄</p>
                                    </div>
                                ) : (
                                    filteredOrders.map(order => (
                                        <div
                                            key={order.id}
                                            onClick={() => handleViewDetail(order)}
                                            className="bg-white p-5 rounded-2xl border border-slate-200 hover:shadow-lg transition-all cursor-pointer group"
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-xs font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase">{order.id}</span>
                                                        <span className="text-[10px] text-slate-400 font-bold">{order.date}</span>
                                                    </div>
                                                    <h3 className="text-lg font-black text-slate-800 group-hover:text-blue-600 transition-colors">{order.supplier}</h3>
                                                </div>
                                                <div className={`px-3 py-1 rounded-full text-xs font-black uppercase ${order.status === 'Completed' ? 'bg-emerald-100 text-emerald-600' :
                                                        order.status === 'Cancelled' ? 'bg-slate-100 text-slate-400' :
                                                            'bg-amber-100 text-amber-600'
                                                    }`}>
                                                    {order.status === 'Pending' ? '待收貨' :
                                                        order.status === 'Partial' ? '部分收貨' :
                                                            order.status === 'Completed' ? '已完成' : '已取消'}
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between text-sm text-slate-500 font-bold">
                                                <div className="flex items-center gap-4">
                                                    <span className="flex items-center gap-1.5"><Package size={14} /> {order.items.length} 品項</span>
                                                    <span className="flex items-center gap-1.5"><Truck size={14} /> {getWarehouseName(order.targetWarehouseId)}</span>
                                                </div>
                                                <div className="text-slate-900 text-lg">
                                                    ${order.totalAmount.toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* View: Create */}
                    {view === 'create' && (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="flex-1 overflow-y-auto p-8 space-y-6">
                                {/* Basic Info */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">訂購日期</label>
                                        <input
                                            type="date"
                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                                            value={formData.date}
                                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">供應商</label>
                                        <input
                                            type="text"
                                            placeholder="輸入供應商名稱..."
                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                                            value={formData.supplier}
                                            onChange={e => setFormData({ ...formData, supplier: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">入庫倉庫 (收貨地點)</label>
                                        <select
                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                                            value={formData.targetWarehouseId}
                                            onChange={e => setFormData({ ...formData, targetWarehouseId: e.target.value })}
                                        >
                                            {locations.map(loc => (
                                                <option key={loc.id} value={loc.id}>{loc.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">備註</label>
                                        <input
                                            type="text"
                                            placeholder="選填"
                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                                            value={formData.notes || ''}
                                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Items */}
                                <div className="bg-white p-6 rounded-2xl border border-slate-200">
                                    <h3 className="font-black text-slate-700 mb-4 flex items-center gap-2"><Package size={18} /> 訂購品項</h3>

                                    {/* Add Item Row */}
                                    <div className="flex flex-col md:flex-row gap-4 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <div className="flex-1">
                                            <div className="text-xs text-slate-400 font-bold mb-1 ml-1">選擇品項</div>
                                            <select
                                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 outline-none"
                                                value={newItemInput.itemId}
                                                onChange={e => {
                                                    const item = inventoryItems.find(i => i.id === e.target.value);
                                                    setNewItemInput({
                                                        ...newItemInput,
                                                        itemId: e.target.value,
                                                        cost: item?.costPrice || 0
                                                    })
                                                }}
                                            >
                                                <option value="">選擇庫存項目...</option>
                                                {inventoryItems.map(item => (
                                                    <option key={item.id} value={item.id}>{item.name} ({item.sku || 'No SKU'})</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="w-24">
                                            <div className="text-xs text-slate-400 font-bold mb-1 ml-1">數量</div>
                                            <input
                                                type="number"
                                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 outline-none text-center"
                                                value={newItemInput.quantity}
                                                onChange={e => setNewItemInput({ ...newItemInput, quantity: Number(e.target.value) })}
                                            />
                                        </div>
                                        <div className="w-32">
                                            <div className="text-xs text-slate-400 font-bold mb-1 ml-1">單價</div>
                                            <input
                                                type="number"
                                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 outline-none text-right"
                                                value={newItemInput.cost}
                                                onChange={e => setNewItemInput({ ...newItemInput, cost: Number(e.target.value) })}
                                            />
                                        </div>
                                        <div className="flex items-end">
                                            <button
                                                onClick={handleAddItem}
                                                className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors"
                                            >
                                                <Plus size={20} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Item List */}
                                    <div className="space-y-2">
                                        {formData.items?.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-xl transition-colors border-b border-slate-50 last:border-0">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">
                                                        {idx + 1}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-800">{item.itemName}</div>
                                                        <div className="text-xs text-slate-400 font-bold">單價: ${item.cost.toLocaleString()}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <div className="text-right">
                                                        <div className="font-black text-slate-700">x {item.quantity} {item.unit}</div>
                                                        <div className="text-sm font-bold text-blue-600">${(item.quantity * item.cost).toLocaleString()}</div>
                                                    </div>
                                                    <button onClick={() => handleRemoveItem(idx)} className="text-slate-300 hover:text-rose-500">
                                                        <X size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        {(!formData.items || formData.items.length === 0) && (
                                            <div className="text-center text-slate-400 py-4 font-bold text-sm">尚未加入品項</div>
                                        )}
                                    </div>

                                    <div className="mt-8 pt-4 border-t border-slate-100 flex justify-between items-center">
                                        <span className="text-slate-400 font-black uppercase tracking-widest text-xs">總金額</span>
                                        <span className="text-2xl font-black text-slate-900">${formData.totalAmount?.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-t border-slate-100 flex gap-4">
                                <button onClick={() => setView('list')} className="flex-1 py-4 text-slate-400 font-bold hover:text-slate-600">取消</button>
                                <button onClick={handleSaveOrder} className="flex-[2] bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-slate-800 shadow-xl active:scale-95 transition-all">建立訂單</button>
                            </div>
                        </div>
                    )}

                    {/* View: Detail */}
                    {selectedOrder && view === 'detail' && (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="flex-1 overflow-y-auto p-8 space-y-8">
                                {/* Status Banner */}
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-800">{selectedOrder.supplier}</h2>
                                        <div className="flex items-center gap-3 text-sm font-bold text-slate-500 mt-1">
                                            <span>{selectedOrder.date}</span>
                                            <span>•</span>
                                            <span className="text-slate-400">入庫: {getWarehouseName(selectedOrder.targetWarehouseId)}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">訂單總額</div>
                                        <div className="text-3xl font-black text-slate-900">${selectedOrder.totalAmount.toLocaleString()}</div>
                                    </div>
                                </div>

                                {/* Items & Receiving */}
                                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                                        <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                            <Package size={18} /> 訂購品項
                                        </h3>
                                        {selectedReceiveIndices.length > 0 && (
                                            <button
                                                onClick={handleReceiveSubmit}
                                                className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-lg shadow-emerald-200 transition-all flex items-center gap-2"
                                            >
                                                <CheckCircle size={14} /> 確認收貨 ({selectedReceiveIndices.length})
                                            </button>
                                        )}
                                    </div>
                                    <div className="divide-y divide-slate-100">
                                        {selectedOrder.items.map((item, idx) => (
                                            <div key={idx} className={`p-4 flex items-center justify-between transition-colors ${item.received ? 'bg-slate-50/50' : 'hover:bg-slate-50'}`}>
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer ${item.received
                                                            ? 'bg-emerald-500 border-emerald-500 text-white'
                                                            : selectedReceiveIndices.includes(idx)
                                                                ? 'bg-blue-500 border-blue-500 text-white'
                                                                : 'border-slate-300 bg-white'
                                                        }`}
                                                        onClick={() => {
                                                            if (item.received) return;
                                                            if (selectedReceiveIndices.includes(idx)) {
                                                                setSelectedReceiveIndices(prev => prev.filter(i => i !== idx));
                                                            } else {
                                                                setSelectedReceiveIndices(prev => [...prev, idx]);
                                                            }
                                                        }}
                                                    >
                                                        {(item.received || selectedReceiveIndices.includes(idx)) && <Check size={14} strokeWidth={4} />}
                                                    </div>
                                                    <div>
                                                        <div className={`font-bold ${item.received ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{item.itemName}</div>
                                                        <div className="text-xs text-slate-400 font-bold">${item.cost.toLocaleString()} / {item.unit}</div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className={`font-black ${item.received ? 'text-slate-400' : 'text-slate-700'}`}>x {item.quantity}</div>
                                                    {item.received && <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1">已入庫</div>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Payments */}
                                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                                        <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                            <DollarSign size={18} /> 付款紀錄
                                        </h3>
                                    </div>
                                    <div className="p-6">
                                        <div className="space-y-4 mb-6">
                                            {selectedOrder.payments.map(pay => (
                                                <div key={pay.id} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                                                    <div>
                                                        <div className="font-bold text-slate-700">${pay.amount.toLocaleString()}</div>
                                                        <div className="text-xs text-slate-400 font-bold">{pay.date} • {pay.method}</div>
                                                    </div>
                                                    {pay.note && <div className="text-sm text-slate-500">{pay.note}</div>}
                                                </div>
                                            ))}
                                            {selectedOrder.payments.length === 0 && (
                                                <div className="text-center text-slate-400 text-sm font-bold py-2">尚無付款紀錄</div>
                                            )}
                                        </div>

                                        {/* Add Payment Form */}
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-3">
                                            <div className="flex gap-2">
                                                <input
                                                    type="date"
                                                    className="w-1/3 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none"
                                                    value={newPaymentInput.date}
                                                    onChange={e => setNewPaymentInput({ ...newPaymentInput, date: e.target.value })}
                                                />
                                                <div className="relative flex-1">
                                                    <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                                                    <input
                                                        type="number"
                                                        placeholder="金額"
                                                        className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-sm font-bold outline-none"
                                                        value={newPaymentInput.amount}
                                                        onChange={e => setNewPaymentInput({ ...newPaymentInput, amount: Number(e.target.value) })}
                                                    />
                                                </div>
                                                <select
                                                    className="w-1/3 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none appearance-none"
                                                    value={newPaymentInput.method}
                                                    onChange={e => setNewPaymentInput({ ...newPaymentInput, method: e.target.value })}
                                                >
                                                    <option value="Cash">現金</option>
                                                    <option value="Transfer">轉帳</option>
                                                    <option value="Check">支票</option>
                                                </select>
                                                <button
                                                    onClick={handleAddPayment}
                                                    className="bg-slate-900 text-white px-4 rounded-lg font-bold text-sm hover:bg-slate-800"
                                                >
                                                    紀錄付款
                                                </button>
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="備註 (選填)..."
                                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none"
                                                value={newPaymentInput.note}
                                                onChange={e => setNewPaymentInput({ ...newPaymentInput, note: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 border-t border-slate-100 bg-white">
                                <button onClick={() => setView('list')} className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all">
                                    返回列表
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OrderManagerModal;
