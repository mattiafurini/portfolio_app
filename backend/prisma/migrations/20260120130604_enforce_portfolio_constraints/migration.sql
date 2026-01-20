/*
  Warnings:

  - A unique constraint covering the columns `[name,portfolioId]` on the table `Asset` will be added. If there are existing duplicate values, this will fail.
  - Made the column `portfolioId` on table `Asset` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "Asset_name_userId_key";

-- AlterTable
ALTER TABLE "Asset" ALTER COLUMN "portfolioId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Asset_name_portfolioId_key" ON "Asset"("name", "portfolioId");
