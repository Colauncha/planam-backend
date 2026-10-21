import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { BookingDetailsService } from './booking-details.service';
import { UpdateBookingDetailsDto } from './dto/update-booking-details.dto';
import { AddTimelineEventDto } from './dto/add-timeline-event.dto';
import { AddBookingNoteDto } from './dto/add-booking-note.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@planam/shared';

@Controller('bookings/:bookingId')
@UseGuards(JwtAuthGuard)
export class BookingDetailsController {
  constructor(private readonly bookingDetailsService: BookingDetailsService) {}

  @UseGuards(RolesGuard)
  @Roles(Role.VENDOR, Role.PLANNER)
  @Patch('status')
  updateStatus(
    @Request() req,
    @Param('bookingId') bookingId: string,
    @Body() dto: UpdateBookingStatusDto,
  ) {
    return this.bookingDetailsService.updateStatus(
      req.user.userId,
      bookingId,
      dto.status,
    );
  }

  @UseGuards(RolesGuard)
  @Roles(Role.VENDOR, Role.PLANNER)
  @Patch('details')
  updateDetails(
    @Request() req,
    @Param('bookingId') bookingId: string,
    @Body() dto: UpdateBookingDetailsDto,
  ) {
    return this.bookingDetailsService.updateDetails(
      req.user.userId,
      bookingId,
      dto,
    );
  }

  @UseGuards(RolesGuard)
  @Roles(Role.VENDOR, Role.PLANNER)
  @Post('menu-selections/:menuItemId')
  selectMenuItem(
    @Request() req,
    @Param('bookingId') bookingId: string,
    @Param('menuItemId') menuItemId: string,
  ) {
    return this.bookingDetailsService.selectMenuItem(
      req.user.userId,
      bookingId,
      menuItemId,
    );
  }

  @UseGuards(RolesGuard)
  @Roles(Role.VENDOR, Role.PLANNER)
  @Delete('menu-selections/:menuItemId')
  removeMenuSelection(
    @Request() req,
    @Param('bookingId') bookingId: string,
    @Param('menuItemId') menuItemId: string,
  ) {
    return this.bookingDetailsService.removeMenuSelection(
      req.user.userId,
      bookingId,
      menuItemId,
    );
  }

  @Get('menu-selections')
  listMenuSelections(@Request() req, @Param('bookingId') bookingId: string) {
    return this.bookingDetailsService.listMenuSelections(
      req.user.userId,
      bookingId,
      req.user.role === 'HOST' ? 'host' : 'vendor',
    );
  }

  @UseGuards(RolesGuard)
  @Roles(Role.VENDOR, Role.PLANNER)
  @Post('add-on-selections/:addOnId')
  selectAddOn(
    @Request() req,
    @Param('bookingId') bookingId: string,
    @Param('addOnId') addOnId: string,
  ) {
    return this.bookingDetailsService.selectAddOn(
      req.user.userId,
      bookingId,
      addOnId,
    );
  }

  @UseGuards(RolesGuard)
  @Roles(Role.VENDOR, Role.PLANNER)
  @Delete('add-on-selections/:addOnId')
  removeAddOnSelection(
    @Request() req,
    @Param('bookingId') bookingId: string,
    @Param('addOnId') addOnId: string,
  ) {
    return this.bookingDetailsService.removeAddOnSelection(
      req.user.userId,
      bookingId,
      addOnId,
    );
  }

  @Get('add-on-selections')
  listAddOnSelections(@Request() req, @Param('bookingId') bookingId: string) {
    return this.bookingDetailsService.listAddOnSelections(
      req.user.userId,
      bookingId,
      req.user.role === 'HOST' ? 'host' : 'vendor',
    );
  }

  @UseGuards(RolesGuard)
  @Roles(Role.VENDOR, Role.PLANNER)
  @Post('timeline')
  addTimelineEvent(
    @Request() req,
    @Param('bookingId') bookingId: string,
    @Body() dto: AddTimelineEventDto,
  ) {
    return this.bookingDetailsService.addTimelineEvent(
      req.user.userId,
      bookingId,
      dto,
    );
  }

  @UseGuards(RolesGuard)
  @Roles(Role.VENDOR, Role.PLANNER)
  @Delete('timeline/:eventId')
  removeTimelineEvent(
    @Request() req,
    @Param('bookingId') bookingId: string,
    @Param('eventId') eventId: string,
  ) {
    return this.bookingDetailsService.removeTimelineEvent(
      req.user.userId,
      bookingId,
      eventId,
    );
  }

  @Get('timeline')
  listTimeline(@Request() req, @Param('bookingId') bookingId: string) {
    return this.bookingDetailsService.listTimeline(
      req.user.userId,
      bookingId,
      req.user.role === 'HOST' ? 'host' : 'vendor',
    );
  }

  @Post('notes')
  addNote(
    @Request() req,
    @Param('bookingId') bookingId: string,
    @Body() dto: AddBookingNoteDto,
  ) {
    return this.bookingDetailsService.addNote(
      req.user.userId,
      bookingId,
      req.user.role,
      dto,
    );
  }

  @Get('notes')
  listNotes(
    @Request() req,
    @Param('bookingId') bookingId: string,
    @Query('type') type?: 'INTERNAL' | 'SPECIAL_REQUEST',
  ) {
    return this.bookingDetailsService.listNotes(
      req.user.userId,
      bookingId,
      req.user.role,
      type,
    );
  }
}
