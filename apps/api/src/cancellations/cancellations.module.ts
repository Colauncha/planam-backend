import { Module } from '@nestjs/common';
import { PrismaService } from '@planam/shared';
import { CancellationsController } from './cancellations.controller';
import { CancellationsService } from './cancellations.service';
import { PaymentsModule } from '../payments/payments.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PaymentsModule, NotificationsModule],
  controllers: [CancellationsController],
  providers: [CancellationsService, PrismaService],
})
export class CancellationsModule {}
