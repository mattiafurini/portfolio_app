import {
    Controller,
    Post,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';

@Controller('upload')
export class UploadController {
    constructor(private readonly uploadService: UploadService) { }

    @Post('fineco')
    @UseInterceptors(FileInterceptor('file'))
    async uploadFineco(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        const result = await this.uploadService.parseAndSaveFineco(file.buffer);
        return {
            success: true,
            message: `Imported ${result.transactionsCreated} transactions for ${result.assetsCreated} assets`,
            ...result,
        };
    }
}
