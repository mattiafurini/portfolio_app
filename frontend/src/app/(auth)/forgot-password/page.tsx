
'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';
            const res = await fetch(`${API_BASE}/auth/forgot-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            if (!res.ok) {
                throw new Error('Failed to send request');
            }

            setMessage('If an account exists with this email, you will receive a password reset link.');
        } catch (err: any) {
            setError(err.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
                        Reset your password
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                        Enter your email address and we will send you a link to reset your password.
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label htmlFor="email-address" className="sr-only">
                                Email address
                            </label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    {message && (
                        <div className="text-green-500 text-sm text-center bg-green-100 dark:bg-green-900/30 p-2 rounded">
                            {message}
                        </div>
                    )}

                    {error && (
                        <div className="text-red-500 text-sm text-center bg-red-100 dark:bg-red-900/30 p-2 rounded">
                            {error}
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
                        >
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                    </div>

                    <div className="text-sm text-center">
                        <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                            Back to Sign in
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
