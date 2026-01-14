
'use client';

import { useState, useEffect, useCallback } from 'react';
import { getPortfolioSummary, getPortfolioHistory, getTransactions, PortfolioSummary, HistoryPoint, Transaction } from '@/lib/api';
import { MOCK_SUMMARY, MOCK_HISTORY, MOCK_TRANSACTIONS } from '@/lib/demoData';
import PortfolioCard from '@/components/PortfolioCard';
import PerformanceChart from '@/components/PerformanceChart';
import HoldingsTable from '@/components/HoldingsTable';
import FileUpload from '@/components/FileUpload';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { user, token, logout, isAuthenticated } = useAuth();
  const router = useRouter();

  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [chartLoading, setChartLoading] = useState(false);

  // Demo mode check
  const isDemo = !token;

  // Authentication check - REMOVED strictly forcing login
  // We now allow access without token (Demo Mode)
  useEffect(() => {
    // Optional: Redirect to login if user explicitly logged out? 
    // No, we want to show landing page.
  }, []);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);

    if (isDemo) {
      // Load Mock Data
      // Artificial delay for realism
      setTimeout(() => {
        setSummary(MOCK_SUMMARY);
        const assetNames = MOCK_SUMMARY.holdings.map(h => h.name);
        setSelectedAssets(assetNames);
        setHistory(MOCK_HISTORY);
        setRecentTransactions(MOCK_TRANSACTIONS);
        setLoading(false);
      }, 800);
      return;
    }

    try {
      const summaryData = await getPortfolioSummary();
      setSummary(summaryData);

      // Initialize selected assets to all assets
      const assetNames = summaryData.holdings.map(h => h.name);
      setSelectedAssets(assetNames);

      // Fetch history for all assets
      const historyData = await getPortfolioHistory();
      setHistory(historyData);

      // Fetch last 5 transactions
      const txData = await getTransactions(5);
      setRecentTransactions(txData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      if (!isDemo) setLoading(false);
    }
  }, [token, isDemo]);

  // Fetch history when filter changes
  const fetchHistoryForFilter = useCallback(async (assets: string[]) => {
    if (isDemo) return; // Disable historical filtering in demo for simplicity

    if (assets.length === 0) {
      setHistory([]);
      return;
    }

    setChartLoading(true);
    try {
      const historyData = await getPortfolioHistory(assets);
      setHistory(historyData);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setChartLoading(false);
    }
  }, []);

  // Handle filter change
  const toggleAsset = (assetName: string) => {
    let newSelection: string[];
    if (selectedAssets.includes(assetName)) {
      newSelection = selectedAssets.filter(a => a !== assetName);
    } else {
      newSelection = [...selectedAssets, assetName];
    }
    setSelectedAssets(newSelection);
    fetchHistoryForFilter(newSelection);
  };

  const selectAllAssets = () => {
    const allAssets = summary?.holdings.map(h => h.name) || [];
    setSelectedAssets(allAssets);
    fetchHistoryForFilter(allAssets);
  };

  const deselectAllAssets = () => {
    setSelectedAssets([]);
    fetchHistoryForFilter([]);
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Short name helper
  const getShortName = (name: string) => {
    // Extract key words from ETF name
    if (name.includes('S&P 500')) return 'S&P 500';
    if (name.includes('Overnight')) return 'EUR Overnight';
    if (name.includes('Stoxx Europe')) return 'Stoxx Europe 600';
    if (name.includes('Emerging')) return 'Emerging Markets';
    if (name.includes('MSCI World')) return 'MSCI World';
    if (name.includes('All-World')) return 'All-World';
    return name.substring(0, 15) + '...';
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-slate-800/50 backdrop-blur-sm bg-slate-900/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">ETF Portfolio Tracker</h1>
                  <p className="text-slate-500 text-sm">Track your investments</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {isDemo ? (
                  <>
                    <button
                      onClick={() => router.push('/login')}
                      className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                    >
                      Login
                    </button>
                    <button
                      onClick={() => router.push('/register')}
                      className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-blue-600 text-white text-sm font-medium rounded-lg hover:shadow-lg hover:shadow-emerald-500/20 transition-all"
                    >
                      Sign Up
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-sm text-gray-400 hidden sm:block">{user?.email}</span>

                    <button
                      onClick={logout}
                      className="px-3 py-1.5 border border-red-500/30 text-red-400 text-sm font-medium rounded-lg hover:bg-red-500/10 transition-colors"
                    >
                      Logout
                    </button>
                    <button
                      onClick={fetchData}
                      disabled={loading}
                      className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-2 text-sm"
                    >
                      <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              <PortfolioCard summary={summary} loading={loading} />

              {/* Chart + Filter */}
              <div className="space-y-3">
                <PerformanceChart
                  data={history}
                  loading={loading || chartLoading}
                  totalCost={summary?.holdings
                    .filter(h => selectedAssets.includes(h.name))
                    .reduce((sum, h) => sum + h.totalCost, 0)
                  }
                />

                {/* ETF Filter Pills - Under Chart */}
                {summary && summary.holdings.length > 0 && (
                  <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/30">
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="text-xs text-slate-500 mr-2">Filter:</span>
                      {summary.holdings.map((holding) => {
                        const isSelected = selectedAssets.includes(holding.name);
                        const profitPercent = holding.profitLossPercent ?? 0;

                        return (
                          <button
                            key={holding.id}
                            onClick={() => toggleAsset(holding.name)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${isSelected
                              ? profitPercent >= 0
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                                : 'bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30'
                              : 'bg-slate-700/50 text-slate-500 border border-slate-600/30 hover:bg-slate-700 hover:text-slate-300'
                              }`}
                          >
                            {getShortName(holding.name)}
                            {isSelected && (
                              <span className={`ml-1 ${profitPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {profitPercent >= 0 ? '+' : ''}{profitPercent.toFixed(1)}%
                              </span>
                            )}
                          </button>
                        );
                      })}

                      {selectedAssets.length > 0 && (
                        <button
                          onClick={deselectAllAssets}
                          className="px-2 py-1 rounded text-xs text-slate-400 hover:text-white transition-colors"
                        >
                          Deselect All
                        </button>
                      )}

                      {selectedAssets.length < (summary?.holdings.length ?? 0) && (
                        <button
                          onClick={selectAllAssets}
                          className="px-2 py-1 rounded text-xs text-slate-400 hover:text-white transition-colors"
                        >
                          Select All
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <HoldingsTable holdings={summary?.holdings ?? []} loading={loading} />
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {!isDemo && <FileUpload onUploadSuccess={fetchData} />}

              {isDemo && (
                <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
                  <h3 className="text-white font-semibold mb-2">👋 Welcome to Portfolio Demo</h3>
                  <p className="text-slate-400 text-sm">
                    This is a preview of the dashboard populated with mock data.
                    <span className="text-emerald-400 cursor-pointer hover:underline ml-1" onClick={() => router.push('/register')}>Sign up</span> to create your real portfolio.
                  </p>
                </div>
              )}

              {/* Quick Stats */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700/50 shadow-xl">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Quick Stats
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                    <span className="text-slate-400 text-sm">ETF Totali</span>
                    <span className="text-white font-medium">{summary?.holdings.length ?? 0}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                    <span className="text-slate-400 text-sm">Nel Grafico</span>
                    <span className="text-white font-medium">{selectedAssets.length}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                    <span className="text-slate-400 text-sm">Punti Dati</span>
                    <span className="text-white font-medium">{history.length}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-slate-400 text-sm">Ultimo Agg.</span>
                    <span className="text-white font-medium">{loading ? '-' : 'Ora'}</span>
                  </div>
                </div>
              </div>

              {/* Recent Transactions Widget */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700/50 shadow-xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Last Transactions
                  </h3>
                  <button
                    onClick={() => router.push('/transactions')}
                    className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    View All
                  </button>
                </div>

                <div className="space-y-3">
                  {recentTransactions.map((tx) => (
                    <div key={tx.id} className="flex justify-between items-center py-2 border-b border-slate-700/30 text-sm last:border-0">
                      <div>
                        <div className="text-slate-200 font-medium">{getShortName(tx.asset.name)}</div>
                        <div className="text-xs text-slate-500">{new Date(tx.date).toLocaleDateString()}</div>
                      </div>
                      <div className="text-right">
                        <div className={`font-medium ${tx.type === 'BUY' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {tx.type === 'BUY' ? '+' : '-'}{tx.quantity.toFixed(2)}
                        </div>
                        <div className="text-xs text-slate-400">€{tx.price.toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
                  {recentTransactions.length === 0 && (
                    <div className="text-center text-slate-500 text-sm py-4">No transactions yet.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
