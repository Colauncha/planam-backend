-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "authorEmail" TEXT,
ADD COLUMN     "authorName" TEXT,
ALTER COLUMN "eventId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "vendor_portfolio_media" ADD COLUMN     "caption" TEXT;

-- AlterTable
ALTER TABLE "vendor_profiles" ADD COLUMN     "country" TEXT,
ADD COLUMN     "isAcceptingBookings" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "teamSize" TEXT;

-- CreateTable
CREATE TABLE "package_menu_items" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,

    CONSTRAINT "package_menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "package_menu_items_packageId_menuItemId_key" ON "package_menu_items"("packageId", "menuItemId");

-- AddForeignKey
ALTER TABLE "package_menu_items" ADD CONSTRAINT "package_menu_items_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "vendor_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_menu_items" ADD CONSTRAINT "package_menu_items_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
