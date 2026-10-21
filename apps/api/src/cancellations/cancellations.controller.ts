import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { CancellationsService } from './cancellations.service';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('bookings')
export class CancellationsController {
  constructor(private readonly cancellations: CancellationsService) {}

  @UseGuards(JwtAuthGuard)
  @Get(':bookingId/cancellation-quote')
  quote(@Request() req, @Param('bookingId') bookingId: string) {
    return this.cancellations.getQuote(req.user.userId, bookingId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':bookingId/cancel')
  cancel(
    @Request() req,
    @Param('bookingId') bookingId: string,
    @Body() dto: CancelBookingDto,
  ) {
    return this.cancellations.cancel(req.user.userId, bookingId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':bookingId/cancellation')
  details(@Request() req, @Param('bookingId') bookingId: string) {
    return this.cancellations.getCancellation(req.user.userId, bookingId);
  }
}
