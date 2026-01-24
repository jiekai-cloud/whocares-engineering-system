import React, { useState } from 'react';
import { AttendanceRecord, TeamMember, User } from '../types';
import { Calendar, User as UserIcon, MapPin, Download } from 'lucide-react';
import LocationModal from './LocationModal';

interface PayrollSystemProps {
    records: AttendanceRecord[];
    teamMembers: TeamMember[];
    currentUser: User;
}

const PayrollSystem: React.FC<PayrollSystemProps> = ({ records = [], teamMembers, currentUser }) => {
    const [viewingLocation, setViewingLocation] = useState<AttendanceRecord | null>(null);

    // Robust data filtering
    const validRecords = Array.isArray(records) ? records.filter(r => r && r.timestamp && r.id) : [];

    const sortedRecords = [...validRecords].sort((a, b) => {
        try {
            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        } catch (e) {
            return 0;
        }
    });

    return (
        <div className="p-6 max-w-6xl mx-auto animate-in fade-in">
            {/* Location Modal */}
            {viewingLocation && viewingLocation.location && (
                <LocationModal
                    location={viewingLocation.location}
                    onClose={() => setViewingLocation(null)}
                    title={`${viewingLocation.name} - ${viewingLocation.type === 'work-start' ? '上班' : '下班'}打卡位置`}
                />
            )}

            <div className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-black text-stone-900 mb-2">人事薪資管理</h1>
                    <p className="text-stone-500">查看所有成員的打卡紀錄與工時統計</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-stone-50 border-b border-stone-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">員工</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">打卡類型</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">時間</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">地點</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            {sortedRecords.map((record) => (
                                <tr key={record.id} className="hover:bg-stone-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center font-bold text-stone-600 text-xs">
                                                {record.name ? record.name.substring(0, 1) : '?'}
                                            </div>
                                            <span className="font-bold text-stone-700">{record.name || '未知員工'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${record.type === 'work-start' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'
                                            }`}>
                                            {record.type === 'work-start' ? '上班' : '下班'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-stone-600">
                                        {record.timestamp ? new Date(record.timestamp).toLocaleString('zh-TW') : '時間無效'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                                        <div
                                            className={`flex items-center gap-1 ${record.location ? 'cursor-pointer hover:text-orange-500 hover:underline' : ''}`}
                                            onClick={() => record.location && setViewingLocation(record)}
                                        >
                                            <MapPin size={12} />
                                            {record.location ? `${record.location.lat.toFixed(4)}, ${record.location.lng.toFixed(4)}` : '未知位置'}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {sortedRecords.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-stone-400">尚無打卡紀錄</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PayrollSystem;
