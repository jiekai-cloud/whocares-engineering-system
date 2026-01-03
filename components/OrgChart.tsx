
import React from 'react';
import { TeamMember, Department } from '../types';
import { Shield, MapPin, Phone, Award } from 'lucide-react';

interface OrgChartProps {
    members: TeamMember[];
    departments: Department[];
}

const HIERARCHY: Record<string, number> = {
    '總經理': 0,
    '副總經理': 1,
    '總經理特助': 1,
    '經理': 2,
    '副經理': 3,
    '專案經理': 3,
    '工地主任': 4,
    '工務主管': 4,
    '設計師': 4,
    '工地助理': 5,
    '現場工程師': 5,
    '工頭': 5,
    '行政助理': 5,
    '助理': 5,
    '外部協力': 6
};

const OrgChart: React.FC<OrgChartProps> = ({ members, departments }) => {
    // 按等級分組
    const levels = members.reduce((acc: Record<number, TeamMember[]>, m) => {
        const level = HIERARCHY[m.role as string] ?? 6;
        if (!acc[level]) acc[level] = [];
        acc[level].push(m);
        return acc;
    }, {});

    const sortedLevels = Object.keys(levels)
        .map(Number)
        .sort((a, b) => a - b);

    return (
        <div className="p-8 space-y-12 animate-in fade-in duration-500 overflow-x-auto min-w-[800px]">
            <div className="flex flex-col items-center">
                {sortedLevels.map((level, idx) => (
                    <React.Fragment key={level}>
                        {/* 連接線 */}
                        {idx > 0 && (
                            <div className="h-12 w-1 bg-gradient-to-b from-stone-200 to-stone-100" />
                        )}

                        <div className="flex flex-wrap justify-center gap-6 p-4">
                            {levels[level].map(m => {
                                const dept = departments.find(d => d.id === m.departmentId);
                                return (
                                    <div
                                        key={m.id}
                                        className="w-64 bg-white rounded-3xl border border-stone-200 p-5 shadow-xl shadow-slate-200/50 hover:border-orange-500 hover:shadow-orange-100 transition-all group relative"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="relative">
                                                <img
                                                    src={m.avatar}
                                                    alt={m.name}
                                                    className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-md"
                                                />
                                                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${m.status === 'Available' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-black text-slate-900 truncate">{m.name}</h4>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className="text-[9px] font-black text-white px-2 py-0.5 rounded-full" style={{ backgroundColor: dept?.color || '#3b82f6' }}>
                                                        {m.role}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-stone-100 space-y-2">
                                            <div className="flex flex-wrap gap-1">
                                                {(m.departmentIds || [m.departmentId]).map(deptId => {
                                                    const d = departments.find(dep => dep.id === deptId);
                                                    return d ? (
                                                        <div key={deptId} className="flex items-center gap-1.5 text-[9px] text-stone-500 font-black bg-stone-50 px-2 py-0.5 rounded-md border border-stone-100 uppercase">
                                                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: d.color }} />
                                                            {d.name}
                                                        </div>
                                                    ) : null;
                                                })}
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] text-stone-500 font-bold">
                                                <Phone size={12} className="text-stone-300" />
                                                <a href={`tel:${m.phone}`} className="hover:text-orange-600 hover:underline transition-colors">{m.phone || '無電話'}</a>
                                            </div>
                                        </div>

                                        {/* 快速資訊 Tag */}
                                        <div className="absolute -top-2 -right-2 bg-stone-900 text-white px-2 py-1 rounded-lg text-[8px] font-black shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                            {m.employeeId}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </React.Fragment>
                ))}
            </div>

            {levels[6] && (
                <div className="mt-16 pt-16 border-t border-dashed border-stone-200 flex flex-col items-center">
                    <div className="bg-stone-100 px-4 py-1.5 rounded-full text-[10px] font-black text-stone-400 uppercase tracking-widest mb-8">外部聯軍 Partners</div>
                    <div className="flex flex-wrap justify-center gap-4">
                        {levels[6].map(m => (
                            <div key={m.id} className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-stone-200 shadow-sm opacity-60">
                                <img src={m.avatar} className="w-8 h-8 rounded-lg object-cover" alt={m.name} />
                                <div>
                                    <p className="text-xs font-black text-slate-900">{m.name}</p>
                                    <p className="text-[10px] font-bold text-slate-400">{m.role}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrgChart;
