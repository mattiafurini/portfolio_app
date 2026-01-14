'use client';

import { useState, useEffect, useMemo } from 'react';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, ReferenceArea } from 'recharts';
import { HistoryPoint } from '@/lib/api';

interface PerformanceChartProps {
    data: HistoryPoint[];
    loading: boolean;
    totalCost?: number;
    range?: '1M' | '3M' | '6M' | 'YTD' | '1Y' | 'ALL';
    onRangeChange?: (range: '1M' | '3M' | '6M' | 'YTD' | '1Y' | 'ALL') => void;
    onViewChange?: (start: string, end: string) => void;
}

interface EnhancedDataPoint extends HistoryPoint {
    gain?: number;
    loss?: number;
    prevValue?: number;
    change?: number;
}

export default function PerformanceChart({ data, loading, totalCost, range: propRange, onRangeChange, onViewChange }: PerformanceChartProps) {
    const [internalRange, setInternalRange] = useState<'1M' | '3M' | '6M' | 'YTD' | '1Y' | 'ALL'>('ALL');
    const [interval, setInterval] = useState<'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'>('WEEKLY');

    // Use prop if available, otherwise internal state
    const range = propRange || internalRange;

    const [refAreaLeft, setRefAreaLeft] = useState<string | null>(null);
    const [refAreaRight, setRefAreaRight] = useState<string | null>(null);
    const [left, setLeft] = useState<string | 'dataMin'>('dataMin');
    const [right, setRight] = useState<string | 'dataMax'>('dataMax');
    const [isZoomed, setIsZoomed] = useState(false);

    // Calculate history duration in days
    const historyDurationDays = data.length > 1
        ? (new Date(data[data.length - 1].date).getTime() - new Date(data[0].date).getTime()) / (1000 * 3600 * 24)
        : 0;

    // Update interval default when range changes
    // This provides a good default but allows user override
    const handleRangeChange = (newRange: typeof range) => {
        if (onRangeChange) {
            onRangeChange(newRange);
        } else {
            setInternalRange(newRange);
        }

        const isLongRange = ['3M', '6M', 'YTD', '1Y'].includes(newRange) || (newRange === 'ALL' && historyDurationDays > 30);

        // If switching to a long range
        // and current interval is DAILY, switch to WEEKLY
        if (isLongRange) {
            if (interval === 'DAILY') {
                setInterval('WEEKLY');
            }
            // Do not force change if already on WEEKLY or MONTHLY
        } else if (newRange === '1M' || (newRange === 'ALL' && historyDurationDays <= 30)) {
            // For short ranges, always allow/default to DAILY
            if (interval !== 'DAILY') setInterval('DAILY');
        }
    };

    // Map API ranges to Display labels
    const rangeLabels: Record<string, string> = {
        '1M': '1M',
        '3M': '3M',
        '6M': '6M',
        'YTD': 'YTD',
        '1Y': '1Y',
        'ALL': 'ALL'
    };

    // FILTER DATA BASED ON RANGE
    const filteredData = useMemo(() => {
        if (!data) return [];
        return data.filter(d => {
            if (range === 'ALL') return true;

            const date = new Date(d.date);
            const now = new Date();
            const start = new Date();

            switch (range) {
                case '1M': start.setMonth(now.getMonth() - 1); break;
                case '3M': start.setMonth(now.getMonth() - 3); break;
                case '6M': start.setMonth(now.getMonth() - 6); break;
                case 'YTD': start.setMonth(0, 1); break; // Jan 1st of current year
                case '1Y': start.setFullYear(now.getFullYear() - 1); break;
            }

            // Reset hours to compare dates properly
            start.setHours(0, 0, 0, 0);
            return date >= start;
        });
    }, [data, range]);

    // Zoom Logic Helper
    // const getAxisYDomain = ... (commented out) ...

    const zoom = () => {
        if (refAreaLeft === refAreaRight || refAreaRight === null || refAreaLeft === null) {
            setRefAreaLeft(null);
            setRefAreaRight(null);
            return;
        }

        // Ensure left is smaller than right for domain
        let leftLabel = refAreaLeft;
        let rightLabel = refAreaRight;

        // Find indices in filteredData to sort correctly if dragging backwards
        const leftIndex = filteredData.findIndex(d => d.date === refAreaLeft);
        const rightIndex = filteredData.findIndex(d => d.date === refAreaRight);

        if (leftIndex > rightIndex) {
            [leftLabel, rightLabel] = [refAreaRight, refAreaLeft];
        }

        setRefAreaLeft(null);
        setRefAreaRight(null);
        setLeft(leftLabel);
        setRight(rightLabel);
        setIsZoomed(true);
    };

    const zoomOut = () => {
        setLeft('dataMin');
        setRight('dataMax');
        setIsZoomed(false);
        setRefAreaLeft(null);
        setRefAreaRight(null);
    };

    // Calculate display data
    // If zoomed: show all points in the zoomed range
    // Always apply interval sampling unless interval is DAILY
    const displayData = useMemo(() => {
        if (!filteredData || filteredData.length === 0) return [];

        // First filter by zoom window if applied
        let initialSet = filteredData;
        if (isZoomed && left !== 'dataMin' && right !== 'dataMax') {
            const startIndex = filteredData.findIndex(d => d.date === left);
            const endIndex = filteredData.findIndex(d => d.date === right);
            if (startIndex !== -1 && endIndex !== -1) {
                initialSet = filteredData.slice(
                    Math.min(startIndex, endIndex),
                    Math.max(startIndex, endIndex) + 1
                );
            }
        }

        // Apply sampling ALWAYS (respect user choice)
        if (initialSet.length > 0) {
            return initialSet.filter((d, index, array) => {
                if (index === array.length - 1) return true;
                switch (interval) {
                    case 'MONTHLY': return index % 30 === 0;
                    case 'BIWEEKLY': return index % 14 === 0;
                    case 'WEEKLY': return index % 7 === 0;
                    default: return true;
                }
            });
        }

        return initialSet.length > 0 ? initialSet : (data || []);
    }, [filteredData, isZoomed, left, right, interval, data]);

    // Notify parent of view change
    useEffect(() => {
        if (onViewChange && displayData.length > 0) {
            const start = displayData[0].date;
            const end = displayData[displayData.length - 1].date;
            onViewChange(start, end);
        }
    }, [displayData, onViewChange]);

    if (loading) {
        return (
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700/50 shadow-xl h-80 animate-pulse">
                <div className="flex justify-between mb-4">
                    <div className="h-6 bg-slate-700 rounded w-48" />
                    <div className="h-6 bg-slate-700 rounded w-32" />
                </div>
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
        return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
    };

    const formatValue = (value: number) => {
        return `€${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // Calculate Y-axis domain with padding based on DISPLAY DATA
    const values = displayData.map(d => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const rangeVal = maxValue - minValue;
    const padding = rangeVal < maxValue * 0.01 ? maxValue * 0.005 : rangeVal * 0.1;
    const yMin = Math.max(0, minValue - padding);
    const yMax = maxValue + padding;

    // Determine trend and baseline
    const lastValue = displayData[displayData.length - 1]?.value || 0;

    // If zoomed, always use start of zoomed period as baseline
    // If range is ALL and NOT zoomed, use totalCost (lifetime performance)
    // Otherwise use start of displayed period
    const baselineValue = (range === 'ALL' && totalCost !== undefined && !isZoomed)
        ? totalCost
        : (displayData[0]?.value || 0);
    const changeValue = lastValue - baselineValue;
    const isOverallPositive = changeValue >= 0;

    // Enhance data with gain/loss for coloring
    const enhancedData: EnhancedDataPoint[] = displayData.map((point, index) => {
        if (index === 0) {
            return {
                ...point,
                gain: point.value,
                loss: undefined,
                change: 0
            };
        }
        const prevValue = displayData[index - 1].value;
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                        </svg>
                        Portfolio Performance
                    </h3>
                    <p className={`text-sm font-medium mt-1 ${isOverallPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isOverallPositive ? '↑' : '↓'} {formatValue(Math.abs(changeValue))}
                        <span className="opacity-75 ml-1">
                            ({baselineValue > 0 ? ((changeValue / baselineValue) * 100).toFixed(2) : '0.00'}%)
                        </span>
                    </p>
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                    {/* Zoom Reset Button */}
                    {isZoomed && (
                        <button
                            onClick={zoomOut}
                            title="Reset Zoom"
                            className="bg-slate-700/50 hover:bg-slate-600 text-white p-1.5 rounded-md transition-colors border border-slate-600 flex items-center justify-center"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                            </svg>
                        </button>
                    )}

                    {/* Interval Selector */}
                    <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700/50 mr-2">
                        {(['DAILY', 'WEEKLY', 'MONTHLY'] as const).map((int) => {
                            const isLongRange = ['3M', '6M', 'YTD', '1Y'].includes(range) || (range === 'ALL' && historyDurationDays > 30);
                            const isDailyDisabled = int === 'DAILY' && isLongRange;

                            return (
                                <button
                                    key={int}
                                    onClick={() => !isDailyDisabled && setInterval(int)}
                                    disabled={isDailyDisabled}
                                    className={`px-2 py-1 text-[10px] font-medium rounded-md transition-all ${interval === int
                                        ? 'bg-slate-600 text-white shadow-sm'
                                        : isDailyDisabled
                                            ? 'text-slate-600 cursor-not-allowed'
                                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                                        }`}
                                >
                                    {int === 'DAILY' ? '1D' : int === 'WEEKLY' ? '1W' : '1M'}
                                </button>
                            );
                        })}
                    </div>

                    {/* Range Selector */}
                    <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700/50">
                        {(['1M', '3M', '6M', 'YTD', '1Y', 'ALL'] as const).map((r) => {
                            let isDisabled = false;
                            if (data.length > 0 && r !== 'ALL') {
                                const firstHistoryDate = new Date(data[0].date);
                                const now = new Date();
                                const rangeStart = new Date();

                                switch (r) {
                                    case '1M': rangeStart.setMonth(now.getMonth() - 1); break;
                                    case '3M': rangeStart.setMonth(now.getMonth() - 3); break;
                                    case '6M': rangeStart.setMonth(now.getMonth() - 6); break;
                                    case 'YTD': rangeStart.setMonth(0, 1); break; // Jan 1st of current year
                                    case '1Y': rangeStart.setFullYear(now.getFullYear() - 1); break;
                                }

                                // Reset hours for fair comparison
                                rangeStart.setHours(0, 0, 0, 0);
                                firstHistoryDate.setHours(0, 0, 0, 0);

                                // If the range start is BEFORE the first data point, disable it
                                // (Exception: YTD is usually always allowed unless data starts AFTER today, which shouldn't happen)
                                if (rangeStart < firstHistoryDate) {
                                    isDisabled = true;
                                }
                            }

                            return (
                                <button
                                    key={r}
                                    onClick={() => {
                                        if (!isDisabled) {
                                            handleRangeChange(r);
                                            zoomOut(); // Reset zoom when changing range
                                        }
                                    }}
                                    disabled={isDisabled}
                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${range === r
                                        ? 'bg-slate-600 text-white shadow-sm'
                                        : isDisabled
                                            ? 'text-slate-600 cursor-not-allowed'
                                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                                        }`}
                                >
                                    {rangeLabels[r] || r}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="h-64 select-none">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={enhancedData}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                        onMouseDown={(e: any) => {
                            if (e && e.activeLabel) setRefAreaLeft(e.activeLabel);
                        }}
                        onMouseMove={(e: any) => {
                            if (refAreaLeft && e && e.activeLabel) setRefAreaRight(e.activeLabel);
                        }}
                        onMouseUp={zoom}
                    >
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
                            minTickGap={30}
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
                                return [formatValue(value as number) + changeStr, 'Value'];
                            }}
                            labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', {
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

                        {(refAreaLeft && refAreaRight) ? (
                            <ReferenceArea
                                yAxisId={0}
                                x1={refAreaLeft}
                                x2={refAreaRight}
                                strokeOpacity={0.3}
                                fill="#8884d8"
                                fillOpacity={0.3}
                            />
                        ) : null}
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
