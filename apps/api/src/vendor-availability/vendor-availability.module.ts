import { Module } from '@nestjs/common';
import { VendorAvailabilityController } from './vendor-availability.controller';
import { VendorAvailabilityService } from './vendor-availability.service';
import { PrismaService } from '@planam/shared';

@Module({
  controllers: [VendorAvailabilityController],
  providers: [VendorAvailabilityService, PrismaService],
  exports: [VendorAvailabilityService],
})
export class VendorAvailabilityModule {}
