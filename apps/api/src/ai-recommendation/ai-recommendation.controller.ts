import {
  Controller,
  Get,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AiRecommendationService } from './ai-recommendation.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@planam/shared';

@Controller()
export class AiRecommendationController {
  constructor(
    private readonly aiRecommendationService: AiRecommendationService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOST)
  @Get('events/:eventId/recommendations')
  recommend(
    @Request() req,
    @Param('eventId') eventId: string,
    @Query('category') category: string,
  ) {
    return this.aiRecommendationService.recommendVendors(
      req.user.userId,
      eventId,
      category,
    );
  }
}
