import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('assets')
@UseGuards(JwtAuthGuard)
export class AssetsController {
    constructor(private readonly assetsService: AssetsService) { }

    @Get()
    async getAll(@Request() req: any) {
        return this.assetsService.getAll(req.user.id);
    }
}
