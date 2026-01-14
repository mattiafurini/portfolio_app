/*
  Warnings:

  - A unique constraint covering the columns `[name,userId]` on the table `Asset` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `Asset` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Asset_name_key";

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_name_userId_key" ON "Asset"("name", "userId");

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
