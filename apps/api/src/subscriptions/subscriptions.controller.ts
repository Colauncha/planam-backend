import { Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('subscriptions/me')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  get(@Request() req) {
    return this.subscriptionsService.getMySubscription(req.user.userId);
  }

  @Post('upgrade')
  upgrade(@Request() req) {
    return this.subscriptionsService.initiateUpgrade(req.user.userId);
  }
}
