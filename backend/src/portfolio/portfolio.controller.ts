import { Controller, Get, Query } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';

@Controller('portfolio')
export class PortfolioController {
    constructor(private readonly portfolioService: PortfolioService) { }

    @Get('summary')
    async getSummary(@Query('assets') assets?: string) {
        const assetFilter = assets
            ? assets.split(',').map(a => decodeURIComponent(a))
            : undefined;
        return this.portfolioService.getSummary(assetFilter);
    }

    @Get('history')
    async getHistory(@Query('assets') assets?: string) {
        const assetFilter = assets
            ? assets.split(',').map(a => decodeURIComponent(a))
            : undefined;
        return this.portfolioService.getHistory(assetFilter);
    }
}
