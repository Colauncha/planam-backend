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
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AddSubtaskDto } from './dto/add-subtask.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly calendarService: CalendarService) {}

  @Post()
  create(@Request() req, @Body() dto: CreateTaskDto) {
    return this.calendarService.createTask(req.user.userId, dto);
  }

  @Get()
  list(
    @Request() req,
    @Query('filter') filter?: 'ALL' | 'TODAY' | 'COMPLETED',
    @Query('listId') listId?: string,
  ) {
    return this.calendarService.listTasks(req.user.userId, filter, listId);
  }

  @Get('counts')
  counts(@Request() req) {
    return this.calendarService.getTaskCounts(req.user.userId);
  }

  @Patch(':id')
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.calendarService.updateTask(req.user.userId, id, dto);
  }

  @Delete(':id')
  delete(@Request() req, @Param('id') id: string) {
    return this.calendarService.deleteTask(req.user.userId, id);
  }

  @Post(':id/subtasks')
  addSubtask(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: AddSubtaskDto,
  ) {
    return this.calendarService.addSubtask(req.user.userId, id, dto.title);
  }

  @Patch('subtasks/:subtaskId')
  toggleSubtask(
    @Request() req,
    @Param('subtaskId') subtaskId: string,
    @Body('isCompleted') isCompleted: boolean,
  ) {
    return this.calendarService.toggleSubtask(
      req.user.userId,
      subtaskId,
      isCompleted,
    );
  }

  @Delete('subtasks/:subtaskId')
  deleteSubtask(@Request() req, @Param('subtaskId') subtaskId: string) {
    return this.calendarService.deleteSubtask(req.user.userId, subtaskId);
  }
}
