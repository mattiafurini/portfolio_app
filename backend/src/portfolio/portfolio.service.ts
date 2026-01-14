import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PricesService } from '../prices/prices.service';

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

@Injectable()
export class PortfolioService {
    constructor(
        private prisma: PrismaService,
        private pricesService: PricesService,
    ) { }

    async getSummary(userId: string, assetFilter?: string[]): Promise<PortfolioSummary> {
        const whereClause: any = { userId };
        if (assetFilter) {
            whereClause.name = { in: assetFilter };
        }

        const assets = await this.prisma.asset.findMany({
            where: whereClause,
            include: {
                transactions: true,
            },
        });

        const holdings: AssetHolding[] = [];
        let totalCost = 0;

        for (const asset of assets) {
            // Calculate net quantity and average price
            let netQuantity = 0;
            let totalBuyCost = 0;
            let totalBuyQuantity = 0;

            for (const tx of asset.transactions) {
                if (tx.type === 'BUY') {
                    netQuantity += tx.quantity;
                    totalBuyCost += tx.quantity * tx.price;
                    totalBuyQuantity += tx.quantity;
                } else {
                    netQuantity -= tx.quantity;
                }
            }

            // Skip if no holdings
            if (netQuantity <= 0) continue;

            const avgPrice = totalBuyQuantity > 0 ? totalBuyCost / totalBuyQuantity : 0;
            const assetTotalCost = netQuantity * avgPrice;

            holdings.push({
                id: asset.id,
                name: asset.name,
                quantity: netQuantity,
                avgPrice,
                totalCost: assetTotalCost,
                currentPrice: null,
                currentValue: null,
                profitLoss: null,
                profitLossPercent: null,
            });

            totalCost += assetTotalCost;
        }

        // Fetch all current prices at once for efficiency
        let totalValue = 0;
        if (holdings.length > 0) {
            const assetNames = holdings.map((h) => h.name);
            const pricesMap = await this.pricesService.getPricesMap(assetNames);

            for (const holding of holdings) {
                const currentPrice = pricesMap[holding.name] ?? null;
                holding.currentPrice = currentPrice;
                if (currentPrice) {
                    holding.currentValue = holding.quantity * currentPrice;
                    holding.profitLoss = holding.currentValue - holding.totalCost;
                    holding.profitLossPercent =
                        holding.totalCost > 0
                            ? (holding.profitLoss / holding.totalCost) * 100
                            : null;
                    totalValue += holding.currentValue;
                } else {
                    // Fallback to cost if no price available
                    totalValue += holding.totalCost;
                }
            }
        }

        const totalProfitLoss = totalValue - totalCost;
        const totalProfitLossPercent =
            totalCost > 0 ? (totalProfitLoss / totalCost) * 100 : 0;

        return {
            totalValue,
            totalCost,
            totalProfitLoss,
            totalProfitLossPercent,
            holdings,
        };
    }

    async getHistory(userId: string, assetFilter?: string[]) {
        // Get all transactions ordered by date
        const whereClause: any = { asset: { userId } };
        if (assetFilter) {
            whereClause.asset.name = { in: assetFilter };
        }

        const transactions = await this.prisma.transaction.findMany({
            where: whereClause,
            include: { asset: true },
            orderBy: { date: 'asc' },
        });

        if (transactions.length === 0) {
            return [];
        }

        // Get first transaction date and today
        const firstTxDate = transactions[0].date;
        const today = new Date();

        // Build holdings state from transactions
        const holdingsMap: Record<string, number> = {}; // asset name -> quantity

        for (const tx of transactions) {
            const assetName = tx.asset.name;
            if (!holdingsMap[assetName]) {
                holdingsMap[assetName] = 0;
            }
            if (tx.type === 'BUY') {
                holdingsMap[assetName] += tx.quantity;
            } else {
                holdingsMap[assetName] -= tx.quantity;
            }
        }

        // Get asset names with positive holdings
        const assetNames = Object.keys(holdingsMap).filter(
            (name) => holdingsMap[name] > 0,
        );

        if (assetNames.length === 0) {
            return [];
        }

        // Fetch historical prices for all assets from first transaction date to today
        const historicalPrices = await this.pricesService.getHistoricalPricesForAssets(
            assetNames,
            firstTxDate,
            today,
        );

        // Calculate portfolio value for each day AND build per-asset history
        const history: { date: string; value: number }[] = [];
        const assetsHistory: Record<string, { date: string; value: number }[]> = {};

        // Initialize arrays for each asset
        for (const assetName of assetNames) {
            assetsHistory[assetName] = [];
        }

        for (const [dateStr, pricesForDate] of Object.entries(historicalPrices)) {
            let dailyValue = 0;

            for (const assetName of assetNames) {
                const quantity = holdingsMap[assetName];
                const price = pricesForDate[assetName];

                if (price) {
                    // Track individual asset price history
                    assetsHistory[assetName].push({ date: dateStr, value: price });

                    if (quantity > 0) {
                        dailyValue += quantity * price;
                    }
                }
            }

            if (dailyValue > 0) {
                history.push({ date: dateStr, value: dailyValue });
            }
        }

        // Add today with real-time prices
        const todayStr = today.toISOString().split('T')[0];
        // Check if we already have an entry for today (e.g. from historical data if market closed)
        const hasPortfolioToday = history.some((h) => h.date === todayStr);

        // We fetch current prices anyway to ensure "latest" is real-time for the pills
        const currentPrices = await this.pricesService.getPricesMap(assetNames);

        // Update portfolio history for today if missing
        if (!hasPortfolioToday) {
            let todayValue = 0;
            for (const assetName of assetNames) {
                const quantity = holdingsMap[assetName];
                const price = currentPrices[assetName];
                if (price && quantity > 0) {
                    todayValue += quantity * price;
                }
            }
            if (todayValue > 0) {
                history.push({ date: todayStr, value: todayValue });
            }
        }

        // Ensure every asset has a "today" entry with current price
        for (const assetName of assetNames) {
            const price = currentPrices[assetName];
            if (price) {
                const assetHist = assetsHistory[assetName];
                // Check if last entry is already today
                const lastEntry = assetHist[assetHist.length - 1];
                if (!lastEntry || lastEntry.date !== todayStr) {
                    assetHist.push({ date: todayStr, value: price });
                } else {
                    // If it exists (e.g. from history), maybe update it with real-time? 
                    // Usually historical close provides a stable value, but real-time is better for "now".
                    // Let's overwrite/update.
                    lastEntry.value = price;
                }
            }
        }

        return {
            portfolio: history.sort((a, b) => a.date.localeCompare(b.date)),
            assets: assetsHistory
        };
    }

    async getTransactions(userId: string, limit?: number) {
        return this.prisma.transaction.findMany({
            where: { asset: { userId } },
            include: { asset: { select: { name: true, isin: true, ticker: true } } },
            orderBy: { date: 'desc' },
            take: limit,
        });
    }
}
