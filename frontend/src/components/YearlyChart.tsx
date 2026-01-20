'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';

interface YearlyChartProps {
    data: {
        year: number;
        returnPercent: number;
        value: number;
    }[];
}

export default function YearlyChart({ data }: YearlyChartProps) {
    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis
                        dataKey="year"
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(val) => `${val}%`}
                    />
                    <Tooltip
                        cursor={{ fill: '#334155', opacity: 0.15 }}
                        contentStyle={{
                            backgroundColor: '#0f172a',
                            border: '1px solid #1e293b',
                            borderRadius: '0.5rem',
                            padding: '8px 12px',
                        }}
                        itemStyle={{ color: '#fff' }}
                        labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                        formatter={(value: number | undefined) => {
                            if (value === undefined || value === null) {
                                return ['N/A', 'Return'];
                            }
                            return [`${value}%`, 'Return'];
                        }}
                    />
                    <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
                    <Bar dataKey="returnPercent" radius={[4, 4, 0, 0]}>
                        {data.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={entry.returnPercent >= 0 ? '#10b981' : '#ef4444'}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
