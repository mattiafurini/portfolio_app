'use client';

import { useAuth } from '@/context/AuthContext';
import PortfolioSelector from './PortfolioSelector';
import { useRouter, usePathname } from 'next/navigation';

export default function Header() {
    const { user, isAuthenticated, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    return (
        <header className="border-b border-slate-800/50 backdrop-blur-sm bg-slate-900/30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 cursor-pointer"
                            onClick={() => router.push('/')}
                        >
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                        </div>
                        {isAuthenticated ? (
                            <PortfolioSelector />
                        ) : (
                            <div>
                                <h1 className="text-xl font-bold text-white">Portfolio</h1>
                                <p className="text-xs text-slate-500 font-medium">ETF TRACKER</p>
                            </div>
                        )}
                        {isAuthenticated && (
                            <div className="flex items-center gap-1 ml-6">
                                <button
                                    onClick={() => router.push('/')}
                                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all border ${pathname === '/'
                                        ? 'bg-slate-800 text-white border-slate-700'
                                        : 'bg-transparent text-slate-400 border-transparent hover:text-white hover:bg-slate-800/50'
                                        }`}
                                >
                                    Dashboard
                                </button>
                                <button
                                    onClick={() => router.push('/transactions')}
                                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all border ${pathname === '/transactions'
                                        ? 'bg-slate-800 text-white border-slate-700'
                                        : 'bg-transparent text-slate-400 border-transparent hover:text-white hover:bg-slate-800/50'
                                        }`}
                                >
                                    Transactions
                                </button>
                                <button
                                    onClick={() => router.push('/backtest')}
                                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all border ${pathname === '/backtest'
                                        ? 'bg-slate-800 text-white border-slate-700'
                                        : 'bg-transparent text-slate-400 border-transparent hover:text-white hover:bg-slate-800/50'
                                        }`}
                                >
                                    Backtest
                                </button>
                            </div>
                        )}
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
    );
}
