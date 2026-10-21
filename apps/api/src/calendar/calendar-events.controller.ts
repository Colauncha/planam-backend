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
import { CalendarService } from './calendar.service';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';
import { UpdateCalendarEventDto } from './dto/update-calendar-event.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('calendar-events')
@UseGuards(JwtAuthGuard)
export class CalendarEventsController {
  constructor(private readonly calendarService: CalendarService) {}

  @Post()
  create(@Request() req, @Body() dto: CreateCalendarEventDto) {
    return this.calendarService.createEvent(req.user.userId, dto);
  }

  @Get()
  list(@Request() req, @Query('from') from: string, @Query('to') to: string) {
    return this.calendarService.listEvents(req.user.userId, from, to);
  }

  @Patch(':id')
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateCalendarEventDto,
  ) {
    return this.calendarService.updateEvent(req.user.userId, id, dto);
  }

  @Delete(':id')
  delete(@Request() req, @Param('id') id: string) {
    return this.calendarService.deleteEvent(req.user.userId, id);
  }
}
