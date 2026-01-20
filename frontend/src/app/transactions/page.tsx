'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { usePortfolio } from '@/context/PortfolioContext';
import { getTransactions, deleteTransaction, deleteTransactions, Transaction } from '@/lib/api';
import Header from '@/components/Header';

export default function TransactionsPage() {
    const { token } = useAuth();
    const { currentPortfolio, isLoading: isPortfolioLoading } = usePortfolio();
    const router = useRouter();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const fetchTx = useCallback(async () => {
        if (!currentPortfolio?.id) return;

        try {
            setLoading(true);
            const data = await getTransactions(undefined, currentPortfolio.id);
            setTransactions(data);
            setSelectedIds(new Set()); // Reset selection on refresh
        } catch (error) {
            console.error('Failed to fetch transactions:', error);
        } finally {
            setLoading(false);
        }
    }, [currentPortfolio]);

    useEffect(() => {
        if (!localStorage.getItem('token')) {
            router.push('/login');
            return;
        }

        if (token && !isPortfolioLoading && currentPortfolio) {
            fetchTx();
        }
    }, [token, router, isPortfolioLoading, currentPortfolio, fetchTx]);

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this transaction? This action cannot be undone.')) {
            return;
        }

        try {
            await deleteTransaction(id);
            setTransactions(prev => prev.filter(tx => tx.id !== id));
            setSelectedIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        } catch (error) {
            console.error('Failed to delete transaction:', error);
            alert('Failed to delete transaction. Please try again.');
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;

        if (!confirm(`Are you sure you want to delete these ${selectedIds.size} transactions?`)) {
            return;
        }

        try {
            await deleteTransactions(Array.from(selectedIds));
            setTransactions(prev => prev.filter(tx => !selectedIds.has(tx.id)));
            setSelectedIds(new Set());
        } catch (error) {
            console.error('Failed to delete transactions:', error);
            alert('Failed to delete transactions. Please try again.');
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === transactions.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(transactions.map(tx => tx.id)));
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('it-IT', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatCurrency = (val: number) => {
        return `€${val.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    if (!token) return null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
            <Header />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-slate-900/50 rounded-2xl border border-slate-800/50 overflow-hidden shadow-xl">
                    <div className="p-6 border-b border-slate-800/50 flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-white">Trade History</h2>
                        {selectedIds.size > 0 && (
                            <button
                                onClick={handleBulkDelete}
                                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete Selected ({selectedIds.size})
                            </button>
                        )}
                    </div>

                    {loading ? (
                        <div className="p-12 text-center text-slate-500 animate-pulse">Loading transactions...</div>
                    ) : transactions.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">No transactions found.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-800/50 bg-slate-900/50">
                                        <th className="px-6 py-4 w-4">
                                            <div className="relative flex items-center justify-center">
                                                <input
                                                    type="checkbox"
                                                    className="peer appearance-none w-5 h-5 rounded-md border-2 border-slate-600 bg-slate-800/50 checked:bg-emerald-500 checked:border-emerald-500 focus:ring-0 focus:outline-none transition-all cursor-pointer"
                                                    checked={transactions.length > 0 && selectedIds.size === transactions.length}
                                                    onChange={toggleSelectAll}
                                                />
                                                <svg className="absolute w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-[30%]">Asset</th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Type</th>
                                        <th className="px-6 py-4 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Quantity</th>
                                        <th className="px-6 py-4 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Price</th>
                                        <th className="px-6 py-4 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Total</th>
                                        <th className="px-6 py-4 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Fees</th>
                                        <th className="px-6 py-4 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {transactions.map((tx) => (
                                        <tr key={tx.id} className={`hover:bg-slate-800/30 transition-colors group ${selectedIds.has(tx.id) ? 'bg-emerald-500/5' : ''}`}>
                                            <td className="px-6 py-4 w-4">
                                                <div className="relative flex items-center justify-center">
                                                    <input
                                                        type="checkbox"
                                                        className="peer appearance-none w-5 h-5 rounded-md border-2 border-slate-600 bg-slate-800/50 checked:bg-emerald-500 checked:border-emerald-500 focus:ring-0 focus:outline-none transition-all cursor-pointer hover:border-slate-500"
                                                        checked={selectedIds.has(tx.id)}
                                                        onChange={() => toggleSelect(tx.id)}
                                                    />
                                                    <svg className="absolute w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                                                {formatDate(tx.date)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap max-w-[200px]">
                                                <div className="text-sm font-medium text-white truncate" title={tx.asset.name}>{tx.asset.name}</div>
                                                <div className="text-xs text-slate-500 truncate">{tx.asset.isin}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${tx.type === 'BUY'
                                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                                    }`}>
                                                    {tx.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300 text-right">
                                                {tx.quantity.toFixed(4)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300 text-right">
                                                {formatCurrency(tx.price)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white text-right">
                                                {formatCurrency(tx.quantity * tx.price)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 text-right">
                                                {formatCurrency(tx.fees)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    onClick={() => handleDelete(tx.id)}
                                                    className="text-slate-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-1"
                                                    title="Delete transaction"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
