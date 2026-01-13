import { Module } from '@nestjs/common';
import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from './portfolio.service';
import { PricesModule } from '../prices/prices.module';

@Module({
    imports: [PricesModule],
    controllers: [PortfolioController],
    providers: [PortfolioService],
})
export class PortfolioModule { }
