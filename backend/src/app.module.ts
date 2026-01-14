import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { UploadModule } from './upload/upload.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { AssetsModule } from './assets/assets.module';
import { PricesModule } from './prices/prices.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    UploadModule,
    PortfolioModule,
    AssetsModule,
    PricesModule,
    AuthModule,
  ],
})
export class AppModule { }
