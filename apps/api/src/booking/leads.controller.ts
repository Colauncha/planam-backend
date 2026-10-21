import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
  Query,
} from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { RespondLeadDto } from './dto/respond-lead.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@planam/shared';
import { LeadsQueryDto } from './dto/leads-query.dto';

@Controller()
export class LeadsController {
  constructor(private readonly bookingService: BookingService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOST)
  @Post('events/:eventId/leads')
  create(
    @Request() req,
    @Param('eventId') eventId: string,
    @Body() dto: CreateLeadDto,
  ) {
    return this.bookingService.createLead(req.user.userId, eventId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR, Role.PLANNER)
  @Get('vendors/me/leads')
  findMine(@Request() req, @Query() query: LeadsQueryDto) {
    return this.bookingService.listVendorLeads(req.user.userId, query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR, Role.PLANNER)
  @Patch('leads/:id/respond')
  respond(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
    @Body() dto: RespondLeadDto,
  ) {
    return this.bookingService.respondToLead(req.user.userId, id, dto.status);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR, Role.PLANNER)
  @Get('leads/:id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.bookingService.getLeadDetail(req.user.userId, id);
  }
}
