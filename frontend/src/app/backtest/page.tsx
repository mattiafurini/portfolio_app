'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import BacktestChart from '@/components/BacktestChart';
import TickerSearch from '@/components/TickerSearch';
import { runBacktest, BacktestRequest, BacktestResult } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function BacktestPage() {
    const { token } = useAuth();
    const router = useRouter();

    const [form, setForm] = useState<BacktestRequest>({
        ticker: 'SPYL.DE',
        initialInvestment: 1000,
        monthlyContribution: 100,
        startDate: '2020-01-01',
    });

    const [result, setResult] = useState<BacktestResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setResult(null);

        try {
            const data = await runBacktest(form);
            setResult(data);
        } catch (err: any) {
            setError(err.message || 'Backtest failed');
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        // Simple redirect or render null until auth hook handles it
        return null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
            <Header />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-white mb-2">Historical Backtest</h2>
                    <p className="text-slate-400">Simulate investment strategies on historical market data.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Controls */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-slate-900/50 rounded-2xl border border-slate-800/50 p-6 shadow-xl">
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Ticker / Symbol</label>
                                    <TickerSearch
                                        value={form.ticker}
                                        onChange={(val) => setForm({ ...form, ticker: val })}
                                    />
                                    <p className="text-xs text-slate-500 mt-1">Search or use Yahoo Finance tickers directly (e.g. ^GSPC)</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Initial Investment (€)</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                        value={form.initialInvestment}
                                        onChange={e => setForm({ ...form, initialInvestment: Number(e.target.value) })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Monthly Contribution (€)</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                        value={form.monthlyContribution}
                                        onChange={e => setForm({ ...form, monthlyContribution: Number(e.target.value) })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                        value={form.startDate}
                                        onChange={e => setForm({ ...form, startDate: e.target.value })}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 rounded-lg transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
                                >
                                    {loading ? (
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    ) : 'Run Simulation'}
                                </button>
                            </form>

                            {error && (
                                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                                    {error}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Results */}
                    <div className="lg:col-span-3 space-y-6">
                        {!result && !loading && (
                            <div className="bg-slate-900/30 rounded-2xl border border-slate-800/30 p-12 text-center text-slate-500 border-dashed">
                                Configure the simulation parameters on the left to see results.
                            </div>
                        )}

                        {result && (
                            <>
                                {/* Stats Cards */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/50">
                                        <div className="text-slate-400 text-sm mb-1">Total Invested</div>
                                        <div className="text-2xl font-bold text-white">€{result.summary.totalInvested.toLocaleString('it-IT')}</div>
                                    </div>
                                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/50">
                                        <div className="text-slate-400 text-sm mb-1">Final Value</div>
                                        <div className="text-2xl font-bold text-white">€{result.summary.finalValue.toLocaleString('it-IT')}</div>
                                    </div>
                                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/50">
                                        <div className="text-slate-400 text-sm mb-1">Total Return</div>
                                        <div className={`text-2xl font-bold ${result.summary.totalReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {result.summary.totalReturn >= 0 ? '+' : ''}€{result.summary.totalReturn.toLocaleString('it-IT')}
                                        </div>
                                    </div>
                                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/50">
                                        <div className="text-slate-400 text-sm mb-1">Return %</div>
                                        <div className={`text-2xl font-bold ${result.summary.totalReturnPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {result.summary.totalReturnPercent >= 0 ? '+' : ''}{result.summary.totalReturnPercent.toFixed(2)}%
                                        </div>
                                    </div>
                                </div>

                                {/* Chart */}
                                <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800/50 shadow-xl">
                                    <h3 className="text-lg font-semibold text-white mb-6">Performance Growth</h3>
                                    <BacktestChart data={result.chartData} />
                                </div>

                                {/* Details */}
                                <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800/50">
                                    <h3 className="text-lg font-semibold text-white mb-4">Simulation Details</h3>
                                    <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                                        <div className="flex justify-between py-2 border-b border-slate-800">
                                            <span className="text-slate-400">Asset</span>
                                            <span className="text-white font-medium">{result.ticker}</span>
                                        </div>
                                        <div className="flex justify-between py-2 border-b border-slate-800">
                                            <span className="text-slate-400">Period</span>
                                            <span className="text-white font-medium">{result.period.start} to {result.period.end}</span>
                                        </div>
                                        <div className="flex justify-between py-2 border-b border-slate-800">
                                            <span className="text-slate-400">Duration</span>
                                            <span className="text-white font-medium">{result.period.years} Years</span>
                                        </div>
                                        <div className="flex justify-between py-2 border-b border-slate-800">
                                            <span className="text-slate-400">Strategy</span>
                                            <span className="text-white font-medium">
                                                {form.initialInvestment > 0 ? `Initial €${form.initialInvestment}` : ''}
                                                {form.initialInvestment > 0 && form.monthlyContribution > 0 ? ' + ' : ''}
                                                {form.monthlyContribution > 0 ? `€${form.monthlyContribution}/mo DCA` : ''}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
