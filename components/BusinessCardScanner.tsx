
import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Loader2, Check, AlertCircle, Scan, Sparkles, MapPin, Briefcase, User, MessageSquare, Target } from 'lucide-react';
import { scanBusinessCard } from '../services/geminiService';

interface BusinessCardScannerProps {
    onScan: (data: any) => void;
    onClose: () => void;
}

const BusinessCardScanner: React.FC<BusinessCardScannerProps> = ({ onScan, onClose }) => {
    const [image, setImage] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [scanResult, setScanResult] = useState<any | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setImage(base64String);
                setError(null);
                setScanResult(null);
            };
            reader.readAsDataURL(file);
        }
    };

    const startScan = async () => {
        if (!image) return;

        setIsScanning(true);
        setError(null);

        try {
            const base64Data = image.split(',')[1];
            const result = await scanBusinessCard(base64Data);

            if (result && (result.name || result.contactPerson)) {
                setScanResult(result);
            } else {
                setError("無法有效解析名片內容，請手動輸入或提供更清晰的照片。");
            }
        } catch (err) {
            console.error("Scan error:", err);
            setError("AI 辨識發生錯誤，請檢查網路連線或稍後再試。");
        } finally {
            setIsScanning(false);
        }
    };

    const handleSave = () => {
        if (scanResult) {
            onScan(scanResult);
            onClose();
        }
    };

    const updateField = (field: string, value: string) => {
        setScanResult((prev: any) => ({ ...prev, [field]: value }));
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 my-auto">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                            <Scan size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-900 leading-tight">AI 名片掃描儀</h2>
                            <p className="text-xs font-bold text-slate-400 mt-0.5">自動提取與手動覆核</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 sm:p-8">
                    {!image ? (
                        <div className="space-y-6">
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-slate-200 rounded-[2.5rem] p-12 flex flex-col items-center justify-center gap-4 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer group"
                            >
                                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 group-hover:text-indigo-500 group-hover:scale-110 transition-all shadow-inner">
                                    <Camera size={32} />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-black text-slate-600 uppercase tracking-widest">點擊拍攝名片</p>
                                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">支援 JPG / PNG / HEIC</p>
                                </div>
                            </div>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleFileChange} />
                        </div>
                    ) : !scanResult ? (
                        <div className="space-y-6">
                            <div className="relative rounded-3xl overflow-hidden border border-slate-100 shadow-inner bg-slate-50 aspect-[1.6/1] flex items-center justify-center">
                                <img src={image} alt="Preview" className="max-h-full max-w-full object-contain" />
                                {isScanning && (
                                    <div className="absolute inset-0 bg-white/80 backdrop-blur-[4px] flex flex-col items-center justify-center gap-4 animate-in fade-in">
                                        <div className="relative">
                                            <Loader2 size={48} className="text-indigo-600 animate-spin" />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <Sparkles size={20} className="text-indigo-600" />
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-black text-indigo-900 animate-pulse tracking-widest uppercase">AI 正在深度掃描...</p>
                                            <p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-tighter">精準提取聯絡欄位中</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {error && (
                                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 text-rose-600 animate-in shake duration-500">
                                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                                    <p className="text-xs font-bold leading-relaxed">{error}</p>
                                </div>
                            )}

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setImage(null)}
                                    disabled={isScanning}
                                    className="flex-1 px-6 py-4 rounded-2xl border border-slate-200 text-slate-400 font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all disabled:opacity-50"
                                >
                                    返回
                                </button>
                                <button
                                    onClick={startScan}
                                    disabled={isScanning}
                                    className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-indigo-100 active:scale-95 font-black text-sm uppercase tracking-widest disabled:opacity-50"
                                >
                                    {isScanning ? <Loader2 size={20} className="animate-spin" /> : <Scan size={20} />}
                                    <span>{isScanning ? '辨識中...' : '開始提取'}</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 max-h-[60vh] overflow-y-auto no-scrollbar pr-1">
                            <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex items-center gap-3">
                                <div className="p-2 bg-white rounded-xl text-indigo-600 shadow-sm">
                                    <Check size={20} />
                                </div>
                                <p className="text-xs font-black text-indigo-900 uppercase tracking-widest">請覆核提取結果並修改</p>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {[
                                    { key: 'name', label: '公司 / 名稱', icon: Briefcase },
                                    { key: 'contactPerson', label: '聯絡人', icon: User },
                                    { key: 'occupation', label: '職稱', icon: Target },
                                    { key: 'phone', label: '電話', icon: Camera },
                                    { key: 'email', label: 'Email', icon: MessageSquare },
                                    { key: 'address', label: '地址', icon: MapPin }
                                ].map((field) => (
                                    <div key={field.key} className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                                            {field.label}
                                        </label>
                                        <div className="relative group">
                                            <input
                                                type="text"
                                                value={scanResult[field.key] || ''}
                                                onChange={(e) => updateField(field.key, e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-4 pt-4 pb-2">
                                <button
                                    onClick={() => setScanResult(null)}
                                    className="flex-1 px-6 py-4 rounded-2xl border border-slate-200 text-slate-400 font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="flex-[2] bg-slate-900 hover:bg-black text-white px-6 py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-slate-200 active:scale-95 font-black text-sm uppercase tracking-widest"
                                >
                                    確認儲存進入系統
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BusinessCardScanner;
