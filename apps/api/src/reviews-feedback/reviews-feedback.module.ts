import { Module } from '@nestjs/common';
import { ReviewsFeedbackController } from './reviews-feedback.controller';
import { ReviewsFeedbackService } from './reviews-feedback.service';
import { PrismaService } from '@planam/shared';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  controllers: [ReviewsFeedbackController],
  providers: [ReviewsFeedbackService, PrismaService],
  imports: [NotificationsModule],
})
export class ReviewsFeedbackModule {}
