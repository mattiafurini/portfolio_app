import { Injectable, Logger } from '@nestjs/common';
import YahooFinance from 'yahoo-finance2';
import { PrismaService } from '../prisma/prisma.service';

const yahooFinance = new YahooFinance();

// Mapping from Fineco ETF names to Yahoo Finance tickers
const ETF_TICKER_MAP: Record<string, string> = {
    'Xtrackers II EUR Overnight Rate Swap UCITS ETF 1C': 'XEON.DE',
    'Amundi IS Prime Emerging Markets UCITS ETF DR': 'PRAM.DE',
    'SPDR S&P 500 UCITS ETF (Acc)': 'SPYL.DE',
    'iShares Stoxx Europe 600 UCITS ETF (DE) Acc': 'EXIE.DE',
    'iShares Core MSCI World UCITS ETF USD (Acc)': 'EUNL.DE',
    'Vanguard FTSE All-World UCITS ETF (USD) Accumulating': 'VWCE.DE',
    // Add more mappings as needed
};

@Injectable()
export class PricesService {
    private readonly logger = new Logger(PricesService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Get current price for an ETF by its Fineco name
     */
    async getCurrentPrice(assetName: string): Promise<number | null> {
        const ticker = ETF_TICKER_MAP[assetName];
        if (!ticker) {
            this.logger.warn(`No ticker mapping for: ${assetName}`);
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
     * Get prices for multiple assets at once
     */
    async getPricesMap(assetNames: string[]): Promise<Record<string, number>> {
        const prices: Record<string, number> = {};

        // First try to get from cache (today's prices)
        const today = new Date(new Date().toDateString());
        const cachedPrices = await this.prisma.priceHistory.findMany({
            where: {
                asset: { in: assetNames },
                date: today,
            },
        });

        for (const cached of cachedPrices) {
            prices[cached.asset] = cached.price;
        }

        // Fetch missing prices from Yahoo Finance
        const missingAssets = assetNames.filter((name) => !(name in prices));
        for (const assetName of missingAssets) {
            const price = await this.getCurrentPrice(assetName);
            if (price !== null) {
                prices[assetName] = price;
                // Cache it
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
    ): Promise<Record<string, number>> {
        const ticker = ETF_TICKER_MAP[assetName];
        if (!ticker) {
            this.logger.warn(`No ticker mapping for: ${assetName}`);
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

        for (const assetName of assetNames) {
            const assetPrices = await this.getHistoricalPrices(assetName, startDate, endDate);

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
