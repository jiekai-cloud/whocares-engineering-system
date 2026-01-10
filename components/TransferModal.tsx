import React, { useState } from 'react';
import { X, ArrowRightLeft, MapPin, Box, MoveRight } from 'lucide-react';
import { InventoryItem, InventoryLocation } from '../types';

interface TransferModalProps {
    item: InventoryItem;
    allLocations: InventoryLocation[];
    onClose: () => void;
    onConfirm: (from: string, to: string, quantity: number, notes: string) => void;
}

const TransferModal: React.FC<TransferModalProps> = ({ item, allLocations, onClose, onConfirm }) => {
    const [fromLoc, setFromLoc] = useState<string>('');
    const [toLoc, setToLoc] = useState<string>('');
    const [quantity, setQuantity] = useState<number>(0);
    const [notes, setNotes] = useState('');

    // Filter locations that actually have stock for this item
    const sourceOptions = item.locations.filter(l => l.quantity > 0);

    const maxQuantity = fromLoc
        ? (item.locations.find(l => l.name === fromLoc)?.quantity || 0)
        : 0;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (fromLoc && toLoc && quantity > 0 && fromLoc !== toLoc) {
            onConfirm(fromLoc, toLoc, quantity, notes);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-8 py-6 bg-slate-900 flex justify-between items-center text-white">
                    <h2 className="font-bold flex items-center gap-3 text-lg">
                        <ArrowRightLeft className="text-emerald-400" />
                        庫存調撥 / 移動
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">

                    {/* Item Info Summary */}
                    <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-4 border border-slate-100">
                        <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400">
                            <Box size={24} />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-900">{item.name}</h3>
                            <p className="text-xs font-bold text-slate-400">目前總量: {item.quantity} {item.unit}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex-1 space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">來源倉庫 (From)</label>
                            <div className="relative">
                                <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                                <select
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
                                    value={fromLoc}
                                    onChange={e => {
                                        setFromLoc(e.target.value);
                                        setQuantity(0); // Reset quantity when source changes
                                    }}
                                >
                                    <option value="">選擇來源...</option>
                                    {sourceOptions.map(loc => (
                                        <option key={loc.name} value={loc.name}>
                                            {loc.name} (剩餘: {loc.quantity})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="text-slate-300 pt-6">
                            <MoveRight size={20} />
                        </div>

                        <div className="flex-1 space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">目的倉庫 (To)</label>
                            <div className="relative">
                                <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                                <select
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
                                    value={toLoc}
                                    onChange={e => setToLoc(e.target.value)}
                                >
                                    <option value="">選擇目的...</option>
                                    {allLocations.filter(al => al.name !== fromLoc).map(loc => (
                                        <option key={loc.id} value={loc.name}>
                                            {loc.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">調撥數量</label>
                        <div className="relative">
                            <Box size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                            <input
                                type="number"
                                required
                                min={1}
                                max={maxQuantity}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                                value={quantity || ''}
                                onChange={e => setQuantity(Number(e.target.value))}
                                placeholder={`最大可輸入: ${maxQuantity}`}
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">{item.unit}</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">備註</label>
                        <input
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder="調撥原因..."
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                        />
                    </div>

                    <div className="pt-4 flex gap-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 text-slate-400 font-bold hover:text-slate-600 transition-colors"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            disabled={!fromLoc || !toLoc || quantity <= 0}
                            className="flex-[2] bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ArrowRightLeft size={18} />
                            確認調撥
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TransferModal;
