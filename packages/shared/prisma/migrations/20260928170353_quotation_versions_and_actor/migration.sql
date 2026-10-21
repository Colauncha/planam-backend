-- CreateEnum
CREATE TYPE "ActivityActor" AS ENUM ('VENDOR', 'HOST', 'AI', 'SYSTEM');

-- AlterEnum
ALTER TYPE "QuotationActivityType" ADD VALUE 'GUEST_COUNT_CHANGED';

-- AlterTable
ALTER TABLE "quotation_activity_logs" ADD COLUMN     "actor" "ActivityActor" NOT NULL DEFAULT 'SYSTEM';

-- AlterTable
ALTER TABLE "quotations" ADD COLUMN     "sentAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "quotation_versions" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "packageId" TEXT,
    "lineItems" JSONB NOT NULL,
    "subtotal" MONEY NOT NULL,
    "taxRate" DECIMAL(5,2) NOT NULL,
    "taxAmount" MONEY NOT NULL,
    "totalAmount" MONEY NOT NULL,
    "terms" TEXT,
    "revisionMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quotation_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quotation_versions_quotationId_version_key" ON "quotation_versions"("quotationId", "version");

-- AddForeignKey
ALTER TABLE "quotation_versions" ADD CONSTRAINT "quotation_versions_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
