'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface BacktestChartProps {
    data: {
        date: string;
        invested: number;
        value: number;
        price: number;
    }[];
}

export default function BacktestChart({ data }: BacktestChartProps) {
    if (!data || data.length === 0) return null;

    // Convert date strings to timestamps for time-scale axis
    const chartData = data.map(d => ({
        ...d,
        dateNum: new Date(d.date).getTime()
    }));

    const formatCurrency = (val: number) => {
        return `€${val.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    const formatDate = (dateNum: number) => {
        const date = new Date(dateNum);
        return date.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' });
    };

    return (
        <div className="w-full h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                    <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} vertical={false} />
                    <XAxis
                        dataKey="dateNum"
                        type="number"
                        domain={['dataMin', 'dataMax']}
                        scale="time"
                        stroke="#94a3b8"
                        tickFormatter={formatDate}
                        minTickGap={50}
                        tick={{ fontSize: 12 }}
                    />
                    <YAxis
                        stroke="#94a3b8"
                        tickFormatter={formatCurrency}
                        tick={{ fontSize: 12 }}
                        width={80}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#1e293b',
                            borderColor: '#334155',
                            color: '#f8fafc',
                            borderRadius: '0.5rem',
                        }}
                        formatter={(value: number | undefined) => [value ? `€${value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}` : '', '']}
                        itemStyle={{ color: '#e2e8f0' }}
                        labelStyle={{ color: '#94a3b8', marginBottom: '0.5rem' }}
                        labelFormatter={(label) => new Date(label).toLocaleDateString('it-IT')}
                    />
                    <Legend verticalAlign="top" height={36} />
                    <Line
                        name="Portfolio Value"
                        type="monotone"
                        dataKey="value"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 6, fill: '#10b981' }}
                    />
                    <Line
                        name="Total Invested"
                        type="stepAfter"
                        dataKey="invested"
                        stroke="#64748b"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
