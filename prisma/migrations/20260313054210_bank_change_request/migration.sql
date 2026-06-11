/*
  Warnings:

  - You are about to drop the column `ifscCode` on the `BankChangeRequest` table. All the data in the column will be lost.
  - You are about to drop the column `ifscCode` on the `Employee` table. All the data in the column will be lost.
  - Added the required column `Code` to the `BankChangeRequest` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "BankChangeRequest" DROP COLUMN "ifscCode",
ADD COLUMN     "Code" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Employee" DROP COLUMN "ifscCode",
ADD COLUMN     "Code" TEXT;
