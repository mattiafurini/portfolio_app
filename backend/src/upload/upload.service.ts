
import { Injectable, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { PrismaService } from '../prisma/prisma.service';

interface FinecoRow {
    Titolo: string;
    Stato: string;
    Segno: string;
    'Q.tà eseguita': number;
    'P.zo medio': number;
    'Data e ora': string;
}

@Injectable()
export class UploadService {
    constructor(private prisma: PrismaService) { }

    async parseAndSaveFineco(buffer: Buffer, userId: string): Promise<{
        assetsCreated: number;
        transactionsCreated: number;
    }> {
        // Parse Excel file
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Convert to JSON, skipping the first row (header "Monitor Azioni, ETP ed Opzioni")
        const rawData = XLSX.utils.sheet_to_json<any>(sheet, { header: 1 });

        // Find the header row (contains "Titolo")
        let headerRowIndex = -1;
        for (let i = 0; i < rawData.length; i++) {
            if (rawData[i] && rawData[i][0] === 'Titolo') {
                headerRowIndex = i;
                break;
            }
        }

        if (headerRowIndex === -1) {
            throw new BadRequestException('Invalid Fineco file format: header row not found');
        }

        const headers = rawData[headerRowIndex] as string[];
        const dataRows = rawData.slice(headerRowIndex + 1);

        // Map column indices
        const colMap = {
            titolo: headers.indexOf('Titolo'),
            stato: headers.indexOf('Stato'),
            segno: headers.indexOf('Segno'),
            quantita: headers.indexOf('Q.tà eseguita'),
            prezzo: headers.indexOf('P.zo medio'),
            dataOra: headers.indexOf('Data e ora'),
        };

        let assetsCreated = 0;
        let transactionsCreated = 0;

        for (const row of dataRows) {
            if (!row || !row[colMap.titolo]) continue;

            const name = row[colMap.titolo]?.toString().trim();
            const stato = row[colMap.stato]?.toString().trim();
            const segno = row[colMap.segno]?.toString().trim();
            const quantita = parseFloat(row[colMap.quantita]) || 0;
            const prezzo = parseFloat(row[colMap.prezzo]) || 0;
            const dataOraStr = row[colMap.dataOra]?.toString().trim();

            // Skip non-executed transactions
            if (stato !== 'Eseguito' || !name || quantita === 0) continue;

            // Parse date (format: DD/MM/YYYY HH:MM:SS)
            let date: Date;
            try {
                const [datePart, timePart] = dataOraStr.split(' ');
                const [day, month, year] = datePart.split('/').map(Number);
                const [hours, minutes, seconds] = (timePart || '00:00:00').split(':').map(Number);
                date = new Date(year, month - 1, day, hours, minutes, seconds);
            } catch {
                date = new Date();
            }

            // Upsert asset linked to user
            let asset = await this.prisma.asset.findFirst({
                where: { name, userId }
            });

            if (!asset) {
                asset = await this.prisma.asset.create({
                    data: {
                        name,
                        userId
                    }
                });
                assetsCreated++;
            }

            // Determine transaction type
            const type = segno === 'Acquisto' ? 'BUY' : 'SELL';

            // Create transaction
            await this.prisma.transaction.create({
                data: {
                    assetId: asset.id,
                    type,
                    quantity: quantita,
                    price: prezzo,
                    date,
                },
            });
            transactionsCreated++;
        }

        return { assetsCreated, transactionsCreated };
    }
}
