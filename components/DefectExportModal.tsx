import React, { useState, useRef } from 'react';
import { X, Download, CheckSquare, Square, Loader2, AlertTriangle, FileText, ChevronRight, ChevronDown } from 'lucide-react';
import { Project, DefectRecord } from '../types';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface DefectExportModalProps {
    projects: Project[];
    onClose: () => void;
}

const DefectExportModal: React.FC<DefectExportModalProps> = ({ projects, onClose }) => {
    // Filter projects that actually have defect records
    const availableProjects = projects.filter(p => p.defectRecords && p.defectRecords.length > 0);

    const [selectedIds, setSelectedIds] = useState<string[]>(availableProjects.map(p => p.id));
    const [isExporting, setIsExporting] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
        );
    };

    const toggleAll = () => {
        if (selectedIds.length === availableProjects.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(availableProjects.map(p => p.id));
        }
    };

    const handleExport = async () => {
        if (!printRef.current || selectedIds.length === 0) return;
        setIsExporting(true);

        try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const projectElements = printRef.current.querySelectorAll('[data-project-id]');

            for (let i = 0; i < projectElements.length; i++) {
                const element = projectElements[i] as HTMLElement;
                // Only capture if selected
                if (!selectedIds.includes(element.dataset.projectId || '')) continue;

                // Capture the element
                const canvas = await html2canvas(element, {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    backgroundColor: '#ffffff'
                });

                const imgData = canvas.toDataURL('image/png');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                const imgWidth = pdfWidth;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;

                // Add to PDF
                // If it's taller than one page, we need to split (simple splitting)
                // For this batch mode, we'll assume "Header + Content" fits reasonably or just scale it.
                // But better to handle multipage if single project is huge.

                let heightLeft = imgHeight;
                let position = 0;

                if (i > 0) pdf.addPage(); // Add page for next project

                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pdfHeight;

                while (heightLeft >= 0) {
                    position = heightLeft - imgHeight;
                    pdf.addPage();
                    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                    heightLeft -= pdfHeight;
                }
            }

            pdf.save(`各案缺失改善紀錄彙整_${new Date().toISOString().split('T')[0]}.pdf`);
            onClose();

        } catch (error) {
            console.error('Export failed', error);
            alert('匯出失敗，請稍後再試');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-stone-900 text-white rounded-xl">
                            <FileText size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-stone-900">匯出缺失改善報告</h2>
                            <p className="text-xs text-stone-500 font-bold">PDF Batch Export</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-stone-200 rounded-full transition text-stone-400 hover:text-stone-600">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-stone-700">選擇要匯出的案件 ({selectedIds.length})</h3>
                        <button
                            onClick={toggleAll}
                            className="text-xs font-black text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition flex items-center gap-1"
                        >
                            {selectedIds.length === availableProjects.length ? <CheckSquare size={14} /> : <Square size={14} />}
                            全選 / 取消
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {availableProjects.length === 0 ? (
                            <div className="col-span-full py-12 text-center text-stone-400 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                                <AlertTriangle size={32} className="mx-auto mb-2 opacity-50" />
                                <p className="text-xs font-bold">目前沒有任何案件包含缺失紀錄</p>
                            </div>
                        ) : (
                            availableProjects.map(p => (
                                <div
                                    key={p.id}
                                    onClick={() => toggleSelect(p.id)}
                                    className={`
                                        p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-3 group
                                        ${selectedIds.includes(p.id)
                                            ? 'bg-blue-50 border-blue-200 shadow-sm'
                                            : 'bg-white border-stone-100 hover:border-blue-200 hover:bg-stone-50'}
                                    `}
                                >
                                    <div className={`
                                        w-5 h-5 rounded-md border flex items-center justify-center transition-colors
                                        ${selectedIds.includes(p.id) ? 'bg-blue-600 border-blue-600' : 'bg-white border-stone-300'}
                                    `}>
                                        <CheckSquare size={12} className="text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <h4 className="font-black text-stone-800 text-sm truncate">{p.name}</h4>
                                            <span className="text-[10px] font-bold text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">{p.id}</span>
                                        </div>
                                        <div className="flex gap-2 text-[10px] font-medium text-stone-500">
                                            <span className="flex items-center gap-1"><AlertTriangle size={10} className="text-stone-400" /> {p.defectRecords?.length || 0} 筆紀錄</span>
                                            <span className="flex items-center gap-1 text-rose-500"><AlertTriangle size={10} /> {p.defectRecords?.reduce((acc, r) => acc + r.items.filter(i => i.status === 'Pending').length, 0) || 0} 待改進</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="p-6 border-t border-stone-100 bg-stone-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 rounded-2xl font-bold text-stone-500 hover:bg-stone-200 transition"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={selectedIds.length === 0 || isExporting}
                        className="px-8 py-3 bg-stone-900 text-white rounded-2xl font-black shadow-xl shadow-stone-200 disabled:opacity-50 hover:bg-black active:scale-95 transition-all flex items-center gap-2"
                    >
                        {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                        開始匯出 PDF
                    </button>
                </div>
            </div>

            {/* Hidden Print Container */}
            <div className="fixed left-[-9999px] top-0 w-[210mm] bg-white" ref={printRef}>
                {availableProjects
                    .filter(p => selectedIds.includes(p.id))
                    .map(project => (
                        <div key={project.id} data-project-id={project.id} className="p-12 mb-8 bg-white" style={{ minHeight: '297mm' }}>

                            {/* Project Header */}
                            <div className="border-b-2 border-stone-900 pb-6 mb-8">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <span className="text-xs font-black text-stone-400 uppercase tracking-[0.2em] mb-2 block">Project Defect Report</span>
                                        <h1 className="text-3xl font-black text-stone-900">{project.name}</h1>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-stone-500">案件編號: {project.id}</p>
                                        <p className="text-xs text-stone-400 mt-1">匯出日期: {new Date().toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Stats Overview */}
                            <div className="flex gap-4 mb-8">
                                <div className="flex-1 bg-stone-50 p-4 rounded-xl border border-stone-100">
                                    <p className="text-[10px] text-stone-400 font-black uppercase tracking-widest mb-1">總紀錄數</p>
                                    <p className="text-2xl font-black text-stone-900">{project.defectRecords?.length || 0}</p>
                                </div>
                                <div className="flex-1 bg-rose-50 p-4 rounded-xl border border-rose-100">
                                    <p className="text-[10px] text-rose-400 font-black uppercase tracking-widest mb-1">待改善項目</p>
                                    <p className="text-2xl font-black text-rose-600">{project.defectRecords?.reduce((acc, r) => acc + r.items.filter(i => i.status === 'Pending').length, 0) || 0}</p>
                                </div>
                                <div className="flex-1 bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                                    <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mb-1">已改善項目</p>
                                    <p className="text-2xl font-black text-emerald-600">{project.defectRecords?.reduce((acc, r) => acc + r.items.filter(i => i.status === 'Completed').length, 0) || 0}</p>
                                </div>
                            </div>

                            {/* Records List */}
                            <div className="space-y-8">
                                {project.defectRecords?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((record, idx) => (
                                    <div key={record.id} className="border border-stone-200 rounded-2xl overflow-hidden">
                                        <div className="bg-stone-100/50 px-6 py-3 border-b border-stone-200 flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <span className="bg-stone-900 text-white text-[10px] font-bold px-2 py-1 rounded">#{idx + 1}</span>
                                                <span className="font-black text-stone-800">{record.date}</span>
                                            </div>
                                            <span className="text-[10px] text-stone-400 font-mono">{new Date(record.updatedAt).toLocaleString()}</span>
                                        </div>
                                        <div className="p-6">
                                            <div className="mb-6">
                                                <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-3 border-b border-stone-100 pb-2">缺失項目列表</h4>
                                                {record.items.length > 0 ? (
                                                    <div className="space-y-3">
                                                        {record.items.map(item => (
                                                            <div key={item.id} className="flex gap-4 items-start">
                                                                <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${item.status === 'Completed' ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-rose-300'}`}>
                                                                    {item.status === 'Completed' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                                                </div>
                                                                <div className="flex-1">
                                                                    <p className="text-sm font-bold text-stone-800 leading-relaxed">{item.content}</p>
                                                                    {item.improvement && (
                                                                        <div className="mt-1.5 bg-emerald-50/50 p-2 rounded-lg border border-emerald-100/50">
                                                                            <p className="text-xs text-emerald-700"><span className="font-black">已改善：</span>{item.improvement}</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="shrink-0">
                                                                    <span className={`text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider ${item.status === 'Completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                                                        {item.status === 'Completed' ? 'COMPLETED' : 'PENDING'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : <p className="text-stone-400 text-sm italic">無項目</p>}
                                            </div>

                                            <div>
                                                <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">後續會議建議</h4>
                                                <p className="text-sm text-stone-600 leading-relaxed bg-stone-50 p-4 rounded-xl border border-stone-100">
                                                    {record.suggestions || '無建議事項'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                        </div>
                    ))}
            </div>
        </div>
    );
};

export default DefectExportModal;
