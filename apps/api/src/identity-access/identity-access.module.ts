import { Module } from '@nestjs/common';
import { IdentityAccessController } from './identity-access.controller';
import { IdentityAccessService } from './identity-access.service';
import { PrismaService } from '@planam/shared';

@Module({
  controllers: [IdentityAccessController],
  providers: [IdentityAccessService, PrismaService],
})
export class IdentityAccessModule {}
