import {
  Controller,
  Delete,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { BookingCalendarService } from './booking-calendar.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('bookings')
export class BookingCalendarController {
  constructor(private readonly calendar: BookingCalendarService) {}

  @UseGuards(JwtAuthGuard)
  @Post(':bookingId/calendar')
  add(@Request() req, @Param('bookingId') bookingId: string) {
    return this.calendar.add(req.user.userId, bookingId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':bookingId/calendar')
  remove(@Request() req, @Param('bookingId') bookingId: string) {
    return this.calendar.remove(req.user.userId, bookingId);
  }
}
