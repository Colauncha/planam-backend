import { Module } from '@nestjs/common';
import { AiRecommendationController } from './ai-recommendation.controller';
import { AiRecommendationService } from './ai-recommendation.service';
import { PrismaService } from '@planam/shared';

@Module({
  controllers: [AiRecommendationController],
  providers: [AiRecommendationService, PrismaService],
  exports: [AiRecommendationService],
})
export class AiRecommendationModule {}
