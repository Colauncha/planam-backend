import { Module } from '@nestjs/common';
import { VendorLogsController } from './vendor-logs.controller';
import { VendorLogsService } from './vendor-logs.service';
import { PrismaService } from '@planam/shared';

@Module({
  controllers: [VendorLogsController],
  providers: [VendorLogsService, PrismaService],
})
export class VendorLogsModule {}
