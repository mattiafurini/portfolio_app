
'use client';

import { useState, useEffect, useCallback } from 'react';
import { getPortfolioSummary, getPortfolioHistory, getTransactions, PortfolioSummary, HistoryPoint, Transaction } from '@/lib/api';
import { MOCK_SUMMARY, MOCK_HISTORY, MOCK_ASSETS_HISTORY, MOCK_TRANSACTIONS } from '@/lib/demoData';
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
  const [assetsHistory, setAssetsHistory] = useState<Record<string, HistoryPoint[]>>({});
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [range, setRange] = useState<'1M' | '3M' | '6M' | 'YTD' | '1Y' | 'ALL'>('ALL');
  const [viewRange, setViewRange] = useState<{ start: string; end: string } | null>(null);

  // Demo mode check
  const isDemo = !token;

  // Authentication check - REMOVED strictly forcing login
  // ... (useEffect remains same)

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
        setAssetsHistory(MOCK_ASSETS_HISTORY);
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
      const historyRes = await getPortfolioHistory();
      setHistory(historyRes.portfolio);
      setAssetsHistory(historyRes.assets);

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
      const historyRes = await getPortfolioHistory(assets);
      setHistory(historyRes.portfolio);
      setAssetsHistory(historyRes.assets);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setChartLoading(false);
    }
  }, []);

  // Handle Chart View Change (Zoom or Range Filter)
  const handleViewChange = useCallback((start: string, end: string) => {
    setViewRange({ start, end });
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

  const getShortName = (name: string) => {
    // ... (remains same) ...
    if (name.includes('S&P 500')) return 'S&P 500';
    if (name.includes('Overnight')) return 'EUR Overnight';
    if (name.includes('Stoxx Europe')) return 'Stoxx Europe 600';
    if (name.includes('Emerging')) return 'Emerging Markets';
    if (name.includes('MSCI World')) return 'MSCI World';
    if (name.includes('All-World')) return 'All-World';
    return name.substring(0, 15) + '...';
  };

  // Calculate performance for a specific asset over the selected 'range'
  const getAssetPerformance = (assetName: string, currentProfitPercent: number) => {
    // If we don't have detailed history (e.g. demo mode or failed fetch), return current Total P/L
    if (!assetsHistory || !assetsHistory[assetName]) return currentProfitPercent;

    const assetHist = assetsHistory[assetName];
    if (assetHist.length === 0) return currentProfitPercent;

    // Use actual visible range from chart if available
    let startPrice: number;
    let endPrice: number;

    if (viewRange) {
      // Find exact points matching the view range
      // Since dates are strings YYYY-MM-DD
      const startPoint = assetHist.find(p => p.date >= viewRange.start);
      const endPoint = assetHist.find(p => p.date <= viewRange.end) || assetHist[assetHist.length - 1]; // Fallback to last point if max range

      // Actually we want the price AT the end of the range
      // Find last point <= viewRange.end
      // We iterate backwards or just find
      let foundEnd = assetHist[assetHist.length - 1];
      for (let i = assetHist.length - 1; i >= 0; i--) {
        if (assetHist[i].date <= viewRange.end) {
          foundEnd = assetHist[i];
          break;
        }
      }

      if (!startPoint) return currentProfitPercent;
      startPrice = startPoint.value;
      endPrice = foundEnd.value;
    } else {
      // Fallback to old logic if viewRange not yet ready
      // Find start date based on range
      endPrice = assetHist[assetHist.length - 1].value;
      const now = new Date();
      let startDate = new Date();

      switch (range) {
        case '1M': startDate.setMonth(now.getMonth() - 1); break;
        case '3M': startDate.setMonth(now.getMonth() - 3); break;
        case '6M': startDate.setMonth(now.getMonth() - 6); break;
        case 'YTD': startDate.setMonth(0, 1); break; // Jan 1st
        case '1Y': startDate.setFullYear(now.getFullYear() - 1); break;
        case 'ALL': return currentProfitPercent; // For ALL, we usually default to Total Return since Inception
      }

      startDate.setHours(0, 0, 0, 0);
      const startDateStr = startDate.toISOString().split('T')[0];
      const startPoint = assetHist.find(p => p.date >= startDateStr);

      if (!startPoint) return currentProfitPercent;
      startPrice = startPoint.value;
    }

    return ((endPrice - startPrice) / startPrice) * 100;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* ... */}
      <div className="relative z-10">
        <header className="border-b border-slate-800/50 backdrop-blur-sm bg-slate-900/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Portfolio</h1>
                  <p className="text-xs text-slate-500 font-medium">ETF TRACKER</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {isAuthenticated && (
                  <span className="text-sm text-gray-400 hidden sm:block">{user?.email}</span>
                )}
                {isAuthenticated ? (
                  <button
                    onClick={logout}
                    className="px-3 py-1.5 border border-red-500/30 text-red-400 text-sm font-medium rounded-lg hover:bg-red-500/10 transition-colors"
                  >
                    Logout
                  </button>
                ) : (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => router.push('/login')}
                      className="text-slate-300 hover:text-white text-sm font-medium transition-colors"
                    >
                      Login
                    </button>
                    <button
                      onClick={() => router.push('/register')}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-emerald-600/20"
                    >
                      Sign Up
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <PortfolioCard summary={summary} loading={loading} />

              {/* Chart + Filter */}
              <div className="space-y-3">
                <PerformanceChart
                  key={token ? 'auth' : 'demo'}
                  data={history}
                  loading={loading || chartLoading}
                  totalCost={summary?.holdings
                    .filter(h => selectedAssets.includes(h.name))
                    .reduce((sum, h) => sum + h.totalCost, 0)
                  }
                  range={range}
                  onRangeChange={setRange}
                  onViewChange={handleViewChange}
                />

                {/* ETF Filter Pills - Under Chart */}
                {summary && summary.holdings.length > 0 && (
                  <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/30">
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="text-xs text-slate-500 mr-2">Filter:</span>
                      {summary.holdings.map((holding) => {
                        const isSelected = selectedAssets.includes(holding.name);
                        // Calculate percentage based on selected range if available, else total P/L
                        const profitPercent = getAssetPerformance(holding.name, holding.profitLossPercent ?? 0);

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
                    <span className="text-slate-400 text-sm">Total ETFs</span>
                    <span className="text-white font-medium">{summary?.holdings.length ?? 0}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                    <span className="text-slate-400 text-sm">On Chart</span>
                    <span className="text-white font-medium">{selectedAssets.length}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                    <span className="text-slate-400 text-sm">Data Points</span>
                    <span className="text-white font-medium">{history.length}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-slate-400 text-sm">Last Update</span>
                    <span className="text-white font-medium">{loading ? '-' : 'Now'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
