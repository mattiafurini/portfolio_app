import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AssetsService {
    constructor(private prisma: PrismaService) { }

    async getAll(userId: string) {
        return this.prisma.asset.findMany({
            where: { userId },
            include: {
                transactions: {
                    orderBy: { date: 'desc' },
                },
            },
        });
    }
}
