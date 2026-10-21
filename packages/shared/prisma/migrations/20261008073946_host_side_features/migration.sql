-- CreateEnum
CREATE TYPE "PricingType" AS ENUM ('FLAT', 'PER_GUEST');

-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('QUOTATION', 'INSTANT');

-- CreateEnum
CREATE TYPE "BookingGroupStatus" AS ENUM ('DRAFT', 'BOOKED');

-- CreateEnum
CREATE TYPE "MilestoneType" AS ENUM ('SIGN_AGREEMENT', 'PAY_DEPOSIT', 'FINALIZE_SELECTIONS');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('PENDING', 'COMPLETED', 'OVERDUE');

-- AlterTable
ALTER TABLE "booking_add_on_selections" ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "unitPrice" MONEY;

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "bookingGroupId" TEXT,
ADD COLUMN     "serviceFee" MONEY,
ADD COLUMN     "source" "BookingSource" NOT NULL DEFAULT 'QUOTATION',
ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "vendor_add_ons" ADD COLUMN     "description" TEXT,
ADD COLUMN     "pricingType" "PricingType" NOT NULL DEFAULT 'FLAT';

-- AlterTable
ALTER TABLE "vendor_packages" ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "negotiablePrice" MONEY,
ADD COLUMN     "pricingType" "PricingType" NOT NULL DEFAULT 'FLAT';

-- CreateTable
CREATE TABLE "event_budget_allocations" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "category" "VendorCategory" NOT NULL,
    "minAmount" MONEY NOT NULL,
    "maxAmount" MONEY NOT NULL,

    CONSTRAINT "event_budget_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shortlisted_vendors" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "vendorProfileId" TEXT NOT NULL,
    "category" "VendorCategory" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shortlisted_vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_groups" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "discountAmount" MONEY NOT NULL DEFAULT 0,
    "status" "BookingGroupStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_milestones" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "type" "MilestoneType" NOT NULL,
    "title" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "status" "MilestoneStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "booking_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_policies" (
    "id" TEXT NOT NULL,
    "vendorProfileId" TEXT NOT NULL,
    "depositPercent" INTEGER NOT NULL DEFAULT 30,
    "fullRefundDaysBefore" INTEGER NOT NULL DEFAULT 45,
    "lateCancelDaysBefore" INTEGER NOT NULL DEFAULT 30,
    "lateCancelPercentDue" INTEGER NOT NULL DEFAULT 50,
    "terms" TEXT,

    CONSTRAINT "vendor_policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_budget_allocations_eventId_category_key" ON "event_budget_allocations"("eventId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "shortlisted_vendors_eventId_vendorProfileId_key" ON "shortlisted_vendors"("eventId", "vendorProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "booking_milestones_bookingId_type_key" ON "booking_milestones"("bookingId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_policies_vendorProfileId_key" ON "vendor_policies"("vendorProfileId");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_bookingGroupId_fkey" FOREIGN KEY ("bookingGroupId") REFERENCES "booking_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_budget_allocations" ADD CONSTRAINT "event_budget_allocations_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shortlisted_vendors" ADD CONSTRAINT "shortlisted_vendors_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shortlisted_vendors" ADD CONSTRAINT "shortlisted_vendors_vendorProfileId_fkey" FOREIGN KEY ("vendorProfileId") REFERENCES "vendor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_groups" ADD CONSTRAINT "booking_groups_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_milestones" ADD CONSTRAINT "booking_milestones_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_policies" ADD CONSTRAINT "vendor_policies_vendorProfileId_fkey" FOREIGN KEY ("vendorProfileId") REFERENCES "vendor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
