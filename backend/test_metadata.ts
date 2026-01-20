
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

async function run() {
    const ticker = 'SPYL.DE';
    try {
        // Method 1: Quote Summary - often has 'firstTradeDateMilliseconds'
        const quote = await yahooFinance.quote(ticker);
        console.log('Quote firstTradeDate:', quote.firstTradeDateMilliseconds ? new Date(quote.firstTradeDateMilliseconds).toISOString() : 'N/A');

        // Method 2: Chart with earliest possible date
        const chart = await yahooFinance.chart(ticker, {
            period1: '2000-01-01', // Arbitrary old date
            period2: '2026-01-01',
            interval: '1mo', // coarse interval is fine for start date check
        });
        if (chart.quotes && chart.quotes.length > 0) {
            console.log('Chart First Quote:', chart.quotes[0].date);
        }

    } catch (e) {
        console.error(e);
    }
}

run();
