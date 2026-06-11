/*
  Warnings:

  - You are about to drop the column `module` on the `permissions` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[moduleId,action]` on the table `permissions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `moduleId` to the `permissions` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "permissions_module_action_key";

-- AlterTable
ALTER TABLE "permissions" DROP COLUMN "module",
ADD COLUMN     "moduleId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "modules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "modules_name_key" ON "modules"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_moduleId_action_key" ON "permissions"("moduleId", "action");

-- AddForeignKey
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
