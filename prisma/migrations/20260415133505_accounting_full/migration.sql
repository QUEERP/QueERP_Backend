/*
  Warnings:

  - You are about to drop the `Tax` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Tax" DROP CONSTRAINT "Tax_businessId_fkey";

-- DropTable
DROP TABLE "Tax";

-- DropEnum
DROP TYPE "TaxType";
