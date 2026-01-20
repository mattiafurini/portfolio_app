const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

export interface AssetHolding {
    id: string;
    name: string;
    quantity: number;
    avgPrice: number;
    totalCost: number;
    currentPrice: number | null;
    currentValue: number | null;
    profitLoss: number | null;
    profitLossPercent: number | null;
}

export interface PortfolioSummary {
    totalValue: number;
    totalCost: number;
    totalProfitLoss: number;
    totalProfitLossPercent: number;
    holdings: AssetHolding[];
}

export interface HistoryPoint {
    date: string;
    value: number;
}

export interface HistoryResponse {
    portfolio: HistoryPoint[];
    assets: Record<string, HistoryPoint[]>;
}

function getHeaders() {
    const token = localStorage.getItem('token');
    const headers: HeadersInit = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

// Portfolios
export interface Portfolio {
    id: string;
    name: string;
    userId: string;
    createdAt: string;
    updatedAt: string;
}

export async function getPortfolios(): Promise<Portfolio[]> {
    const res = await fetch(`${API_BASE}/portfolio/list`, {
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch portfolios');
    return res.json();
}

export async function createPortfolio(name: string): Promise<Portfolio> {
    const res = await fetch(`${API_BASE}/portfolio`, {
        method: 'POST',
        headers: {
            ...getHeaders(),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error('Failed to create portfolio');
    return res.json();
}

export async function updatePortfolio(id: string, name: string): Promise<Portfolio> {
    const res = await fetch(`${API_BASE}/portfolio/${id}`, {
        method: 'PUT',
        headers: {
            ...getHeaders(),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error('Failed to update portfolio');
    return res.json();
}

export async function deletePortfolio(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/portfolio/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete portfolio');
}

// Data Fetching with Portfolio Scope
export async function getPortfolioSummary(assets?: string[], portfolioId?: string): Promise<PortfolioSummary> {
    const queryParts = [];
    if (assets?.length) queryParts.push(`assets=${assets.map(a => encodeURIComponent(a)).join(',')}`);
    if (portfolioId) queryParts.push(`portfolioId=${portfolioId}`);

    const params = queryParts.length ? `?${queryParts.join('&')}` : '';

    const res = await fetch(`${API_BASE}/portfolio/summary${params}`, {
        headers: getHeaders(),
    });
    if (!res.ok) {
        if (res.status === 401) throw new Error('Unauthorized');
        throw new Error('Failed to fetch portfolio summary');
    }
    return res.json();
}

export async function getPortfolioHistory(assets?: string[], portfolioId?: string): Promise<HistoryResponse> {
    const queryParts = [];
    if (assets?.length) queryParts.push(`assets=${assets.map(a => encodeURIComponent(a)).join(',')}`);
    if (portfolioId) queryParts.push(`portfolioId=${portfolioId}`);

    const params = queryParts.length ? `?${queryParts.join('&')}` : '';

    const res = await fetch(`${API_BASE}/portfolio/history${params}`, {
        headers: getHeaders(),
    });
    if (!res.ok) {
        if (res.status === 401) throw new Error('Unauthorized');
        throw new Error('Failed to fetch portfolio history');
    }
    return res.json();
}

export interface Transaction {
    id: string;
    date: string;
    type: 'BUY' | 'SELL';
    quantity: number;
    price: number;
    fees: number;
    asset: {
        name: string;
        isin: string;
        ticker: string | null;
    };
}

export async function getTransactions(limit?: number, portfolioId?: string): Promise<Transaction[]> {
    const queryParts = [];
    if (limit) queryParts.push(`limit=${limit}`);
    if (portfolioId) queryParts.push(`portfolioId=${portfolioId}`);

    const params = queryParts.length ? `?${queryParts.join('&')}` : '';

    const res = await fetch(`${API_BASE}/portfolio/transactions${params}`, {
        headers: getHeaders(),
    });
    if (!res.ok) {
        if (res.status === 401) throw new Error('Unauthorized');
        throw new Error('Failed to fetch transactions');
    }
    return res.json();
}

export async function uploadTransactionFile(file: File, portfolioId?: string): Promise<{ success: boolean; message: string }> {
    const formData = new FormData();
    formData.append('file', file);
    if (portfolioId) {
        formData.append('portfolioId', portfolioId);
    }

    const res = await fetch(`${API_BASE}/upload/transactions`, {
        method: 'POST',
        headers: {
            ...getHeaders(),
        },
        body: formData,
    });

    if (!res.ok) throw new Error('Failed to upload file');
    return res.json();
}

export async function deleteTransaction(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/portfolio/transactions/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
    });

    if (!res.ok) throw new Error('Failed to delete transaction');
}

export async function deleteTransactions(ids: string[]): Promise<void> {
    const res = await fetch(`${API_BASE}/portfolio/transactions/delete`, {
        method: 'POST',
        headers: {
            ...getHeaders(),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids }),
    });

    if (!res.ok) throw new Error('Failed to delete transactions');
}

// Backtesting
export interface BacktestRequest {
    ticker: string;
    initialInvestment: number;
    monthlyContribution: number;
    startDate: string; // YYYY-MM-DD
    endDate?: string;
    currency?: string;
}

export interface BacktestResult {
    ticker: string;
    period: { start: string; end: string; years: number };
    summary: {
        totalInvested: number;
        finalValue: number;
        totalReturn: number;
        totalReturnPercent: number;
        cagr: number;
    };
    chartData: {
        date: string;
        invested: number;
        value: number;
        price: number;
    }[];
}

export async function runBacktest(request: BacktestRequest): Promise<BacktestResult> {
    const res = await fetch(`${API_BASE}/backtest/run`, {
        method: 'POST',
        headers: {
            ...getHeaders(),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Failed to run backtest' }));
        throw new Error(err.message || 'Failed to run backtest');
    }
    return res.json();
}

export interface SearchResult {
    symbol: string;
    longname?: string;
    shortname?: string;
    score: number;
    typeDisp?: string;
    exchange?: string;
}

export async function searchAssets(query: string): Promise<SearchResult[]> {
    if (!query) return [];

    // Check if query is short to avoid spamming the backend
    if (query.length < 2) return [];

    const res = await fetch(`${API_BASE}/backtest/search?q=${encodeURIComponent(query)}`, {
        headers: getHeaders(),
    });

    if (!res.ok) {
        // Silently fail or return empty on search errors
        return [];
    }
    return res.json();
}

export async function getBacktestMetadata(ticker: string) {
    const res = await fetch(`${API_BASE}/backtest/metadata?ticker=${encodeURIComponent(ticker)}`, {
        headers: getHeaders(),
    });
    if (!res.ok) return null;
    return res.json();
}
