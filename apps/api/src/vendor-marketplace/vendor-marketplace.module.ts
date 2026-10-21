import { Module } from '@nestjs/common';
import { VendorMarketplaceController } from './vendor-marketplace.controller';
import { VendorMarketplaceService } from './vendor-marketplace.service';
import { PrismaService } from '@planam/shared';
import { IdentityAccessService } from '../identity-access/identity-access.service';

@Module({
  controllers: [VendorMarketplaceController],
  providers: [VendorMarketplaceService, PrismaService, IdentityAccessService],
})
export class VendorMarketplaceModule {}
