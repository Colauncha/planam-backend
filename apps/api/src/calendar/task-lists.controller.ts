import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { CreateTaskListDto } from './dto/create-task-list.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('task-lists')
@UseGuards(JwtAuthGuard)
export class TaskListsController {
  constructor(private readonly calendarService: CalendarService) {}

  @Post()
  create(@Request() req, @Body() dto: CreateTaskListDto) {
    return this.calendarService.createTaskList(req.user.userId, dto.name);
  }

  @Get()
  list(@Request() req) {
    return this.calendarService.listTaskLists(req.user.userId);
  }

  @Delete(':id')
  delete(@Request() req, @Param('id') id: string) {
    return this.calendarService.deleteTaskList(req.user.userId, id);
  }
}
