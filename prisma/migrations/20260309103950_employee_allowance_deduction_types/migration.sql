/*
  Warnings:

  - The `allowance` column on the `Employee` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `deduction` column on the `Employee` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `SalaryComponent` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "SalaryComponent" DROP CONSTRAINT "SalaryComponent_employeeId_fkey";

-- AlterTable
ALTER TABLE "Employee" DROP COLUMN "allowance",
ADD COLUMN     "allowance" JSONB,
DROP COLUMN "deduction",
ADD COLUMN     "deduction" JSONB;

-- DropTable
DROP TABLE "SalaryComponent";
