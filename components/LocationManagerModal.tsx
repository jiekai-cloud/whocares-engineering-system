import React, { useState } from 'react';
import { X, Plus, Trash2, MapPin, Building2, Truck } from 'lucide-react';
import { InventoryLocation } from '../types';

interface LocationManagerModalProps {
    locations: InventoryLocation[];
    onClose: () => void;
    onAdd: (location: Omit<InventoryLocation, 'id'>) => void;
    onDelete: (id: string) => void;
}

const LocationManagerModal: React.FC<LocationManagerModalProps> = ({ locations, onClose, onAdd, onDelete }) => {
    const [newLocName, setNewLocName] = useState('');
    const [newLocDesc, setNewLocDesc] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newLocName) return;
        onAdd({
            name: newLocName,
            description: newLocDesc,
            type: 'Temporary',
            isDefault: false
        });
        setNewLocName('');
        setNewLocDesc('');
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-8 py-6 bg-slate-900 flex justify-between items-center text-white">
                    <h2 className="font-bold flex items-center gap-3 text-lg">
                        <Building2 className="text-blue-400" />
                        倉庫 / 儲位管理
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    {/* List */}
                    <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                        {locations.map(loc => (
                            <div key={loc.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${loc.type === 'Main' ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'
                                        }`}>
                                        {loc.type === 'Main' ? <Building2 size={20} /> : <Truck size={20} />}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900">{loc.name}</h3>
                                        <p className="text-xs text-slate-500 font-medium">
                                            {loc.type === 'Main' ? '總倉庫 (預設)' : '臨時倉庫/工地'}
                                        </p>
                                    </div>
                                </div>
                                {loc.type !== 'Main' && (
                                    <button
                                        onClick={() => {
                                            if (confirm('確定要移除此倉庫嗎？請確認其中已無庫存。')) onDelete(loc.id);
                                        }}
                                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-white rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Add New */}
                    <form onSubmit={handleSubmit} className="pt-6 border-t border-slate-100 space-y-4">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">新增臨時倉庫</h3>
                        <div className="grid grid-cols-1 gap-3">
                            <input
                                placeholder="倉庫名稱 (如: 信義工地所, 二號車)"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                value={newLocName}
                                onChange={e => setNewLocName(e.target.value)}
                            />
                            <input
                                placeholder="備註說明 (選填)"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                value={newLocDesc}
                                onChange={e => setNewLocDesc(e.target.value)}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={!newLocName.trim()}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Plus size={18} />
                            新增倉庫
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LocationManagerModal;
