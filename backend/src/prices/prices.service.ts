import { Injectable, Logger } from '@nestjs/common';
import YahooFinance from 'yahoo-finance2';
import { PrismaService } from '../prisma/prisma.service';

const yahooFinance = new YahooFinance();

// Mapping from ISIN to Yahoo Finance tickers (PRIORITY)
const ISIN_TICKER_MAP: Record<string, string> = {
    'LU0290358497': 'XEON.DE', // Xtrackers II EUR Overnight
    'IE000XZSV718': 'SPYL.DE', // SPDR S&P 500
    'LU2300295123': 'PRAM.DE', // Amundi Prime Emerging Markets
    'DE000A2QP4B6': 'EXIE.DE', // iShares Stoxx Europe 600
};

// Fallback mapping from Fineco ETF names (if ISIN is missing)
const ETF_TICKER_MAP: Record<string, string> = {
    'Xtrackers II EUR Overnight Rate Swap UCITS ETF 1C': 'XEON.DE',
    'Amundi IS Prime Emerging Markets UCITS ETF DR': 'PRAM.DE',
    'SPDR S&P 500 UCITS ETF (Acc)': 'SPYL.DE',
    'iShares Stoxx Europe 600 UCITS ETF (DE) Acc': 'EXIE.DE',
    'iShares Core MSCI World UCITS ETF USD (Acc)': 'EUNL.DE',
    'Vanguard FTSE All-World UCITS ETF (USD) Accumulating': 'VWCE.DE',
};

