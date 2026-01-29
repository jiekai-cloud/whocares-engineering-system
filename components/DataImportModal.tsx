
import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, X, FileSpreadsheet, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { AttendanceRecord, ApprovalRequest } from '../types';

interface DataImportModalProps {
    onClose: () => void;
    onImportAttendance: (records: AttendanceRecord[]) => void;
    onImportLeaves: (requests: ApprovalRequest[]) => void;
}

type ImportType = 'attendance' | 'leave';

interface PreviewData {
    valid: boolean;
    data: any[];
    errors: string[];
}

const DataImportModal: React.FC<DataImportModalProps> = ({ onClose, onImportAttendance, onImportLeaves }) => {
    const [activeTab, setActiveTab] = useState<ImportType>('attendance');
    const [isProcessing, setIsProcessing] = useState(false);
    const [preview, setPreview] = useState<PreviewData | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        setPreview(null);

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (jsonData.length < 2) {
                throw new Error("檔案內容為空或格式錯誤");
            }

            const headers = (jsonData[0] as string[]).map(h => h.trim());
            const rows = jsonData.slice(1);

            if (activeTab === 'attendance') {
                processAttendanceData(headers, rows);
            } else {
                processLeaveData(headers, rows);
            }

        } catch (error) {
            console.error(error);
            setPreview({
                valid: false,
                data: [],
                errors: [`解析失敗: ${(error as Error).message}`]
            });
        } finally {
            setIsProcessing(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const processAttendanceData = (headers: string[], rows: any[]) => {
        const requiredHeaders = ['員工編號', '員工姓名', '日期', '時間', '類型'];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

        if (missingHeaders.length > 0) {
            setPreview({
                valid: false,
                data: [],
                errors: [`缺少必要欄位: ${missingHeaders.join(', ')}`]
            });
            return;
        }

        const errors: string[] = [];
        const records: AttendanceRecord[] = [];

        rows.forEach((row: any, index) => {
            if (row.length === 0) return;

            // Map row to object based on headers
            const rowData: any = {};
            headers.forEach((h, i) => rowData[h] = row[i]);

            try {
                // Basic Validation
                if (!rowData['員工編號'] && !rowData['員工姓名']) throw new Error('缺少員工資訊');
                if (!rowData['日期'] || !rowData['時間']) throw new Error('缺少時間資訊');

                // Determine timestamp
                // Handle Excel serial date or string date
                let dateStr = rowData['日期'];
                if (typeof dateStr === 'number') {
                    // Excel serial date conversion could be complex, assuming string for now or standard YYYY-MM-DD
                    dateStr = new Date(Math.round((dateStr - 25569) * 86400 * 1000)).toISOString().split('T')[0];
                }

                // Format check
                const timestamp = `${dateStr}T${rowData['時間']}`;
                if (isNaN(new Date(timestamp).getTime())) throw new Error(`時間格式錯誤: ${timestamp}`);

                const type = rowData['類型']?.includes('上班') ? 'work-start' :
                    rowData['類型']?.includes('下班') ? 'work-end' : null;

                if (!type) throw new Error(`無效的打卡類型: ${rowData['類型']}`);

                records.push({
                    id: crypto.randomUUID(),
                    employeeId: rowData['員工編號'] ? String(rowData['員工編號']) : '',
                    name: rowData['員工姓名'] || '未知',
                    type,
                    timestamp,
                    location: { lat: 0, lng: 0, address: '匯入資料' },
                    isCorrection: false // Imported records are treated as legitimate records
                });

            } catch (e) {
                errors.push(`第 ${index + 2} 行: ${(e as Error).message}`);
            }
        });

        setPreview({
            valid: errors.length === 0 && records.length > 0,
            data: records,
            errors
        });
    };

    const processLeaveData = (headers: string[], rows: any[]) => {
        const requiredHeaders = ['員工編號', '員工姓名', '假別', '開始日期', '結束日期', '事由'];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

        if (missingHeaders.length > 0) {
            setPreview({
                valid: false,
                data: [],
                errors: [`缺少必要欄位: ${missingHeaders.join(', ')}`]
            });
            return;
        }

        const errors: string[] = [];
        const requests: ApprovalRequest[] = [];

        rows.forEach((row: any, index) => {
            if (row.length === 0) return;
            const rowData: any = {};
            headers.forEach((h, i) => rowData[h] = row[i]);

            try {
                if (!rowData['員工編號'] && !rowData['員工姓名']) throw new Error('缺少員工資訊');
                if (!rowData['開始日期'] || !rowData['結束日期']) throw new Error('缺少日期範圍');
                if (!rowData['假別']) throw new Error('缺少假別');

                requests.push({
                    id: crypto.randomUUID(),
                    templateId: 'TPL-LEAVE-IMPORT',
                    templateName: '請假申請單 (匯入)',
                    requesterId: rowData['員工編號'] ? String(rowData['員工編號']) : 'IMP-USER',
                    requesterName: rowData['員工姓名'] || '未知',
                    title: `[匯入] ${rowData['假別']} - ${rowData['員工姓名']}`,
                    formData: {
                        date: rowData['開始日期'], // Primary date for payroll check
                        startDate: rowData['開始日期'],
                        endDate: rowData['結束日期'],
                        reason: rowData['事由'] || '批量匯入',
                        leaveType: rowData['假別']
                    },
                    status: 'approved', // Auto-approved
                    currentStep: 99,
                    workflowLogs: [{
                        step: 0,
                        role: 'System',
                        approverName: 'System Import',
                        status: 'approved',
                        timestamp: new Date().toISOString(),
                        comment: '批量匯入自動核准'
                    }],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    completedAt: new Date().toISOString()
                });

            } catch (e) {
                errors.push(`第 ${index + 2} 行: ${(e as Error).message}`);
            }
        });

        setPreview({
            valid: errors.length === 0 && requests.length > 0,
            data: requests,
            errors
        });
    };

    const handleConfirm = () => {
        if (!preview || !preview.valid) return;

        if (activeTab === 'attendance') {
            onImportAttendance(preview.data);
            alert(`成功匯入 ${preview.data.length} 筆打卡紀錄`);
        } else {
            onImportLeaves(preview.data);
            alert(`成功匯入 ${preview.data.length} 筆請假紀錄`);
        }
        onClose();
    };

    const downloadTemplate = () => {
        const wb = XLSX.utils.book_new();
        let headers: string[] = [];
        let example: any[] = []; // Array of arrays

        if (activeTab === 'attendance') {
            headers = ['員工編號', '員工姓名', '日期', '時間', '類型'];
            example = [
                ['EMP001', '王小明', '2026-01-01', '09:00', '上班'],
                ['EMP001', '王小明', '2026-01-01', '18:00', '下班']
            ];
        } else {
            headers = ['員工編號', '員工姓名', '假別', '開始日期', '結束日期', '事由'];
            example = [
                ['EMP001', '王小明', '病假', '2026-01-02', '2026-01-02', '感冒']
            ];
        }

        const ws = XLSX.utils.aoa_to_sheet([headers, ...example]);
        XLSX.utils.book_append_sheet(wb, ws, "匯入範本");
        XLSX.writeFile(wb, `${activeTab === 'attendance' ? '打卡記錄' : '請假記錄'}_匯入範本.xlsx`);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50">
                    <div>
                        <h2 className="text-xl font-black text-stone-800">資料批量匯入</h2>
                        <p className="text-xs text-stone-500 font-bold mt-1">請選擇匯入類型並上傳 Excel 檔案</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-stone-200 rounded-full transition-colors">
                        <X size={24} className="text-stone-400" />
                    </button>
                </div>

                <div className="flex border-b border-stone-100">
                    <button
                        onClick={() => { setActiveTab('attendance'); setPreview(null); }}
                        className={`flex-1 py-4 text-sm font-black transition-colors ${activeTab === 'attendance' ? 'text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50/50' : 'text-stone-400 hover:text-stone-600'}`}
                    >
                        打卡紀錄匯入
                    </button>
                    <button
                        onClick={() => { setActiveTab('leave'); setPreview(null); }}
                        className={`flex-1 py-4 text-sm font-black transition-colors ${activeTab === 'leave' ? 'text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50/50' : 'text-stone-400 hover:text-stone-600'}`}
                    >
                        請假紀錄匯入
                    </button>
                </div>

                <div className="p-8 overflow-y-auto flex-1">
                    {!preview ? (
                        <div className="flex flex-col items-center justify-center h-full space-y-6">
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full h-48 border-2 border-dashed border-stone-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-all group"
                            >
                                <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    {isProcessing ? <Loader2 className="animate-spin text-emerald-500" size={32} /> : <Upload className="text-stone-400 group-hover:text-emerald-500" size={32} />}
                                </div>
                                <p className="font-bold text-stone-600">點擊或拖放 Excel 檔案至此</p>
                                <p className="text-xs text-stone-400 mt-2">支援 .xlsx, .xls 格式</p>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx, .xls"
                                onChange={handleFileChange}
                                className="hidden"
                            />

                            <button
                                onClick={downloadTemplate}
                                className="text-emerald-600 text-sm font-bold flex items-center gap-2 hover:underline"
                            >
                                <FileSpreadsheet size={16} /> 下載匯入範本
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className={`p-4 rounded-xl border ${preview.valid ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
                                <div className="flex items-start gap-3">
                                    {preview.valid ? <CheckCircle className="shrink-0" /> : <AlertTriangle className="shrink-0" />}
                                    <div>
                                        <h3 className="font-bold mb-1">{preview.valid ? '解析成功' : '解析失敗或含有錯誤'}</h3>
                                        {preview.valid ? (
                                            <p className="text-sm">成功讀取 {preview.data.length} 筆資料，確認後請點擊匯入按鈕。</p>
                                        ) : (
                                            <ul className="text-sm list-disc pl-4 space-y-1">
                                                {preview.errors.slice(0, 5).map((err, i) => (
                                                    <li key={i}>{err}</li>
                                                ))}
                                                {preview.errors.length > 5 && <li>...以及其他 {preview.errors.length - 5} 個錯誤</li>}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {preview.valid && (
                                <div className="max-h-60 overflow-y-auto border border-stone-200 rounded-xl">
                                    <table className="w-full text-xs">
                                        <thead className="bg-stone-50 sticky top-0">
                                            <tr>
                                                <th className="px-4 py-2 text-left font-bold text-stone-500">摘要預覽 (前 5 筆)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-stone-100">
                                            {preview.data.slice(0, 5).map((row: any, i) => (
                                                <tr key={i}>
                                                    <td className="px-4 py-2 font-mono text-stone-600">
                                                        {activeTab === 'attendance'
                                                            ? `${row.name} | ${row.timestamp} | ${row.type === 'work-start' ? '上班' : '下班'}`
                                                            : `${row.requesterName} | ${row.formData.date} | ${row.formData.leaveType}`
                                                        }
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setPreview(null)}
                                    className="flex-1 py-3 rounded-xl font-bold text-stone-500 hover:bg-stone-100 transition-colors"
                                >
                                    重新上傳
                                </button>
                                {preview.valid && (
                                    <button
                                        onClick={handleConfirm}
                                        className="flex-1 py-3 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all active:scale-95"
                                    >
                                        確認匯入紀錄
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DataImportModal;
