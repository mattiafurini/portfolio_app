import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('portfolio')
@UseGuards(JwtAuthGuard)
export class PortfolioController {
    constructor(private readonly portfolioService: PortfolioService) { }

    @Get('summary')
    async getSummary(@Request() req: any, @Query('assets') assets?: string) {
        const assetFilter = assets
            ? assets.split(',').map(a => decodeURIComponent(a))
            : undefined;
        return this.portfolioService.getSummary(req.user.id, assetFilter);
    }

    @Get('history')
    async getHistory(@Request() req: any, @Query('assets') assets?: string) {
        const assetFilter = assets
            ? assets.split(',').map(a => decodeURIComponent(a))
            : undefined;
        return this.portfolioService.getHistory(req.user.id, assetFilter);
    }

    @Get('transactions')
    async getTransactions(@Request() req: any, @Query('limit') limit?: string) {
        const take = limit ? parseInt(limit) : undefined;
        return this.portfolioService.getTransactions(req.user.id, take);
    }
}