@Injectable()
export class PricesService {
    private readonly logger = new Logger(PricesService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Resolve ticker from ISIN or Name
     */
    private getTicker(assetName: string, isin?: string | null): string | null {
        if (isin && ISIN_TICKER_MAP[isin]) {
            return ISIN_TICKER_MAP[isin];
        }
        return ETF_TICKER_MAP[assetName] || null;
    }

    /**
     * Get current price for an ETF by its Fineco name (and optional ISIN)
     */
    async getCurrentPrice(assetName: string, isin?: string | null): Promise<number | null> {
        const ticker = this.getTicker(assetName, isin);

        if (!ticker) {
            this.logger.warn(`No ticker mapping for: ${assetName} (ISIN: ${isin || 'N/A'})`);
            return null;
        }

        try {
            const quote = await yahooFinance.quote(ticker);
            if (quote && typeof quote === 'object' && 'regularMarketPrice' in quote) {
                return (quote as { regularMarketPrice?: number }).regularMarketPrice ?? null;
            }
            return null;
        } catch (error) {
            this.logger.error(`Failed to fetch price for ${ticker}: ${error}`);
            return null;
        }
    }

    /**
     * Fetch and cache prices for all assets
     */
    async refreshAllPrices(): Promise<{ updated: number; failed: number }> {
        const assets = await this.prisma.asset.findMany();
        let updated = 0;
        let failed = 0;

        for (const asset of assets) {
            const price = await this.getCurrentPrice(asset.name);
            if (price !== null) {
                await this.prisma.priceHistory.upsert({
                    where: {
                        asset_date: {
                            asset: asset.name,
                            date: new Date(new Date().toDateString()), // Today at midnight
                        },
                    },
                    update: { price },
                    create: {
                        asset: asset.name,
                        price,
                        date: new Date(new Date().toDateString()),
                    },
                });
                updated++;
            } else {
                failed++;
            }
        }

        return { updated, failed };
    }

    /**
     * Check if the market is currently open (Mon-Fri, 09:00 - 18:00 CET)
     */
    private isMarketOpen(): boolean {
        const now = new Date();
        // Adjust for CET/CEST (UTC+1 or UTC+2)
        // Ideally use a library like DateTime/Luxon, but for simplicity we'll check local time 
        // assuming the server runs in a timezone or we handle generic working hours.
        // Let's assume the server time is consistent or we check UTC hours (8am - 5pm UTC roughly).
        // Since we are on a linux/azure VM, let's use the Date object which uses system time.
        // We will stick to simple Mon-Fri 09:00 - 18:00 logic based on local server time.

        const day = now.getDay();
        const hour = now.getHours();

        // 0 = Sunday, 6 = Saturday
        if (day === 0 || day === 6) return false;

        // 9:00 to 18:00
        return hour >= 9 && hour < 18;
    }

    /**
     * Get prices for multiple assets at once
     */
    async getPricesMap(assetNames: string[]): Promise<Record<string, number>> {
        const prices: Record<string, number> = {};
        const today = new Date(new Date().toDateString());
        const marketOpen = this.isMarketOpen();

        // If market is CLOSED, try to get from cache first (efficient)
        // If market is OPEN, SKIP cache for today to force fresh data
        if (!marketOpen) {
            const cachedPrices = await this.prisma.priceHistory.findMany({
                where: {
                    asset: { in: assetNames },
                    date: today,
                },
            });

            for (const cached of cachedPrices) {
                prices[cached.asset] = cached.price;
            }
        }

        // Fetch missing prices OR all prices if market is active
        const assetsToFetch = assetNames.filter((name) => !(name in prices));

        for (const assetName of assetsToFetch) {
            // Get fresh price from Yahoo
            const price = await this.getCurrentPrice(assetName);

            if (price !== null) {
                prices[assetName] = price;

                // Always UPSERT to keep the "latest known price" for today in DB
                // This acts as the "closing price" if it's the last fetch of the day
                await this.prisma.priceHistory.upsert({
                    where: {
                        asset_date: {
                            asset: assetName,
                            date: today,
                        },
                    },
                    update: { price },
                    create: {
                        asset: assetName,
                        price,
                        date: today,
                    },
                });
            } else if (!marketOpen) {
                // If Yahoo fails and market is closed, maybe we have an old cached value we skipped? 
                // (Edge case: DB has data, but we forced fetch and it failed. 
                // Ideally we should fallback to DB if fetch fails, but for now keep it simple)

                // Try to fallback to DB cache if fetch failed even if market is open?
                // Let's leave strictly as "fetch fresh" for now.
            }
        }

        // If we still miss some prices (e.g. Yahoo failed during market open), 
        // try to fill from DB as last resort
        const stillMissing = assetNames.filter((name) => !(name in prices));
        if (stillMissing.length > 0) {
            const cachedFallback = await this.prisma.priceHistory.findMany({
                where: {
                    asset: { in: stillMissing },
                    date: today,
                },
            });
            for (const cached of cachedFallback) {
                prices[cached.asset] = cached.price;
            }
        }

        return prices;
    }

    /**
     * Get historical prices for an asset between two dates
     */
    async getHistoricalPrices(
        assetName: string,
        startDate: Date,
        endDate: Date,
        isin?: string | null,
    ): Promise<Record<string, number>> {
        const ticker = this.getTicker(assetName, isin);
        if (!ticker) {
            this.logger.warn(`No ticker mapping for: ${assetName} (ISIN: ${isin})`);
            return {};
        }

        const prices: Record<string, number> = {};

        try {
            const result = await yahooFinance.chart(ticker, {
                period1: startDate,
                period2: endDate,
                interval: '1d',
            });

            if (result && result.quotes) {
                for (const quote of result.quotes) {
                    if (quote.date && quote.close) {
                        const dateStr = quote.date.toISOString().split('T')[0];
                        prices[dateStr] = quote.close;
                    }
                }
            }
        } catch (error) {
            this.logger.error(`Failed to fetch historical prices for ${ticker}: ${error}`);
        }

        return prices;
    }

    /**
     * Get historical prices for multiple assets, returns map of date -> asset -> price
     */
    async getHistoricalPricesForAssets(
        assetNames: string[],
        startDate: Date,
        endDate: Date,
    ): Promise<Record<string, Record<string, number>>> {
        // Structure: { "2026-01-07": { "ETF Name": 148.13, ... }, ... }
        const result: Record<string, Record<string, number>> = {};

        // Fetch ISINs for accurate ticker lookup
        const assetsDetails = await this.prisma.asset.findMany({
            where: { name: { in: assetNames } },
            select: { name: true, isin: true }
        });

        const isinMap = assetsDetails.reduce((acc, curr) => {
            acc[curr.name] = curr.isin;
            return acc;
        }, {} as Record<string, string | null>);

        for (const assetName of assetNames) {
            const isin = isinMap[assetName];
            const assetPrices = await this.getHistoricalPrices(assetName, startDate, endDate, isin);

            for (const [dateStr, price] of Object.entries(assetPrices)) {
                if (!result[dateStr]) {
                    result[dateStr] = {};
                }
                result[dateStr][assetName] = price;
            }
        }

        return result;
    }
}
