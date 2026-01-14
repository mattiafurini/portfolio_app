import {
    Controller,
    Post,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
    UseGuards,
    Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
    constructor(private readonly uploadService: UploadService) { }

    @Post('fineco')
    @UseInterceptors(FileInterceptor('file'))
    async uploadFineco(@Request() req: any, @UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        const result = await this.uploadService.parseAndSaveFineco(file.buffer, req.user.id);
        return {
            success: true,
            message: `Imported ${result.transactionsCreated} transactions for ${result.assetsCreated} assets`,
            ...result,
        };
    }
}
