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
import { GuestTicketingService } from './guest-ticketing.service';
import { CreateGuestDto } from './dto/create-guest.dto';
import { BulkCreateGuestsDto } from './dto/bulk-create-guests.dto';
import { AssignSeatDto } from './dto/assign-seat.dto';
import { RsvpDto } from './dto/rsvp.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@planam/shared';

@Controller()
export class GuestTicketingController {
  // ---- HOST SIDE ----

  constructor(private readonly guestTicketingService: GuestTicketingService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOST)
  @Post('events/:eventId/guests')
  addGuest(
    @Request() req,
    @Param('eventId') eventId: string,
    @Body() dto: CreateGuestDto,
  ) {
    return this.guestTicketingService.addGuest(req.user.userId, eventId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOST)
  @Post('events/:eventId/guests/bulk')
  bulkAddGuests(
    @Request() req,
    @Param('eventId') eventId: string,
    @Body() dto: BulkCreateGuestsDto,
  ) {
    return this.guestTicketingService.bulkAddGuests(
      req.user.userId,
      eventId,
      dto.guests,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOST)
  @Get('events/:eventId/guests')
  listGuests(@Request() req, @Param('eventId') eventId: string) {
    return this.guestTicketingService.listGuests(req.user.userId, eventId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOST)
  @Patch('guests/:guestId/seat')
  assignSeat(
    @Request() req,
    @Param('guestId') guestId: string,
    @Body() dto: AssignSeatDto,
  ) {
    return this.guestTicketingService.assignSeat(req.user.userId, guestId, dto);
  }

  // ---- PUBLIC / ATTENDEE SIDE — no guard ----

  @Get('invitations/:ticketCode')
  getInvitation(@Param('ticketCode') ticketCode: string) {
    return this.guestTicketingService.getInvitationByTicketCode(ticketCode);
  }

  @Patch('invitations/:ticketCode/rsvp')
  rsvp(@Param('ticketCode') ticketCode: string, @Body() dto: RsvpDto) {
    return this.guestTicketingService.respondToInvitation(
      ticketCode,
      dto.status,
      dto.plusOneName,
    );
  }
}
