import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  Request,
  Get,
  UseGuards,
} from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { RespondQuotationDto } from './dto/respond-quotation.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@planam/shared';
import { ReviseQuotationDto } from './dto/revise-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';

@Controller()
export class QuotationsController {
  constructor(private readonly bookingService: BookingService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR, Role.PLANNER)
  @Post('leads/:leadId/quotation')
  create(
    @Request() req,
    @Param('leadId') leadId: string,
    @Body() dto: CreateQuotationDto,
  ) {
    return this.bookingService.createQuotation(req.user.userId, leadId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR, Role.PLANNER)
  @Patch('quotations/:id/revise')
  revise(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: ReviseQuotationDto,
  ) {
    return this.bookingService.reviseQuotation(req.user.userId, id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOST)
  @Patch('quotations/:id/respond')
  respond(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: RespondQuotationDto,
  ) {
    return this.bookingService.respondToQuotation(
      req.user.userId,
      id,
      dto.status,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR, Role.PLANNER)
  @Patch('quotations/:id/send')
  send(@Request() req, @Param('id') id: string) {
    return this.bookingService.sendQuotation(req.user.userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('quotations/:id/activity-log')
  activityLog(@Request() req, @Param('id') id: string) {
    return this.bookingService.getQuotationActivityLog(req.user.userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('quotations/:id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.bookingService.getQuotation(req.user.userId, id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR, Role.PLANNER)
  @Patch('quotations/:id')
  updateDraft(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateQuotationDto,
  ) {
    return this.bookingService.updateDraftQuotation(req.user.userId, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('quotations/:id/versions')
  versions(@Request() req, @Param('id') id: string) {
    return this.bookingService.getQuotationVersions(req.user.userId, id);
  }
}
