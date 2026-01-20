'use client';

import { useState, useRef } from 'react';
import { uploadTransactionFile } from '@/lib/api';

interface FileUploadProps {
    onUploadSuccess: () => void;
    portfolioId?: string;
}

export default function FileUpload({ onUploadSuccess, portfolioId }: FileUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setMessage(null);
        setError(null);

        try {
            const result = await uploadTransactionFile(file, portfolioId);
            setMessage(result.message);
            onUploadSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700/50 shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Import Transactions
            </h3>

            <label className="block">
                <div className={`
          border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
          ${uploading
                        ? 'border-emerald-500/50 bg-emerald-500/10'
                        : 'border-slate-600 hover:border-emerald-500/50 hover:bg-slate-800/50'
                    }
        `}>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xls,.xlsx,.csv"
                        onChange={handleFileChange}
                        disabled={uploading}
                        className="hidden"
                    />

                    {uploading ? (
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                            <span className="text-slate-400">Uploading...</span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-slate-700/50 flex items-center justify-center">
                                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </div>
                            <div>
                                <span className="text-emerald-400 font-medium">Click to upload</span>
                                <span className="text-slate-500"> or drag and drop</span>
                            </div>
                            <span className="text-slate-500 text-sm">XLS, XLSX or CSV</span>
                        </div>
                    )}
                </div>
            </label>

            {message && (
                <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
                    ✓ {message}
                </div>
            )}

            {error && (
                <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    ✗ {error}
                </div>
            )}
        </div>
    );
}
