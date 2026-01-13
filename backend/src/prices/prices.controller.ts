import { Controller, Get, Post } from '@nestjs/common';
import { PricesService } from './prices.service';

@Controller('prices')
export class PricesController {
    constructor(private readonly pricesService: PricesService) { }

    @Post('refresh')
    async refreshPrices() {
        const result = await this.pricesService.refreshAllPrices();
        return {
            success: true,
            message: `Updated ${result.updated} prices, ${result.failed} failed`,
            ...result,
        };
    }
}
