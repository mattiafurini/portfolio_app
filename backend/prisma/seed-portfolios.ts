
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

// Initialize Prisma Client with the adapter, similar to PrismaService
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('Starting migration to portfolios...');

    // Get all users
    const users = await prisma.user.findMany({
        include: {
            assets: true
        }
    });

    console.log(`Found ${users.length} users.`);

    for (const user of users) {
        console.log(`Processing user ${user.email}...`);

        // Check if user already has a portfolio named "Default"
        let defaultPortfolio = await prisma.portfolio.findFirst({
            where: {
                userId: user.id,
                name: 'Default'
            }
        });

        if (!defaultPortfolio) {
            console.log(`Creating Default portfolio for user ${user.email}...`);
            defaultPortfolio = await prisma.portfolio.create({
                data: {
                    name: 'Default',
                    userId: user.id
                }
            });
        }

        // Link all user assets to this portfolio if they are not already linked
        const assetsToUpdate = user.assets.filter(a => !a.portfolioId);
        if (assetsToUpdate.length > 0) {
            console.log(`Linking ${assetsToUpdate.length} assets to portfolio ${defaultPortfolio.id}...`);

            const result = await prisma.asset.updateMany({
                where: {
                    id: { in: assetsToUpdate.map(a => a.id) }
                },
                data: {
                    portfolioId: defaultPortfolio.id
                }
            });
            console.log(`Updated ${result.count} assets.`);
        } else {
            console.log('All assets already linked.');
        }
    }

    console.log('Migration completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
