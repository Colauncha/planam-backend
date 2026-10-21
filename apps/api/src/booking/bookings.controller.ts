import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { BookingService } from './booking.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@planam/shared';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingService: BookingService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOST)
  @Get('mine/as-host')
  mineAsHost(@Request() req) {
    return this.bookingService.findMyBookingsAsHost(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR, Role.PLANNER)
  @Get('mine/as-vendor')
  mineAsVendor(@Request() req) {
    return this.bookingService.findMyBookingsAsVendor(req.user.userId);
  }
}