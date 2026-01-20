'use client';

import { useState, useEffect, useRef } from 'react';
import { searchAssets, SearchResult } from '@/lib/api';

interface TickerSearchProps {
    value: string;
    onChange: (value: string) => void;
}

export default function TickerSearch({ value, onChange }: TickerSearchProps) {
    const [query, setQuery] = useState(value);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Sync external value changes
    useEffect(() => {
        setQuery(value);
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Debounce search
    useEffect(() => {
        const timeoutId = setTimeout(async () => {
            if (query.trim().length >= 2) {
                setLoading(true);
                try {
                    const data = await searchAssets(query);
                    setResults(data);
                    setIsOpen(true);
                } catch (err) {
                    console.error('Search failed', err);
                } finally {
                    setLoading(false);
                }
            } else {
                setResults([]);
                setIsOpen(false);
            }
        }, 500); // 500ms debounce

        return () => clearTimeout(timeoutId);
    }, [query]);

    const handleSelect = (ticker: string) => {
        onChange(ticker);
        setQuery(ticker);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <input
                type="text"
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 placeholder-slate-600"
                placeholder="Search ETF or Stock (e.g. S&P 500)"
                value={query}
                onChange={e => {
                    setQuery(e.target.value);
                    onChange(e.target.value);
                }}
                onFocus={() => {
                    if (results.length > 0) setIsOpen(true);
                }}
            />
            {loading && (
                <div className="absolute right-3 top-2.5">
                    <svg className="animate-spin h-5 w-5 text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
            )}

            {isOpen && results.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {results.map((result) => (
                        <button
                            key={result.symbol}
                            type="button"
                            className="w-full text-left px-4 py-2 hover:bg-slate-700/50 transition-colors border-b border-slate-700/50 last:border-0"
                            onClick={() => handleSelect(result.symbol)}
                        >
                            <div className="flex justify-between items-center">
                                <span className="font-medium text-white">{result.symbol}</span>
                                <span className="text-xs text-slate-500 bg-slate-900/50 px-2 py-0.5 rounded">{result.typeDisp || 'Asset'}</span>
                            </div>
                            <div className="text-sm text-slate-400 truncate">{result.longname || result.shortname}</div>
                            <div className="text-xs text-slate-600 truncate">{result.exchange}</div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
