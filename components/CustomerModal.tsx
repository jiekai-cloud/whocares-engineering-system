import React, { useState, useEffect } from 'react';
import {
  X, User, Phone, Mail, MapPin, Building2, Save,
  Fingerprint, Calendar, Briefcase, Share2, MessageSquare,
  Tag, Info, Heart, Smartphone, Printer, UserCheck, Scan
} from 'lucide-react';
import { Customer } from '../types';
import BusinessCardScanner from './BusinessCardScanner';

interface CustomerModalProps {
  onClose: () => void;
  onConfirm: (data: Partial<Customer>) => void;
  initialData?: Customer | null;
}

const CustomerModal: React.FC<CustomerModalProps> = ({ onClose, onConfirm, initialData }) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'contact' | 'crm'>('basic');
  const [showScanner, setShowScanner] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '',
    contactPerson: '',
    secondaryContact: '',
    phone: '',
    landline: '',
    fax: '',
    secondaryPhone: '',
    email: '',
    address: '',
    type: '個人',
    taxId: '',
    birthday: '',
    occupation: '',
    source: '',
    lineId: '',
    preferredContactMethod: 'Phone',
    notes: '',
    tags: []
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        tags: initialData.tags || []
      });
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    onConfirm(formData);
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!formData.tags?.includes(tagInput.trim())) {
        setFormData({
          ...formData,
          tags: [...(formData.tags || []), tagInput.trim()]
        });
      }
      setTagInput('');
    }
  };

  const removeTag = (t: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter(item => item !== t)
    });
  };

  const tabs = [
    { id: 'basic', label: '基本資料', icon: Building2 },
    { id: 'contact', label: '聯繫管道', icon: Smartphone },
    { id: 'crm', label: '客戶畫像', icon: Heart },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-8 py-6 bg-slate-900 flex justify-between items-center text-white">
          <h2 className="font-bold flex items-center gap-3 text-lg">
            <User className="text-blue-400" />
            {initialData ? '修改客戶資訊' : '新增客戶資料'}
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowScanner(true)}
              className="group flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all border border-blue-100 font-black text-xs"
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

        {/* Tab Navigation */}
        <div className="bg-white border-b border-slate-100 flex overflow-x-auto no-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex - 1 py - 4 px - 2 flex flex - col items - center gap - 1.5 transition - all relative min - w - [80px] ${activeTab === tab.id ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                } `}
            >
              <tab.icon size={18} className={activeTab === tab.id ? 'text-blue-500' : ''} />
              <span className="text-[10px] font-black uppercase tracking-tighter">{tab.label}</span>
              {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 rounded-t-full" />}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
          {activeTab === 'basic' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">客戶/公司全銜 *</label>
                  <div className="relative">
                    <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-black font-bold"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">主要窗口姓名</label>
                  <div className="relative">
                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-black font-bold"
                      value={formData.contactPerson}
                      onChange={e => setFormData({ ...formData, contactPerson: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">第二聯絡人</label>
                  <div className="relative">
                    <UserCheck size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-black font-bold"
                      value={formData.secondaryContact || ''}
                      onChange={e => setFormData({ ...formData, secondaryContact: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">客戶類型</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-black font-bold appearance-none"
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                  >
                    <option value="個人">個人客戶</option>
                    <option value="企業">企業/公司</option>
                    <option value="政府單位">政府/公家</option>
                    <option value="長期夥伴">長期合作</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">統一編號</label>
                  <div className="relative">
                    <Fingerprint size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-black font-bold"
                      value={formData.taxId}
                      onChange={e => setFormData({ ...formData, taxId: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'contact' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">行動電話 (主要) *</label>
                  <div className="relative">
                    <Smartphone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-stone-900 font-bold"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">室內電話 / 分機</label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-stone-900 font-bold"
                      value={formData.landline || ''}
                      onChange={e => setFormData({ ...formData, landline: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">傳真號碼</label>
                  <div className="relative">
                    <Printer size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-stone-900 font-bold"
                      value={formData.fax || ''}
                      onChange={e => setFormData({ ...formData, fax: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">次要電話</label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-stone-900 font-bold"
                      value={formData.secondaryPhone || ''}
                      onChange={e => setFormData({ ...formData, secondaryPhone: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Line ID</label>
                  <div className="relative">
                    <MessageSquare size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-stone-900 font-bold"
                      value={formData.lineId || ''}
                      onChange={e => setFormData({ ...formData, lineId: e.target.value })}
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">電子郵件</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input
                      type="email"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-stone-900 font-bold"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">通訊地址</label>
                  <div className="relative">
                    <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-stone-900 font-bold"
                      value={formData.address}
                      onChange={e => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">優先聯繫方式</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['Phone', 'Email', 'Line'].map(method => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setFormData({ ...formData, preferredContactMethod: method as any })}
                        className={`py - 3 rounded - 2xl text - xs font - bold border transition - all ${formData.preferredContactMethod === method
                          ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100'
                          : 'bg-white border-slate-200 text-slate-500 hover:border-blue-200'
                          } `}
                      >
                        {method === 'Phone' ? '電話' : method === 'Email' ? '郵件' : 'Line'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'crm' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">客戶生日</label>
                  <div className="relative">
                    <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input
                      type="date"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-stone-900 font-bold"
                      value={formData.birthday || ''}
                      onChange={e => setFormData({ ...formData, birthday: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">推薦人/來源</label>
                  <div className="relative">
                    <Share2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input
                      placeholder="例如：Facebook, 官網, 介紹"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-stone-900 font-bold"
                      value={formData.source || ''}
                      onChange={e => setFormData({ ...formData, source: e.target.value })}
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">職業背景</label>
                  <div className="relative">
                    <Briefcase size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input
                      placeholder="客戶職務或公司類型"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-stone-900 font-bold"
                      value={formData.occupation || ''}
                      onChange={e => setFormData({ ...formData, occupation: e.target.value })}
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">分類標籤 (Enter 新增)</label>
                  <div className="relative">
                    <Tag size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-stone-900 font-bold"
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={handleAddTag}
                      placeholder="例如：優質客戶, 待聯繫, VIP"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {formData.tags?.map(t => (
                      <span key={t} className="bg-blue-50 text-blue-700 px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 border border-blue-100">
                        {t}
                        <button type="button" onClick={() => removeTag(t)} className="hover:text-rose-500 transition-colors"><X size={12} /></button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">客戶重要備註 (不對外顯示)</label>
                  <textarea
                    className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] p-5 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-stone-900 font-medium text-sm min-h-[120px] resize-none"
                    placeholder="記錄客戶偏好、特殊要求、過往互動細節..."
                    value={formData.notes || ''}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="pt-8 flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 text-slate-400 font-bold hover:text-slate-600 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-[2] bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Save size={20} />
              儲存客戶資料
            </button>
          </div>
        </form>
      </div>

      {showScanner && (
        <BusinessCardScanner
          onClose={() => setShowScanner(false)}
          onScan={(data) => {
            // Merge scanned data with existing form data, prioritize non-empty scanned fields
            setFormData(prev => ({
              ...prev,
              name: data.name || prev.name,
              contactPerson: data.contactPerson || prev.contactPerson,
              occupation: data.occupation || prev.occupation,
              phone: data.phone || prev.phone,
              landline: data.landline || prev.landline,
              fax: data.fax || prev.fax,
              email: data.email || prev.email,
              address: data.address || prev.address,
              lineId: data.lineId || prev.lineId,
              taxId: data.taxId || prev.taxId,
            }));
            // Switch to basic tab to see the results
            setActiveTab('basic');
          }}
        />
      )}
    </div>
  );
};

export default CustomerModal;
