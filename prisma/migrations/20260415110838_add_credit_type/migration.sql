/*
  Warnings:

  - Added the required column `type` to the `CreditNote` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CreditNoteType" AS ENUM ('INVOICE', 'BILL');

-- AlterTable
ALTER TABLE "CreditNote" ADD COLUMN     "type" "CreditNoteType" NOT NULL;
