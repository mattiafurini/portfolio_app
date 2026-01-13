import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AssetsService {
    constructor(private prisma: PrismaService) { }

    async getAll() {
        return this.prisma.asset.findMany({
            include: {
                transactions: {
                    orderBy: { date: 'desc' },
                },
            },
        });
    }
}
