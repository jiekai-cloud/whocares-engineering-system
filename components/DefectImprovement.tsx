
import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Save, X, CheckCircle2, Circle, AlertTriangle, MessageSquare, Calendar, ChevronDown, ChevronRight, Check } from 'lucide-react';
import { Project, DefectRecord, DefectItem } from '../types';

interface DefectImprovementProps {
    project: Project;
    onUpdate: (records: DefectRecord[]) => void;
    isReadOnly?: boolean;
}

const DefectImprovement: React.FC<DefectImprovementProps> = ({ project, onUpdate, isReadOnly }) => {
    const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
    const [expandedRecords, setExpandedRecords] = useState<string[]>([]);

    // Temporary state for editing a record
    const [tempRecord, setTempRecord] = useState<DefectRecord | null>(null);

    const records = project.defectRecords || [];

    const toggleExpand = (id: string) => {
        setExpandedRecords(prev =>
            prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
        );
    };

    const startEdit = (record: DefectRecord) => {
        setEditingRecordId(record.id);
        setTempRecord({ ...record });
        if (!expandedRecords.includes(record.id)) {
            toggleExpand(record.id);
        }
    };

    const cancelEdit = () => {
        setEditingRecordId(null);
        setTempRecord(null);
    };

    const saveEdit = () => {
        if (!tempRecord) return;
        const newRecords = records.map(r => r.id === tempRecord.id ? tempRecord : r);
        onUpdate(newRecords);
        setEditingRecordId(null);
        setTempRecord(null);
    };

    const addNewRecord = () => {
        const newRecord: DefectRecord = {
            id: Date.now().toString(),
            date: new Date().toISOString().split('T')[0],
            items: [],
            suggestions: '',
            updatedAt: new Date().toISOString()
        };
        onUpdate([newRecord, ...records]);
        setExpandedRecords(prev => [newRecord.id, ...prev]);
        setEditingRecordId(newRecord.id);
        setTempRecord(newRecord);
    };

    const deleteRecord = (id: string) => {
        if (confirm('確定要刪除這份改善紀錄嗎？此動作無法復原。')) {
            onUpdate(records.filter(r => r.id !== id));
        }
    };

    // Item Management Handlers within Temp Record
    const addItem = () => {
        if (!tempRecord) return;
        const newItem: DefectItem = {
            id: Date.now().toString(),
            content: '',
            status: 'Pending'
        };
        setTempRecord({
            ...tempRecord,
            items: [...tempRecord.items, newItem]
        });
    };

    const updateItem = (itemId: string, updates: Partial<DefectItem>) => {
        if (!tempRecord) return;
        setTempRecord({
            ...tempRecord,
            items: tempRecord.items.map(item => item.id === itemId ? { ...item, ...updates } : item)
        });
    };

    const deleteItem = (itemId: string) => {
        if (!tempRecord) return;
        setTempRecord({
            ...tempRecord,
            items: tempRecord.items.filter(item => item.id !== itemId)
        });
    };

    return (
        <div className="h-full flex flex-col bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden animate-in fade-in">
            {/* Header */}
            <div className="px-6 py-4 border-b border-stone-100 bg-stone-50/50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className="text-rose-600" />
                    <h3 className="font-black text-xs uppercase tracking-widest text-stone-900">缺失改善紀錄</h3>
                </div>
                {!isReadOnly && (
                    <button
                        onClick={addNewRecord}
                        disabled={!!editingRecordId}
                        className="flex items-center gap-2 bg-stone-900 text-white px-3 py-1.5 rounded-xl text-[10px] font-black hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-95"
                    >
                        <Plus size={14} /> 新增改善紀錄
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 touch-scroll no-scrollbar">
                {records.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-stone-300 gap-4 opacity-50 py-20">
                        <CheckCircle2 size={48} />
                        <div className="text-center">
                            <p className="text-[10px] font-black uppercase tracking-widest">目前無缺失紀錄</p>
                            <p className="text-[9px] font-bold mt-1">恭喜！本案目前維持良好品質。</p>
                        </div>
                    </div>
                ) : (
                    records.map(record => {
                        const isEditing = editingRecordId === record.id;
                        const data = isEditing && tempRecord ? tempRecord : record;
                        const isExpanded = expandedRecords.includes(record.id);
                        const pendingCount = data.items.filter(i => i.status === 'Pending').length;
                        const completedCount = data.items.filter(i => i.status === 'Completed').length;

                        return (
                            <div key={record.id} className={`border rounded-2xl transition-all ${isEditing ? 'border-blue-500 ring-2 ring-blue-500/10 bg-white' : 'border-stone-200 bg-stone-50 hover:border-stone-300'}`}>
                                {/* Record Header */}
                                <div
                                    className="px-4 py-3 flex items-center justify-between cursor-pointer select-none"
                                    onClick={() => !isEditing && toggleExpand(record.id)}
                                >
                                    <div className="flex items-center gap-3">
                                        <button className="text-stone-400">
                                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                        </button>
                                        <div className="flex items-center gap-2">
                                            <Calendar size={14} className="text-stone-400" />
                                            {isEditing ? (
                                                <input
                                                    type="date"
                                                    value={data.date}
                                                    onChange={(e) => setTempRecord(prev => prev ? { ...prev, date: e.target.value } : null)}
                                                    className="bg-stone-100 border border-stone-200 rounded px-2 py-0.5 text-xs font-bold outline-none focus:border-blue-500"
                                                    onClick={e => e.stopPropagation()}
                                                />
                                            ) : (
                                                <span className="text-sm font-black text-stone-700">{data.date}</span>
                                            )}
                                        </div>
                                        {/* Summary Badge */}
                                        {!isEditing && (
                                            <div className="flex gap-2">
                                                {pendingCount > 0 && (
                                                    <span className="bg-rose-100 text-rose-600 shadow-sm text-[9px] font-black px-2 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
                                                        <AlertTriangle size={10} /> {pendingCount} 待改進
                                                    </span>
                                                )}
                                                {completedCount > 0 && (
                                                    <span className="bg-emerald-100 text-emerald-600 shadow-sm text-[9px] font-black px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                                                        <CheckCircle2 size={10} /> {completedCount} 已改善
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {isEditing ? (
                                            <>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); saveEdit(); }}
                                                    className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                                                    title="儲存"
                                                >
                                                    <Save size={14} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); cancelEdit(); }}
                                                    className="p-1.5 bg-stone-200 text-stone-600 rounded-lg hover:bg-stone-300 transition"
                                                    title="取消"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </>
                                        ) : (
                                            !isReadOnly && (
                                                <>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); startEdit(record); }}
                                                        className="p-1.5 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                        title="編輯"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); deleteRecord(record.id); }}
                                                        className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                                        title="刪除"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </>
                                            )
                                        )}
                                    </div>
                                </div>

                                {/* Expanded Content */}
                                {isExpanded && (
                                    <div className="px-4 pb-4 border-t border-stone-100/50 pt-4 animate-in slide-in-from-top-1">
                                        {/* Defect Items List */}
                                        <div className="space-y-3 mb-6">
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest">缺失項目列表</label>
                                                {isEditing && (
                                                    <button
                                                        onClick={addItem}
                                                        className="flex items-center gap-1 text-[9px] font-black text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition"
                                                    >
                                                        <Plus size={10} /> 新增項目
                                                    </button>
                                                )}
                                            </div>

                                            {data.items.length === 0 ? (
                                                <p className="text-xs text-stone-400 italic py-2 text-center bg-stone-100 rounded-xl">本紀錄尚無項目</p>
                                            ) : (
                                                <div className="space-y-2">
                                                    {data.items.map((item, index) => (
                                                        <div key={item.id} className={`flex items-start gap-3 p-3 rounded-xl border ${item.status === 'Completed' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-white border-stone-100'}`}>
                                                            {/* Status Toggle */}
                                                            <button
                                                                disabled={!isEditing}
                                                                onClick={() => updateItem(item.id, { status: item.status === 'Pending' ? 'Completed' : 'Pending' })}
                                                                className={`shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center border transition-all ${item.status === 'Completed'
                                                                        ? 'bg-emerald-500 border-emerald-500 text-white'
                                                                        : 'bg-white border-stone-300 text-transparent hover:border-emerald-400'
                                                                    }`}
                                                            >
                                                                <Check size={12} strokeWidth={4} />
                                                            </button>

                                                            <div className="flex-1 space-y-2">
                                                                {isEditing ? (
                                                                    <div className="space-y-2">
                                                                        <input
                                                                            className="w-full bg-stone-50 border border-stone-200 rounded px-2 py-1.5 text-xs font-bold outline-none focus:border-blue-500 placeholder:text-stone-300"
                                                                            placeholder="描述缺失項目..."
                                                                            value={item.content}
                                                                            onChange={(e) => updateItem(item.id, { content: e.target.value })}
                                                                        />
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-[9px] font-bold text-stone-400 whitespace-nowrap">改善情形:</span>
                                                                            <input
                                                                                className="flex-1 bg-stone-50 border border-stone-200 rounded px-2 py-1 text-xs outline-none focus:border-blue-500 placeholder:text-stone-300"
                                                                                placeholder="輸入已改善內容..."
                                                                                value={item.improvement || ''}
                                                                                onChange={(e) => updateItem(item.id, { improvement: e.target.value })}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div>
                                                                        <p className={`text-xs font-bold leading-relaxed ${item.status === 'Completed' ? 'text-emerald-800 line-through decoration-emerald-200' : 'text-stone-800'}`}>
                                                                            {item.content}
                                                                        </p>
                                                                        {item.improvement && (
                                                                            <p className="text-[10px] text-stone-500 mt-1 pl-2 border-l-2 border-stone-200">
                                                                                <span className="font-bold">改善：</span>{item.improvement}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {isEditing && (
                                                                <button
                                                                    onClick={() => deleteItem(item.id)}
                                                                    className="text-stone-300 hover:text-rose-500 transition p-1"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Suggestions */}
                                        <div>
                                            <label className="flex items-center gap-2 text-[9px] font-black text-stone-400 uppercase tracking-widest mb-2">
                                                <MessageSquare size={12} /> 後續會議建議
                                            </label>
                                            {isEditing ? (
                                                <textarea
                                                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-blue-500 min-h-[80px] resize-none"
                                                    placeholder="輸入會議建議..."
                                                    value={data.suggestions || ''}
                                                    onChange={(e) => setTempRecord(prev => prev ? { ...prev, suggestions: e.target.value } : null)}
                                                />
                                            ) : (
                                                <div className="bg-white border border-stone-100 rounded-xl p-3">
                                                    <p className="text-xs text-stone-600 leading-relaxed whitespace-pre-wrap">
                                                        {data.suggestions || '無建議事項'}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default DefectImprovement;
