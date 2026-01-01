
import React, { useState } from 'react';
import {
  Search, UserPlus, Phone, Mail, MoreHorizontal, Pencil,
  Trash2, Award, Briefcase, Activity, ExternalLink, Sparkles, Hash
} from 'lucide-react';
import { TeamMember } from '../types';

interface TeamListProps {
  members: TeamMember[];
  onAddClick: () => void;
  onEditClick: (member: TeamMember) => void;
  onDeleteClick: (id: string) => void;
}

const TeamList: React.FC<TeamListProps> = ({ members, onAddClick, onEditClick, onDeleteClick }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredMembers = members.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.specialty.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusBadge = (status: TeamMember['status']) => {
    switch (status) {
      case 'Available': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'Busy': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'OnLeave': return 'bg-rose-50 text-rose-600 border-rose-100';
      default: return 'bg-slate-50 text-slate-500 border-slate-100';
    }
  };

  const getStatusText = (status: TeamMember['status']) => {
    switch (status) {
      case 'Available': return '待命中';
      case 'Busy': return '執行任務中';
      case 'OnLeave': return '請假中';
      default: return '未知';
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">工程團隊成員</h1>
          <p className="text-slate-500 text-sm font-medium">管理內部員工與外部協力廠商的人力分佈與登入權限。</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button className="flex-1 sm:flex-none px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-50 transition-all">
            <Sparkles size={16} className="text-orange-500" />
            AI 負載分析
          </button>
          <button
            onClick={onAddClick}
            className="flex-1 sm:flex-none bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-100 active:scale-95 font-bold text-xs"
          >
            <UserPlus size={18} />
            新增成員
          </button>
        </div>
      </div>

      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="搜尋姓名、員工編號、職位、專長..."
            className="w-full pl-12 pr-4 py-3 bg-transparent border-none focus:ring-0 outline-none text-sm text-slate-900 font-bold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="hidden lg:grid lg:grid-cols-12 px-8 py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="col-span-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">成員資訊 / 角色</div>
          <div className="col-span-3 text-[11px] font-black text-slate-400 uppercase tracking-widest">聯繫方式</div>
          <div className="col-span-2 text-[11px] font-black text-slate-400 uppercase tracking-widest">目前負載</div>
          <div className="col-span-2 text-[11px] font-black text-slate-400 uppercase tracking-widest">狀態</div>
          <div className="col-span-1 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">操作</div>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredMembers.map((member) => (
            <div key={member.id} className="group hover:bg-slate-50/50 transition-colors">
              <div className="p-6 lg:px-8 lg:py-5 lg:grid lg:grid-cols-12 lg:items-center gap-4">
                {/* 基本資訊 */}
                <div className="col-span-4 flex items-center gap-4 mb-4 lg:mb-0">
                  <div className="relative shrink-0">
                    <img src={member.avatar} alt={member.name} className="w-12 h-12 rounded-2xl object-cover border-2 border-slate-50 shadow-sm" />
                    <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${member.status === 'Available' ? 'bg-emerald-500' : member.status === 'Busy' ? 'bg-amber-500' : 'bg-rose-500'
                      }`}></div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-slate-900">{member.name}</h3>
                      <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                        {member.employeeId}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{member.role}</p>
                  </div>
                </div>

                {/* 聯繫方式 */}
                <div className="col-span-3 space-y-1 mb-4 lg:mb-0">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Phone size={12} className="text-slate-400" />
                    <span className="font-bold font-mono">{member.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Mail size={12} className="shrink-0" />
                    <span className="truncate max-w-[180px]">{member.email}</span>
                  </div>
                </div>

                {/* 負載進度 */}
                <div className="col-span-2 mb-4 lg:mb-0">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">進行中案場</span>
                    <span className="text-[10px] font-black text-slate-900">{member.activeProjectsCount} 案</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-500 ${member.activeProjectsCount > 5 ? 'bg-rose-500' : member.activeProjectsCount > 3 ? 'bg-amber-500' : 'bg-orange-600'
                      }`} style={{ width: `${Math.min(member.activeProjectsCount * 20, 100)}%` }}></div>
                  </div>
                </div>

                {/* 狀態標籤 */}
                <div className="col-span-2 mb-4 lg:mb-0">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black border ${getStatusBadge(member.status)}`}>
                    {getStatusText(member.status)}
                  </span>
                </div>

                {/* 操作按鈕 */}
                <div className="col-span-1 flex justify-end items-center gap-1">
                  <button
                    onClick={() => onEditClick(member)}
                    className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                    title="編輯成員"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => onDeleteClick(member.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                    title="刪除成員"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filteredMembers.length === 0 && (
            <div className="p-20 text-center">
              <div className="bg-slate-50 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <Search className="text-slate-300" size={32} />
              </div>
              <p className="text-slate-400 font-bold text-sm">找不到符合條件的成員</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamList;
