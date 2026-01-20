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
    yearlyReturns: {
        year: number;
        returnPercent: number;
        value: number;
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

        // CAGR / Annual Return with XIRR for DCA support
        let cagr = 0;
        if (totalInvested > 0 && finalValue > 0 && chartData.length > 0) {
            // Construct Cash Flows
            // 1. Initial Investment at start date
            const cashFlows: { amount: number; date: Date }[] = [];

            if (initialInvestment > 0) {
                cashFlows.push({ amount: -initialInvestment, date: new Date(chartData[0].date) });
            }

            // 2. Find monthly contribution dates
            // We can infer them from when 'invested' amount increases
            let previousInvested = initialInvestment;
            for (let i = 1; i < chartData.length; i++) {
                const diff = chartData[i].invested - previousInvested;
                if (diff > 0.01) { // Floating point tolerance
                    cashFlows.push({ amount: -diff, date: new Date(chartData[i].date) });
                    previousInvested = chartData[i].invested;
                }
            }

            // 3. Final Value as positive cash flow
            cashFlows.push({ amount: finalValue, date: new Date(chartData[chartData.length - 1].date) });

            cagr = this.calculateXIRR(cashFlows) * 100;
        }

        // Calculate Yearly Returns using Simple Dietz method approximation for DCA
        const yearlyReturns: { year: number; returnPercent: number; value: number }[] = [];
        const yearsList = [...new Set(chartData.map(d => parseInt(d.date.split('-')[0])))];

        for (const year of yearsList) {
            const yearData = chartData.filter(d => d.date.startsWith(year.toString()));
            if (yearData.length === 0) continue;

            const start = yearData[0];
            const end = yearData[yearData.length - 1];

            // Value at start of year (or strictly previous year end if available, but simplest is first data point of year)
            // For DCA: Return = (EndValue - StartValue - Contributions) / (StartValue + 0.5 * Contributions)

            // Find previous year's last data point for precise opening value
            const prevYearData = chartData.filter(d => d.date.startsWith((year - 1).toString()));
            const prevEndValue = prevYearData.length > 0 ? prevYearData[prevYearData.length - 1].value : 0;
            const prevInvested = prevYearData.length > 0 ? prevYearData[prevYearData.length - 1].invested : 0;

            // Start Value is previous year end or 0 if first year
            const startValue = prevYearData.length > 0 ? prevEndValue : start.invested; // If first year, start base is initial investment (approx)
            // Actually, if first year, "startValue" isn't 0, it's the initial lump sum. 
            // Let's use: Gain = (EndValue - EndInvested) - (PrevEndValue - PrevEndInvested) ?? 
            // Simpler: (EndValue - StartValue - NetFlow) / (StartValue + NetFlow/2)

            // Contributions made THIS year = (EndInvested - PrevEndInvested)
            // If first year: EndInvested - 0 (if lump sum is considered "contribution" of that year)
            const investedAtStart = prevYearData.length > 0 ? prevEndValue : 0; // Asset value at start
            const totalInvestedAtStart = prevYearData.length > 0 ? prevInvested : 0;

            const contributions = end.invested - totalInvestedAtStart;

            const gain = end.value - investedAtStart - contributions;
            const denominator = investedAtStart + (contributions / 2); // Simple Dietz

            let returnPercent = 0;
            if (denominator > 0) {
                returnPercent = (gain / denominator) * 100;
            }

            yearlyReturns.push({
                year,
                returnPercent: parseFloat(returnPercent.toFixed(2)),
                value: parseFloat(end.value.toFixed(2))
            });
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
            yearlyReturns,
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

    private calculateXIRR(cashFlows: { amount: number; date: Date }[], guess = 0.1): number {
        const xnpv = (rate: number, cashFlows: { amount: number; date: Date }[]) => {
            let sum = 0;
            const t0 = cashFlows[0].date.getTime();
            for (const flow of cashFlows) {
                const dt = (flow.date.getTime() - t0) / (1000 * 3600 * 24 * 365.25);
                sum += flow.amount / Math.pow(1 + rate, dt);
            }
            return sum;
        };

        const dxnpv = (rate: number, cashFlows: { amount: number; date: Date }[]) => {
            let sum = 0;
            const t0 = cashFlows[0].date.getTime();
            for (const flow of cashFlows) {
                const dt = (flow.date.getTime() - t0) / (1000 * 3600 * 24 * 365.25);
                sum -= (dt * flow.amount) / Math.pow(1 + rate, dt + 1);
            }
            return sum;
        };

        let rate = guess;
        const maxIter = 50;
        const tol = 1e-6;

        for (let i = 0; i < maxIter; i++) {
            const fValue = xnpv(rate, cashFlows);
            const dfValue = dxnpv(rate, cashFlows);

            if (Math.abs(dfValue) < tol) break; // Start of zero-derivative

            const newRate = rate - fValue / dfValue;
            if (Math.abs(newRate - rate) < tol) return newRate;
            rate = newRate;
        }
        return rate;
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
