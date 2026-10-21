import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { SupportService } from './support.service';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('support/feedback')
@UseGuards(JwtAuthGuard)
export class FeedbackController {
  constructor(private readonly supportService: SupportService) {}

  @Post()
  submit(@Request() req, @Body() dto: SubmitFeedbackDto) {
    return this.supportService.submitFeedback(
      req.user.userId,
      dto.rating,
      dto.comment,
    );
  }
}
