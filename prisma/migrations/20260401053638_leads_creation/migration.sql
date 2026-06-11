-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "company" TEXT,
    "website" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "zipCode" TEXT,
    "status" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "assignedTo" TEXT,
    "tags" TEXT,
    "leadValue" DOUBLE PRECISION,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "contactedToday" BOOLEAN NOT NULL DEFAULT false,
    "defaultLanguage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);
