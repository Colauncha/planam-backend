import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { InstantBookingService } from './instant-booking.service';
import { PricePreviewDto } from './dto/price-preview.dto';
import { InstantBookDto } from './dto/instant-book.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@planam/shared';

@Controller('bookings')
export class InstantBookingController {
  constructor(private readonly instantBooking: InstantBookingService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOST)
  @Post('price-preview')
  pricePreview(@Request() req, @Body() dto: PricePreviewDto) {
    return this.instantBooking.getPricePreview(req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOST)
  @Post('instant')
  instant(@Request() req, @Body() dto: InstantBookDto) {
    return this.instantBooking.instantBook(req.user.userId, dto);
  }
}
