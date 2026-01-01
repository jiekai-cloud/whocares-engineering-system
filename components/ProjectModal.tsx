
import React, { useState, useEffect } from 'react';
import { X, Briefcase, Calendar, DollarSign, User as UserIcon, Tag, UserPlus, Save, Activity, Globe, ChevronDown, MapPin } from 'lucide-react';
import { Project, ProjectCategory, ProjectStatus, ProjectSource, ProjectLocation, TeamMember } from '../types';

interface ProjectModalProps {
  onClose: () => void;
  onConfirm: (data: Partial<Project>) => void;
  initialData?: Project | null;
  teamMembers: TeamMember[];
}

const ProjectModal: React.FC<ProjectModalProps> = ({ onClose, onConfirm, initialData, teamMembers }) => {
  const categories: ProjectCategory[] = ['室內裝修', '建築營造', '水電機電', '景觀工程', '設計規劃', '其他'];
  const sources: ProjectSource[] = ['BNI', '台塑集團', '士林電機', '信義居家', '企業', '新建工程', '網路客', '住宅', '台灣美光晶圓', 'AI會勘系統', 'JW'];
  const statuses = Object.values(ProjectStatus);
  const isEditMode = !!initialData;

  const [formData, setFormData] = useState({
    name: '',
    category: '室內裝修' as ProjectCategory,
    source: 'BNI' as ProjectSource,
    status: ProjectStatus.NEGOTIATING,
    client: '',
    referrer: '',
    manager: '',
    budget: '',
    progress: '0',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    address: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        category: initialData.category,
        source: initialData.source,
        status: initialData.status,
        client: initialData.client,
        referrer: initialData.referrer,
        manager: initialData.manager,
        budget: initialData.budget.toString(),
        progress: initialData.progress.toString(),
        startDate: initialData.startDate,
        endDate: initialData.endDate,
        address: initialData.location?.address || '',
      });
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    // 模擬地址轉經緯度 (正式版會串接 Geocoding API)
    const mockLocation: ProjectLocation = {
      address: formData.address,
      lat: 25.0330,
      lng: 121.5654
    };

    onConfirm({
      ...formData,
      budget: Number(formData.budget),
      progress: Number(formData.progress),
      location: mockLocation,
      createdDate: initialData?.createdDate || new Date().toISOString().split('T')[0]
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className={`px-6 py-4 flex justify-between items-center ${isEditMode ? 'bg-amber-600' : 'bg-slate-900'}`}>
          <h2 className="text-white font-bold flex items-center gap-2 text-lg">
            {isEditMode ? <Save size={20} /> : <Briefcase size={20} className="text-blue-400" />}
            {isEditMode ? `編輯案件: ${initialData.id}` : '建立新工程專案'}
          </h2>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5 max-h-[80vh] overflow-y-auto no-scrollbar">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">案件名稱 *</label>
            <input required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none font-bold" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">案場詳細地址</label>
            <div className="relative">
              <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 outline-none font-bold" placeholder="例如：台北市信義區信義路五段7號" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">案件負責人 Manager</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <UserIcon size={16} />
                </div>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 outline-none font-bold appearance-none" value={formData.manager} onChange={e => setFormData({ ...formData, manager: e.target.value })}>
                  <option value="">請選擇負責人</option>
                  {teamMembers.map(m => (
                    <option key={m.id} value={m.name}>{m.name} ({m.role})</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">業主名稱 Client</label>
              <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none font-bold placeholder:text-slate-300" placeholder="" value={formData.client} onChange={e => setFormData({ ...formData, client: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">案件來源 Source</label>
              <div className="relative">
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none font-bold appearance-none" value={formData.source} onChange={e => setFormData({ ...formData, source: e.target.value as any })}>
                  {sources.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">合約預算 Budget (TWD)</label>
              <div className="relative">
                <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 outline-none font-bold placeholder:text-stone-300" placeholder="尚未報價請留空" value={formData.budget} onChange={e => setFormData({ ...formData, budget: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">施工進度 Progress (%)</label>
              <div className="relative">
                <Activity size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="number" min="0" max="100" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 outline-none font-bold" value={formData.progress} onChange={e => setFormData({ ...formData, progress: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">預計開工日 Start Date</label>
              <div className="relative">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 outline-none font-bold" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">預計完工日 End Date</label>
              <div className="relative">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 outline-none font-bold" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">案件類別 Category</label>
            <div className="grid grid-cols-3 gap-2">
              {categories.map(c => (
                <button type="button" key={c} onClick={() => setFormData({ ...formData, category: c })} className={`py-2 rounded-xl text-xs font-bold transition-all border ${formData.category === c ? 'bg-slate-800 text-white border-slate-800' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-6 flex gap-4">
            <button type="button" onClick={onClose} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl">取消</button>
            <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all active:scale-95">確認儲存</button>
          </div>
        </form >
      </div >
    </div >
  );
};

export default ProjectModal;
