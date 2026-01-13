'use client';

import { XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, ReferenceLine } from 'recharts';
import { HistoryPoint } from '@/lib/api';

interface PerformanceChartProps {
    data: HistoryPoint[];
    loading: boolean;
}

interface EnhancedDataPoint extends HistoryPoint {
    gain?: number;
    loss?: number;
    prevValue?: number;
    change?: number;
}

export default function PerformanceChart({ data, loading }: PerformanceChartProps) {
    if (loading) {
        return (
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700/50 shadow-xl h-80 animate-pulse">
                <div className="h-4 bg-slate-700 rounded w-40 mb-4" />
                <div className="h-full bg-slate-700/50 rounded-xl" />
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700/50 shadow-xl h-80 flex items-center justify-center">
                <p className="text-slate-400">No historical data available</p>
            </div>
        );
    }

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
    };

    const formatValue = (value: number) => {
        return `€${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // Calculate Y-axis domain with padding
    const values = data.map(d => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue;
    const padding = range < maxValue * 0.01 ? maxValue * 0.005 : range * 0.1;
    const yMin = Math.max(0, minValue - padding);
    const yMax = maxValue + padding;

    // Determine overall trend
    const firstValue = data[0]?.value || 0;
    const lastValue = data[data.length - 1]?.value || 0;
    const isOverallPositive = lastValue >= firstValue;

    // Enhance data with gain/loss for coloring
    const enhancedData: EnhancedDataPoint[] = data.map((point, index) => {
        if (index === 0) {
            return {
                ...point,
                gain: point.value,
                loss: undefined,
                change: 0
            };
        }
        const prevValue = data[index - 1].value;
        const isUp = point.value >= prevValue;
        return {
            ...point,
            gain: isUp ? point.value : undefined,
            loss: !isUp ? point.value : undefined,
            prevValue,
            change: point.value - prevValue,
        };
    });

    // Color based on overall performance
    const mainColor = isOverallPositive ? '#10b981' : '#ef4444';
    const gradientId = isOverallPositive ? 'greenGradient' : 'redGradient';

    return (
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700/50 shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
                Portfolio Performance
                <span className={`ml-auto text-sm font-medium ${isOverallPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isOverallPositive ? '↑' : '↓'} {formatValue(lastValue - firstValue)}
                    ({((lastValue - firstValue) / firstValue * 100).toFixed(2)}%)
                </span>
            </h3>

            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={enhancedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                            </linearGradient>
                            <linearGradient id="redGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="date"
                            tickFormatter={formatDate}
                            stroke="#64748b"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            tickFormatter={formatValue}
                            stroke="#64748b"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            width={80}
                            domain={[yMin, yMax]}
                            tickCount={5}
                        />
                        <ReferenceLine y={firstValue} stroke="#64748b" strokeDasharray="3 3" />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1e293b',
                                border: '1px solid #334155',
                                borderRadius: '0.75rem',
                                color: '#f8fafc',
                            }}
                            formatter={(value, name, props) => {
                                const point = props.payload as EnhancedDataPoint;
                                const changeStr = point.change !== undefined && point.change !== 0
                                    ? ` (${point.change >= 0 ? '+' : ''}€${point.change.toFixed(2)})`
                                    : '';
                                return [formatValue(value as number) + changeStr, 'Valore'];
                            }}
                            labelFormatter={(label) => new Date(label).toLocaleDateString('it-IT', {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric'
                            })}
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={mainColor}
                            strokeWidth={2}
                            fillOpacity={1}
                            fill={`url(#${gradientId})`}
                            dot={(props) => {
                                const { cx, cy, payload, index } = props;
                                if (index === 0) return null;
                                const isUp = payload.change >= 0;
                                return (
                                    <circle
                                        cx={cx}
                                        cy={cy}
                                        r={4}
                                        fill={isUp ? '#10b981' : '#ef4444'}
                                        stroke={isUp ? '#10b981' : '#ef4444'}
                                        strokeWidth={2}
                                    />
                                );
                            }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
