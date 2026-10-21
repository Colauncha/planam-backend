import {
  Body,
  Controller,
  Get,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { UpdateAvailabilityScheduleDto } from './dto/update-availability-schedule.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('calendar/availability-schedule')
@UseGuards(JwtAuthGuard)
export class AvailabilityScheduleController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get()
  get(@Request() req) {
    return this.calendarService.getAvailabilitySchedule(req.user.userId);
  }

  @Patch()
  update(@Request() req, @Body() dto: UpdateAvailabilityScheduleDto) {
    return this.calendarService.updateAvailabilitySchedule(
      req.user.userId,
      dto,
    );
  }
}
