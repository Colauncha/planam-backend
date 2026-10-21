/*
  Warnings:

  - A unique constraint covering the columns `[userId,bookingId]` on the table `calendar_events` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "policySnapshot" JSONB;

-- AlterTable
ALTER TABLE "calendar_events" ADD COLUMN     "bookingId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "calendar_events_userId_bookingId_key" ON "calendar_events"("userId", "bookingId");

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
