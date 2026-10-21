import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { EarningsService } from './earnings.service';
import { RecentEarningsQueryDto } from './dto/recent-earnings-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@planam/shared';

@Controller('earnings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.VENDOR, Role.PLANNER)
export class EarningsController {
  constructor(private readonly earningsService: EarningsService) {}

  @Get('overview')
  overview(@Request() req) {
    return this.earningsService.getOverview(req.user.userId);
  }

  @Get('recent')
  recent(@Request() req, @Query() query: RecentEarningsQueryDto) {
    return this.earningsService.listRecentEarnings(
      req.user.userId,
      query.page,
      query.pageSize,
    );
  }
}
