import React, { useState, useMemo } from 'react';
import { AttendanceRecord, TeamMember, User, ApprovalRequest } from '../types';
import { Calendar, User as UserIcon, MapPin, Download, Calculator, DollarSign, Clock, Filter, FileSpreadsheet, FileText, XCircle, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';
import LocationModal from './LocationModal';

interface PayrollSystemProps {
    records: AttendanceRecord[];
    teamMembers: TeamMember[];
    currentUser: User;
    approvalRequests: ApprovalRequest[];
}

interface PayrollDetailModalProps {
    member: TeamMember;
    data: PayrollData;
    month: string;
    onClose: () => void;
}

interface DailyStatus {
    date: string;
    status: 'work' | 'leave' | 'absent' | 'rest';
    hours: number;
    overtimeHours: number; // 總加班時數（僅用於顯示）
    approvedOvertimeHours: number; // 新增：核准的加班時數（用於計算加班費）
    isLate: boolean; // 新增：是否遲到
    lateMinutes: number; // 新增：遲到分鐘數
    lateDeduction: number; // 新增：遲到扣款金額
    isEarlyLeave: boolean; // 新增：是否早退
    earlyLeaveMinutes: number; // 新增：早退分鐘數
    actualStartTime?: string; // 新增：實際打卡上班時間
    actualEndTime?: string; // 新增：實際打卡下班時間
    note?: string;
    salary: number; // 本薪
    overtimePay: number; // 新增：加班費（僅計算已核准的加班）
    allowance: number; // 新增：當日津貼
}

interface PayrollData {
    member: TeamMember | undefined;
    workDays: number;
    leaveDays: number;
    hours: number;
    overtimeHours: number; // 新增：總加班時數
    records: AttendanceRecord[];
    baseSalary: number; // 應發本薪
    overtimePay: number; // 新增：應發加班費
    allowances: { // 新增：津貼明細
        spiderman: number;
        other: number;
        total: number;
    };
    grossSalary: number; // 新增：稅前應發總額 (本薪+加班+津貼)
    deductions: {
        late: number; // 新增：遲到扣款
        labor: number;
        health: number;
        other: number;
    };
    netSalary: number; // 實領薪資
    dailyLogs: DailyStatus[];
}

const PayrollDetailModal: React.FC<PayrollDetailModalProps> = ({ member, data, month, onClose }) => {
    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4">
                        <img
                            src={member.avatar || `https://ui-avatars.com/api/?name=${member.name}&background=random`}
                            alt="avatar"
                            className="w-16 h-16 rounded-2xl object-cover border-4 border-white shadow-lg"
                        />
                        <div>
                            <h2 className="text-2xl font-black text-slate-900">{member.name} 薪資明細表</h2>
                            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{month} 月份 • {member.role}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
                        <XCircle size={28} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 space-y-2">
                            <p className="text-[10px] uppercase font-black text-blue-400 tracking-widest">出勤概況</p>
                            <div className="flex justify-between items-baseline">
                                <span className="text-sm font-bold text-slate-600">一般工時</span>
                                <span className="text-lg font-black text-slate-800">{data.hours.toFixed(1)} <span className="text-xs text-slate-400">hr</span></span>
                            </div>
                            <div className="flex justify-between items-baseline">
                                <span className="text-sm font-bold text-slate-600">加班工時</span>
                                <span className="text-lg font-black text-amber-600">{data.overtimeHours.toFixed(1)} <span className="text-xs text-amber-400">hr</span></span>
                            </div>
                        </div>
                        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 space-y-1">
                            <p className="text-[10px] uppercase font-black text-emerald-500 tracking-widest">應發所得詳情</p>
                            <div className="flex justify-between text-sm">
                                <span className="font-bold text-slate-500">本薪</span>
                                <span className="font-black text-slate-700">${data.baseSalary.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="font-bold text-slate-500">加班費</span>
                                <span className="font-black text-amber-600">+${data.overtimePay.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="font-bold text-slate-500">各項津貼</span>
                                <span className="font-black text-blue-600">+${data.allowances.total.toLocaleString()}</span>
                            </div>
                            <div className="border-t border-emerald-200/50 pt-1 mt-1 flex justify-between">
                                <span className="font-black text-emerald-700 text-xs uppercase">應發總額</span>
                                <span className="font-black text-emerald-700">${data.grossSalary.toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 space-y-1">
                            <p className="text-[10px] uppercase font-black text-rose-400 tracking-widest">代扣項目</p>
                            <div className="flex justify-between text-sm">
                                <span className="font-bold text-slate-500">勞保自付</span>
                                <span className="font-black text-rose-600">-${data.deductions.labor.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="font-bold text-slate-500">健保自付</span>
                                <span className="font-black text-rose-600">-${data.deductions.health.toLocaleString()}</span>
                            </div>
                            {data.deductions.late > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="font-bold text-rose-500">遲到扣款</span>
                                    <span className="font-black text-rose-600">-${data.deductions.late.toLocaleString()}</span>
                                </div>
                            )}
                        </div>
                        <div className="bg-slate-900 p-4 rounded-2xl text-white shadow-xl shadow-slate-200 flex flex-col justify-center">
                            <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">本月實領薪資</p>
                            <p className="text-3xl font-black tracking-tight">${data.netSalary.toLocaleString()}</p>
                        </div>
                    </div>

                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Calendar size={16} /> 每日薪資詳情 (ERP 詳細模式)
                    </h3>

                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">日期</th>
                                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase text-center">狀態</th>
                                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase text-center">工時/加班</th>
                                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase text-right">本薪</th>
                                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase text-right">加班費</th>
                                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase text-right">津貼</th>
                                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase text-right">當日總計</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {data.dailyLogs.map(log => (
                                    <tr key={log.date} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="font-mono text-sm font-bold text-slate-600">{log.date}</div>
                                            {log.note && <div className="text-[10px] text-slate-400 mt-0.5">{log.note}</div>}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {log.status === 'work' && <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-1 rounded">出勤</span>}
                                            {log.status === 'leave' && <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-1 rounded">請假</span>}
                                            {log.status === 'absent' && <span className="text-slate-300 text-[10px] font-bold">-</span>}
                                            {log.isLate && <div className="mt-1"><span className="bg-rose-100 text-rose-700 text-[9px] font-black px-1.5 py-0.5 rounded">遲到{log.lateMinutes}分</span></div>}
                                            {log.isEarlyLeave && <div className="mt-1"><span className="bg-orange-100 text-orange-700 text-[9px] font-black px-1.5 py-0.5 rounded">早退{log.earlyLeaveMinutes}分</span></div>}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="font-mono text-xs font-bold text-slate-600">{log.hours.toFixed(1)}h</span>
                                                {log.overtimeHours > 0 && <span className="font-mono text-[10px] font-bold text-amber-600">OT: {log.overtimeHours.toFixed(1)}h</span>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-xs font-bold text-slate-500">
                                            {log.salary > 0 ? `$${log.salary.toLocaleString()}` : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-xs font-bold text-amber-600">
                                            {log.overtimePay > 0 ? `$${log.overtimePay.toLocaleString()}` : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-xs font-bold text-blue-600">
                                            {log.allowance > 0 ? `$${log.allowance.toLocaleString()}` : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-sm font-black text-emerald-700 bg-emerald-50/30">
                                            ${(log.salary + log.overtimePay + log.allowance - log.lateDeduction).toLocaleString()}
                                            {log.lateDeduction > 0 && <div className="text-[9px] text-rose-500 font-bold">- ${log.lateDeduction}</div>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-slate-50 border-t border-slate-100">
                                <tr>
                                    <td colSpan={6} className="px-4 py-3 text-right text-xs font-black text-slate-500 uppercase">稅前應發總計</td>
                                    <td className="px-4 py-3 text-right font-black text-emerald-700 border-t-2 border-emerald-500">${data.grossSalary.toLocaleString()}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PayrollSystem: React.FC<PayrollSystemProps> = ({ records = [], teamMembers, currentUser, approvalRequests = [] }) => {
    const [activeTab, setActiveTab] = useState<'records' | 'payroll'>('payroll');
    const [viewingLocation, setViewingLocation] = useState<AttendanceRecord | null>(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [selectedMemberDetail, setSelectedMemberDetail] = useState<{ member: TeamMember, data: PayrollData } | null>(null);
    const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());

    // Robust data filtering
    const validRecords = Array.isArray(records) ? records.filter(r => r && r.timestamp && r.id) : [];

    // Safe helpers
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

    // Group records by employee name and calculate daily hours
    const recordsByMember = useMemo(() => {
        const grouped = new Map<string, AttendanceRecord[]>();

        sortedRecords.forEach(record => {
            const memberName = safeName(record.name);
            if (!grouped.has(memberName)) {
                grouped.set(memberName, []);
            }
            grouped.get(memberName)!.push(record);
        });

        // Convert to sorted array for display with daily hours calculation
        return Array.from(grouped.entries())
            .map(([name, records]) => {
                // Sort records by time (newest first)
                const sortedRecs = records.sort((a, b) => {
                    const tA = new Date(a.timestamp).getTime();
                    const tB = new Date(b.timestamp).getTime();
                    return (isNaN(tB) ? 0 : tB) - (isNaN(tA) ? 0 : tA);
                });

                // Group by date and calculate daily hours
                const dailyGroups = new Map<string, {
                    workStart?: AttendanceRecord;
                    workEnd?: AttendanceRecord;
                    hours: number;
                }>();

                sortedRecs.forEach(record => {
                    const dateStr = record.timestamp.split('T')[0]; // YYYY-MM-DD

                    if (!dailyGroups.has(dateStr)) {
                        dailyGroups.set(dateStr, { hours: 0 });
                    }

                    const dayData = dailyGroups.get(dateStr)!;
                    const recordTime = new Date(record.timestamp).getTime();

                    if (record.type === 'work-start') {
                        // Keep the earliest work-start of the day
                        if (!dayData.workStart || recordTime < new Date(dayData.workStart.timestamp).getTime()) {
                            dayData.workStart = record;
                        }
                    } else if (record.type === 'work-end') {
                        // Keep the latest work-end of the day
                        if (!dayData.workEnd || recordTime > new Date(dayData.workEnd.timestamp).getTime()) {
                            dayData.workEnd = record;
                        }
                    }
                });

                // Calculate hours for each day
                let totalMonthHours = 0;
                const dailyRecords: Array<{
                    date: string;
                    records: AttendanceRecord[];
                    hours: number;
                }> = [];

                Array.from(dailyGroups.entries())
                    .sort((a, b) => b[0].localeCompare(a[0])) // Sort by date descending
                    .forEach(([date, data]) => {
                        let hours = 0;

                        if (data.workStart && data.workEnd) {
                            const startTime = new Date(data.workStart.timestamp).getTime();
                            const endTime = new Date(data.workEnd.timestamp).getTime();
                            hours = (endTime - startTime) / (1000 * 60 * 60); // Convert to hours
                            if (hours < 0) hours = 0; // Handle invalid data

                            // Deduct lunch break (12:00-13:00) if work period spans across it
                            const startDate = new Date(data.workStart.timestamp);
                            const endDate = new Date(data.workEnd.timestamp);
                            const lunchStart = new Date(startDate);
                            lunchStart.setHours(12, 0, 0, 0);
                            const lunchEnd = new Date(startDate);
                            lunchEnd.setHours(13, 0, 0, 0);

                            // Check if work period overlaps with lunch break
                            if (startDate < lunchEnd && endDate > lunchStart) {
                                hours = Math.max(0, hours - 1); // Deduct 1 hour for lunch break
                            }
                        }

                        totalMonthHours += hours;

                        // Get all records for this date and sort by time (ascending)
                        const dateRecords = sortedRecs
                            .filter(r => r.timestamp.split('T')[0] === date)
                            .sort((a, b) => {
                                const tA = new Date(a.timestamp).getTime();
                                const tB = new Date(b.timestamp).getTime();
                                return tA - tB; // Ascending order (earliest first)
                            });

                        dailyRecords.push({
                            date,
                            records: dateRecords,
                            hours
                        });
                    });

                return {
                    name,
                    records: sortedRecs,
                    dailyRecords,
                    count: records.length,
                    totalMonthHours
                };
            })
            .sort((a, b) => a.name.localeCompare(b.name, 'zh-TW'));
    }, [sortedRecords]);

    const toggleMemberExpansion = (memberName: string) => {
        setExpandedMembers(prev => {
            const newSet = new Set(prev);
            if (newSet.has(memberName)) {
                newSet.delete(memberName);
            } else {
                newSet.add(memberName);
            }
            return newSet;
        });
    };

    // Core Payroll Calculation Logic
    const payrollData = useMemo(() => {
        const [yearStr, monthStr] = selectedMonth.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr);
        const daysInMonth = new Date(year, month, 0).getDate();

        // 1. Filter needed data
        const monthRecords = validRecords.filter(r => r.timestamp.startsWith(selectedMonth));
        const monthLeaves = approvalRequests.filter(req => {
            const isLeave = req.templateName.includes('請假') || req.title.includes('請假');
            const isApproved = req.status === 'approved';
            let dateInMonth = false;
            // Support multiple date formats from various form templates
            if (req.formData?.date && req.formData.date.startsWith(selectedMonth)) dateInMonth = true;
            if (req.formData?.startDate && req.formData.startDate.startsWith(selectedMonth)) dateInMonth = true;
            return isLeave && isApproved && dateInMonth;
        });

        // 2. Initialize map for each employee
        const stats: Record<string, PayrollData> = {};
        teamMembers.forEach(m => {
            stats[m.employeeId || m.id] = {
                member: m,
                workDays: 0,
                leaveDays: 0,
                hours: 0,
                overtimeHours: 0,
                records: [],
                baseSalary: 0,
                overtimePay: 0,
                allowances: {
                    spiderman: 0,
                    other: 0,
                    total: 0
                },
                grossSalary: 0,
                deductions: {
                    late: 0,
                    labor: m.laborFee || 0,
                    health: m.healthFee || 0,
                    other: 0
                },
                netSalary: 0,
                dailyLogs: []
            };
        });

        // 3. Process each day of the month for each employee
        Object.values(stats).forEach(context => {
            const m = context.member!;
            const empId = m.employeeId || m.id;
            const dailyRate = m.dailyRate || 0;
            // Assuming 8-hour work day for hourly rate calc
            const hourlyRate = dailyRate > 0 ? dailyRate / 8 : 0;

            for (let d = 1; d <= daysInMonth; d++) {
                const dateStr = `${selectedMonth}-${d.toString().padStart(2, '0')}`;

                // Check Work
                const dayWorkRecs = monthRecords.filter(r => r.timestamp.startsWith(dateStr) && (r.employeeId === empId || r.name === m.name));
                const hasWorkStart = dayWorkRecs.some(r => r.type === 'work-start');

                // Check Leave
                const dayLeave = monthLeaves.find(req => {
                    const reqRequester = req.requesterId === m.id;
                    const reqDate = req.formData?.date === dateStr || req.formData?.startDate === dateStr;
                    return reqRequester && reqDate;
                });

                // Check Approved Overtime Request for this date
                const overtimeRequest = approvalRequests.find(req => {
                    const isOvertime = req.templateName.includes('加班') || req.title.includes('加班');
                    const isApproved = req.status === 'approved';
                    const reqRequester = req.requesterId === m.id;
                    const reqDate = req.formData?.date === dateStr || req.formData?.startDate === dateStr;
                    return isOvertime && isApproved && reqRequester && reqDate;
                });

                const approvedOvertimeHours = overtimeRequest ? (parseFloat(overtimeRequest.formData?.hours) || 0) : 0;

                // Calculate Hours and Late Status
                let dayHours = 0;
                let isLate = false;
                let lateMinutes = 0;
                let isEarlyLeave = false;
                let earlyLeaveMinutes = 0;
                let actualStartTime: string | undefined;
                let actualEndTime: string | undefined;

                if (hasWorkStart) {
                    const starts = dayWorkRecs.filter(r => r.type === 'work-start').map(r => ({
                        time: new Date(r.timestamp).getTime(),
                        timestamp: r.timestamp
                    }));
                    const ends = dayWorkRecs.filter(r => r.type === 'work-end').map(r => ({
                        time: new Date(r.timestamp).getTime(),
                        timestamp: r.timestamp
                    }));

                    if (starts.length > 0 && ends.length > 0) {
                        const earliestStart = starts.reduce((min, cur) => cur.time < min.time ? cur : min);
                        const latestEnd = ends.reduce((max, cur) => cur.time > max.time ? cur : max);

                        actualStartTime = new Date(earliestStart.timestamp).toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit' });
                        actualEndTime = new Date(latestEnd.timestamp).toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit' });

                        dayHours = (latestEnd.time - earliestStart.time) / (1000 * 60 * 60);

                        // Check if late (compare with member's standard work start time)
                        if (m.workStartTime) {
                            const [expectedHour, expectedMinute] = m.workStartTime.split(':').map(Number);
                            const expectedStartDate = new Date(earliestStart.timestamp);
                            expectedStartDate.setHours(expectedHour, expectedMinute, 0, 0);
                            const expectedStartTime = expectedStartDate.getTime();

                            if (earliestStart.time > expectedStartTime) {
                                isLate = true;
                                lateMinutes = Math.round((earliestStart.time - expectedStartTime) / (1000 * 60));
                            }
                        }

                        // Check if early leave (compare with member's standard work end time)
                        if (m.workEndTime) {
                            const [expectedHour, expectedMinute] = m.workEndTime.split(':').map(Number);
                            const expectedEndDate = new Date(latestEnd.timestamp);
                            expectedEndDate.setHours(expectedHour, expectedMinute, 0, 0);
                            const expectedEndTime = expectedEndDate.getTime();

                            if (latestEnd.time < expectedEndTime) {
                                isEarlyLeave = true;
                                earlyLeaveMinutes = Math.round((expectedEndTime - latestEnd.time) / (1000 * 60));
                            }
                        }
                    } else if (starts.length > 0) {
                        actualStartTime = new Date(starts[0].timestamp).toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit' });
                        dayHours = 8; // Default fallback
                    }
                }

                // Determine Status & Pay
                let status: DailyStatus['status'] = 'absent';
                let note = '';
                let salary = 0;
                let overtimePay = 0;
                let allowance = 0;
                let overtimeHours = 0;
                let lateDeduction = 0;

                if (hasWorkStart) {
                    status = 'work';
                    context.workDays++;
                    context.hours += dayHours;

                    // Base Salary
                    salary = dailyRate;
                    context.baseSalary += salary;
                    context.records.push(...dayWorkRecs);

                    // Calculate Late Deduction
                    if (isLate && lateMinutes > 0) {
                        let perMinuteRate = 0;

                        if (m.salaryType === 'monthly' && m.monthlySalary) {
                            // 月薪制：月薪 / 30天 / 8小時 / 60分鐘
                            perMinuteRate = m.monthlySalary / 30 / 8 / 60;
                        } else if (m.salaryType === 'daily' && m.dailyRate) {
                            // 日薪制：日薪 / 8小時 / 60分鐘
                            perMinuteRate = m.dailyRate / 8 / 60;
                        } else if (m.dailyRate) {
                            // 預設使用日薪計算
                            perMinuteRate = m.dailyRate / 8 / 60;
                        }

                        lateDeduction = Math.round(perMinuteRate * lateMinutes);
                        context.deductions.late += lateDeduction;
                    }

                    // Add note for early leave (for manager notification)
                    if (isEarlyLeave && earlyLeaveMinutes > 0) {
                        note = `早退 ${earlyLeaveMinutes} 分鐘（需主管確認是否扣款）`;
                    }

                    // Overtime Calculation - Only for approved overtime
                    // Display actual overtime hours but only calculate pay for approved hours
                    if (dayHours > 8) {
                        overtimeHours = dayHours - 8;
                        context.overtimeHours += overtimeHours;

                        // Only calculate pay for approved overtime hours
                        if (approvedOvertimeHours > 0) {
                            const payableOT = Math.min(approvedOvertimeHours, overtimeHours);
                            const first2OT = Math.min(payableOT, 2);
                            const restOT = Math.max(0, payableOT - 2);

                            overtimePay += (first2OT * hourlyRate * 1.34);
                            overtimePay += (restOT * hourlyRate * 1.67);

                            overtimePay = Math.round(overtimePay); // Round to integer
                            context.overtimePay += overtimePay;
                        }
                    }

                    // Allowance Calculation
                    if (m.spiderManAllowance && m.spiderManAllowance > 0) {
                        allowance += m.spiderManAllowance;
                        context.allowances.spiderman += m.spiderManAllowance;
                    }

                } else if (dayLeave) {
                    status = 'leave';
                    context.leaveDays++;
                    note = `${dayLeave.templateName} (${dayLeave.title || '無事由'})`;
                }

                context.dailyLogs.push({
                    date: dateStr,
                    status,
                    hours: dayHours,
                    overtimeHours,
                    approvedOvertimeHours,
                    isLate,
                    lateMinutes,
                    lateDeduction,
                    isEarlyLeave,
                    earlyLeaveMinutes,
                    actualStartTime,
                    actualEndTime,
                    note,
                    salary,
                    overtimePay,
                    allowance
                });
            }

            // Final Totals
            // 如果是月薪制，本薪直接使用月薪（還需要考慮缺勤扣款，這裡暫時簡化為固定月薪）
            if (m.salaryType === 'monthly' && m.monthlySalary) {
                context.baseSalary = m.monthlySalary;
            }

            context.allowances.total = context.allowances.spiderman + context.allowances.other;
            context.grossSalary = context.baseSalary + context.overtimePay + context.allowances.total;

            // 實領薪資 = 應發總額 - 勞健保 - 遲到扣款
            context.netSalary = Math.max(0, context.grossSalary - context.deductions.labor - context.deductions.health - context.deductions.late);
        });

        return Object.values(stats).sort((a, b) => (b.workDays - a.workDays));
    }, [validRecords, teamMembers, selectedMonth, approvalRequests]);

    const exportPayrollCSV = () => {
        const headers = ['員工姓名', '員工編號', '職稱', '出勤天數', '請假天數', '總工時', '加班工時', '日薪/月薪', '本薪總額', '加班費', '各項津貼', '遲到扣款', '勞保費', '健保費', '實領薪資'];
        const rows = payrollData.map(d => {
            return [
                d.member?.name || '未知',
                d.member?.employeeId || '-',
                d.member?.role || '-',
                d.workDays,
                d.leaveDays,
                d.hours.toFixed(1),
                d.overtimeHours.toFixed(1),
                d.member?.salaryType === 'monthly' ? `${d.member?.monthlySalary}(月)` : d.member?.dailyRate || 0,
                d.baseSalary,
                d.overtimePay,
                d.allowances.total,
                d.deductions.late,
                d.deductions.labor,
                d.deductions.health,
                d.netSalary
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
            {/* Modals */}
            {viewingLocation && viewingLocation.location && (
                <LocationModal
                    location={viewingLocation.location}
                    onClose={() => setViewingLocation(null)}
                    title={`${safeName(viewingLocation.name)} - 打卡位置`}
                />
            )}

            {selectedMemberDetail && selectedMemberDetail.member && (
                <PayrollDetailModal
                    member={selectedMemberDetail.member}
                    data={selectedMemberDetail.data}
                    month={selectedMonth}
                    onClose={() => setSelectedMemberDetail(null)}
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

            {/* Company Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-[2rem] border border-stone-200 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                            <DollarSign size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest leading-none mb-1">本月實發總額</p>
                            <p className="text-2xl font-black text-stone-900 tabular-nums">
                                ${payrollData.reduce((acc, d) => acc + d.netSalary, 0).toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-stone-200 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                            <Calendar size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest leading-none mb-1">本月出勤 / 請假</p>
                            <p className="text-2xl font-black text-stone-900 tabular-nums flex items-center gap-2">
                                <span>{payrollData.reduce((acc, d) => acc + d.workDays, 0)} 天</span>
                                <span className="text-sm font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">{payrollData.reduce((acc, d) => acc + d.leaveDays, 0)} 請假</span>
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-stone-200 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600">
                            <FileText size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest leading-none mb-1">勞健保代扣總額</p>
                            <p className="text-2xl font-black text-stone-900 tabular-nums">
                                ${payrollData.reduce((acc, d) => acc + d.deductions.labor + d.deductions.health, 0).toLocaleString()}
                            </p>
                        </div>
                    </div>
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
                                        <th className="px-6 py-4 text-center text-[10px] font-black text-stone-400 uppercase tracking-widest">出勤 / 請假</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-black text-stone-400 uppercase tracking-widest hidden md:table-cell">日薪設定</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-black text-stone-400 uppercase tracking-widest hidden md:table-cell">勞健保</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-black text-stone-400 uppercase tracking-widest">實領薪資</th>
                                        <th className="px-6 py-4 text-center text-[10px] font-black text-stone-400 uppercase tracking-widest">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                    {payrollData.map((d) => {
                                        const hasData = d.workDays > 0 || d.leaveDays > 0;
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
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className={`inline-block px-3 py-1 rounded-lg text-sm font-black ${d.workDays > 0 ? 'bg-blue-50 text-blue-600' : 'text-stone-300'}`}>
                                                            {d.workDays} <span className="text-[10px] opacity-70">天</span>
                                                        </span>
                                                        {d.leaveDays > 0 && (
                                                            <span className="text-[10px] font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">
                                                                請假 {d.leaveDays} 天
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right hidden md:table-cell">
                                                    <span className={`text-xs font-mono font-bold ${d.member?.dailyRate ? 'text-slate-600' : 'text-rose-400'}`}>
                                                        {d.member?.dailyRate ? `$${d.member.dailyRate.toLocaleString()}` : '未設定'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right hidden md:table-cell">
                                                    <div className="flex flex-col items-end gap-0.5">
                                                        <span className="text-[10px] font-bold text-slate-400">勞 ${d.deductions.labor}</span>
                                                        <span className="text-[10px] font-bold text-slate-400">健 ${d.deductions.health}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className={`text-lg font-black font-mono tracking-tight ${d.netSalary > 0 ? 'text-emerald-600' : 'text-stone-300'}`}>
                                                        ${d.netSalary.toLocaleString()}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <button
                                                        onClick={() => d.member && setSelectedMemberDetail({ member: d.member, data: d })}
                                                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                                        title="查看薪資單細節"
                                                    >
                                                        <FileText size={18} />
                                                    </button>
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
                        <div className="p-6 space-y-3">
                            {recordsByMember.length === 0 ? (
                                <div className="text-center py-12 text-stone-400">尚無打卡紀錄</div>
                            ) : (
                                recordsByMember.map(({ name, records, count, dailyRecords, totalMonthHours }) => {
                                    const isExpanded = expandedMembers.has(name);
                                    const member = teamMembers.find(m => m.name === name);

                                    return (
                                        <div key={name} className="border border-stone-200 rounded-2xl overflow-hidden">
                                            {/* Member Header - Clickable to expand/collapse */}
                                            <button
                                                onClick={() => toggleMemberExpansion(name)}
                                                className="w-full px-6 py-4 bg-stone-50 hover:bg-stone-100 transition-colors flex items-center justify-between"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <img
                                                        src={member?.avatar || `https://ui-avatars.com/api/?name=${name}&background=random`}
                                                        alt="avatar"
                                                        className="w-12 h-12 rounded-xl object-cover border-2 border-white shadow-sm"
                                                    />
                                                    <div className="text-left">
                                                        <h3 className="text-lg font-black text-stone-900">{name}</h3>
                                                        <p className="text-xs text-stone-500 font-bold">{member?.role || '員工'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl">
                                                        <span className="text-sm font-black">{totalMonthHours.toFixed(1)}</span>
                                                        <span className="text-xs font-bold ml-1">小時</span>
                                                    </div>
                                                    <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl">
                                                        <span className="text-sm font-black">{count}</span>
                                                        <span className="text-xs font-bold ml-1">筆記錄</span>
                                                    </div>
                                                    {isExpanded ? (
                                                        <ChevronDown size={20} className="text-stone-400" />
                                                    ) : (
                                                        <ChevronRight size={20} className="text-stone-400" />
                                                    )}
                                                </div>
                                            </button>

                                            {/* Member's Records - Shown when expanded, grouped by date */}
                                            {isExpanded && (
                                                <div className="bg-white">
                                                    {dailyRecords.map(({ date, records: dayRecords, hours }) => {
                                                        const dateObj = new Date(date + 'T00:00:00');
                                                        const formattedDate = dateObj.toLocaleDateString('zh-TW', {
                                                            year: 'numeric',
                                                            month: '2-digit',
                                                            day: '2-digit',
                                                            weekday: 'short'
                                                        });

                                                        return (
                                                            <div key={date} className="border-b border-stone-100 last:border-b-0">
                                                                {/* Date Header with daily hours */}
                                                                <div className="bg-stone-50/50 px-6 py-2 flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <Calendar size={14} className="text-stone-400" />
                                                                        <span className="text-xs font-black text-stone-600">{formattedDate}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        {hours > 0 ? (
                                                                            <>
                                                                                <Clock size={14} className="text-emerald-600" />
                                                                                <span className="text-xs font-black text-emerald-700">
                                                                                    {hours.toFixed(1)} 小時
                                                                                </span>
                                                                                {hours > 8 && (
                                                                                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                                                                        加班 {(hours - 8).toFixed(1)}h
                                                                                    </span>
                                                                                )}
                                                                            </>
                                                                        ) : (
                                                                            <span className="text-xs font-bold text-stone-400">
                                                                                未完整
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Records for this day */}
                                                                <table className="w-full">
                                                                    <tbody>
                                                                        {(() => {
                                                                            // Find the earliest work-start record for this day
                                                                            const startRecords = dayRecords.filter(r => r.type === 'work-start');
                                                                            const earliestStartRecord = startRecords.length > 0
                                                                                ? startRecords.reduce((prev, curr) =>
                                                                                    new Date(prev.timestamp).getTime() < new Date(curr.timestamp).getTime() ? prev : curr
                                                                                )
                                                                                : null;

                                                                            return dayRecords.map((record) => {
                                                                                const locString = safeLocation(record.location);
                                                                                const recordTime = new Date(record.timestamp);
                                                                                const member = teamMembers.find(m => m.name === name);

                                                                                // Check if this is the earliest start record and if it's late
                                                                                let isRecordLate = false;
                                                                                let lateMinutes = 0;

                                                                                if (record.type === 'work-start' &&
                                                                                    earliestStartRecord &&
                                                                                    record.id === earliestStartRecord.id &&
                                                                                    member?.workStartTime) {

                                                                                    const [expectedHour, expectedMinute] = member.workStartTime.split(':').map(Number);
                                                                                    const expectedTime = new Date(recordTime);
                                                                                    expectedTime.setHours(expectedHour, expectedMinute, 0, 0);

                                                                                    if (recordTime > expectedTime) {
                                                                                        isRecordLate = true;
                                                                                        lateMinutes = Math.round((recordTime.getTime() - expectedTime.getTime()) / (1000 * 60));
                                                                                    }
                                                                                }

                                                                                return (
                                                                                    <tr key={record.id} className="hover:bg-stone-50 transition-colors">
                                                                                        <td className="px-6 py-3 whitespace-nowrap w-24">
                                                                                            <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${record.type === 'work-start'
                                                                                                ? 'bg-emerald-100 text-emerald-700'
                                                                                                : 'bg-indigo-100 text-indigo-700'
                                                                                                }`}>
                                                                                                {record.type === 'work-start' ? '上班' : '下班'}
                                                                                            </span>
                                                                                        </td>
                                                                                        <td className="px-6 py-3 whitespace-nowrap font-mono text-sm text-stone-600">
                                                                                            <div className="flex items-center gap-2">
                                                                                                <span>{recordTime.toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                                                                                {isRecordLate && (
                                                                                                    <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                                                                                                        遲到 {lateMinutes}分
                                                                                                    </span>
                                                                                                )}
                                                                                            </div>
                                                                                        </td>
                                                                                        <td className="px-6 py-3 whitespace-nowrap text-sm text-stone-500">
                                                                                            <div
                                                                                                className={`flex items-center gap-1 ${locString ? 'cursor-pointer hover:text-orange-500 hover:underline' : ''}`}
                                                                                                onClick={() => locString && setViewingLocation(record)}
                                                                                            >
                                                                                                <MapPin size={14} />
                                                                                                {locString || '未知位置'}
                                                                                            </div>
                                                                                        </td>
                                                                                    </tr>
                                                                                );
                                                                            });
                                                                        })()}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PayrollSystem;
