
import React, { useState, useEffect, useRef } from 'react';
import {
  X, User, Shield, Phone, Mail, Award, Save, Camera,
  Loader2, Key, Hash, Calendar, MapPin, Landmark,
  Heart, CreditCard, Sparkles, AlertCircle
} from 'lucide-react';
import { TeamMember } from '../types';

interface TeamModalProps {
  onClose: () => void;
  onConfirm: (data: Partial<TeamMember>) => void;
  initialData?: TeamMember | null;
}

const TeamModal: React.FC<TeamModalProps> = ({ onClose, onConfirm, initialData }) => {
  const roles: TeamMember['role'][] = [
    '總經理', '副總經理', '總經理特助', '經理', '副經理',
    '專案經理', '工地主任', '工地助理', '工務主管', '現場工程師',
    '行政助理', '助理', '設計師', '工頭', '外部協力'
  ];

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'hr' | 'pro' | 'payroll'>('basic');
  const [specialtyInput, setSpecialtyInput] = useState('');
  const [certInput, setCertInput] = useState('');

  const [formData, setFormData] = useState<Partial<TeamMember>>({
    employeeId: '',
    password: '',
    name: '',
    role: '現場工程師',
    phone: '',
    email: '',
    specialty: [],
    certifications: [],
    status: 'Available',
    avatar: `https://picsum.photos/seed/${Math.random()}/200/200`,
    activeProjectsCount: 0,
    departmentId: 'DEPT-1',
    systemRole: 'Staff'
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) return alert('檔案過大，請選擇小於 2MB 的圖片');
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatar: reader.result as string }));
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.employeeId) return;
    onConfirm(formData);
  };

  const tabs = [
    { id: 'basic', label: '基本帳戶', icon: User },
    { id: 'hr', label: '詳細人事', icon: Calendar },
    { id: 'pro', label: '專業資歷', icon: Award },
    { id: 'payroll', label: '薪資會計', icon: Landmark },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-8 py-6 bg-stone-900 flex justify-between items-center text-white">
          <h2 className="font-bold flex items-center gap-3 text-lg">
            <Shield className="text-orange-500" />
            {initialData ? '修改成員權限與資訊' : '加入新團隊成員'}
          </h2>
          <button onClick={onClose} className="opacity-40 hover:opacity-100 transition-opacity">
            <X size={24} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white border-b border-slate-100 flex overflow-x-auto no-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-4 px-2 flex flex-col items-center gap-1.5 transition-all relative min-w-[80px] ${activeTab === tab.id ? 'text-black' : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              <tab.icon size={18} className={activeTab === tab.id ? 'text-orange-500' : ''} />
              <span className="text-[10px] font-black uppercase tracking-tighter">{tab.label}</span>
              {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-1 bg-orange-500 rounded-t-full" />}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">

          {activeTab === 'basic' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div onClick={handleAvatarClick} className="relative group cursor-pointer">
                  <img src={formData.avatar} className="w-28 h-28 rounded-3xl object-cover border-4 border-slate-100 shadow-md" alt="Avatar" />
                  <div className="absolute inset-0 bg-black/40 rounded-3xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {isUploading ? <Loader2 size={24} className="text-white animate-spin" /> : <Camera size={24} className="text-white" />}
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                </div>
                <div className="flex-1 w-full space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">員工編號 (登入帳號)</label>
                    <div className="relative">
                      <Hash size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input required className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-sm font-black" value={formData.employeeId} onChange={e => setFormData({ ...formData, employeeId: e.target.value.toUpperCase() })} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">登入密碼</label>
                    <div className="relative">
                      <Key size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input type="password" placeholder={initialData ? "留空則不修改" : "請設定初始密碼"} className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-sm font-black" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">真實姓名 *</label>
                  <input required className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">職稱角色</label>
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value as any })}>
                    {roles.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">系統權限</label>
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold" value={formData.systemRole} onChange={e => setFormData({ ...formData, systemRole: e.target.value as any })}>
                    <option value="Staff">一般成員</option>
                    <option value="DeptAdmin">部門主管</option>
                    <option value="SuperAdmin">最高權限</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'hr' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">生日</label>
                  <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold" value={formData.birthday || ''} onChange={e => setFormData({ ...formData, birthday: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">入職日</label>
                  <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold" value={formData.joinDate || ''} onChange={e => setFormData({ ...formData, joinDate: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">聯絡電話</label>
                <input className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">通訊地址</label>
                <input className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold" value={formData.address || ''} onChange={e => setFormData({ ...formData, address: e.target.value })} />
              </div>
              <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100 space-y-4">
                <h4 className="flex items-center gap-2 text-[10px] font-black text-rose-600 uppercase tracking-widest"><Heart size={14} /> 緊急聯絡人</h4>
                <div className="grid grid-cols-2 gap-4">
                  <input placeholder="姓名" className="bg-white border border-rose-100 rounded-xl px-4 py-2 text-xs font-bold" value={formData.emergencyContact?.name || ''} onChange={e => setFormData({ ...formData, emergencyContact: { ...(formData.emergencyContact || { name: '', relationship: '', phone: '' }), name: e.target.value } })} />
                  <input placeholder="關係" className="bg-white border border-rose-100 rounded-xl px-4 py-2 text-xs font-bold" value={formData.emergencyContact?.relationship || ''} onChange={e => setFormData({ ...formData, emergencyContact: { ...(formData.emergencyContact || { name: '', relationship: '', phone: '' }), relationship: e.target.value } })} />
                  <input placeholder="電話" className="col-span-2 bg-white border border-rose-100 rounded-xl px-4 py-2 text-xs font-bold" value={formData.emergencyContact?.phone || ''} onChange={e => setFormData({ ...formData, emergencyContact: { ...(formData.emergencyContact || { name: '', relationship: '', phone: '' }), phone: e.target.value } })} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pro' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">專業專長 (Enter 新增)</label>
                <input
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold"
                  value={specialtyInput}
                  onChange={e => setSpecialtyInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && specialtyInput.trim()) {
                      e.preventDefault();
                      setFormData({ ...formData, specialty: [...(formData.specialty || []), specialtyInput.trim()] });
                      setSpecialtyInput('');
                    }
                  }}
                />
                <div className="flex flex-wrap gap-2 mt-3 cursor-default">
                  {formData.specialty?.map(s => (
                    <span key={s} className="bg-orange-50 text-orange-700 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border border-orange-100">
                      {s} <X size={12} className="cursor-pointer hover:text-rose-500" onClick={() => setFormData({ ...formData, specialty: formData.specialty?.filter(x => x !== s) })} />
                    </span>
                  ))}
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">持有證照 (Enter 新增)</label>
                <input
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold"
                  value={certInput}
                  onChange={e => setCertInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && certInput.trim()) {
                      e.preventDefault();
                      setFormData({ ...formData, certifications: [...(formData.certifications || []), certInput.trim()] });
                      setCertInput('');
                    }
                  }}
                />
                <div className="flex flex-wrap gap-2 mt-3 cursor-default">
                  {formData.certifications?.map(c => (
                    <span key={c} className="bg-blue-50 text-blue-700 px-2 py-1 rounded-lg text-xs font-black flex items-center gap-1 border border-blue-100">
                      <Shield size={10} /> {c} <X size={12} className="cursor-pointer hover:text-rose-500" onClick={() => setFormData({ ...formData, certifications: formData.certifications?.filter(x => x !== c) })} />
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payroll' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
              <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 space-y-6 shadow-sm">
                <h4 className="flex items-center gap-2 text-[10px] font-black text-amber-700 uppercase tracking-widest"><CreditCard size={14} /> 薪資帳戶 Payroll</h4>
                <div className="space-y-4">
                  <input placeholder="銀行名稱 (含代碼)" className="w-full bg-white border border-amber-100 rounded-xl px-4 py-3 text-sm font-bold" value={formData.bankInfo?.bankName || ''} onChange={e => setFormData({ ...formData, bankInfo: { ...(formData.bankInfo || { bankName: '', accountName: '', accountNumber: '' }), bankName: e.target.value } })} />
                  <div className="grid grid-cols-2 gap-4">
                    <input placeholder="戶名" className="bg-white border border-amber-100 rounded-xl px-4 py-3 text-sm font-bold" value={formData.bankInfo?.accountName || ''} onChange={e => setFormData({ ...formData, bankInfo: { ...(formData.bankInfo || { bankName: '', accountName: '', accountNumber: '' }), accountName: e.target.value } })} />
                    <input placeholder="帳號" className="bg-white border border-amber-100 rounded-xl px-4 py-3 text-sm font-bold font-mono" value={formData.bankInfo?.accountNumber || ''} onChange={e => setFormData({ ...formData, bankInfo: { ...(formData.bankInfo || { bankName: '', accountName: '', accountNumber: '' }), accountNumber: e.target.value } })} />
                  </div>
                </div>
                <div className="bg-amber-100/30 p-4 rounded-2xl border border-dashed border-amber-200">
                  <p className="text-[10px] text-amber-800 leading-relaxed font-black"> <AlertCircle size={10} className="inline mr-1" /> 此欄位資訊受到進階加密保護，僅限行政主管查核。</p>
                </div>
              </div>
            </div>
          )}

          <div className="pt-8 flex gap-4">
            <button type="button" onClick={onClose} className="flex-1 py-4 text-slate-400 font-bold hover:text-slate-600">取消</button>
            <button type="submit" disabled={isUploading} className="flex-[2] bg-stone-900 text-white font-bold py-4 rounded-2xl shadow-xl hover:bg-stone-800 active:scale-95 transition-all flex items-center justify-center gap-2">
              <Save size={20} /> 儲存變更
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default TeamModal;
