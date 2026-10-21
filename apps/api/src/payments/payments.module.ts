import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PrismaService } from '@planam/shared';
import { NotificationsModule } from '../notifications/notifications.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { RefundsController } from './refunds.controller';
import { RefundsService } from './refunds.service';

@Module({
  controllers: [PaymentsController, RefundsController],
  providers: [PaymentsService, PrismaService, RefundsService],
  imports: [NotificationsModule, SubscriptionsModule],
  exports: [RefundsService],
})
export class PaymentsModule {}
