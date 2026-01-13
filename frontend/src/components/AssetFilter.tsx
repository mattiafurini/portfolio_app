'use client';

import { AssetHolding } from '@/lib/api';

interface AssetFilterProps {
    holdings: AssetHolding[];
    selectedAssets: string[];
    onSelectionChange: (assets: string[]) => void;
}

export default function AssetFilter({ holdings, selectedAssets, onSelectionChange }: AssetFilterProps) {
    const toggleAsset = (assetName: string) => {
        if (selectedAssets.includes(assetName)) {
            onSelectionChange(selectedAssets.filter(a => a !== assetName));
        } else {
            onSelectionChange([...selectedAssets, assetName]);
        }
    };

    const selectAll = () => {
        onSelectionChange(holdings.map(h => h.name));
    };

    const clearAll = () => {
        onSelectionChange([]);
    };

    return (
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-4 border border-slate-700/50 shadow-xl">
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                    <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    Filtra ETF
                </h4>
                <div className="flex gap-2">
                    <button
                        onClick={selectAll}
                        className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                    >
                        Tutti
                    </button>
                    <button
                        onClick={clearAll}
                        className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                    >
                        Nessuno
                    </button>
                </div>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
                {holdings.map((holding) => {
                    const isSelected = selectedAssets.includes(holding.name);
                    const shortName = holding.name.length > 30
                        ? holding.name.substring(0, 30) + '...'
                        : holding.name;

                    return (
                        <label
                            key={holding.id}
                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${isSelected
                                    ? 'bg-emerald-500/20 border border-emerald-500/30'
                                    : 'bg-slate-700/30 border border-slate-700/50 hover:bg-slate-700/50'
                                }`}
                        >
                            <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleAsset(holding.name)}
                                className="sr-only"
                            />
                            <div className={`w-4 h-4 rounded flex items-center justify-center ${isSelected ? 'bg-emerald-500' : 'bg-slate-600'
                                }`}>
                                {isSelected && (
                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </div>
                            <span className={`text-sm ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                                {shortName}
                            </span>
                        </label>
                    );
                })}
            </div>

            {selectedAssets.length > 0 && selectedAssets.length < holdings.length && (
                <p className="text-xs text-slate-500 mt-2">
                    {selectedAssets.length} di {holdings.length} selezionati
                </p>
            )}
        </div>
    );
}
