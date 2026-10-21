/*
  Warnings:

  - You are about to drop the column `tableAssignment` on the `guests` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "EventSessionType" AS ENUM ('CEREMONY', 'RECEPTION', 'OTHER');

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "dressCode" TEXT,
ADD COLUMN     "rsvpDeadline" TIMESTAMP(3),
ADD COLUMN     "suggestedColors" TEXT[];

-- AlterTable
ALTER TABLE "guests" DROP COLUMN "tableAssignment",
ADD COLUMN     "plusOneAllowed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "plusOneName" TEXT,
ADD COLUMN     "seatNumber" TEXT,
ADD COLUMN     "seatingHall" TEXT,
ADD COLUMN     "tableNumber" TEXT;

-- CreateTable
CREATE TABLE "event_sessions" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" "EventSessionType" NOT NULL,
    "venueName" TEXT,
    "address" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_sessions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "event_sessions" ADD CONSTRAINT "event_sessions_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
