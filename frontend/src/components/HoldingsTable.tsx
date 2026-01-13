'use client';

import { AssetHolding } from '@/lib/api';

interface HoldingsTableProps {
    holdings: AssetHolding[];
    loading: boolean;
}

export default function HoldingsTable({ holdings, loading }: HoldingsTableProps) {
    if (loading) {
        return (
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700/50 shadow-xl animate-pulse">
                <div className="h-4 bg-slate-700 rounded w-32 mb-4" />
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-12 bg-slate-700/50 rounded mb-2" />
                ))}
            </div>
        );
    }

    if (!holdings || holdings.length === 0) {
        return (
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700/50 shadow-xl">
                <h3 className="text-lg font-semibold text-white mb-4">Holdings</h3>
                <p className="text-slate-400">No holdings to display</p>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700/50 shadow-xl overflow-hidden">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Holdings
            </h3>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="text-slate-400 text-xs uppercase tracking-wider border-b border-slate-700/50">
                            <th className="text-left py-3 px-2">Asset</th>
                            <th className="text-right py-3 px-2">Qty</th>
                            <th className="text-right py-3 px-2">Avg Price</th>
                            <th className="text-right py-3 px-2">Total Cost</th>
                            <th className="text-right py-3 px-2">P/L %</th>
                        </tr>
                    </thead>
                    <tbody>
                        {holdings.map((holding) => {
                            const isPositive = (holding.profitLossPercent ?? 0) >= 0;
                            return (
                                <tr key={holding.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                                    <td className="py-3 px-2">
                                        <span className="text-white font-medium text-sm">{holding.name}</span>
                                    </td>
                                    <td className="py-3 px-2 text-right text-slate-300 text-sm">
                                        {holding.quantity.toLocaleString('it-IT')}
                                    </td>
                                    <td className="py-3 px-2 text-right text-slate-300 text-sm">
                                        €{holding.avgPrice.toFixed(2)}
                                    </td>
                                    <td className="py-3 px-2 text-right text-white text-sm font-medium">
                                        €{holding.totalCost.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className={`py-3 px-2 text-right text-sm font-semibold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {holding.profitLossPercent !== null
                                            ? `${isPositive ? '+' : ''}${holding.profitLossPercent.toFixed(2)}%`
                                            : '—'
                                        }
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
