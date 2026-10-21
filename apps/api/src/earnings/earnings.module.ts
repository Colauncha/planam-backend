import { Module } from '@nestjs/common';
import { EarningsController } from './earnings.controller';
import { EarningsService } from './earnings.service';
import { PrismaService } from '@planam/shared';

@Module({
  controllers: [EarningsController],
  providers: [EarningsService, PrismaService],
})
export class EarningsModule {}
