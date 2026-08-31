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
import { EventManagementService } from './event-management.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@planam/shared';

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
}
