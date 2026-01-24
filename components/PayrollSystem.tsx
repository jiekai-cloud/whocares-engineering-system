import React, { useState, useMemo } from 'react';
import { AttendanceRecord, TeamMember, User } from '../types';
import { Calendar, User as UserIcon, MapPin, Download, Calculator, DollarSign, Clock, Filter, FileSpreadsheet } from 'lucide-react';
import LocationModal from './LocationModal';

interface PayrollSystemProps {
    records: AttendanceRecord[];
    teamMembers: TeamMember[];
    currentUser: User;
}

const PayrollSystem: React.FC<PayrollSystemProps> = ({ records = [], teamMembers, currentUser }) => {
    const [activeTab, setActiveTab] = useState<'records' | 'payroll'>('payroll'); // Default to payroll for "HR System" feel
    const [viewingLocation, setViewingLocation] = useState<AttendanceRecord | null>(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

    // Robust data filtering
    const validRecords = Array.isArray(records) ? records.filter(r => r && r.timestamp && r.id) : [];

    // Safe helpers (Paranoid Mode)
    const safeDate = (iso: string) => {
        try {
            const d = new Date(iso);
            if (isNaN(d.getTime())) return '無效時間';
            return d.toLocaleString('zh-TW', { hour12: false });
        } catch {
            return '無效格式';
        }
    };

    const safeLocation = (loc: any) => {
        if (!loc) return null;
        if (typeof loc.lat !== 'number' || typeof loc.lng !== 'number') return null;
        return `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`;
    };

    const safeName = (name: any) => {
        if (typeof name !== 'string') return '未知';
        return name;
    };

    const sortedRecords = useMemo(() => {
        return [...validRecords].sort((a, b) => {
            const tA = new Date(a.timestamp).getTime();
            const tB = new Date(b.timestamp).getTime();
            return (isNaN(tB) ? 0 : tB) - (isNaN(tA) ? 0 : tA);
        });
    }, [validRecords]);

    // Payroll Calculation Logic
    const payrollData = useMemo(() => {
        // Filter records by selected month
        const monthRecords = validRecords.filter(r => r.timestamp.startsWith(selectedMonth));

        // Group by Employee
        const statsByEmployee: Record<string, {
            member: TeamMember | undefined;
            days: number;
            hours: number;
            records: AttendanceRecord[];
        }> = {};

        // Initialize with all team members (even those with no attendance)
        teamMembers.forEach(m => {
            statsByEmployee[m.employeeId || m.id] = {
                member: m,
                days: 0,
                hours: 0,
                records: []
            };
        });

        // 1. Group records
        monthRecords.forEach(r => {
            const empId = r.employeeId;
            if (statsByEmployee[empId]) {
                statsByEmployee[empId].records.push(r);
            }
        });

        // 2. Calculate stats for each employee
        Object.values(statsByEmployee).forEach(stat => {
            const { records } = stat;

            // Group by Date for Day count
            const dates = new Set<string>();
            records.forEach(r => dates.add(r.timestamp.split('T')[0]));

            // Calculate actual days (must have start)
            let validDays = 0;
            dates.forEach(date => {
                const dayRecs = records.filter(r => r.timestamp.startsWith(date));
                if (dayRecs.some(r => r.type === 'work-start')) {
                    validDays++;
                }
            });
            stat.days = validDays;

            // Calculate Hours
            let totalHours = 0;
            // Very simple pairing logic (same as AttendanceSystem)
            const sorted = [...records].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

            // Iterate by date
            dates.forEach(date => {
                const dayRecs = sorted.filter(r => r.timestamp.startsWith(date));
                let currentStart: number | null = null;
                dayRecs.forEach(r => {
                    const t = new Date(r.timestamp).getTime();
                    if (r.type === 'work-start') {
                        if (currentStart === null) currentStart = t;
                    } else if (r.type === 'work-end') {
                        if (currentStart !== null) {
                            totalHours += (t - currentStart);
                            currentStart = null;
                        }
                    }
                });
            });

            stat.hours = totalHours / (1000 * 60 * 60);
        });

        return Object.values(statsByEmployee).sort((a, b) => (b.days - a.days)); // Show most active first
    }, [validRecords, teamMembers, selectedMonth]);

    const exportPayrollCSV = () => {
        const headers = ['員工姓名', '員工編號', '職稱', '出勤天數', '總工時', '日薪設定', '預估薪資(未稅)'];
        const rows = payrollData.map(d => {
            const baseRate = d.member?.dailyRate || 0;
            const salary = d.days * baseRate;
            return [
                d.member?.name || '未知',
                d.member?.employeeId || '-',
                d.member?.role || '-',
                d.days,
                d.hours.toFixed(2),
                baseRate,
                salary
            ];
        });

        const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `薪資報表_${selectedMonth}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="p-4 lg:p-8 max-w-7xl mx-auto animate-in fade-in space-y-6">
            {/* Location Modal */}
            {viewingLocation && viewingLocation.location && (
                <LocationModal
                    location={viewingLocation.location}
                    onClose={() => setViewingLocation(null)}
                    title={`${safeName(viewingLocation.name)} - 打卡位置`}
                />
            )}

            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h1 className="text-2xl font-black text-stone-900 mb-1">人事與薪資管理</h1>
                    <p className="text-stone-500 font-bold text-xs">全公司出勤監控與薪資試算中心</p>
                </div>

                <div className="flex bg-stone-100 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('payroll')}
                        className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${activeTab === 'payroll' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                    >
                        <span className="flex items-center gap-2"><DollarSign size={14} /> 薪資試算</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('records')}
                        className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${activeTab === 'records' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                    >
                        <span className="flex items-center gap-2"><Clock size={14} /> 原始打卡紀錄</span>
                    </button>
                </div>
            </div>

            {activeTab === 'payroll' && (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                    {/* Controls */}
                    <div className="bg-white p-4 rounded-2xl border border-stone-200 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                                <Calculator size={20} />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">結算月份</label>
                                <input
                                    type="month"
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className="font-bold text-stone-900 bg-transparent outline-none cursor-pointer"
                                />
                            </div>
                        </div>
                        <button
                            onClick={exportPayrollCSV}
                            className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-emerald-700 active:scale-95 transition-all shadow-lg shadow-emerald-100"
                        >
                            <FileSpreadsheet size={16} /> 匯出 CSV 報表
                        </button>
                    </div>

                    {/* Payroll Table */}
                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-stone-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-stone-50 border-b border-stone-200">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-stone-400 uppercase tracking-widest">員工資訊</th>
                                        <th className="px-6 py-4 text-center text-[10px] font-black text-stone-400 uppercase tracking-widest">出勤天數</th>
                                        <th className="px-6 py-4 text-center text-[10px] font-black text-stone-400 uppercase tracking-widest">總工時</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-black text-stone-400 uppercase tracking-widest">日薪設定</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-black text-stone-400 uppercase tracking-widest">預估薪資</th>
                                        <th className="px-6 py-4 text-center text-[10px] font-black text-stone-400 uppercase tracking-widest">狀態</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                    {payrollData.map((d) => {
                                        const baseRate = d.member?.dailyRate || 0;
                                        const salary = d.days * baseRate;
                                        const hasData = d.days > 0;

                                        return (
                                            <tr key={d.member?.id || Math.random()} className="hover:bg-stone-50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <img
                                                            src={d.member?.avatar || `https://ui-avatars.com/api/?name=${d.member?.name}&background=random`}
                                                            alt="avatar"
                                                            className="w-10 h-10 rounded-xl object-cover border border-stone-100 shadow-sm"
                                                        />
                                                        <div>
                                                            <div className="font-bold text-stone-900">{d.member?.name || '未知員工'}</div>
                                                            <div className="text-[10px] text-stone-400 font-black uppercase tracking-wider">{d.member?.role || '無職稱'}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-block px-3 py-1 rounded-lg text-sm font-black ${hasData ? 'bg-blue-50 text-blue-600' : 'text-stone-300'}`}>
                                                        {d.days} <span className="text-[10px] opacity-70">天</span>
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`text-sm font-mono font-bold ${hasData ? 'text-stone-600' : 'text-stone-300'}`}>
                                                        {d.hours.toFixed(1)} <span className="text-[10px] text-stone-400">hr</span>
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-xs font-mono text-stone-400">
                                                        ${baseRate.toLocaleString()}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className={`text-lg font-black font-mono tracking-tight ${salary > 0 ? 'text-emerald-600' : 'text-stone-300'}`}>
                                                        ${salary.toLocaleString()}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {hasData ? (
                                                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center justify-center gap-1">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                            Active
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] font-black text-stone-300 uppercase tracking-widest">No Data</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'records' && (
                <div className="space-y-6 animate-in slide-in-from-left-4">
                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-stone-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-stone-50 border-b border-stone-200">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-stone-400 uppercase tracking-widest">員工</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-stone-400 uppercase tracking-widest">打卡類型</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-stone-400 uppercase tracking-widest">時間</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-stone-400 uppercase tracking-widest">地點</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                    {sortedRecords.map((record) => {
                                        const locString = safeLocation(record.location);
                                        const displayName = safeName(record.name);
                                        return (
                                            <tr key={record.id} className="hover:bg-stone-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center font-bold text-stone-600 text-xs text-transform uppercase">
                                                            {displayName.substring(0, 1)}
                                                        </div>
                                                        <span className="font-bold text-stone-700">{displayName}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${record.type === 'work-start' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'
                                                        }`}>
                                                        {record.type === 'work-start' ? '上班' : '下班'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-stone-600">
                                                    {safeDate(record.timestamp)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                                                    <div
                                                        className={`flex items-center gap-1 ${locString ? 'cursor-pointer hover:text-orange-500 hover:underline' : ''}`}
                                                        onClick={() => locString && setViewingLocation(record)}
                                                    >
                                                        <MapPin size={12} />
                                                        {locString || '未知位置'}
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
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
            )}
        </div>
    );
};

export default PayrollSystem;
