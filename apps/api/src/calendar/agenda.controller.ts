import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { AgendaQueryDto } from './dto/agenda-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller()
@UseGuards(JwtAuthGuard)
export class AgendaController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('calendar/agenda')
  agenda(@Request() req, @Query() query: AgendaQueryDto) {
    return this.calendarService.getAgenda(
      req.user.userId,
      query.from,
      query.to,
    );
  }

  @Get('calendar/upcoming')
  upcoming(@Request() req) {
    return this.calendarService.getUpcoming(req.user.userId);
  }
}
