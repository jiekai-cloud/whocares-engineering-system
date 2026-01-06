
import React, { useState, useEffect } from 'react';
import {
    X, User, Phone, Mail, MapPin, Building2, Save,
    Target, Star, Tag, Smartphone, Scan, UserCheck
} from 'lucide-react';
import { Vendor } from '../types';
import BusinessCardScanner from './BusinessCardScanner';

interface VendorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (vendor: Vendor) => void;
    vendor?: Vendor | null;
}

const VendorModal: React.FC<VendorModalProps> = ({ isOpen, onClose, onSave, vendor }) => {
    const [showScanner, setShowScanner] = useState(false);
    const [formData, setFormData] = useState<Partial<Vendor>>({
        name: '',
        contact: '',
        type: '未分類',
        phone: '',
        email: '',
        address: '',
        rating: 5,
        notes: ''
    });

    useEffect(() => {
        if (vendor) {
            setFormData(vendor);
        } else {
            setFormData({
                name: '',
                contact: '',
                type: '未分類',
                phone: '',
                email: '',
                address: '',
                rating: 5,
                notes: ''
            });
        }
    }, [vendor, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...formData,
            id: vendor?.id || 'V-' + Date.now().toString().slice(-6),
        } as Vendor);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 lg:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                            <Building2 size={22} />
                        </div>
                        {vendor ? '編輯廠商檔案' : '新增合作廠商'}
                    </h2>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowScanner(true)}
                            className="group flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-star-600 hover:bg-blue-600 hover:text-white transition-all border border-blue-100 font-black text-xs"
                        >
                            <Scan size={16} className="group-hover:rotate-12 transition-transform" />
                            <span>AI 掃描名片</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2.5 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
                    {/* Basic Info Section */}
                    <section className="space-y-6">
                        <h3 className="text-xs font-black text-indigo-500 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Target size={14} /> 基本往來資訊
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">廠商/工班名稱 *</label>
                                <div className="relative">
                                    <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                    <input
                                        required
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-black font-bold"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">廠商類型 (如：防水、水電)</label>
                                <div className="relative">
                                    <Tag size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                    <input
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-black font-bold"
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">合作評分 (1-5)</label>
                                <div className="flex items-center gap-2 mt-2">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, rating: star })}
                                            className={`p-2 rounded-lg transition-all ${formData.rating! >= star ? 'text-amber-400 scale-110' : 'text-slate-200 hover:text-amber-200'}`}
                                        >
                                            <Star size={24} fill={formData.rating! >= star ? 'currentColor' : 'none'} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Contact Section */}
                    <section className="space-y-6">
                        <h3 className="text-xs font-black text-blue-500 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Smartphone size={14} /> 聯繫方式
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">主要聯絡窗口</label>
                                <div className="relative">
                                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                    <input
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-black font-bold"
                                        value={formData.contact}
                                        onChange={e => setFormData({ ...formData, contact: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">聯絡電話</label>
                                <div className="relative">
                                    <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                    <input
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-black font-bold"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">電子信箱</label>
                                <div className="relative">
                                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                    <input
                                        type="email"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-black font-bold"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">公司/通訊地址</label>
                                <div className="relative">
                                    <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                    <input
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-black font-bold"
                                        value={formData.address}
                                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Notes Section */}
                    <section className="space-y-4">
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">備註說明 (配合習慣、擅長工項)</label>
                        <textarea
                            rows={3}
                            className="w-full bg-slate-50 border border-slate-200 rounded-[2rem] p-6 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-black font-bold resize-none"
                            value={formData.notes || ''}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="例如：施工細膩但工期較長、需提早一週預約..."
                        />
                    </section>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-4 rounded-2xl border border-slate-200 text-slate-600 font-extrabold text-sm hover:bg-slate-50 transition-all active:scale-95"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-2xl flex items-center gap-2 transition-all shadow-xl shadow-slate-200 active:scale-95 font-black text-sm"
                        >
                            <Save size={20} />
                            <span>儲存廠商資料</span>
                        </button>
                    </div>
                </form>
            </div>

            {showScanner && (
                <BusinessCardScanner
                    onClose={() => setShowScanner(false)}
                    onScan={(data) => {
                        setFormData(prev => ({
                            ...prev,
                            name: data.name || prev.name,
                            contact: data.contactPerson || prev.contact,
                            phone: data.phone || prev.phone,
                            email: data.email || prev.email,
                            address: data.address || prev.address,
                            type: data.occupation || prev.type,
                            notes: (prev.notes ? prev.notes + '\n' : '') + `AI 辨識結果：統一編號 ${data.taxId || '無'}`
                        }));
                    }}
                />
            )}
        </div>
    );
};

export default VendorModal;
