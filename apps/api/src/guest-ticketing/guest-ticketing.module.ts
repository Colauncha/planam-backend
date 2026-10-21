import { Module } from '@nestjs/common';
import { GuestTicketingController } from './guest-ticketing.controller';
import { GuestTicketingService } from './guest-ticketing.service';
import { PrismaService } from '@planam/shared';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  controllers: [GuestTicketingController],
  providers: [GuestTicketingService, PrismaService],
  imports: [NotificationsModule],
})
export class GuestTicketingModule {}
