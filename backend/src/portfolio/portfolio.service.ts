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
            return { portfolio: [], assets: {} };
        }

        // Get first transaction date and today
        const firstTxDate = transactions[0].date;
        const today = new Date();

        // Initialize current holdings state (starts empty)
        const currentHoldings: Record<string, number> = {};
        let txIndex = 0;

        // Fetch historical prices for all assets from first transaction date to today
        // We need to fetch for all assets that *ever* appear in transactions, not just current holdings
        const allAssetNamesInTransactions = Array.from(new Set(transactions.map(tx => tx.asset.name)));

        const historicalPrices = await this.pricesService.getHistoricalPricesForAssets(
            allAssetNamesInTransactions,
            firstTxDate,
            today,
        );

        // Calculate portfolio value for each day AND build per-asset history
        const history: { date: string; value: number }[] = [];
        const assetsHistory: Record<string, { date: string; value: number }[]> = {};

        // Sort dates to ensure chronological order for forward fill
        const sortedDates = Object.keys(historicalPrices).sort();

        // Track last known prices to handle missing data points (holidays, fetch failures)
        const lastKnownPrices: Record<string, number> = {};

        for (const dateStr of sortedDates) {
            // 1. Update holdings based on transactions up to the end of this day
            // We assume dateStr is YYYY-MM-DD. We compare with transaction date.
            // Transactions are already ordered by date asc.
            const currentDateEndOfDay = new Date(dateStr);
            currentDateEndOfDay.setHours(23, 59, 59, 999);

            while (txIndex < transactions.length && transactions[txIndex].date <= currentDateEndOfDay) {
                const tx = transactions[txIndex];
                const assetName = tx.asset.name;

                if (!currentHoldings[assetName]) {
                    currentHoldings[assetName] = 0;
                }

                if (tx.type === 'BUY') {
                    currentHoldings[assetName] += tx.quantity;
                } else {
                    currentHoldings[assetName] -= tx.quantity;
                }
                txIndex++;
            }

            // 2. Calculate Portfolio Value using CURRENT holdings and CURRENT prices
            const pricesForDate = historicalPrices[dateStr];
            let dailyValue = 0;
            // Check if we have valid prices for this day (to avoid adding days with 0 value if no prices exist yet)
            let hasValidData = false;
            // Only count assets that we actually hold right now
            const activeAssets = Object.keys(currentHoldings).filter(name => currentHoldings[name] > 0);

            for (const assetName of activeAssets) {
                const quantity = currentHoldings[assetName];
                const currentPrice = pricesForDate[assetName];

                if (currentPrice) {
                    lastKnownPrices[assetName] = currentPrice;
                }

                // Use current price or fallback to last known price (Forward Fill)
                const effectivePrice = currentPrice ?? lastKnownPrices[assetName];

                if (effectivePrice) {
                    // Track individual asset price history
                    // Only push if we haven't already pushed this date (though here we iterate unique dates)
                    // We push the EFFECTIVE price to avoid gaps in the chart
                    if (!assetsHistory[assetName]) assetsHistory[assetName] = []; // Initialize if seen for first time
                    assetsHistory[assetName].push({ date: dateStr, value: effectivePrice });

                    if (quantity > 0) {
                        dailyValue += quantity * effectivePrice;
                        hasValidData = true;
                    }
                }
            }

            // Only add point if we have value OR if we hold nothing (value 0 is correct then)
            // But usually we only show history when there is something.
            // If dailyValue is 0 because we hold nothing, that's accurate. 
            // If dailyValue is 0 because price is missing but we have holdings, `hasValidData` (based on effectivePrice) handles it.
            if (activeAssets.length > 0 && hasValidData) {
                history.push({ date: dateStr, value: dailyValue });
            }
        }

        // Add today with real-time prices
        const todayStr = today.toISOString().split('T')[0];
        // Check if we already have an entry for today (e.g. from historical data if market closed)
        const hasPortfolioToday = history.some((h) => h.date === todayStr);

        // We fetch current prices anyway to ensure "latest" is real-time for the pills
        const currentPrices = await this.pricesService.getPricesMap(allAssetNamesInTransactions);

        // Update portfolio history for today if missing
        if (!hasPortfolioToday) {
            let todayValue = 0;
            for (const assetName of Object.keys(currentHoldings)) {
                const quantity = currentHoldings[assetName];
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
        for (const assetName of allAssetNamesInTransactions) {
            const price = currentPrices[assetName];
            if (price) {
                // Initialize if not exists (e.g. asset sold before but we want history, or just robust)
                if (!assetsHistory[assetName]) assetsHistory[assetName] = [];

                const assetHist = assetsHistory[assetName];
                // Check if last entry is already today
                const lastEntry = assetHist[assetHist.length - 1];
                if (!lastEntry || lastEntry.date !== todayStr) {
                    assetHist.push({ date: todayStr, value: price });
                } else {
                    // Update existing today entry
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

    async deleteTransaction(userId: string, transactionId: string) {
        // Verify transaction belongs to user
        const transaction = await this.prisma.transaction.findUnique({
            where: { id: transactionId },
            include: { asset: true },
        });

        if (!transaction || transaction.asset.userId !== userId) {
            throw new Error('Transaction not found or access denied');
        }

        return this.prisma.transaction.delete({
            where: { id: transactionId },
        });
    }
}
