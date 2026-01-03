
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
    // We use a separate useMemo to avoid recalculating unnecessarily, but need minTime outside for the formatter
    const { data, minTime, totalDuration } = useMemo(() => {
        if (!phases || phases.length === 0) return { data: [], minTime: 0, totalDuration: 0 };

        // Ensure dates are valid and get their time components
        const timeValues = phases.flatMap(p => {
            const s = new Date(p.startDate).getTime();
            const e = new Date(p.endDate).getTime();
            return isNaN(s) || isNaN(e) ? [] : [s, e];
        });

        if (timeValues.length === 0) return { data: [], minTime: 0, totalDuration: 0 };

        const minTime = Math.min(...timeValues);
        const maxTime = Math.max(...timeValues);

        // Calculate total duration in ms
        const totalDuration = maxTime - minTime;

        // Process data into relative offsets
        const processedData = phases.map(p => {
            const start = new Date(p.startDate).getTime();
            const end = new Date(p.endDate).getTime();

            // If invalid date, skip or use default
            if (isNaN(start) || isNaN(end)) {
                return { name: p.name, offset: 0, duration: 0, progress: p.progress, status: p.status, fullName: p.name, startStr: p.startDate, endStr: p.endDate };
            }

            const offset = start - minTime;
            // Ensure at least 8 hours duration for tiny items to be visible
            const duration = Math.max(28800000, end - start);

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

        return { data: processedData, minTime, totalDuration };
    }, [phases]);

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white p-4 rounded-2xl shadow-xl border border-stone-100 z-50">
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

    if (phases.length === 0 || data.length === 0) {
        return (
            <div className="h-40 flex flex-col items-center justify-center text-stone-300 gap-2 border-2 border-dashed border-stone-100 rounded-[2rem]">
                <p className="text-[10px] font-black uppercase tracking-widest">目前無階段時程數據</p>
            </div>
        );
    }

    // Add padding to the domain: 2 days before and after
    const padding = 86400000 * 2;
    const domainMax = totalDuration + (padding * 2);

    return (
        <div className="h-[400px] w-full bg-white rounded-2xl overflow-hidden" id="gantt-chart-container">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    layout="vertical"
                    margin={{ top: 40, right: 30, left: 40, bottom: 20 }}
                    barSize={20}
                >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} stroke="#f1f5f9" />
                    <XAxis
                        type="number"
                        domain={[-padding, domainMax - padding]}
                        tickFormatter={(value) => {
                            const date = new Date(minTime + value);
                            return date.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
                        }}
                        tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }}
                        position="top"
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        dataKey="name"
                        type="category"
                        axisLine={false}
                        tickLine={false}
                        width={100}
                        tick={{ fontSize: 11, fontWeight: 800, fill: '#1c1917' }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />

                    {/* Invisible offset bar to push the duration bar to the right position */}
                    <Bar dataKey="offset" stackId="a" fill="transparent" isAnimationActive={false} />

                    {/* The actual Gantt bar */}
                    <Bar dataKey="duration" stackId="a" radius={[4, 4, 4, 4]} isAnimationActive={true}>
                        {data.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={entry.status === 'Completed' ? '#10b981' : entry.status === 'Current' ? '#3b82f6' : '#e7e5e4'}
                                className="transition-all hover:opacity-80"
                            />
                        ))}
                        <LabelList
                            dataKey="startStr"
                            position="left"
                            formatter={(val: string) => {
                                const d = new Date(val);
                                return `${d.getMonth() + 1}/${d.getDate()}`;
                            }}
                            style={{ fontSize: 9, fontWeight: 800, fill: '#64748b' }}
                            offset={8}
                        />
                        <LabelList
                            dataKey="endStr"
                            position="right"
                            formatter={(val: string) => {
                                const d = new Date(val);
                                return `${d.getMonth() + 1}/${d.getDate()}`;
                            }}
                            style={{ fontSize: 9, fontWeight: 800, fill: '#334155' }}
                            offset={8}
                        />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default GanttChart;
