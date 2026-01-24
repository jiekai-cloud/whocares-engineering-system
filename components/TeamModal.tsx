
import React, { useState, useEffect, useRef } from 'react';
import {
  X, User, Shield, Phone, Mail, Award, Save, Camera,
  Loader2, Key, Hash, Calendar, MapPin, Landmark,
  Heart, CreditCard, Sparkles, AlertCircle
} from 'lucide-react';
import { TeamMember, User as UserType } from '../types';
import { MOCK_DEPARTMENTS } from '../constants';
import { ALL_MODULES, DEFAULT_ENABLED_MODULES } from '../moduleConfig';

interface TeamModalProps {
  onClose: () => void;
  onConfirm: (data: Partial<TeamMember>) => void;
  initialData?: TeamMember | null;
  currentUser: UserType;
}

const TeamModal: React.FC<TeamModalProps> = ({ onClose, onConfirm, initialData, currentUser }) => {
  const roles: TeamMember['role'][] = [
    '總經理', '副總經理', '總經理特助', '經理', '副經理',
    '專案經理', '工地主任', '工地助理', '工務主管', '現場工程師',
    '行政助理', '助理', '設計師', '工頭', '外部協力', '財務部經理'
  ];

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'hr' | 'pro' | 'payroll'>('basic');
  const [specialtyInput, setSpecialtyInput] = useState('');
  const [certInput, setCertInput] = useState('');
  const [nicknameInput, setNicknameInput] = useState('');

  const [formData, setFormData] = useState<Partial<TeamMember>>({
    employeeId: '',
    password: '',
    name: '',
    role: '現場工程師',
    phone: '',
    personalPhone: '',
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

  const isSuperAdmin = currentUser.role === 'SuperAdmin';
  const isDeptAdmin = currentUser.role === 'DeptAdmin';
  const isFinance = currentUser.roleName === '財務部經理';

  // 真實權限判定
  const canViewAllTabs = isSuperAdmin || isDeptAdmin || isFinance;

  const tabs = [
    { id: 'basic', label: '基本資料', icon: User, visible: true },
    { id: 'hr', label: '詳細人事', icon: Calendar, visible: isSuperAdmin || isDeptAdmin || isFinance },
    { id: 'pro', label: '專業資歷', icon: Award, visible: isSuperAdmin || isDeptAdmin || isFinance },
    { id: 'payroll', label: '薪資會計', icon: Landmark, visible: isSuperAdmin || isDeptAdmin || isFinance },
    { id: 'perm', label: '權限設定', icon: Key, visible: isSuperAdmin },
  ].filter(t => t.visible);

  // 如果當前 tab 不可見，跳回 basic
  useEffect(() => {
    if (!tabs.find(t => t.id === activeTab)) {
      setActiveTab('basic');
    }
  }, [activeTab, tabs]);

  const isEditable = isSuperAdmin;
  const canEditPayroll = isSuperAdmin || isFinance;
  const showSubmit = isSuperAdmin || (activeTab === 'payroll' && isFinance);

  const handleCall = (number: string) => {
    window.location.href = `tel:${number}`;
  };


  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-8 py-6 bg-stone-900 flex justify-between items-center text-white">
          <h2 className="font-bold flex items-center gap-3 text-lg">
            <Shield className="text-orange-500" />
            {initialData ? '修改成員權限與資訊' : '加入新團隊成員 (Admin)'}
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
                <div onClick={handleAvatarClick} className={`relative group ${isEditable ? 'cursor-pointer' : 'cursor-default'}`}>
                  <img src={formData.avatar} className="w-28 h-28 rounded-3xl object-cover border-4 border-slate-100 shadow-md" alt="Avatar" />
                  {isUploading ? <Loader2 size={24} className="text-white animate-spin" /> : <Camera size={24} className="text-white" />}
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                </div>
                <div className="flex-1 w-full space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">員工編號 (登入帳號)</label>
                    <div className="relative">
                      <Hash size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input required disabled={!isEditable} className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-sm font-black" value={formData.employeeId} onChange={e => setFormData({ ...formData, employeeId: e.target.value.toUpperCase() })} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">登入密碼</label>
                    <div className="relative">
                      <Key size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input type="password" disabled={!isEditable} placeholder={initialData ? "留空則不修改" : "請設定初始密碼"} className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-sm font-black" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">真實姓名 *</label>
                    <input required disabled={!isEditable} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">外號 / 暱稱 (Enter 新增多個)</label>
                    <input
                      disabled={!isEditable}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold"
                      value={nicknameInput}
                      onChange={e => setNicknameInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && nicknameInput.trim()) {
                          e.preventDefault();
                          const currentNicknames = formData.nicknames || [];
                          if (!currentNicknames.includes(nicknameInput.trim())) {
                            setFormData({ ...formData, nicknames: [...currentNicknames, nicknameInput.trim()] });
                          }
                          setNicknameInput('');
                        }
                      }}
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {formData.nicknames?.map(n => (
                        <span key={n} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg text-[10px] font-black border border-slate-200 flex items-center gap-1">
                          {n}
                          {isEditable && <X size={10} className="cursor-pointer hover:text-rose-500" onClick={() => setFormData({ ...formData, nicknames: formData.nicknames?.filter(x => x !== n) })} />}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">職稱角色</label>
                  <select disabled={!isEditable} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value as any })}>
                    {roles.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>


                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex justify-between">
                    <span>所屬部門 (最多 3 個)</span>
                    <span className="text-orange-500">{formData.departmentIds?.length || 0} / 3</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {MOCK_DEPARTMENTS.map(dept => {
                      const isSelected = (formData.departmentIds || []).includes(dept.id);
                      return (
                        <button
                          key={dept.id}
                          type="button"
                          disabled={!isSuperAdmin || (!isSelected && (formData.departmentIds?.length || 0) >= 3)}
                          onClick={() => {
                            const currentIds = formData.departmentIds || [];
                            let nextIds = [];
                            if (isSelected) {
                              nextIds = currentIds.filter(id => id !== dept.id);
                            } else if (currentIds.length < 3) {
                              nextIds = [...currentIds, dept.id];
                            } else {
                              return;
                            }
                            setFormData({
                              ...formData,
                              departmentIds: nextIds,
                              departmentId: nextIds[0] || 'DEPT-1' // Keep primary synced
                            });
                          }}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-black border transition-all ${isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                            : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                            } ${!isSuperAdmin ? 'cursor-default opacity-80' : ''}`}
                        >
                          {dept.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'hr' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">生日</label>
                  <input type="date" disabled={!isEditable} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold" value={formData.birthday || ''} onChange={e => setFormData({ ...formData, birthday: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">入職日</label>
                  <input type="date" disabled={!isEditable} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold" value={formData.joinDate || ''} onChange={e => setFormData({ ...formData, joinDate: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">工作電話</label>
                  <div className="flex gap-2">
                    <input disabled={!isEditable} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                    {formData.phone && (
                      <button type="button" onClick={() => handleCall(formData.phone!)} className="bg-emerald-50 text-emerald-600 px-3 rounded-2xl hover:bg-emerald-100 transition-colors border border-emerald-200">
                        <Phone size={16} />
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">個人電話</label>
                  <div className="flex gap-2">
                    <input disabled={!isEditable} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold" value={formData.personalPhone || ''} onChange={e => setFormData({ ...formData, personalPhone: e.target.value })} />
                    {formData.personalPhone && (
                      <button type="button" onClick={() => handleCall(formData.personalPhone!)} className="bg-emerald-50 text-emerald-600 px-3 rounded-2xl hover:bg-emerald-100 transition-colors border border-emerald-200">
                        <Phone size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">電子信箱</label>
                <input type="email" disabled={!isEditable} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">通訊地址</label>
                <input disabled={!isEditable} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold" value={formData.address || ''} onChange={e => setFormData({ ...formData, address: e.target.value })} />
              </div>
              <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100 space-y-4">
                <h4 className="flex items-center gap-2 text-[10px] font-black text-rose-600 uppercase tracking-widest"><Heart size={14} /> 緊急聯絡人</h4>
                <div className="grid grid-cols-2 gap-4">
                  <input placeholder="姓名" disabled={!isEditable} className="bg-white border border-rose-100 rounded-xl px-4 py-2 text-xs font-bold" value={formData.emergencyContact?.name || ''} onChange={e => setFormData({ ...formData, emergencyContact: { ...(formData.emergencyContact || { name: '', relationship: '', phone: '' }), name: e.target.value } })} />
                  <input placeholder="關係" disabled={!isEditable} className="bg-white border border-rose-100 rounded-xl px-4 py-2 text-xs font-bold" value={formData.emergencyContact?.relationship || ''} onChange={e => setFormData({ ...formData, emergencyContact: { ...(formData.emergencyContact || { name: '', relationship: '', phone: '' }), relationship: e.target.value } })} />
                  <div className="col-span-2 flex gap-2">
                    <input placeholder="電話" disabled={!isEditable} className="flex-1 bg-white border border-rose-100 rounded-xl px-4 py-2 text-xs font-bold" value={formData.emergencyContact?.phone || ''} onChange={e => setFormData({ ...formData, emergencyContact: { ...(formData.emergencyContact || { name: '', relationship: '', phone: '' }), phone: e.target.value } })} />
                    {formData.emergencyContact?.phone && (
                      <button type="button" onClick={() => handleCall(formData.emergencyContact?.phone!)} className="bg-rose-100 text-rose-600 px-3 rounded-xl hover:bg-rose-200 transition-colors">
                        <Phone size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pro' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">專業專長 (Enter 新增)</label>
                <input
                  disabled={!isEditable}
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
                      {s} {isEditable && <X size={12} className="cursor-pointer hover:text-rose-500" onClick={() => setFormData({ ...formData, specialty: formData.specialty?.filter(x => x !== s) })} />}
                    </span>
                  ))}
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">持有證照 (Enter 新增)</label>
                <input
                  disabled={!isEditable}
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
                      <Shield size={10} /> {c} {isEditable && <X size={12} className="cursor-pointer hover:text-rose-500" onClick={() => setFormData({ ...formData, certifications: formData.certifications?.filter(x => x !== c) })} />}
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
                  <input placeholder="銀行名稱 (含代碼)" disabled={!canEditPayroll} className="w-full bg-white border border-amber-100 rounded-xl px-4 py-3 text-sm font-bold" value={formData.bankInfo?.bankName || ''} onChange={e => setFormData({ ...formData, bankInfo: { ...(formData.bankInfo || { bankName: '', accountName: '', accountNumber: '' }), bankName: e.target.value } })} />
                  <div className="grid grid-cols-2 gap-4">
                    <input placeholder="戶名" disabled={!canEditPayroll} className="bg-white border border-amber-100 rounded-xl px-4 py-3 text-sm font-bold" value={formData.bankInfo?.accountName || ''} onChange={e => setFormData({ ...formData, bankInfo: { ...(formData.bankInfo || { bankName: '', accountName: '', accountNumber: '' }), accountName: e.target.value } })} />
                    <input placeholder="帳號" disabled={!canEditPayroll} className="bg-white border border-amber-100 rounded-xl px-4 py-3 text-sm font-bold font-mono" value={formData.bankInfo?.accountNumber || ''} onChange={e => setFormData({ ...formData, bankInfo: { ...(formData.bankInfo || { bankName: '', accountName: '', accountNumber: '' }), accountNumber: e.target.value } })} />
                  </div>
                </div>
                <div className="pt-4 border-t border-amber-100">
                  <label className="block text-[10px] font-black text-amber-700 uppercase tracking-widest mb-2">酬勞設定 Labor Cost</label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="日薪 (例如: 3000)"
                      disabled={!canEditPayroll}
                      className="w-full bg-white border border-amber-100 rounded-xl pl-4 pr-12 py-3 text-sm font-bold"
                      value={formData.dailyRate || ''}
                      onChange={e => setFormData({ ...formData, dailyRate: Number(e.target.value) })}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-amber-400">TWD / 日</span>
                  </div>
                </div>
                <div className="pt-4 border-t border-amber-100">
                  <label className="block text-[10px] font-black text-amber-700 uppercase tracking-widest mb-2">🕷️ 蜘蛛人津貼 Spider-Man Allowance</label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="繩索吊掛作業津貼 (例如: 500)"
                      disabled={!canEditPayroll}
                      className="w-full bg-white border border-amber-100 rounded-xl pl-4 pr-12 py-3 text-sm font-bold"
                      value={formData.spiderManAllowance || ''}
                      onChange={e => setFormData({ ...formData, spiderManAllowance: Number(e.target.value) })}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-amber-400">TWD / 日</span>
                  </div>
                  <p className="text-[9px] text-amber-600 mt-2 font-medium">
                    當工人執行繩索吊掛作業時，系統會自動加計此津貼到基本日薪上
                  </p>
                </div>
                <div className="bg-amber-100/30 p-4 rounded-2xl border border-dashed border-amber-200">
                  <p className="text-[10px] text-amber-800 leading-relaxed font-black"> <AlertCircle size={10} className="inline mr-1" /> 此欄位資訊受到進階加密保護，僅限行政主管查核。</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'perm' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
              <div className="bg-stone-50 p-6 rounded-3xl border border-stone-200 space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">系統權限級別</label>
                  <select disabled={!isSuperAdmin} className="w-full bg-white border border-stone-200 rounded-2xl px-4 py-3 text-sm font-bold" value={formData.systemRole} onChange={e => setFormData({ ...formData, systemRole: e.target.value as any })}>
                    <option value="Staff">一般成員 (僅限查看所属專案)</option>
                    <option value="AdminStaff">行政人員 (可管理客戶/廠商資料)</option>
                    <option value="DeptAdmin">部門主管 (可查看該部門所有資料)</option>
                    <option value="SuperAdmin">最高權限 (可存取系統所有功能)</option>
                  </select>
                  <div className="mt-4 p-4 bg-orange-50 rounded-2xl border border-orange-100 text-[10px] text-orange-800 leading-relaxed">
                    <p className="font-black mb-1">權限說明：</p>
                    <ul className="list-disc list-inside space-y-1 opacity-80">
                      <li><b>一般成員：</b> 僅能查看列表及指派給自己的任務。</li>
                      <li><b>行政人員：</b> 擁有編輯客戶與廠商清單的權限。</li>
                      <li><b>部門主管：</b> 可查看並管理該部門下的所有成員與專案。</li>
                      <li><b>最高權限：</b> 擁有系統完整控制權，包含刪除資料與指派權限。</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-stone-50 p-6 rounded-3xl border border-stone-200 mt-6 space-y-4">
                <h4 className="font-black text-xs text-stone-500 uppercase tracking-widest">模組存取權限</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ALL_MODULES.filter(m => !m.isCore).map(module => {
                    const isChecked = (formData.accessibleModules || DEFAULT_ENABLED_MODULES).includes(module.id);
                    const Icon = module.icon;

                    return (
                      <label key={module.id} className={`flex items-start gap-3 p-3 bg-white rounded-xl border transition-all ${isChecked ? 'border-stone-300 shadow-sm' : 'border-stone-100 opacity-60'} ${isSuperAdmin ? 'cursor-pointer hover:border-blue-300' : 'cursor-default'}`}>
                        <div className="pt-1">
                          <input
                            type="checkbox"
                            disabled={!isSuperAdmin}
                            checked={isChecked}
                            onChange={(e) => {
                              const currentModules = formData.accessibleModules || DEFAULT_ENABLED_MODULES;
                              let newModules;
                              if (e.target.checked) {
                                newModules = Array.from(new Set([...currentModules, module.id]));
                              } else {
                                newModules = currentModules.filter(id => id !== module.id);
                              }
                              setFormData({ ...formData, accessibleModules: newModules });
                            }}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${isChecked ? 'bg-blue-50 text-blue-600' : 'bg-stone-100 text-stone-400'}`}>
                            <Icon size={16} />
                          </div>
                          <div className="flex flex-col">
                            <span className={`text-xs font-bold ${isChecked ? 'text-stone-800' : 'text-stone-500'}`}>{module.name}</span>
                            <span className="text-[9px] text-stone-400 leading-tight">{module.description}</span>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {
            showSubmit && (
              <div className="pt-8 flex gap-4">
                <button type="button" onClick={onClose} className="flex-1 py-4 text-slate-400 font-bold hover:text-slate-600">取消</button>
                <button type="submit" disabled={isUploading} className="flex-[2] bg-stone-900 text-white font-bold py-4 rounded-2xl shadow-xl hover:bg-stone-800 active:scale-95 transition-all flex items-center justify-center gap-2">
                  <Save size={20} /> 儲存變更
                </button>
              </div>
            )
          }
          {
            !showSubmit && (
              <div className="pt-8">
                <button type="button" onClick={onClose} className="w-full bg-slate-100 text-slate-600 font-bold py-4 rounded-2xl hover:bg-slate-200 transition-all">關閉視窗</button>
              </div>
            )
          }

        </form >
      </div >
    </div >
  );
};

export default TeamModal;
