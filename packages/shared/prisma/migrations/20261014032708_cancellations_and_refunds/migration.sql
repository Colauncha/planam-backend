-- CreateEnum
CREATE TYPE "CancelledBy" AS ENUM ('HOST', 'VENDOR');

-- CreateEnum
CREATE TYPE "CancellationTier" AS ENUM ('EARLY', 'MID', 'LATE', 'VENDOR_CANCELLED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'PROCESSING', 'NEEDS_ATTENTION', 'PROCESSED', 'FAILED');

-- AlterEnum
ALTER TYPE "InvoiceType" ADD VALUE 'CANCELLATION';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'BOOKING_CANCELLED';
ALTER TYPE "NotificationType" ADD VALUE 'REFUND_UPDATE';

-- AlterTable
ALTER TABLE "vendor_policies" ADD COLUMN     "midCancelPercentDue" INTEGER NOT NULL DEFAULT 30;

-- CreateTable
CREATE TABLE "booking_cancellations" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "cancelledBy" "CancelledBy" NOT NULL,
    "cancelledByUserId" TEXT NOT NULL,
    "reason" TEXT,
    "tier" "CancellationTier" NOT NULL,
    "daysBeforeEvent" DOUBLE PRECISION NOT NULL,
    "policy" JSONB NOT NULL,
    "totalPaid" MONEY NOT NULL,
    "amountOwed" MONEY NOT NULL,
    "refundAmount" MONEY NOT NULL,
    "amountStillDue" MONEY NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_cancellations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" TEXT NOT NULL,
    "cancellationId" TEXT,
    "paymentId" TEXT NOT NULL,
    "amount" MONEY NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "paystackRefundId" TEXT,
    "failureReason" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "booking_cancellations_bookingId_key" ON "booking_cancellations"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_paymentId_key" ON "refunds"("paymentId");

-- AddForeignKey
ALTER TABLE "booking_cancellations" ADD CONSTRAINT "booking_cancellations_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_cancellationId_fkey" FOREIGN KEY ("cancellationId") REFERENCES "booking_cancellations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
