import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
  Delete,
  Put,
} from '@nestjs/common';
import { EventManagementService } from './event-management.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@planam/shared';
import { CreateSessionDto } from './dto/create-session.dto';
import { SetBudgetAllocationsDto } from './dto/set-budget-allocations.dto';

@Controller('events')
export class EventManagementController {
  constructor(
    private readonly eventManagementService: EventManagementService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOST)
  @Post()
  create(@Request() req, @Body() dto: CreateEventDto) {
    return this.eventManagementService.createEvent(req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOST)
  @Get('mine')
  findMine(@Request() req) {
    return this.eventManagementService.findMyEvents(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventManagementService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOST)
  @Patch(':id')
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdateEventDto) {
    return this.eventManagementService.updateEvent(id, req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOST)
  @Patch(':id/complete')
  markCompleted(@Request() req, @Param('id') id: string) {
    return this.eventManagementService.markCompleted(id, req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOST)
  @Post(':id/sessions')
  addSession(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: CreateSessionDto,
  ) {
    return this.eventManagementService.addSession(id, req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOST)
  @Delete(':id/sessions/:sessionId')
  removeSession(
    @Request() req,
    @Param('id') id: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.eventManagementService.removeSession(
      id,
      req.user.userId,
      sessionId,
    );
  }

  @Get(':id/sessions')
  listSessions(@Param('id') id: string) {
    return this.eventManagementService.listSessions(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOST)
  @Get(':id/budget-allocations')
  getBudgetAllocations(@Request() req, @Param('id') id: string) {
    return this.eventManagementService.getBudgetAllocations(
      id,
      req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOST)
  @Put(':id/budget-allocations')
  setBudgetAllocations(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: SetBudgetAllocationsDto,
  ) {
    return this.eventManagementService.setBudgetAllocations(
      id,
      req.user.userId,
      dto,
    );
  }
}
