import { Module } from '@nestjs/common';
import { VendorPolicyService } from './vendor-policy.service';
import { VendorPolicyController } from './vendor-policy.controller';
import { PrismaService } from '@planam/shared';

@Module({
  providers: [VendorPolicyService, PrismaService],
  controllers: [VendorPolicyController],
})
export class VendorPolicyModule {}
