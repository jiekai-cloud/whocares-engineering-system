
import React, { useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Cell, ReferenceLine, LabelList
} from 'recharts';
import { Project, ProjectPhase } from '../types';

interface GanttChartProps {
    phases: ProjectPhase[];
}

const GanttChart: React.FC<GanttChartProps> = ({ phases }) => {
    const data = useMemo(() => {
        if (!phases || phases.length === 0) return [];

        // 尋找最早的日期作為基準
        const dates = phases.flatMap(p => [new Date(p.startDate), new Date(p.endDate)]);
        const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
        const minTime = minDate.getTime();

        return phases.map(p => {
            const start = new Date(p.startDate).getTime();
            const end = new Date(p.endDate).getTime();
            const duration = Math.max(1, (end - start) / (1000 * 60 * 60 * 24));
            const offset = (start - minTime) / (1000 * 60 * 60 * 24);

            return {
                name: p.name,
                offset: offset,
                duration: duration,
                progress: p.progress,
                status: p.status,
                fullName: p.name,
                startStr: p.startDate,
                endStr: p.endDate
            };
        }).sort((a, b) => a.offset - b.offset);
    }, [phases]);

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white p-4 rounded-2xl shadow-xl border border-stone-100 animate-in fade-in zoom-in duration-200">
                    <p className="text-xs font-black text-stone-900 mb-2 uppercase tracking-widest">{data.fullName}</p>
                    <div className="space-y-1 text-[10px] font-bold text-stone-500">
                        <p className="flex justify-between gap-4"><span>開始:</span> <span className="text-stone-900">{data.startStr}</span></p>
                        <p className="flex justify-between gap-4"><span>結束:</span> <span className="text-stone-900">{data.endStr}</span></p>
                        <p className="flex justify-between gap-4"><span>進度:</span> <span className="text-orange-600 font-black">{data.progress}%</span></p>
                    </div>
                </div>
            );
        }
        return null;
    };

    if (phases.length === 0) {
        return (
            <div className="h-40 flex flex-col items-center justify-center text-stone-300 gap-2 border-2 border-dashed border-stone-100 rounded-[2rem]">
                <p className="text-[10px] font-black uppercase tracking-widest">目前無階段時程數據</p>
            </div>
        );
    }

    return (
        <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    layout="vertical"
                    margin={{ top: 20, right: 30, left: 40, bottom: 20 }}
                    barSize={32}
                >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis
                        dataKey="name"
                        type="category"
                        axisLine={false}
                        tickLine={false}
                        width={100}
                        tick={{ fontSize: 10, fontWeight: 900, fill: '#1c1917' }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />

                    {/* 背景條 (透明偏移) */}
                    <Bar dataKey="offset" stackId="a" fill="transparent" />

                    {/* 進度條 */}
                    <Bar dataKey="duration" stackId="a" radius={[12, 12, 12, 12]}>
                        {data.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={entry.status === 'Completed' ? '#10b981' : entry.status === 'Current' ? '#ea580c' : '#e7e5e4'}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default GanttChart;
