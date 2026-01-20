
'use client';

import { useState } from 'react';
import { usePortfolio } from '@/context/PortfolioContext';

export default function PortfolioSelector() {
    const { portfolios, currentPortfolio, selectPortfolio, createPortfolio, updatePortfolioName, isLoading } = usePortfolio();
    const [isCreating, setIsCreating] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [newPortfolioName, setNewPortfolioName] = useState('');
    const [editName, setEditName] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPortfolioName.trim()) return;

        await createPortfolio(newPortfolioName);
        setNewPortfolioName('');
        setIsCreating(false);
        setIsOpen(false);
    };

    const handleRename = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editName.trim() || !currentPortfolio) return;

        await updatePortfolioName(currentPortfolio.id, editName);
        setEditName('');
        setIsEditing(false);
    };

    const startEditing = () => {
        if (currentPortfolio) {
            setEditName(currentPortfolio.name);
            setIsEditing(true);
        }
    };

    if (isLoading && !currentPortfolio) return <div className="h-10 w-32 bg-slate-800/50 rounded-xl animate-pulse"></div>;

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-800/50 transition-colors group"
            >
                <div>
                    <h1 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors text-left max-w-[200px] truncate">
                        {currentPortfolio?.name || 'Select Portfolio'}
                    </h1>
                    <p className="text-xs text-slate-500 font-medium text-left">ETF TRACKER</p>
                </div>
                <svg className={`w-5 h-5 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => {
                            setIsOpen(false);
                            setIsCreating(false);
                            setIsEditing(false);
                        }}
                    />
                    <div className="absolute top-full left-0 mt-2 w-72 bg-slate-900 border border-slate-700/50 rounded-xl shadow-xl z-50 overflow-hidden">
                        {isEditing ? (
                            <div className="p-3">
                                <h3 className="text-sm font-medium text-white mb-2">Rename Portfolio</h3>
                                <form onSubmit={handleRename}>
                                    <input
                                        type="text"
                                        placeholder="Portfolio Name"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 mb-2"
                                        autoFocus
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setIsEditing(false)}
                                            className="flex-1 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 text-xs hover:text-white hover:bg-slate-800"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={!editName.trim()}
                                            className="flex-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Save
                                        </button>
                                    </div>
                                </form>
                            </div>
                        ) : !isCreating ? (
                            <>
                                <div className="max-h-60 overflow-y-auto py-1">
                                    {portfolios.map(p => (
                                        <div
                                            key={p.id}
                                            className={`w-full px-4 py-3 flex items-center justify-between group/item hover:bg-slate-800/50 transition-colors ${currentPortfolio?.id === p.id ? 'bg-emerald-500/10' : ''
                                                }`}
                                        >
                                            <button
                                                onClick={() => {
                                                    selectPortfolio(p.id);
                                                    setIsOpen(false);
                                                }}
                                                className={`flex-1 text-left ${currentPortfolio?.id === p.id ? 'text-emerald-400' : 'text-slate-300'}`}
                                            >
                                                <span className="font-medium">{p.name}</span>
                                            </button>

                                            <div className="flex items-center gap-2">
                                                {currentPortfolio?.id === p.id && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            selectPortfolio(p.id); // Ensure selected
                                                            startEditing();
                                                        }}
                                                        className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                                                        title="Rename Portfolio"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                        </svg>
                                                    </button>
                                                )}
                                                {currentPortfolio?.id === p.id && (
                                                    <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="border-t border-slate-700/50 p-2">
                                    <button
                                        onClick={() => setIsCreating(true)}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-dashed border-slate-600 rounded-lg text-slate-400 hover:text-white hover:border-slate-500 hover:bg-slate-800/50 transition-all text-sm"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        New Portfolio
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="p-3">
                                <h3 className="text-sm font-medium text-white mb-2">Create New Portfolio</h3>
                                <form onSubmit={handleCreate}>
                                    <input
                                        type="text"
                                        placeholder="Portfolio Name"
                                        value={newPortfolioName}
                                        onChange={(e) => setNewPortfolioName(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 mb-2"
                                        autoFocus
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setIsCreating(false)}
                                            className="flex-1 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 text-xs hover:text-white hover:bg-slate-800"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={!newPortfolioName.trim()}
                                            className="flex-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Create
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
