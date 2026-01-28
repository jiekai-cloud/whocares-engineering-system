import React, { useState } from 'react';
import { X, Calendar, Clock, AlertCircle } from 'lucide-react';

interface SupplementModalProps {
    onClose: () => void;
    onSubmit: (data: { date: string; time: string; type: 'work-start' | 'work-end'; reason: string }) => void;
}

const SupplementModal: React.FC<SupplementModalProps> = ({ onClose, onSubmit }) => {
    const today = new Date().toISOString().split('T')[0];
    const [date, setDate] = useState(today);
    const [time, setTime] = useState('09:00');
    const [type, setType] = useState<'work-start' | 'work-end'>('work-start');
    const [reason, setReason] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({ date, time, type, reason });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="bg-stone-900 px-6 py-4 flex justify-between items-center text-white">
                    <h3 className="font-bold text-lg">補打卡申請</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-stone-400 uppercase tracking-widest">日期</label>
                            <div className="relative">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                                <input
                                    type="date"
                                    required
                                    max={today}
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900 focus:ring-2 focus:ring-orange-200 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-stone-400 uppercase tracking-widest">時間</label>
                                <div className="relative">
                                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                                    <input
                                        type="time"
                                        required
                                        value={time}
                                        onChange={(e) => setTime(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900 focus:ring-2 focus:ring-orange-200 outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-stone-400 uppercase tracking-widest">類型</label>
                                <select
                                    value={type}
                                    onChange={(e) => setType(e.target.value as any)}
                                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900 focus:ring-2 focus:ring-orange-200 outline-none transition-all appearance-none"
                                >
                                    <option value="work-start">上班</option>
                                    <option value="work-end">下班</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black text-stone-400 uppercase tracking-widest flex items-center gap-2">
                                補登原因 <span className="text-rose-500">*</span>
                            </label>
                            <textarea
                                required
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="請說明補打卡原因 (例如: 忘記打卡、設備故障、外出洽公...)"
                                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900 focus:ring-2 focus:ring-orange-200 outline-none transition-all min-h-[100px] resize-none"
                            />
                        </div>
                    </div>

                    <div className="bg-amber-50 p-4 rounded-xl flex gap-3 items-start border border-amber-100">
                        <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                        <p className="text-xs text-amber-700 font-bold leading-relaxed">
                            補打卡記錄將會被標記為「手動補登」，請再次確認日期與時間。
                        </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 bg-white border border-stone-200 text-stone-600 rounded-xl font-black shadow-sm hover:bg-stone-50 transition-all"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-3 bg-stone-900 text-white rounded-xl font-black shadow-xl hover:bg-stone-800 active:scale-95 transition-all"
                        >
                            提交補登
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SupplementModal;
