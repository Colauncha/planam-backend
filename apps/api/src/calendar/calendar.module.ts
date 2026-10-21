import { Module } from '@nestjs/common';
import { CalendarEventsController } from './calendar-events.controller';
import { TasksController } from './tasks.controller';
import { TaskListsController } from './task-lists.controller';
import { AgendaController } from './agenda.controller';
import { AvailabilityScheduleController } from './availability-schedule.controller';
import { CalendarService } from './calendar.service';
import { PrismaService } from '@planam/shared';

@Module({
  controllers: [
    CalendarEventsController,
    TasksController,
    TaskListsController,
    AgendaController,
    AvailabilityScheduleController,
  ],
  providers: [CalendarService, PrismaService],
})
export class CalendarModule {}
