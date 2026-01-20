import { Injectable, Logger } from '@nestjs/common';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

export class BacktestRequest {
    ticker!: string;
    initialInvestment!: number;
    monthlyContribution!: number;
    startDate!: string; // YYYY-MM-DD
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

@Injectable()
export class BacktestService {
    private readonly logger = new Logger(BacktestService.name);

    async runBacktest(request: BacktestRequest): Promise<BacktestResult> {
        const { ticker, initialInvestment, monthlyContribution, startDate, endDate } = request;

        const start = new Date(startDate);
        const end = endDate ? new Date(endDate) : new Date();

        // 1. Fetch Historical Data
        let historicalData;
        try {
            historicalData = await yahooFinance.chart(ticker, {
                period1: start,
                period2: end,
                interval: '1d',
            });
        } catch (error) {
            this.logger.error(`Failed to fetch data for ${ticker}: ${error}`);
            throw new Error(`Failed to fetch historical data for ${ticker}`);
        }

        if (!historicalData || !historicalData.quotes || historicalData.quotes.length === 0) {
            throw new Error('No historical data found for the specified period');
        }

        // 2. Simulate Investment
        let shares = 0;
        let totalInvested = 0;
        let currentValue = 0;
        const chartData: BacktestResult['chartData'] = [];

        // Filter and Sort Quotes
        const sortedQuotes = historicalData.quotes
            .filter(q => q.date && q.close !== null && q.close !== undefined)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        if (sortedQuotes.length === 0) throw new Error("No valid quotes");

        const firstParams = sortedQuotes[0];

        // Buy Initial
        if (initialInvestment > 0 && firstParams.close) {
            shares += initialInvestment / firstParams.close;
            totalInvested += initialInvestment;
        }

        // Setup next monthly trigger relative to the ACTUAL start date of data
        // This prevents "catching up" missed months if the asset didn't exist yet
        let nextMonthTarget = new Date(sortedQuotes[0].date);
        nextMonthTarget.setMonth(nextMonthTarget.getMonth() + 1);

        for (const quote of sortedQuotes) {
            const date = new Date(quote.date);
            const price = quote.close;

            if (!price) continue;

            // Check for monthly contribution
            if (monthlyContribution > 0 && date >= nextMonthTarget) {
                shares += monthlyContribution / price;
                totalInvested += monthlyContribution;
                // Move to next month
                nextMonthTarget.setMonth(nextMonthTarget.getMonth() + 1);
            }

            currentValue = shares * price;

            chartData.push({
                date: date.toISOString().split('T')[0],
                invested: parseFloat(totalInvested.toFixed(2)),
                value: parseFloat(currentValue.toFixed(2)),
                price: parseFloat(price.toFixed(2))
            });
        }

        const finalValue = currentValue;
        const totalReturn = finalValue - totalInvested;
        const totalReturnPercent = (totalInvested > 0) ? (totalReturn / totalInvested) * 100 : 0;

        // CAGR - Use actual data start, not requested start
        const startTimestamp = new Date(sortedQuotes[0].date).getTime();
        const endTimestamp = new Date(sortedQuotes[sortedQuotes.length - 1].date).getTime();
        const years = (endTimestamp - startTimestamp) / (1000 * 60 * 60 * 24 * 365.25);

        let cagr = 0;
        if (totalInvested > 0 && finalValue > 0 && years > 0) {
            if (monthlyContribution === 0) {
                cagr = (Math.pow(finalValue / totalInvested, 1 / years) - 1) * 100;
            }
        }

        return {
            ticker: ticker.toUpperCase(),
            period: {
                start: sortedQuotes[0].date.toISOString().split('T')[0],
                end: sortedQuotes[sortedQuotes.length - 1].date.toISOString().split('T')[0],
                years: parseFloat(years.toFixed(2))
            },
            summary: {
                totalInvested: parseFloat(totalInvested.toFixed(2)),
                finalValue: parseFloat(finalValue.toFixed(2)),
                totalReturn: parseFloat(totalReturn.toFixed(2)),
                totalReturnPercent: parseFloat(totalReturnPercent.toFixed(2)),
                cagr: parseFloat(cagr.toFixed(2))
            },
            chartData
        };
    }

    async search(query: string) {
        if (!query) return [];

        const searchYahoo = async (q: string) => {
            const res = await yahooFinance.search(q, { newsCount: 0, quotesCount: 100 });
            return res.quotes.filter(q => q.isYahooFinance && q.quoteType === 'ETF');
        };

        try {
            let results = await searchYahoo(query);

            // If no ETFs found, try appending " etf"
            if (results.length === 0) {
                this.logger.log(`No ETFs found for "${query}", trying "${query} etf"`);
                const etfResults = await searchYahoo(`${query} etf`);
                results = etfResults;
            }

            // Deduplicate if we ever decide to merge strategies, though currently we just switch.
            // But let's verify if we want to try BOTH strategies and merge?
            // The user wants "all available". 
            // Validating: "500" -> 0 ETFs -> "500 etf" -> ~7 ETFs.
            // "Stoxx 600" -> search "Stoxx 600" -> might find ETFs.
            // "600" -> 0 ETFs -> "600 etf" -> Finds ETFs.

            // Just returning the results without slicing.
            return results;
        } catch (error) {
            this.logger.error(`Search failed for ${query}: ${error}`);
            return [];
        }
    }

    async getMetadata(ticker: string) {
        try {
            const quote = await yahooFinance.quote(ticker) as any;
            if (!quote) {
                return { ticker, firstTradeDate: null };
            }
            return {
                ticker: quote.symbol,
                firstTradeDate: quote.firstTradeDateMilliseconds ? new Date(quote.firstTradeDateMilliseconds).toISOString() : null,
                currency: quote.currency,
                exchange: quote.exchange,
            };
        } catch (error) {
            this.logger.error(`Metadata fetch failed for ${ticker}: ${error}`);
            // Return empty or defaults instead of crash
            return { ticker, firstTradeDate: null };
        }
    }
}
