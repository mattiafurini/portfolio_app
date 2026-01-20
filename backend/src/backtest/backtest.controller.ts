import { Controller, Post, Get, Body, Query, BadRequestException } from '@nestjs/common';
import { BacktestService, BacktestRequest, BacktestResult } from './backtest.service';

@Controller('backtest')
export class BacktestController {
    constructor(private readonly backtestService: BacktestService) { }

    @Post('run')
    async runBacktest(@Body() request: BacktestRequest): Promise<BacktestResult> {
        if (!request.ticker) {
            throw new BadRequestException('Ticker is required');
        }
        return this.backtestService.runBacktest(request);
    }

    @Get('search')
    search(@Query('q') query: string) {
        return this.backtestService.search(query);
    }

    @Get('metadata')
    getMetadata(@Query('ticker') ticker: string) {
        return this.backtestService.getMetadata(ticker);
    }
}
