/*
  Warnings:

  - Added the required column `listId` to the `tasks` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "endTime" TIMESTAMP(3),
ADD COLUMN     "listId" TEXT NOT NULL,
ADD COLUMN     "startTime" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "task_lists" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_subtasks" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_subtasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "timeZone" TEXT NOT NULL DEFAULT 'Africa/Lagos',

    CONSTRAINT "availability_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_availability_days" (
    "id" TEXT NOT NULL,
    "settingsId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "ranges" JSONB NOT NULL,

    CONSTRAINT "weekly_availability_days_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "task_lists_userId_name_key" ON "task_lists"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "availability_settings_userId_key" ON "availability_settings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_availability_days_settingsId_dayOfWeek_key" ON "weekly_availability_days"("settingsId", "dayOfWeek");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_listId_fkey" FOREIGN KEY ("listId") REFERENCES "task_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_lists" ADD CONSTRAINT "task_lists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_subtasks" ADD CONSTRAINT "task_subtasks_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_settings" ADD CONSTRAINT "availability_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_availability_days" ADD CONSTRAINT "weekly_availability_days_settingsId_fkey" FOREIGN KEY ("settingsId") REFERENCES "availability_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
