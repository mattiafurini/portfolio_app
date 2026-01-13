'use client';

import { PortfolioSummary } from '@/lib/api';

interface PortfolioCardProps {
    summary: PortfolioSummary | null;
    loading: boolean;
}

export default function PortfolioCard({ summary, loading }: PortfolioCardProps) {
    if (loading) {
        return (
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700/50 shadow-xl animate-pulse">
                <div className="h-4 bg-slate-700 rounded w-32 mb-4" />
                <div className="h-10 bg-slate-700 rounded w-48 mb-2" />
                <div className="h-4 bg-slate-700 rounded w-24" />
            </div>
        );
    }

    if (!summary) {
        return (
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700/50 shadow-xl">
                <p className="text-slate-400">No data available. Upload a Fineco file to get started.</p>
            </div>
        );
    }

    const isPositive = summary.totalProfitLoss >= 0;

    return (
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700/50 shadow-xl">
            <h3 className="text-slate-400 text-sm font-medium mb-2">Portfolio Value</h3>

            <div className="flex items-baseline gap-4 mb-4">
                <span className="text-4xl font-bold text-white">
                    €{summary.totalValue.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className={`text-lg font-semibold flex items-center gap-1 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isPositive ? '↑' : '↓'}
                    {summary.totalProfitLossPercent.toFixed(2)}%
                </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/50 rounded-xl p-4">
                    <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Total Cost</p>
                    <p className="text-white font-semibold">
                        €{summary.totalCost.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4">
                    <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Profit/Loss</p>
                    <p className={`font-semibold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isPositive ? '+' : ''}€{summary.totalProfitLoss.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>
            </div>
        </div>
    );
}
