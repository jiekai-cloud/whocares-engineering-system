import React, { useState, useMemo } from 'react';
import {
    FileCheck, Plus, Settings, History, ClipboardList,
    CheckCircle2, XCircle, Clock, ChevronRight, User,
    FileText, Send, Save, Trash2, Edit2, AlertCircle,
    ArrowRight, ListTodo, Filter, Search
} from 'lucide-react';
import { ApprovalRequest, ApprovalTemplate, TeamMember, User as UserType } from '../types';

interface ApprovalSystemProps {
    requests: ApprovalRequest[];
    templates: ApprovalTemplate[];
    teamMembers: TeamMember[];
    currentUser: UserType;
    onSaveRequest: (request: ApprovalRequest) => void;
    onSaveTemplate: (template: ApprovalTemplate) => void;
    onDeleteTemplate: (id: string) => void;
    onAction: (requestId: string, action: 'approved' | 'rejected', comment?: string) => void;
}

const ApprovalSystem: React.FC<ApprovalSystemProps> = ({
    requests = [],
    templates = [],
    teamMembers,
    currentUser,
    onSaveRequest,
    onSaveTemplate,
    onDeleteTemplate,
    onAction
}) => {
    const [activeTab, setActiveTab] = useState<'my-tasks' | 'my-requests' | 'templates'>('my-tasks');
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<ApprovalTemplate | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState<ApprovalTemplate | null>(null);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [requestTitle, setRequestTitle] = useState('');
    const [actionComment, setActionComment] = useState('');
    const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);

    // Filter Tasks (Approvals waiting for current user role or ID)
    const myTasks = useMemo(() => {
        return requests.filter(req => {
            if (req.status !== 'pending') return false;
            const currentWorkflowStep = templates.find(t => t.id === req.templateId)?.workflow[req.currentStep];
            // Check if current user's role or ID matches the workflow step
            return currentUser.role === currentWorkflowStep || currentUser.id === currentWorkflowStep;
        });
    }, [requests, currentUser, templates]);

    const myRequests = useMemo(() => {
        return requests.filter(req => req.requesterId === currentUser.id);
    }, [requests, currentUser]);

    const handleCreateRequest = (template: ApprovalTemplate) => {
        setSelectedTemplate(template);
        setFormData({});
        setRequestTitle('');
        setIsRequestModalOpen(true);
    };

    const handleSaveRequest = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTemplate) return;

        const newRequest: ApprovalRequest = {
            id: 'REQ-' + Date.now().toString().slice(-6),
            templateId: selectedTemplate.id,
            templateName: selectedTemplate.name,
            requesterId: currentUser.id,
            requesterName: currentUser.name,
            title: requestTitle,
            formData: formData,
            status: 'pending',
            currentStep: 0,
            workflowLogs: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        onSaveRequest(newRequest);
        setIsRequestModalOpen(false);
    };

    return (
        <div className="p-4 lg:p-8 max-w-7xl mx-auto animate-in fade-in space-y-8">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2rem] flex items-center justify-center text-white shadow-xl shadow-indigo-100 ring-4 ring-white">
                        <FileCheck size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">智能簽核系統</h1>
                        <p className="text-slate-500 font-bold text-sm flex items-center gap-2">
                            <ListTodo size={14} /> 全企業內部審核與表單自動化
                        </p>
                    </div>
                </div>

                <div className="flex bg-slate-100 p-1.5 rounded-2xl shadow-inner border border-slate-200">
                    <button
                        onClick={() => setActiveTab('my-tasks')}
                        className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeTab === 'my-tasks' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-600'}`}
                    >
                        待我審核
                        {myTasks.length > 0 && <span className="bg-rose-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] animate-pulse">{myTasks.length}</span>}
                    </button>
                    <button
                        onClick={() => setActiveTab('my-requests')}
                        className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeTab === 'my-requests' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-600'}`}
                    >
                        <History size={14} /> 我的申請
                    </button>
                    {['SuperAdmin', 'Admin', 'DeptAdmin', 'Manager', 'AdminStaff'].includes(currentUser.role) && (
                        <button
                            onClick={() => setActiveTab('templates')}
                            className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeTab === 'templates' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-600'}`}
                        >
                            <Settings size={14} /> 流程設定
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

                {/* Side Action Panel */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">快速發起申請</h3>
                        <div className="grid grid-cols-1 gap-2">
                            {templates.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => handleCreateRequest(t)}
                                    className="group w-full p-4 bg-slate-50 hover:bg-indigo-600 rounded-2xl border border-slate-100 hover:border-indigo-500 transition-all text-left flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                                            <FileText size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-slate-800 group-hover:text-white transition-colors">{t.name}</p>
                                            <p className="text-[10px] text-slate-400 group-hover:text-indigo-100 font-bold transition-colors">{t.workflow.length} 關審核</p>
                                        </div>
                                    </div>
                                    <Plus size={16} className="text-slate-300 group-hover:text-white" />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-100 relative overflow-hidden group">
                        <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
                        <h4 className="text-xl font-black mb-2 relative z-10">需要新流程？</h4>
                        <p className="text-indigo-100 text-xs font-medium mb-6 relative z-10">您可以自定義表單欄位與串聯審核對象，實現自動化管理。</p>
                        <button
                            onClick={() => { setEditingTemplate(null); setIsTemplateModalOpen(true); }}
                            className="w-full bg-white text-indigo-600 py-3 rounded-xl text-xs font-black shadow-lg shadow-indigo-800/20 active:scale-95 transition-all relative z-10"
                        >
                            建立簽核種類
                        </button>
                    </div>
                </div>

                {/* Main List Display */}
                <div className="lg:col-span-3 space-y-6">
                    {activeTab === 'my-tasks' && (
                        <div className="space-y-4 animate-in slide-in-from-bottom-4">
                            <div className="flex items-center justify-between px-2">
                                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">待我審核的項目 <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full">{myTasks.length}</span></h2>
                                <div className="flex items-center gap-2 text-slate-400">
                                    <Filter size={16} />
                                    <span className="text-xs font-bold">按時間排序</span>
                                </div>
                            </div>

                            {myTasks.length === 0 ? (
                                <div className="bg-white border-2 border-dashed border-slate-100 rounded-[2.5rem] py-24 flex flex-col items-center justify-center text-slate-300 gap-4">
                                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                                        <CheckCircle2 size={40} className="text-slate-200" />
                                    </div>
                                    <p className="font-bold">目前無須您處理的案件</p>
                                </div>
                            ) : (
                                myTasks.map(req => (
                                    <div key={req.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all group">
                                        <div className="flex flex-col md:flex-row justify-between gap-4">
                                            <div className="flex gap-5">
                                                <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 shrink-0">
                                                    <Clock size={28} />
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded uppercase tracking-widest">{req.templateName}</span>
                                                        <span className="text-[10px] font-bold text-slate-400">{req.id}</span>
                                                    </div>
                                                    <h3 className="text-lg font-black text-slate-900">{req.title || '無標題申請'}</h3>
                                                    <p className="text-xs text-slate-500 font-bold flex items-center gap-1">
                                                        申請人：{req.requesterName} <ChevronRight size={12} /> 第 {req.currentStep + 1} 關審核中
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => setSelectedRequest(req)}
                                                    className="px-5 py-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-black text-slate-600 transition-all border border-slate-200"
                                                >
                                                    查看詳情
                                                </button>
                                                <button
                                                    onClick={() => { setSelectedRequest(req); setActionComment(''); }}
                                                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-100 transition-all active:scale-95"
                                                >
                                                    立即簽核
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'my-requests' && (
                        <div className="space-y-4 animate-in slide-in-from-bottom-4">
                            <h2 className="text-lg font-black text-slate-900 px-2">我的申請歷史</h2>
                            <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">申請編號 / 類型</th>
                                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">主旨</th>
                                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">狀態</th>
                                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">申請時間</th>
                                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">動作</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {myRequests.map(req => (
                                            <tr key={req.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-8 py-5">
                                                    <div>
                                                        <p className="font-black text-slate-900 text-sm">{req.id}</p>
                                                        <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">{req.templateName}</p>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <p className="font-bold text-slate-700">{req.title || '未命名項目'}</p>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="flex justify-center">
                                                        {req.status === 'pending' && <span className="bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-[10px] font-black ring-1 ring-amber-100">待審核</span>}
                                                        {req.status === 'approved' && <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black ring-1 ring-emerald-100">已核准</span>}
                                                        {req.status === 'rejected' && <span className="bg-rose-50 text-rose-600 px-3 py-1 rounded-full text-[10px] font-black ring-1 ring-rose-100">已駁回</span>}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-xs text-slate-500 font-medium">
                                                    {new Date(req.createdAt).toLocaleDateString()} {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <button onClick={() => setSelectedRequest(req)} className="text-slate-400 hover:text-indigo-600 p-2"><ChevronRight size={18} /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'templates' && (
                        <div className="space-y-4 animate-in slide-in-from-bottom-4">
                            <div className="flex justify-between items-center px-2">
                                <h2 className="text-lg font-black text-slate-900">簽核模板設定</h2>
                                <button onClick={() => { setEditingTemplate(null); setIsTemplateModalOpen(true); }} className="flex items-center gap-2 text-indigo-600 text-sm font-black hover:underline"><Plus size={16} /> 新增種類</button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {templates.map(t => (
                                    <div key={t.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-start justify-between group">
                                        <div className="space-y-3">
                                            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-indigo-500 transition-colors">
                                                <Settings size={24} />
                                            </div>
                                            <div>
                                                <h3 className="font-black text-slate-900">{t.name}</h3>
                                                <p className="text-xs text-slate-500 font-bold">{t.description || '無描述'}</p>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {t.workflow.map((role, i) => (
                                                    <React.Fragment key={i}>
                                                        <div className="px-2 py-1 bg-slate-100 rounded text-[9px] font-black text-slate-500 border border-slate-200">{role}</div>
                                                        {i < t.workflow.length - 1 && <ArrowRight size={10} className="text-slate-300 mx-0.5" />}
                                                    </React.Fragment>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => { setEditingTemplate(t); setIsTemplateModalOpen(true); }}
                                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => onDeleteTemplate(t.id)}
                                                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Request Modal */}
            {isRequestModalOpen && selectedTemplate && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                                    <Send size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-900">發起簽核申請</h2>
                                    <p className="text-xs text-indigo-500 font-black uppercase tracking-widest">{selectedTemplate.name}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsRequestModalOpen(false)} className="p-2.5 hover:bg-slate-200 rounded-full transition-colors text-slate-400"><XCircle size={24} /></button>
                        </div>

                        <form onSubmit={handleSaveRequest} className="flex-1 overflow-y-auto p-8 space-y-6">
                            <div>
                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">申請主旨 *</label>
                                <input
                                    required
                                    placeholder="例如：1月份加班申請"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                                    value={requestTitle}
                                    onChange={e => setRequestTitle(e.target.value)}
                                />
                            </div>

                            {selectedTemplate.formFields.map(field => (
                                <div key={field.key}>
                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{field.label} {field.required ? '*' : ''}</label>
                                    {field.type === 'text' && (
                                        <textarea
                                            required={field.required}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold min-h-[100px]"
                                            value={formData[field.key] || ''}
                                            onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                                        />
                                    )}
                                    {field.type === 'number' && (
                                        <input
                                            type="number"
                                            required={field.required}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                                            value={formData[field.key] || ''}
                                            onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                                        />
                                    )}
                                    {field.type === 'date' && (
                                        <input
                                            type="date"
                                            required={field.required}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                                            value={formData[field.key] || ''}
                                            onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                                        />
                                    )}
                                    {field.type === 'time' && (
                                        <input
                                            type="time"
                                            required={field.required}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                                            value={formData[field.key] || ''}
                                            onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                                        />
                                    )}
                                    {field.type === 'select' && (
                                        <select
                                            required={field.required}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                                            value={formData[field.key] || ''}
                                            onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                                        >
                                            <option value="">請選擇...</option>
                                            {field.options?.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    )}
                                    {field.type === 'teamMember' && (
                                        <select
                                            required={field.required}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                                            value={formData[field.key] || ''}
                                            onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                                        >
                                            <option value="">請選擇團隊成員...</option>
                                            {teamMembers.map(member => (
                                                <option key={member.id} value={member.name}>
                                                    {member.name} - {member.role}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            ))}

                            <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100 flex gap-4">
                                <AlertCircle className="text-amber-500 shrink-0" />
                                <div className="space-y-1">
                                    <p className="text-[11px] font-black text-amber-700 uppercase tracking-widest">流程預覽</p>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-[10px] font-bold text-slate-500">{currentUser.name} (發起)</span>
                                        <ChevronRight size={10} className="text-amber-300" />
                                        {selectedTemplate.workflow.map((role, i) => (
                                            <React.Fragment key={i}>
                                                <span className="text-[10px] font-bold text-amber-700">{role}</span>
                                                {i < selectedTemplate.workflow.length - 1 && <ChevronRight size={10} className="text-amber-300" />}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setIsRequestModalOpen(false)} className="flex-1 py-4 rounded-2xl border border-slate-200 text-slate-600 font-black text-sm hover:bg-slate-50 transition-all">取消</button>
                                <button type="submit" className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-xl hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2">
                                    <Send size={18} /> 提交申請
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Request Detail / Active Signing Modal */}
            {selectedRequest && !isRequestModalOpen && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
                        {/* Detail Info (Left/Top) */}
                        <div className="flex-1 p-8 md:p-12 overflow-y-auto space-y-8 no-scrollbar">
                            <div className="space-y-2">
                                <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">{selectedRequest.templateName}</span>
                                <h2 className="text-3xl font-black text-slate-900">{selectedRequest.title || '無標題申請'}</h2>
                                <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
                                    <span>申請人：{selectedRequest.requesterName}</span>
                                    <span>•</span>
                                    <span>時間：{new Date(selectedRequest.createdAt).toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                {Object.entries(selectedRequest.formData).map(([key, value]) => {
                                    const template = templates.find(t => t.id === selectedRequest.templateId);
                                    const fieldDef = template?.formFields.find(f => f.key === key);
                                    // Skip hidden fields if any (like targetEmployeeId which might not be in formFields)
                                    // But showing them is fine for now, or we can filter.
                                    // Let's show label if found, otherwise show key (for custom/meta data)
                                    const label = fieldDef?.label || key;

                                    // Simple filter: Don't show targetEmployeeId/Name if they are duplicates of requester or internal logic
                                    if (key === 'targetEmployeeId' || key === 'targetEmployeeName') {
                                        // If it's different from requester, maybe show it?
                                        if (selectedRequest.requesterId === selectedRequest.formData.targetEmployeeId) return null;
                                        return (
                                            <div key={key} className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{key === 'targetEmployeeName' ? '補卡對象' : key}</p>
                                                <p className="text-slate-800 font-bold whitespace-pre-wrap">{value}</p>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div key={key} className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                                            <p className="text-slate-800 font-bold whitespace-pre-wrap">{value}</p>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">審核歷程</h4>
                                <div className="relative border-l-2 border-slate-100 ml-3 space-y-8 py-2">
                                    {selectedRequest.workflowLogs.map((log, i) => (
                                        <div key={i} className="relative pl-8">
                                            <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm ${log.status === 'approved' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-slate-900">{log.status === 'approved' ? '已核准' : '已駁回'}</span>
                                                    <span className="text-xs text-slate-400">•</span>
                                                    <span className="text-xs font-bold text-slate-600">{log.approverName} ({log.role})</span>
                                                </div>
                                                {log.comment && <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 italic">「{log.comment}」</p>}
                                                <p className="text-[10px] text-slate-400 font-mono">{new Date(log.timestamp).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {selectedRequest.status === 'pending' && (
                                        <div className="relative pl-8">
                                            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm bg-amber-500 animate-pulse" />
                                            <p className="text-xs font-black text-amber-600 uppercase tracking-widest">目前關卡：第 {selectedRequest.currentStep + 1} 關審核中</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Control Panel (Right/Bottom) */}
                        <div className="w-full md:w-80 bg-slate-50 p-8 md:p-12 border-l border-slate-200 flex flex-col justify-between overflow-y-auto">
                            <div className="space-y-8">
                                <button onClick={() => setSelectedRequest(null)} className="w-full py-3 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all">關閉視窗</button>

                                {selectedRequest.status === 'pending' && (
                                    <div className="space-y-6 animate-in slide-in-from-right-4">
                                        <div className="space-y-4">
                                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">簽核意見 (選擇性)</label>
                                            <textarea
                                                className="w-full bg-white border border-slate-200 rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold min-h-[120px] text-sm"
                                                placeholder="請輸入審核說明內容..."
                                                value={actionComment}
                                                onChange={e => setActionComment(e.target.value)}
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 gap-3">
                                            <button
                                                onClick={() => { onAction(selectedRequest.id, 'approved', actionComment); setSelectedRequest(null); }}
                                                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                                            >
                                                <CheckCircle2 size={20} /> 核准並送出
                                            </button>
                                            <button
                                                onClick={() => { onAction(selectedRequest.id, 'rejected', actionComment); setSelectedRequest(null); }}
                                                className="w-full py-4 bg-white border-2 border-rose-500 text-rose-500 rounded-2xl font-black hover:bg-rose-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                                            >
                                                <XCircle size={20} /> 駁回申請
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="mt-8 text-center text-slate-400">
                                <p className="text-[10px] font-bold">BuildTrack Workflow v1.0</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Template Manager Modal */}
            {isTemplateModalOpen && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <h2 className="text-xl font-black text-slate-900">{editingTemplate ? '編輯簽核種類' : '建立新簽核種類'}</h2>
                            <button onClick={() => setIsTemplateModalOpen(false)} className="p-2.5 hover:bg-slate-200 rounded-full transition-colors text-slate-400"><XCircle size={24} /></button>
                        </div>

                        <div className="p-8 overflow-y-auto space-y-8 no-scrollbar">
                            <div className="grid grid-cols-1 gap-6">
                                <div>
                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">流程種類名稱</label>
                                    <input
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="例如：採購申請、加班單..."
                                        value={editingTemplate?.name || ''}
                                        onChange={e => setEditingTemplate(prev => ({ ...(prev || { id: '', name: '', workflow: [], formFields: [], updatedAt: '' }), name: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">描述說明</label>
                                    <input
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="說明此簽核流程的用途..."
                                        value={editingTemplate?.description || ''}
                                        onChange={e => setEditingTemplate(prev => ({ ...(prev || { id: '', name: '', workflow: [], formFields: [], updatedAt: '' }), description: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">簽核關卡順序 (將按順序推送)</label>
                                <div className="space-y-2">
                                    {(editingTemplate?.workflow || []).map((step, i) => (
                                        <div key={i} className="flex items-center gap-3 animate-in slide-in-from-left-2">
                                            <div className="w-8 h-8 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500 font-extrabold text-xs">{i + 1}</div>
                                            <select
                                                className="flex-1 bg-white border border-slate-200 p-3 rounded-xl font-bold"
                                                value={step}
                                                onChange={e => {
                                                    const newWf = [...(editingTemplate?.workflow || [])];
                                                    newWf[i] = e.target.value;
                                                    setEditingTemplate(p => p ? ({ ...p, workflow: newWf }) : null);
                                                }}
                                            >
                                                <option value="">請選擇審核角色</option>
                                                <option value="Admin">管理者 (Admin)</option>
                                                <option value="Manager">部主管 (Manager)</option>
                                                <option value="DeptAdmin">部門管理員 (DeptAdmin)</option>
                                                <option value="AdminStaff">行政人員 (AdminStaff)</option>
                                                <option value="Staff">一般員工 (Staff)</option>
                                                <option value="SuperAdmin">超級管理員 (SuperAdmin)</option>
                                            </select>
                                            <button
                                                onClick={() => {
                                                    const newWf = (editingTemplate?.workflow || []).filter((_, idx) => idx !== i);
                                                    setEditingTemplate(p => p ? ({ ...p, workflow: newWf }) : null);
                                                }}
                                                className="p-2 text-rose-400 hover:text-rose-600"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => {
                                            const newWf = [...(editingTemplate?.workflow || []), ''];
                                            setEditingTemplate(p => p ? ({ ...p, workflow: newWf }) : ({ id: '', name: '', workflow: [''], formFields: [], updatedAt: '' }));
                                        }}
                                        className="w-full py-3 border-2 border-dashed border-slate-100 rounded-2xl text-slate-400 font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2 text-sm"
                                    >
                                        <Plus size={16} /> 增加審核關卡
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">表單欄位設定</label>
                                <div className="space-y-3">
                                    {(editingTemplate?.formFields || []).map((field, i) => (
                                        <div key={i} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-wrap gap-4 items-end">
                                            <div className="flex-1 min-w-[150px]">
                                                <input
                                                    className="w-full bg-white border border-slate-200 p-2 text-xs font-bold rounded-lg"
                                                    placeholder="欄位標題 (e.g. 加班原因)"
                                                    value={field.label}
                                                    onChange={e => {
                                                        const newFields = [...(editingTemplate?.formFields || [])];
                                                        newFields[i].label = e.target.value;
                                                        newFields[i].key = e.target.value;
                                                        setEditingTemplate(p => p ? ({ ...p, formFields: newFields }) : null);
                                                    }}
                                                />
                                            </div>
                                            <select
                                                className="bg-white border border-slate-200 p-2 text-xs font-bold rounded-lg"
                                                value={field.type}
                                                onChange={e => {
                                                    const newFields = [...(editingTemplate?.formFields || [])];
                                                    newFields[i].type = e.target.value as any;
                                                    setEditingTemplate(p => p ? ({ ...p, formFields: newFields }) : null);
                                                }}
                                            >
                                                <option value="text">文字輸入</option>
                                                <option value="number">數字</option>
                                                <option value="date">日期</option>
                                                <option value="time">時間</option>
                                                <option value="select">下拉選單</option>
                                                <option value="teamMember">團隊成員</option>
                                            </select>
                                            {field.type === 'select' && (
                                                <input
                                                    className="w-full bg-white border border-slate-200 p-2 text-xs font-bold rounded-lg mt-2"
                                                    placeholder="選項 (用逗號分隔 e.g. 上班,下班)"
                                                    value={field.options?.join(',') || ''}
                                                    onChange={e => {
                                                        const newFields = [...(editingTemplate?.formFields || [])];
                                                        newFields[i].options = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                                                        setEditingTemplate(p => p ? ({ ...p, formFields: newFields }) : null);
                                                    }}
                                                />
                                            )}
                                            <label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 pb-2">
                                                <input type="checkbox" checked={field.required} onChange={e => {
                                                    const newFields = [...(editingTemplate?.formFields || [])];
                                                    newFields[i].required = e.target.checked;
                                                    setEditingTemplate(p => p ? ({ ...p, formFields: newFields }) : null);
                                                }} /> 必填
                                            </label>
                                            <button
                                                onClick={() => {
                                                    const newFields = (editingTemplate?.formFields || []).filter((_, idx) => idx !== i);
                                                    setEditingTemplate(p => p ? ({ ...p, formFields: newFields }) : null);
                                                }}
                                                className="p-2 text-rose-400 hover:text-rose-600 mb-0.5"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => {
                                            const newFields = [...(editingTemplate?.formFields || []), { key: '', label: '', type: 'text', required: true }];
                                            setEditingTemplate(p => p ? ({ ...p, formFields: newFields as any }) : ({ id: '', name: '', workflow: [], formFields: [{ key: '', label: '', type: 'text', required: true }], updatedAt: '' } as any));
                                        }}
                                        className="w-full py-3 border-2 border-dashed border-slate-100 rounded-2xl text-slate-400 font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2 text-sm"
                                    >
                                        <Plus size={16} /> 增加自定義欄位
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-6 border-t border-slate-100">
                                <button onClick={() => setIsTemplateModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm">取消</button>
                                <button
                                    onClick={() => {
                                        if (!editingTemplate?.name) return alert('請輸入種類名稱');
                                        onSaveTemplate({
                                            ...editingTemplate,
                                            id: editingTemplate.id || 'TPL-' + Date.now().toString().slice(-4),
                                            updatedAt: new Date().toISOString()
                                        } as ApprovalTemplate);
                                        setIsTemplateModalOpen(false);
                                    }}
                                    className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-xl flex items-center justify-center gap-2"
                                >
                                    <Save size={18} /> 儲存種類設定
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ApprovalSystem;
