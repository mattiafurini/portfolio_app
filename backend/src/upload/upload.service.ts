
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

    async parseAndSaveTransaction(buffer: Buffer, userId: string, portfolioId?: string): Promise<{
        assetsCreated: number;
        transactionsCreated: number;
        skipped: number;
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
            throw new BadRequestException('Invalid transaction file format: header row not found');
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

        if (dataRows.length === 0) {
            return { assetsCreated: 0, transactionsCreated: 0, skipped: 0 };
        }

        // 1. Pre-process rows to find date range and build potential transactions
        const parsedRows: any[] = [];
        let minDate: Date | null = null;
        let maxDate: Date | null = null;

        for (const row of dataRows) {
            if (!row || !row[colMap.titolo]) continue;

            const name = row[colMap.titolo]?.toString().trim();
            const stato = row[colMap.stato]?.toString().trim();
            const segno = row[colMap.segno]?.toString().trim();
            const quantita = parseFloat(row[colMap.quantita]) || 0;
            const prezzo = parseFloat(row[colMap.prezzo]) || 0;
            const dataOraStr = row[colMap.dataOra]?.toString().trim();

            if (stato !== 'Eseguito' || !name || quantita === 0) continue;

            let date: Date;
            try {
                const [datePart, timePart] = dataOraStr.split(' ');
                const [day, month, year] = datePart.split('/').map(Number);
                const [hours, minutes, seconds] = (timePart || '00:00:00').split(':').map(Number);
                date = new Date(year, month - 1, day, hours, minutes, seconds);
            } catch {
                continue;
            }

            if (!minDate || date < minDate) minDate = date;
            if (!maxDate || date > maxDate) maxDate = date;

            parsedRows.push({
                name,
                stato,
                segno,
                quantita,
                prezzo,
                date,
            });
        }

        if (parsedRows.length === 0) {
            return { assetsCreated: 0, transactionsCreated: 0, skipped: 0 };
        }

        // 2. Fetch existing transactions in this date range to compare
        const existingTxs = await this.prisma.transaction.findMany({
            where: {
                asset: {
                    userId,
                    ...(portfolioId ? { portfolioId } : {})
                },
                date: {
                    gte: minDate!,
                    lte: maxDate!,
                },
            },
            include: {
                asset: true,
            },
        });

        // 3. Build a Set of signatures for O(1) lookup
        // Signature: AssetName|DateISO|Type|Quantity|Price
        const existingSignatures = new Set<string>();
        for (const tx of existingTxs) {
            const sig = `${tx.asset.name}|${tx.date.getTime()}|${tx.type}|${tx.quantity}|${tx.price}`;
            existingSignatures.add(sig);
        }

        let assetsCreated = 0;
        let transactionsCreated = 0;
        let skipped = 0;

        // 4. Process valid rows
        for (const row of parsedRows) {
            const type = row.segno === 'Acquisto' ? 'BUY' : 'SELL';

            // Generate signature for this row
            const sig = `${row.name}|${row.date.getTime()}|${type}|${row.quantita}|${row.prezzo}`;

            if (existingSignatures.has(sig)) {
                skipped++;
                continue;
            }

            // Not a duplicate -> Insert
            let asset = await this.prisma.asset.findFirst({
                where: {
                    name: row.name,
                    userId,
                    ...(portfolioId ? { portfolioId } : {})
                }
            });

            if (!asset) {
                asset = await this.prisma.asset.create({
                    data: {
                        name: row.name,
                        userId,
                        portfolioId
                    }
                });
                assetsCreated++;
            }

            await this.prisma.transaction.create({
                data: {
                    assetId: asset.id,
                    type,
                    quantity: row.quantita,
                    price: row.prezzo,
                    date: row.date,
                },
            });
            transactionsCreated++;

            // Add to set to prevent duplicates WITHIN the file itself
            existingSignatures.add(sig);
        }

        return { assetsCreated, transactionsCreated, skipped };
    }
}
