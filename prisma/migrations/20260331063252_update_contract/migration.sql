/*
  Warnings:

  - You are about to drop the column `type` on the `Contract` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Contract" DROP COLUMN "type",
ADD COLUMN     "typeId" TEXT,
ALTER COLUMN "currency" DROP DEFAULT;

-- CreateTable
CREATE TABLE "ContractType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContractType_businessId_name_key" ON "ContractType"("businessId", "name");

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "ContractType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractType" ADD CONSTRAINT "ContractType_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
