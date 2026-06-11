-- AlterTable
ALTER TABLE "users" ADD COLUMN     "activeBusinessId" TEXT;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_activeBusinessId_fkey" FOREIGN KEY ("activeBusinessId") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
