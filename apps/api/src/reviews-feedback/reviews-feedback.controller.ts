import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ReviewsFeedbackService } from './reviews-feedback.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { RespondReviewDto } from './dto/respond-review.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@planam/shared';

@Controller()
export class ReviewsFeedbackController {
  constructor(
    private readonly reviewsFeedbackService: ReviewsFeedbackService,
  ) {}

  // guest — no login, uses ticket code
  @Post('invitations/:ticketCode/reviews')
  submitAsGuest(
    @Param('ticketCode') ticketCode: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsFeedbackService.submitReviewAsGuest(ticketCode, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOST)
  @Post('events/:eventId/reviews')
  submitAsHost(
    @Request() req,
    @Param('eventId') eventId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsFeedbackService.submitReviewAsHost(
      req.user.userId,
      eventId,
      dto,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR, Role.PLANNER)
  @Patch('reviews/:reviewId/respond')
  respond(
    @Request() req,
    @Param('reviewId') reviewId: string,
    @Body() dto: RespondReviewDto,
  ) {
    return this.reviewsFeedbackService.respondToReview(
      req.user.userId,
      reviewId,
      dto.response,
    );
  }

  @Get('vendors/:vendorProfileId/reviews')
  listForVendor(@Param('vendorProfileId') vendorProfileId: string) {
    return this.reviewsFeedbackService.listReviewsForVendor(vendorProfileId);
  }

  @Get('events/:eventId/reviews')
  listForEvent(@Param('eventId') eventId: string) {
    return this.reviewsFeedbackService.listReviewsForEvent(eventId);
  }
}
