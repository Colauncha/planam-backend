import {
  Controller,
  Get,
  Param,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import { BookingMilestonesService } from './booking-milestones.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@planam/shared';

@Controller('bookings')
export class BookingMilestonesController {
  constructor(private readonly milestones: BookingMilestonesService) {}

  @UseGuards(JwtAuthGuard)
  @Get(':bookingId/milestones')
  list(@Request() req, @Param('bookingId') bookingId: string) {
    return this.milestones.list(req.user.userId, bookingId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOST)
  @Patch(':bookingId/milestones/:milestoneId/complete')
  complete(
    @Request() req,
    @Param('bookingId') bookingId: string,
    @Param('milestoneId') milestoneId: string,
  ) {
    return this.milestones.complete(req.user.userId, bookingId, milestoneId);
  }
}
