const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

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

export async function getPortfolioSummary(assets?: string[]): Promise<PortfolioSummary> {
    const params = assets?.length ? `?assets=${assets.map(a => encodeURIComponent(a)).join(',')}` : '';
    const res = await fetch(`${API_BASE}/portfolio/summary${params}`);
    if (!res.ok) throw new Error('Failed to fetch portfolio summary');
    return res.json();
}

export async function getPortfolioHistory(assets?: string[]): Promise<HistoryPoint[]> {
    const params = assets?.length ? `?assets=${assets.map(a => encodeURIComponent(a)).join(',')}` : '';
    const res = await fetch(`${API_BASE}/portfolio/history${params}`);
    if (!res.ok) throw new Error('Failed to fetch portfolio history');
    return res.json();
}

export async function uploadFinecoFile(file: File): Promise<{ success: boolean; message: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/upload/fineco`, {
        method: 'POST',
        body: formData,
    });

    if (!res.ok) throw new Error('Failed to upload file');
    return res.json();
}
