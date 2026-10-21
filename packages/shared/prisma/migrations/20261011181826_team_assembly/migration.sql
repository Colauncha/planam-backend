-- CreateEnum
CREATE TYPE "TeamSlot" AS ENUM ('CATERING', 'ENTERTAINMENT', 'DECOR', 'PHOTOGRAPHY');

-- CreateTable
CREATE TABLE "booking_group_items" (
    "id" TEXT NOT NULL,
    "bookingGroupId" TEXT NOT NULL,
    "slot" "TeamSlot" NOT NULL,
    "vendorProfileId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "addOns" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_group_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "booking_group_items_bookingGroupId_slot_key" ON "booking_group_items"("bookingGroupId", "slot");

-- AddForeignKey
ALTER TABLE "booking_group_items" ADD CONSTRAINT "booking_group_items_bookingGroupId_fkey" FOREIGN KEY ("bookingGroupId") REFERENCES "booking_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_group_items" ADD CONSTRAINT "booking_group_items_vendorProfileId_fkey" FOREIGN KEY ("vendorProfileId") REFERENCES "vendor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_group_items" ADD CONSTRAINT "booking_group_items_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "vendor_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
