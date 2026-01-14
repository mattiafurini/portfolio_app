import { PortfolioSummary, HistoryPoint, Transaction } from './api';

export const MOCK_SUMMARY: PortfolioSummary = {
    totalValue: 24560.85,
    totalCost: 21500.00,
    totalProfitLoss: 3060.85,
    totalProfitLossPercent: 14.23,
    holdings: [
        {
            id: '1',
            name: 'iShares Core S&P 500 UCITS ETF',
            quantity: 45,
            avgPrice: 420.50,
            totalCost: 18922.50,
            currentPrice: 485.30,
            currentValue: 21838.50,
            profitLoss: 2916.00,
            profitLossPercent: 15.41
        },
        {
            id: '2',
            name: 'Vanguard FTSE All-World UCITS ETF',
            quantity: 25,
            avgPrice: 103.10,
            totalCost: 2577.50,
            currentPrice: 108.89,
            currentValue: 2722.35,
            profitLoss: 144.85,
            profitLossPercent: 5.62
        }
    ]
};

// Generate a realistic looking 1-year curve
const generateHistory = (): HistoryPoint[] => {
    const points: HistoryPoint[] = [];
    const days = 365;
    const startValue = 21500;
    const endValue = 24560.85;

    // Create a curve that combines linear trend with random noise and sine wave for realism
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - days);

    for (let i = 0; i <= days; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);

        // Linear progress (0 to 1)
        const progress = i / days;

        // Base linear trend
        const trend = startValue + (endValue - startValue) * progress;

        // Add random noise that decreases slightly towards the end to ensure we hit target roughly
        // But we will force the exact target at the end anyway, just reducing noise magnitude
        // Noise: Sine wave + Random walk
        const noiseValues = Math.sin(progress * Math.PI * 4) * 300; // Large waves
        const randomJitter = (Math.random() - 0.5) * 150; // Daily jitter

        // Damping factor: reduce noise influence as we get closer to end to avoid sharp jumps
        const damping = 1 - Math.pow(progress, 4); // Stays 1 for long, drops at end

        let value = trend + (noiseValues + randomJitter) * damping;

        // Force exact start and end
        if (i === 0) value = startValue;
        if (i === days) value = endValue;

        points.push({
            date: date.toISOString().split('T')[0],
            value: Math.max(0, value)
        });
    }
    return points;
};

export const MOCK_HISTORY: HistoryPoint[] = generateHistory();

export const MOCK_TRANSACTIONS: Transaction[] = [
    {
        id: 't1',
        date: new Date().toISOString(),
        type: 'BUY',
        quantity: 5,
        price: 485.20,
        fees: 2.95,
        asset: { name: 'iShares Core S&P 500 UCITS ETF', isin: 'IE00B5BMR087', ticker: 'CSSPX.MI' }
    },
    {
        id: 't2',
        date: new Date(Date.now() - 86400000 * 15).toISOString(), // 15 days ago
        type: 'BUY',
        quantity: 10,
        price: 105.40,
        fees: 2.95,
        asset: { name: 'Vanguard FTSE All-World UCITS ETF', isin: 'IE00B3RBWM25', ticker: 'VWCE.MI' }
    },
    {
        id: 't3',
        date: new Date(Date.now() - 86400000 * 45).toISOString(), // 45 days ago
        type: 'BUY',
        quantity: 10,
        price: 435.00,
        fees: 2.95,
        asset: { name: 'iShares Core S&P 500 UCITS ETF', isin: 'IE00B5BMR087', ticker: 'CSSPX.MI' }
    },
    {
        id: 't4',
        date: new Date(Date.now() - 86400000 * 90).toISOString(),
        type: 'BUY',
        quantity: 15,
        price: 101.20,
        fees: 2.95,
        asset: { name: 'Vanguard FTSE All-World UCITS ETF', isin: 'IE00B3RBWM25', ticker: 'VWCE.MI' }
    },
    {
        id: 't5',
        date: new Date(Date.now() - 86400000 * 120).toISOString(),
        type: 'BUY',
        quantity: 30,
        price: 410.00,
        fees: 5.00,
        asset: { name: 'iShares Core S&P 500 UCITS ETF', isin: 'IE00B5BMR087', ticker: 'CSSPX.MI' }
    }
];
