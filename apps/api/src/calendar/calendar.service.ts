import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@planam/shared';

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOrCreateDefaultList(userId: string) {
    const existing = await this.prisma.taskList.findFirst({
      where: { userId, name: 'My Tasks' },
    });
    if (existing) return existing;
    return this.prisma.taskList.create({ data: { userId, name: 'My Tasks' } });
  }

  // ---- CALENDAR EVENTS ----

  async createEvent(userId: string, dto: any) {
    return this.prisma.calendarEvent.create({
      data: {
        userId,
        ...dto,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
      },
    });
  }

  async updateEvent(userId: string, eventId: string, dto: any) {
    const event = await this.prisma.calendarEvent.findUnique({
      where: { id: eventId },
    });
    if (!event) throw new NotFoundException('Calendar event not found');
    if (event.userId !== userId)
      throw new ForbiddenException('Not your calendar event');

    return this.prisma.calendarEvent.update({
      where: { id: eventId },
      data: {
        ...dto,
        startTime: dto.startTime ? new Date(dto.startTime) : undefined,
        endTime: dto.endTime ? new Date(dto.endTime) : undefined,
      },
    });
  }

  async deleteEvent(userId: string, eventId: string) {
    const event = await this.prisma.calendarEvent.findUnique({
      where: { id: eventId },
    });
    if (!event) throw new NotFoundException('Calendar event not found');
    if (event.userId !== userId)
      throw new ForbiddenException('Not your calendar event');

    return this.prisma.calendarEvent.delete({ where: { id: eventId } });
  }

  async listEvents(userId: string, from: string, to: string) {
    return this.prisma.calendarEvent.findMany({
      where: {
        userId,
        startTime: { gte: new Date(from) },
        endTime: { lte: new Date(to) },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  // ---- TASKS ----

  async createTask(userId: string, dto: any) {
    const listId = dto.listId ?? (await this.getOrCreateDefaultList(userId)).id;

    if (dto.listId) {
      const list = await this.prisma.taskList.findUnique({
        where: { id: dto.listId },
      });
      if (!list || list.userId !== userId)
        throw new ForbiddenException('Not your task list');
    }

    return this.prisma.task.create({
      data: {
        userId,
        listId,
        title: dto.title,
        description: dto.description,
        priority: dto.priority,
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
        startTime: dto.startTime ? new Date(dto.startTime) : undefined,
        endTime: dto.endTime ? new Date(dto.endTime) : undefined,
      },
    });
  }

  async updateTask(userId: string, taskId: string, dto: any) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');
    if (task.userId !== userId) throw new ForbiddenException('Not your task');

    if (dto.listId) {
      const list = await this.prisma.taskList.findUnique({
        where: { id: dto.listId },
      });
      if (!list || list.userId !== userId)
        throw new ForbiddenException('Not your task list');
    }

    return this.prisma.task.update({
      where: { id: taskId },
      data: {
        ...dto,
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
        startTime: dto.startTime ? new Date(dto.startTime) : undefined,
        endTime: dto.endTime ? new Date(dto.endTime) : undefined,
      },
    });
  }

  async deleteTask(userId: string, taskId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');
    if (task.userId !== userId) throw new ForbiddenException('Not your task');

    return this.prisma.task.delete({ where: { id: taskId } });
  }

  async listTasks(
    userId: string,
    filter?: 'ALL' | 'TODAY' | 'COMPLETED',
    listId?: string,
  ) {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const where: any = { userId };
    if (listId) where.listId = listId;
    // if (filter === 'TODAY') where.deadline = { gte: todayStart, lt: todayEnd };
    if (filter === 'TODAY') {
      where.OR = [
        { deadline: { gte: todayStart, lt: todayEnd } },
        { startTime: { gte: todayStart, lt: todayEnd } },
      ];
    }
    if (filter === 'COMPLETED') where.isCompleted = true;

    return this.prisma.task.findMany({
      where,
      include: { subtasks: true, list: { select: { id: true, name: true } } },
      orderBy: [{ isCompleted: 'asc' }, { deadline: 'asc' }],
    });
  }

  async getTaskCounts(userId: string) {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const [all, today, completed, lists] = await Promise.all([
      this.prisma.task.count({ where: { userId } }),
      // this.prisma.task.count({
      // where: { userId, deadline: { gte: todayStart, lt: todayEnd } },
      // }),
      this.prisma.task.count({
        where: {
          userId,
          OR: [
            { deadline: { gte: todayStart, lt: todayEnd } },
            { startTime: { gte: todayStart, lt: todayEnd } },
          ],
        },
      }),
      this.prisma.task.count({ where: { userId, isCompleted: true } }),
      this.prisma.taskList.findMany({
        where: { userId },
        include: { _count: { select: { tasks: true } } },
      }),
    ]);

    return {
      all,
      today,
      completed,
      lists: lists.map((l) => ({
        id: l.id,
        name: l.name,
        taskCount: l._count.tasks,
      })),
    };
  }

  // ---- AGENDA (merged view for the calendar grid) ----

  async getAgenda(userId: string, from: string, to: string) {
    const fromDate = new Date(from);
    const toDate = new Date(to);

    const [calendarEvents, tasks, hostBookings, vendorBookings] =
      await Promise.all([
        this.prisma.calendarEvent.findMany({
          where: {
            userId,
            startTime: { gte: fromDate },
            endTime: { lte: toDate },
          },
        }),
        this.prisma.task.findMany({
          where: { userId, deadline: { gte: fromDate, lte: toDate } },
        }),
        this.prisma.booking.findMany({
          where: {
            event: {
              hostId: userId,
              eventDate: { gte: fromDate, lte: toDate },
            },
          },
          include: { event: true },
        }),
        this.prisma.booking.findMany({
          where: {
            vendorProfile: { userId },
            event: { eventDate: { gte: fromDate, lte: toDate } },
          },
          include: { event: true },
        }),
      ]);

    const bookingItems = [...hostBookings, ...vendorBookings].map((b) => ({
      id: b.id,
      type: 'BOOKING' as const,
      title: b.event.title,
      location: b.event.location,
      startTime: b.event.eventDate,
      endTime: b.event.eventDate,
      allDay: true,
    }));

    const eventItems = calendarEvents.map((e) => ({
      id: e.id,
      type: 'CALENDAR_EVENT' as const,
      title: e.title,
      location: e.location,
      startTime: e.startTime,
      endTime: e.endTime,
      allDay: e.allDay,
    }));

    const taskItems = tasks.map((t) => ({
      id: t.id,
      type: 'TASK' as const,
      title: t.title,
      location: null,
      startTime: t.deadline,
      endTime: t.deadline,
      allDay: true,
      priority: t.priority,
      isCompleted: t.isCompleted,
    }));

    return [...bookingItems, ...eventItems, ...taskItems].sort(
      (a, b) =>
        new Date(a.startTime!).getTime() - new Date(b.startTime!).getTime(),
    );
  }

  async getUpcoming(userId: string, limit = 5) {
    const now = new Date();

    const [hostBookings, vendorBookings] = await Promise.all([
      this.prisma.booking.findMany({
        where: { event: { hostId: userId, eventDate: { gte: now } } },
        include: { event: true },
        orderBy: { event: { eventDate: 'asc' } },
        take: limit,
      }),
      this.prisma.booking.findMany({
        where: {
          vendorProfile: { userId },
          event: { eventDate: { gte: now } },
        },
        include: { event: true },
        orderBy: { event: { eventDate: 'asc' } },
        take: limit,
      }),
    ]);

    return [...hostBookings, ...vendorBookings]
      .map((b) => ({
        bookingId: b.id,
        title: b.event.title,
        eventDate: b.event.eventDate,
        location: b.event.location,
      }))
      .sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime())
      .slice(0, limit);
  }

  // ---- TASK LISTS ----

  async createTaskList(userId: string, name: string) {
    return this.prisma.taskList.create({ data: { userId, name } });
  }

  async listTaskLists(userId: string) {
    return this.prisma.taskList.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async deleteTaskList(userId: string, listId: string) {
    const list = await this.prisma.taskList.findUnique({
      where: { id: listId },
    });
    if (!list) throw new NotFoundException('List not found');
    if (list.userId !== userId) throw new ForbiddenException('Not your list');
    if (list.name === 'My Tasks')
      throw new ForbiddenException('The default list cannot be deleted');

    return this.prisma.taskList.delete({ where: { id: listId } });
  }

  // ---- SUBTASKS ----

  async addSubtask(userId: string, taskId: string, title: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');
    if (task.userId !== userId) throw new ForbiddenException('Not your task');

    return this.prisma.taskSubtask.create({ data: { taskId, title } });
  }

  async toggleSubtask(userId: string, subtaskId: string, isCompleted: boolean) {
    const subtask = await this.prisma.taskSubtask.findUnique({
      where: { id: subtaskId },
      include: { task: true },
    });
    if (!subtask) throw new NotFoundException('Subtask not found');
    if (subtask.task.userId !== userId)
      throw new ForbiddenException('Not your subtask');

    return this.prisma.taskSubtask.update({
      where: { id: subtaskId },
      data: { isCompleted },
    });
  }

  async deleteSubtask(userId: string, subtaskId: string) {
    const subtask = await this.prisma.taskSubtask.findUnique({
      where: { id: subtaskId },
      include: { task: true },
    });
    if (!subtask) throw new NotFoundException('Subtask not found');
    if (subtask.task.userId !== userId)
      throw new ForbiddenException('Not your subtask');

    return this.prisma.taskSubtask.delete({ where: { id: subtaskId } });
  }

  // ---- WEEKLY AVAILABILITY SCHEDULE ----

  async getAvailabilitySchedule(userId: string) {
    let settings = await this.prisma.availabilitySettings.findUnique({
      where: { userId },
      include: { days: { orderBy: { dayOfWeek: 'asc' } } },
    });

    if (!settings) {
      settings = await this.prisma.availabilitySettings.create({
        data: {
          userId,
          days: {
            create: Array.from({ length: 7 }, (_, dayOfWeek) => ({
              dayOfWeek,
              isActive: false,
              ranges: [],
            })),
          },
        },
        include: { days: { orderBy: { dayOfWeek: 'asc' } } },
      });
    }

    return settings;
  }

  async updateAvailabilitySchedule(
    userId: string,
    dto: { timeZone?: string; days: any[] },
  ) {
    const settings = await this.getAvailabilitySchedule(userId); // ensures the row exists first

    await this.prisma.$transaction([
      this.prisma.availabilitySettings.update({
        where: { id: settings.id },
        data: { timeZone: dto.timeZone ?? settings.timeZone },
      }),
      ...dto.days.map((day) =>
        this.prisma.weeklyAvailabilityDay.update({
          where: {
            settingsId_dayOfWeek: {
              settingsId: settings.id,
              dayOfWeek: day.dayOfWeek,
            },
          },
          data: { isActive: day.isActive, ranges: day.ranges },
        }),
      ),
    ]);

    return this.getAvailabilitySchedule(userId);
  }
}
