-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'INR',
ADD COLUMN     "currencySymbol" TEXT NOT NULL DEFAULT '₹';
