import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { FaqsController } from './faqs.controller';
import { FeedbackController } from './feedback.controller';
import { SupportService } from './support.service';
import { PrismaService } from '@planam/shared';

@Module({
  controllers: [TicketsController, FaqsController, FeedbackController],
  providers: [SupportService, PrismaService],
})
export class SupportModule {}
