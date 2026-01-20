import {
    Controller,
    Post,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
    UseGuards,
    Request,
    Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
    constructor(private readonly uploadService: UploadService) { }

    @Post('transactions')
    @UseInterceptors(FileInterceptor('file'))
    async uploadTransactionFile(@Request() req: any, @UploadedFile() file: Express.Multer.File, @Body() body: { portfolioId?: string }) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        // If no portfolioId, we could try to find a default one, but let's pass undefined and let service handle or logic
        // Ideally frontend SHOULD send it.
        const result = await this.uploadService.parseAndSaveTransaction(file.buffer, req.user.id, body.portfolioId);
        return {
            success: true,
            message: `Imported ${result.transactionsCreated} transactions for ${result.assetsCreated} assets. Skipped ${result.skipped} duplicates.`,
            ...result,
        };
    }
}
