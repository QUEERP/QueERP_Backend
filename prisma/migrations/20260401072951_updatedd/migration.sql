/*
  Warnings:

  - The values [FACEBOOK,INSTAGRAM] on the enum `LeadSource` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `businessId` to the `Lead` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "LeadSource_new" AS ENUM ('WEBSITE', 'SOCIAL_MEDIA', 'LINKEDIN', 'REFERRAL', 'CALL', 'OTHER');
ALTER TABLE "Lead" ALTER COLUMN "source" TYPE "LeadSource_new" USING ("source"::text::"LeadSource_new");
ALTER TYPE "LeadSource" RENAME TO "LeadSource_old";
ALTER TYPE "LeadSource_new" RENAME TO "LeadSource";
DROP TYPE "public"."LeadSource_old";
COMMIT;

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "businessId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
