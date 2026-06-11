-- DropForeignKey
ALTER TABLE "CreditNote" DROP CONSTRAINT "CreditNote_customerId_fkey";

-- AlterTable
ALTER TABLE "CreditNote" ALTER COLUMN "customerId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
