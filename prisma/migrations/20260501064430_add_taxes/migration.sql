/*
  Warnings:

  - You are about to drop the column `taxAmount` on the `invoice_items` table. All the data in the column will be lost.
  - You are about to drop the column `taxPercent` on the `invoice_items` table. All the data in the column will be lost.
  - Added the required column `type` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `region` to the `customers` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Region" AS ENUM ('INDIA', 'UAE');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('GOODS', 'SERVICE');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "taxCode" TEXT,
ADD COLUMN     "type" "ItemType" NOT NULL;

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "region" "Region" NOT NULL;

-- AlterTable
ALTER TABLE "invoice_items" DROP COLUMN "taxAmount",
DROP COLUMN "taxPercent",
ADD COLUMN     "taxDetails" JSONB,
ADD COLUMN     "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalTax" DOUBLE PRECISION NOT NULL DEFAULT 0;
