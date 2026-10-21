import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { VendorLogsService } from './vendor-logs.service';
import { LogsQueryDto } from './dto/logs-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@planam/shared';

@Controller('vendors/me/logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.VENDOR, Role.PLANNER)
export class VendorLogsController {
  constructor(private readonly vendorLogsService: VendorLogsService) {}

  @Get()
  getLogs(@Request() req, @Query() query: LogsQueryDto) {
    return this.vendorLogsService.getLogs(req.user.userId, query);
  }
}
