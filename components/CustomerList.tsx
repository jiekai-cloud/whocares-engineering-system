import React, { useState, useMemo } from 'react';
import {
  Search, Plus, User, Phone, Mail, MapPin,
  MoreHorizontal, Pencil, Trash2, Building2,
  ShieldAlert, Tag, Share2, MessageSquare,
  Smartphone, Filter, Hash, ExternalLink, Printer, UserCheck
} from 'lucide-react';
import { Customer, User as UserType } from '../types';

interface CustomerListProps {
  customers: Customer[];
  user?: UserType;
  onAddClick: () => void;
  onEditClick: (customer: Customer) => void;
  onDeleteClick: (id: string) => void;
}

const CustomerList: React.FC<CustomerListProps> = ({ customers, user, onAddClick, onEditClick, onDeleteClick }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');

  // Define authorized roles for editing (Administrative privileges)
  const canEdit = user?.role === 'SuperAdmin' ||
    user?.role === 'Admin' ||
    user?.role === 'DeptAdmin' ||
    user?.role === 'AdminStaff' ||
    user?.role === 'Manager';

  const isReadOnly = !canEdit;

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm) ||
        c.tags?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.source && c.source.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesType = selectedType === 'all' || c.type === selectedType;

      return matchesSearch && matchesType;
    });
  }, [customers, searchTerm, selectedType]);

  const getTypeStyle = (type: Customer['type']) => {
    switch (type) {
      case '企業': return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      case '政府單位': return 'bg-amber-50 text-amber-700 border-amber-100';
      case '長期夥伴': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const getContactIcon = (method?: string) => {
    switch (method) {
      case 'Line': return <MessageSquare size={14} className="text-emerald-500" />;
      case 'Email': return <Mail size={14} className="text-blue-500" />;
      default: return <Phone size={14} className="text-stone-400" />;
    }
  };

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">客戶 CRM 中心</h1>
          <p className="text-slate-500 font-bold mt-1">管理所有往來業主、合作企業與政府單位聯絡窗口。</p>
        </div>
        <div className="flex items-center gap-3">
          {!isReadOnly ? (
            <button
              onClick={onAddClick}
              className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3.5 rounded-2xl flex items-center gap-2 transition-all shadow-xl shadow-slate-200 active:scale-95 font-black text-sm"
            >
              <Plus size={20} />
              <span>新增客戶檔案</span>
            </button>
          ) : (
            <div className="bg-stone-50 text-stone-400 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-stone-200">
              <ShieldAlert size={16} /> 訪客唯讀模式
            </div>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col xl:flex-row gap-4">
        <div className="flex-1 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input
              type="text"
              placeholder="搜尋姓名、電話、公司、Line ID 或 標籤..."
              className="w-full pl-12 pr-4 py-3 bg-transparent border-none focus:ring-0 outline-none text-sm text-slate-900 font-bold"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="hidden sm:flex items-center gap-1.5 border-l border-slate-100 pl-4 overflow-x-auto no-scrollbar whitespace-nowrap">
            <Filter size={14} className="text-slate-300 mr-2" />
            {['all', '個人', '企業', '政府單位', '長期夥伴'].map(type => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${selectedType === type
                  ? 'bg-slate-900 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                  }`}
              >
                {type === 'all' ? '全部類型' : type}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile Filter (Only visible on smallest screens) */}
        <div className="sm:hidden flex bg-white p-2 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto no-scrollbar gap-1.5">
          {['all', '個人', '企業', '政府單位', '長期夥伴'].map(type => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all whitespace-nowrap ${selectedType === type
                ? 'bg-slate-900 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                }`}
            >
              {type === 'all' ? '全部' : type}
            </button>
          ))}
        </div>
      </div>

      {/* Customer Cards List */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="hidden lg:grid lg:grid-cols-12 px-8 py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="col-span-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">客戶名稱 / 分類</div>
          <div className="col-span-3 text-[11px] font-black text-slate-400 uppercase tracking-widest">聯繫管道 / Line</div>
          <div className="col-span-2 text-[11px] font-black text-slate-400 uppercase tracking-widest">來源 & 生日</div>
          <div className="col-span-2 text-[11px] font-black text-slate-400 uppercase tracking-widest">建檔日期</div>
          <div className="col-span-1 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">操作</div>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredCustomers.length > 0 ? filteredCustomers.map((customer) => (
            <div key={customer.id} className="group hover:bg-slate-50/50 transition-colors">
              <div className="p-6 lg:px-8 lg:py-5 lg:grid lg:grid-cols-12 lg:items-center gap-4">
                {/* Basic Info */}
                <div className="col-span-4 flex items-center gap-4 mb-4 lg:mb-0">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 border-white shadow-sm shrink-0 ${customer.type === '企業' ? 'bg-indigo-100 text-indigo-600' :
                    customer.type === '政府單位' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                    {customer.type === '企業' ? <Building2 size={24} /> : <User size={24} />}
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 leading-tight group-hover:text-blue-600 transition-colors uppercase tracking-tight flex items-center gap-2">
                      {customer.name}
                      {customer.secondaryContact && (
                        <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 flex items-center gap-1">
                          <UserCheck size={10} /> {customer.secondaryContact}
                        </span>
                      )}
                    </h3>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border uppercase ${getTypeStyle(customer.type)}`}>
                        {customer.type}
                      </span>
                      {customer.tags?.map(tag => (
                        <span key={tag} className="text-[9px] font-black bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-md border border-blue-100/50">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="col-span-3 space-y-2 mb-4 lg:mb-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 border border-slate-100">
                      <Smartphone size={14} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 leading-none">主要窗口 / 電話</p>
                      <p className="text-xs font-black text-slate-700 mt-1">
                        {customer.contactPerson || '未填寫'} - <a href={`tel:${customer.phone}`} className="hover:text-blue-600 hover:underline transition-colors">{customer.phone}</a>
                      </p>
                      {customer.landline && (
                        <p className="text-[10px] font-bold text-slate-500 mt-0.5 flex items-center gap-1">
                          <Phone size={10} /> 室話: <a href={`tel:${customer.landline}`} className="hover:text-blue-600 hover:underline transition-colors">{customer.landline}</a>
                        </p>
                      )}
                      {customer.fax && (
                        <p className="text-[10px] font-bold text-slate-500 mt-0.5 flex items-center gap-1">
                          <Printer size={10} /> 傳真: {customer.fax}
                        </p>
                      )}
                    </div>
                  </div>
                  {(customer.lineId || customer.email) && (
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 border border-slate-100">
                        {customer.preferredContactMethod ? getContactIcon(customer.preferredContactMethod) : <ExternalLink size={14} />}
                      </div>
                      <div className="flex flex-col">
                        {customer.lineId && <p className="text-[10px] font-black text-emerald-600">Line: {customer.lineId}</p>}
                        {customer.email && <p className="text-[10px] font-black text-blue-500 truncate max-w-[150px]">{customer.email}</p>}
                      </div>
                    </div>
                  )}
                </div>

                {/* CRM Profiles */}
                <div className="col-span-2 space-y-1.5 mb-4 lg:mb-0">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Share2 size={12} className="shrink-0" />
                    <span className="text-[11px] font-bold">來源: {customer.source || '不詳'}</span>
                  </div>
                  {customer.birthday && (
                    <div className="flex items-center gap-2 text-rose-500">
                      <Heart size={12} className="shrink-0" />
                      <span className="text-[11px] font-bold">生日: {customer.birthday}</span>
                    </div>
                  )}
                </div>

                {/* Date */}
                <div className="col-span-2">
                  <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 w-fit">
                    <p className="text-[10px] font-black text-slate-400 leading-none mb-1">建檔日期</p>
                    <p className="text-[11px] font-bold text-slate-600">{customer.createdDate || '---'}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="col-span-1 flex items-center justify-end gap-1">
                  {!isReadOnly ? (
                    <>
                      <button
                        onClick={() => onEditClick(customer)}
                        className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-white hover:shadow-md hover:border-blue-100 border border-transparent rounded-xl transition-all"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => onDeleteClick(customer.id)}
                        className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-white hover:shadow-md hover:border-rose-100 border border-transparent rounded-xl transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </>
                  ) : (
                    <span className="text-[9px] font-black text-stone-200 uppercase italic tracking-widest">View Only</span>
                  )}
                </div>
              </div>
            </div>
          )) : (
            <div className="px-8 py-32 text-center text-slate-300">
              <div className="flex flex-col items-center gap-4">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
                  <Building2 size={40} className="text-slate-200" />
                </div>
                <div>
                  <p className="text-lg font-black text-slate-400 uppercase tracking-tighter">找不到符合的客戶資料</p>
                  <p className="text-sm font-bold text-slate-300 mt-1">請嘗試變更搜尋關鍵字或過擬條件</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerList;
