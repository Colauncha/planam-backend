import { Module } from '@nestjs/common';
import { PackagesController } from './packages.controller';
import { MenuItemsController } from './menu-items.controller';
import { AddOnsController } from './add-ons.controller';
import { VendorCatalogService } from './vendor-catalog.service';
import { PrismaService } from '@planam/shared';

@Module({
  controllers: [PackagesController, MenuItemsController, AddOnsController],
  providers: [VendorCatalogService, PrismaService],
})
export class VendorCatalogModule {}
