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

function getHeaders() {
    const token = localStorage.getItem('token');
    const headers: HeadersInit = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

export async function getPortfolioSummary(assets?: string[]): Promise<PortfolioSummary> {
    const params = assets?.length ? `?assets=${assets.map(a => encodeURIComponent(a)).join(',')}` : '';
    const res = await fetch(`${API_BASE}/portfolio/summary${params}`, {
        headers: getHeaders(),
    });
    if (!res.ok) {
        if (res.status === 401) throw new Error('Unauthorized');
        throw new Error('Failed to fetch portfolio summary');
    }
    return res.json();
}

export async function getPortfolioHistory(assets?: string[]): Promise<HistoryPoint[]> {
    const params = assets?.length ? `?assets=${assets.map(a => encodeURIComponent(a)).join(',')}` : '';
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

export async function getTransactions(limit?: number): Promise<Transaction[]> {
    const params = limit ? `?limit=${limit}` : '';
    const res = await fetch(`${API_BASE}/portfolio/transactions${params}`, {
        headers: getHeaders(),
    });
    if (!res.ok) {
        if (res.status === 401) throw new Error('Unauthorized');
        throw new Error('Failed to fetch transactions');
    }
    return res.json();
}

export async function uploadFinecoFile(file: File): Promise<{ success: boolean; message: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/upload/fineco`, {
        method: 'POST',
        headers: {
            // FormData automatically sets Content-Type to multipart/form-data
            ...getHeaders(),
        },
        body: formData,
    });

    if (!res.ok) throw new Error('Failed to upload file');
    return res.json();
}
