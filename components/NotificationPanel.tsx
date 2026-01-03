
import React, { useState, useMemo } from 'react';
import {
    X, Bell, Briefcase, Users, User, Shield,
    MessageSquare, Clock, ArrowRight, Zap, Target, Search, FilterX, CheckCheck
} from 'lucide-react';
import { ActivityLog } from '../types';

interface NotificationPanelProps {
    logs: ActivityLog[];
    onClose: () => void;
    onProjectClick: (projectId: string) => void;
    onMarkAsRead: (logId: string) => void;
    onMarkAllAsRead: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ logs, onClose, onProjectClick, onMarkAsRead, onMarkAllAsRead }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedType, setSelectedType] = useState<string>('all');

    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const matchSearch =
                log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.targetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.userName.toLowerCase().includes(searchTerm.toLowerCase());
            const matchType = selectedType === 'all' || log.type === selectedType;
            return matchSearch && matchType;
        });
    }, [logs, searchTerm, selectedType]);

    const unreadCount = logs.filter(l => !l.isRead).length;

    const getIcon = (type: ActivityLog['type']) => {
        switch (type) {
            case 'project': return <Briefcase size={14} />;
            case 'customer': return <Users size={14} />;
            case 'team': return <User size={14} />;
            default: return <Shield size={14} />;
        }
    };

    const getBgColor = (type: ActivityLog['type']) => {
        switch (type) {
            case 'project': return 'bg-blue-50 text-blue-600';
            case 'customer': return 'bg-purple-50 text-purple-600';
            case 'team': return 'bg-emerald-50 text-emerald-600';
            default: return 'bg-stone-50 text-stone-600';
        }
    };

    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleString('zh-TW', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="flex flex-col h-full bg-white animate-in slide-in-from-right duration-300">
            {/* 標頭 */}
            <div className="flex flex-col border-b border-stone-100 shrink-0">
                <div className="flex items-center justify-between p-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-50 text-orange-600 rounded-xl relative">
                            <Bell size={20} />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[8px] font-black flex items-center justify-center rounded-full border-2 border-white">
                                    {unreadCount}
                                </span>
                            )}
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-stone-900 uppercase tracking-widest">活動中心</h3>
                            <p className="text-[10px] text-stone-400 font-bold tracking-tight">追蹤團隊最新協作動態</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {unreadCount > 0 && (
                            <button
                                onClick={onMarkAllAsRead}
                                className="p-2 hover:bg-stone-50 rounded-xl text-stone-400 hover:text-orange-600 transition-all group"
                                title="全部標記為已讀"
                            >
                                <CheckCheck size={18} />
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-stone-50 rounded-xl text-stone-400 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* 搜尋與篩選器 */}
                <div className="px-6 pb-4 space-y-3">
                    <div className="flex items-center bg-stone-50 rounded-xl border border-stone-100 px-3 py-2 shadow-inner focus-within:ring-2 focus-within:ring-orange-500/10 transition-all">
                        <Search size={14} className="text-stone-400 mr-2" />
                        <input
                            className="bg-transparent text-[11px] font-bold outline-none w-full text-stone-900 placeholder:text-stone-300"
                            placeholder="搜尋活動關鍵字..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                        {['all', 'project', 'customer', 'team', 'system'].map(type => (
                            <button
                                key={type}
                                onClick={() => setSelectedType(type)}
                                className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${selectedType === type
                                        ? 'bg-stone-900 text-white border-stone-900 shadow-md'
                                        : 'bg-white text-stone-400 border-stone-100 hover:border-stone-200'
                                    }`}
                            >
                                {type === 'all' ? '全部' : type === 'project' ? '專案' : type === 'customer' ? '業主' : type === 'team' ? '團隊' : '系統'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 活動列表 */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6 bg-stone-50/20">
                {filteredLogs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40 py-20">
                        {searchTerm || selectedType !== 'all' ? <FilterX size={48} className="text-stone-300" /> : <Zap size={48} className="text-stone-300" />}
                        <p className="text-xs font-black text-stone-500 uppercase tracking-widest">
                            {searchTerm || selectedType !== 'all' ? '找不到相符的活動' : '尚無最新活動'}
                        </p>
                    </div>
                ) : (
                    filteredLogs.map((log) => (
                        <div
                            key={log.id}
                            onClick={() => {
                                onMarkAsRead(log.id);
                                if (log.type === 'project' && log.targetId) {
                                    onProjectClick(log.targetId);
                                }
                            }}
                            className={`group relative flex gap-4 animate-in fade-in slide-in-from-bottom-2 cursor-pointer transition-all ${!log.isRead ? 'translate-x-1' : ''}`}
                        >
                            <div className="flex flex-col items-center">
                                <div className="relative">
                                    <img
                                        src={log.userAvatar}
                                        alt={log.userName}
                                        className={`w-10 h-10 rounded-2xl border-2 shadow-md z-10 transition-all ${!log.isRead ? 'border-orange-500 ring-4 ring-orange-500/10' : 'border-white'}`}
                                    />
                                    {!log.isRead && (
                                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-white animate-pulse z-20"></span>
                                    )}
                                </div>
                                <div className="w-0.5 flex-1 bg-stone-100 group-last:hidden my-2"></div>
                            </div>

                            <div className="flex-1 pb-6 group-last:pb-0">
                                <div className="flex items-center justify-between mb-1">
                                    <span className={`text-xs font-black transition-colors ${!log.isRead ? 'text-orange-600' : 'text-stone-900'}`}>{log.userName}</span>
                                    <span className="text-[9px] font-bold text-stone-400 flex items-center gap-1">
                                        <Clock size={10} />
                                        {formatTime(log.timestamp)}
                                    </span>
                                </div>

                                <div className={`p-4 rounded-[1.5rem] transition-all border shadow-sm group-hover:shadow-md ${!log.isRead ? 'bg-white border-orange-100' : 'bg-white/60 border-stone-100 group-hover:bg-white group-hover:border-stone-200'}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className={`p-1.5 rounded-lg ${getBgColor(log.type)}`}>
                                            {getIcon(log.type)}
                                        </div>
                                        <span className="text-[10px] font-black text-stone-500 uppercase tracking-wider">
                                            {log.action}
                                        </span>
                                    </div>

                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-stone-800 leading-tight">
                                            {log.targetName}
                                        </p>
                                        <div className="flex items-center gap-1.5 pt-2 text-stone-400 group-hover:text-orange-600 transition-colors">
                                            <span className="text-[9px] font-black uppercase tracking-widest">查看詳情</span>
                                            <ArrowRight size={10} className="transition-transform group-hover:translate-x-1" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* 說明腳註 */}
            <div className="p-4 bg-stone-50 border-t border-stone-100 text-center shrink-0">
                <p className="text-[9px] font-black text-stone-400 uppercase tracking-[0.2em]">系統僅保留最近 100 筆活動紀錄</p>
            </div>
        </div>
    );
};

export default NotificationPanel;
