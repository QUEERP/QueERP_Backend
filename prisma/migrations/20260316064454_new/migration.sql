/*
  Warnings:

  - Added the required column `country` to the `BankChangeRequest` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "BankChangeRequest" ADD COLUMN     "country" TEXT NOT NULL;
