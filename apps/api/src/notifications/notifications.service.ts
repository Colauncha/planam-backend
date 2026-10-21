import { Injectable } from '@nestjs/common';
import { PrismaService } from '@planam/shared';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  // called internally by other modules, not exposed via HTTP
  async create(
    userId: string,
    type: string,
    title: string,
    body?: string,
    metadata?: any,
  ) {
    return this.prisma.notification.create({
      data: { userId, type: type as any, title, body, metadata },
    });
  }

  async findForUser(userId: string) {
    const many = this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    console.log('Notifications for user', userId, many);
    return many;
  }

  async markRead(userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}
