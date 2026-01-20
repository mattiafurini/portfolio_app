import { Controller, Get, Query, UseGuards, Request, Delete, Param, Post, Body, Put, BadRequestException } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('portfolio')
@UseGuards(JwtAuthGuard)
export class PortfolioController {
    constructor(private readonly portfolioService: PortfolioService) { }

    @Get('list')
    async listPortfolios(@Request() req: any) {
        return this.portfolioService.getUserPortfolios(req.user.id);
    }

    @Post()
    async createPortfolio(@Request() req: any, @Body() body: { name: string }) {
        return this.portfolioService.createPortfolio(req.user.id, body.name);
    }

    @Put(':id')
    async updatePortfolio(@Request() req: any, @Param('id') id: string, @Body() body: { name: string }) {
        try {
            return await this.portfolioService.updatePortfolio(req.user.id, id, body.name);
        } catch (error) {
            throw new BadRequestException(error.message);
        }
    }

    @Delete(':id')
    async deletePortfolio(@Request() req: any, @Param('id') id: string) {
        try {
            return await this.portfolioService.deletePortfolio(req.user.id, id);
        } catch (error) {
            throw new BadRequestException(error.message);
        }
    }

    @Get('summary')
    async getSummary(@Request() req: any, @Query('assets') assets?: string, @Query('portfolioId') portfolioId?: string) {
        const assetFilter = assets
            ? assets.split(',').map(a => decodeURIComponent(a))
            : undefined;
        return this.portfolioService.getSummary(req.user.id, assetFilter, portfolioId);
    }

    @Get('history')
    async getHistory(@Request() req: any, @Query('assets') assets?: string, @Query('portfolioId') portfolioId?: string) {
        const assetFilter = assets
            ? assets.split(',').map(a => decodeURIComponent(a))
            : undefined;
        return this.portfolioService.getHistory(req.user.id, assetFilter, portfolioId);
    }

    @Get('transactions')
    async getTransactions(@Request() req: any, @Query('limit') limit?: string, @Query('portfolioId') portfolioId?: string) {
        const take = limit ? parseInt(limit) : undefined;
        return this.portfolioService.getTransactions(req.user.id, take, portfolioId);
    }
    @Delete('transactions/:id')
    async deleteTransaction(@Request() req: any, @Param('id') id: string) {
        return this.portfolioService.deleteTransaction(req.user.id, id);
    }

    @Post('transactions/delete')
    async deleteTransactions(@Request() req: any, @Body() body: { ids: string[] }) {
        return this.portfolioService.deleteTransactions(req.user.id, body.ids);
    }
}
