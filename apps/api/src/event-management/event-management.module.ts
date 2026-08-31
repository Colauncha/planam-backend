import { Module } from '@nestjs/common';
import { EventManagementController } from './event-management.controller';
import { EventManagementService } from './event-management.service';
import { PrismaService } from '@planam/shared';

@Module({
  controllers: [EventManagementController],
  providers: [EventManagementService, PrismaService],
})
export class EventManagementModule {}
