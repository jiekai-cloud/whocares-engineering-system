
import React, { useState, useRef } from 'react';
import { Plus, Trash2, Edit2, Save, X, CheckCircle2, Circle, AlertTriangle, MessageSquare, Calendar, ChevronDown, ChevronRight, Check, Download, Loader2, Image as ImageIcon, Video as VideoIcon, Play } from 'lucide-react';
import { Project, DefectRecord, DefectItem } from '../types';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface DefectImprovementProps {
    project: Project;
    onUpdate: (records: DefectRecord[]) => void;
    isReadOnly?: boolean;
}

const DefectImprovement: React.FC<DefectImprovementProps> = ({ project, onUpdate, isReadOnly }) => {
    const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
    const [expandedRecords, setExpandedRecords] = useState<string[]>([]);
    const [isExporting, setIsExporting] = useState(false);
    const pdfRef = useRef<HTMLDivElement>(null);
    const photoInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);

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

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, itemId: string) => {
        const files = e.target.files;
        if (!files || !tempRecord) return;

        setUploadingItemId(itemId);
        const newPhotos: string[] = [];
        let processedCount = 0;

        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (reader.result) {
                    newPhotos.push(reader.result as string);
                }
                processedCount++;
                if (processedCount === files.length) {
                    const currentItem = tempRecord.items.find(i => i.id === itemId);
                    if (currentItem) {
                        const existingPhotos = currentItem.photos || [];
                        updateItem(itemId, { photos: [...existingPhotos, ...newPhotos] });
                    }
                    setUploadingItemId(null);
                }
            };
            reader.readAsDataURL(file);
        });

        // Reset input
        e.target.value = '';
    };

    const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>, itemId: string) => {
        const file = e.target.files?.[0];
        if (!file || !tempRecord) return;

        setUploadingItemId(itemId);
        // Check size (limit to 50MB for base64 safety, though ideally should be cloud URL)
        if (file.size > 50 * 1024 * 1024) {
            alert('影片檔案過大 (限制 50MB)');
            setUploadingItemId(null);
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            updateItem(itemId, { videoUrl: reader.result as string });
            setUploadingItemId(null);
        };
        reader.readAsDataURL(file);

        // Reset input
        e.target.value = '';
    };

    const removePhoto = (itemId: string, photoIndex: number) => {
        if (!tempRecord) return;
        const currentItem = tempRecord.items.find(i => i.id === itemId);
        if (currentItem && currentItem.photos) {
            const newPhotos = currentItem.photos.filter((_, idx) => idx !== photoIndex);
            updateItem(itemId, { photos: newPhotos });
        }
    };

    const removeVideo = (itemId: string) => {
        updateItem(itemId, { videoUrl: undefined });
    };

    return (
        <>
            <div className="h-full flex flex-col bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden animate-in fade-in">
                {/* Header */}
                <div className="px-6 py-4 border-b border-stone-100 bg-stone-50/50 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={16} className="text-rose-600" />
                        <h3 className="font-black text-xs uppercase tracking-widest text-stone-900">缺失改善紀錄</h3>
                    </div>
                    {!isReadOnly && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={async () => {
                                    if (!pdfRef.current || isExporting) return;
                                    setIsExporting(true);
                                    try {
                                        const element = pdfRef.current;
                                        const canvas = await html2canvas(element, {
                                            scale: 2,
                                            useCORS: true,
                                            logging: false,
                                            backgroundColor: '#ffffff'
                                        });
                                        const imgData = canvas.toDataURL('image/png');
                                        const pdf = new jsPDF('p', 'mm', 'a4');
                                        const pdfWidth = pdf.internal.pageSize.getWidth();
                                        const pdfHeight = pdf.internal.pageSize.getHeight();
                                        const imgWidth = pdfWidth;
                                        const imgHeight = (canvas.height * imgWidth) / canvas.width;

                                        let heightLeft = imgHeight;
                                        let position = 0;

                                        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                                        heightLeft -= pdfHeight;

                                        while (heightLeft >= 0) {
                                            position = heightLeft - imgHeight;
                                            pdf.addPage();
                                            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                                            heightLeft -= pdfHeight;
                                        }

                                        pdf.save(`${project.name}_缺失改善紀錄_${new Date().toISOString().split('T')[0]}.pdf`);
                                    } catch (error) {
                                        console.error('PDF Export failed', error);
                                        alert('匯出失敗，請稍後再試');
                                    } finally {
                                        setIsExporting(false);
                                    }
                                }}
                                className="flex items-center gap-2 bg-white border border-stone-200 text-stone-600 px-3 py-1.5 rounded-xl text-[10px] font-black hover:bg-stone-50 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                                disabled={isExporting}
                            >
                                {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} 匯出 PDF
                            </button>
                            <button
                                onClick={addNewRecord}
                                disabled={!!editingRecordId}
                                className="flex items-center gap-2 bg-stone-900 text-white px-3 py-1.5 rounded-xl text-[10px] font-black hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-95"
                            >
                                <Plus size={14} /> 新增改善紀錄
                            </button>
                        </div>
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

                                                                            {/* Upload Controls */}
                                                                            <div className="flex gap-2 pt-1">
                                                                                <button
                                                                                    onClick={() => {
                                                                                        // Hacky way to pass ID, better to have individual inputs or state
                                                                                        // But since we can only open one file dialgo at a time:
                                                                                        if (photoInputRef.current) {
                                                                                            photoInputRef.current.setAttribute('data-item-id', item.id);
                                                                                            photoInputRef.current.click();
                                                                                        }
                                                                                    }}
                                                                                    className="flex items-center gap-1 text-[9px] font-black text-stone-400 hover:text-blue-600 bg-stone-50 px-2 py-1 rounded-lg border border-stone-200 hover:border-blue-200 transition"
                                                                                >
                                                                                    <ImageIcon size={10} />
                                                                                    {uploadingItemId === item.id ? '上傳中...' : '添加照片'}
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => {
                                                                                        if (videoInputRef.current) {
                                                                                            videoInputRef.current.setAttribute('data-item-id', item.id);
                                                                                            videoInputRef.current.click();
                                                                                        }
                                                                                    }}
                                                                                    disabled={!!item.videoUrl}
                                                                                    className="flex items-center gap-1 text-[9px] font-black text-stone-400 hover:text-blue-600 bg-stone-50 px-2 py-1 rounded-lg border border-stone-200 hover:border-blue-200 transition disabled:opacity-50"
                                                                                >
                                                                                    <VideoIcon size={10} />
                                                                                    {item.videoUrl ? '影片已上傳' : '添加影片'}
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="space-y-2">
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
                                                                        </div>
                                                                    )}

                                                                    {/* Media Preview Grid */}
                                                                    {(item.photos && item.photos.length > 0 || item.videoUrl) && (
                                                                        <div className="flex flex-wrap gap-2 mt-2">
                                                                            {item.photos?.map((photo, pIdx) => (
                                                                                <div key={pIdx} className="relative group w-16 h-16 rounded-lg overflow-hidden bg-stone-100 border border-stone-200">
                                                                                    <img src={photo} alt="Defect" className="w-full h-full object-cover" />
                                                                                    {isEditing && (
                                                                                        <button
                                                                                            onClick={() => removePhoto(item.id, pIdx)}
                                                                                            className="absolute top-0.5 right-0.5 bg-black/50 hover:bg-rose-500 p-0.5 rounded-full text-white opacity-0 group-hover:opacity-100 transition-all"
                                                                                        >
                                                                                            <X size={10} />
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                            ))}
                                                                            {item.videoUrl && (
                                                                                <div className="relative group w-16 h-16 rounded-lg overflow-hidden bg-stone-900 border border-stone-200 flex items-center justify-center">
                                                                                    <video src={item.videoUrl} className="w-full h-full object-cover opacity-50" />
                                                                                    <Play size={20} className="absolute text-white" />
                                                                                    {isEditing && (
                                                                                        <button
                                                                                            onClick={() => removeVideo(item.id)}
                                                                                            className="absolute top-0.5 right-0.5 bg-black/50 hover:bg-rose-500 p-0.5 rounded-full text-white opacity-0 group-hover:opacity-100 transition-all z-10"
                                                                                        >
                                                                                            <X size={10} />
                                                                                        </button>
                                                                                    )}
                                                                                    <a href={item.videoUrl} target="_blank" rel="noreferrer" className="absolute inset-0 z-0" />
                                                                                </div>
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

                                            {/* Hidden Inputs for File Upload */}
                                            <input
                                                type="file"
                                                ref={photoInputRef}
                                                className="hidden"
                                                accept="image/*"
                                                multiple
                                                onChange={(e) => {
                                                    const itemId = e.target.getAttribute('data-item-id');
                                                    if (itemId) handlePhotoUpload(e, itemId);
                                                }}
                                            />
                                            <input
                                                type="file"
                                                ref={videoInputRef}
                                                className="hidden"
                                                accept="video/*"
                                                onChange={(e) => {
                                                    const itemId = e.target.getAttribute('data-item-id');
                                                    if (itemId) handleVideoUpload(e, itemId);
                                                }}
                                            />

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

            {/* Hidden Print Container */}
            <div className="fixed left-[-9999px] top-0 w-[210mm] bg-white p-8" ref={pdfRef}>
                <div className="mb-6 border-b border-stone-200 pb-4">
                    <h1 className="text-2xl font-black text-stone-900 mb-2">{project.name} - 缺失改善紀錄</h1>
                    <p className="text-sm text-stone-500">列印時間：{new Date().toLocaleString('zh-TW')}</p>
                </div>
                <div className="space-y-6">
                    {records.map(record => {
                        const pendingCount = record.items.filter(i => i.status === 'Pending').length;
                        const completedCount = record.items.filter(i => i.status === 'Completed').length;
                        return (
                            <div key={record.id} className="border border-stone-200 rounded-xl overflow-hidden break-inside-avoid">
                                <div className="bg-stone-50 px-4 py-2 border-b border-stone-200 flex justify-between items-center">
                                    <span className="font-black text-stone-800">{record.date}</span>
                                    <div className="flex gap-2">
                                        {pendingCount > 0 && <span className="text-[10px] bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full font-bold">待改進: {pendingCount}</span>}
                                        {completedCount > 0 && <span className="text-[10px] bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full font-bold">已改善: {completedCount}</span>}
                                    </div>
                                </div>
                                <div className="p-4">
                                    <div className="space-y-2 mb-4">
                                        <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">缺失項目</h4>
                                        {record.items.map(item => (
                                            <div key={item.id} className="flex gap-2 items-start border-b border-stone-100 pb-2 last:border-0 last:pb-0">
                                                <span className={`shrink-0 text-xs px-1.5 rounded ${item.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{item.status === 'Completed' ? '已改進' : '待改進'}</span>
                                                <div className="flex-1">
                                                    <p className="text-xs font-bold text-stone-800">{item.content}</p>
                                                    {item.improvement && <p className="text-[10px] text-stone-500 mt-1">改善：{item.improvement}</p>}
                                                </div>
                                            </div>
                                        ))}
                                        {record.items.length === 0 && <p className="text-xs text-stone-400 italic">無缺失項目</p>}
                                    </div>
                                    <div>
                                        <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">會議建議</h4>
                                        <p className="text-xs text-stone-600 leading-relaxed whitespace-pre-wrap">{record.suggestions || '無'}</p>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                    {records.length === 0 && (
                        <div className="text-center py-20 text-stone-300">
                            <p className="font-bold">尚無任何缺失紀錄</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default DefectImprovement;
