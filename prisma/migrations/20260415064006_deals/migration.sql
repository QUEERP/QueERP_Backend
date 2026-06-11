/*
  Warnings:

  - You are about to drop the column `assignedTo` on the `Deal` table. All the data in the column will be lost.
  - You are about to drop the column `assignedTo` on the `Lead` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Deal" DROP COLUMN "assignedTo",
ADD COLUMN     "assignedToId" TEXT;

-- AlterTable
ALTER TABLE "Lead" DROP COLUMN "assignedTo",
ADD COLUMN     "assignedToId" TEXT;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "business_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "business_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
