import { Module } from '@nestjs/common';
import { PrismaService } from '@planam/shared';
import { VendorComparisonController } from './vendor-comparison.controller';
import { VendorComparisonService } from './vendor-comparison.service';
import { AiRecommendationModule } from '../ai-recommendation/ai-recommendation.module';
import { VendorAvailabilityModule } from '../vendor-availability/vendor-availability.module';

@Module({
  imports: [AiRecommendationModule, VendorAvailabilityModule],
  controllers: [VendorComparisonController],
  providers: [VendorComparisonService, PrismaService],
})
export class VendorComparisonModule {}
