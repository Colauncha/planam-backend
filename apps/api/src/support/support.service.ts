import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@planam/shared';
import * as crypto from 'crypto';

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  private generateTicketNumber(): string {
    return `SUP-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
  }

  // ---- TICKETS ----

  async createTicket(userId: string, subject: string, firstMessage: string) {
    return this.prisma.supportTicket.create({
      data: {
        userId,
        subject,
        ticketNumber: this.generateTicketNumber(),
        messages: { create: { senderType: 'USER', content: firstMessage } },
      },
      include: { messages: true },
    });
  }

  async listMyTickets(userId: string) {
    return this.prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
  }

  async getTicket(userId: string, ticketId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.userId !== userId)
      throw new ForbiddenException('Not your ticket');
    return ticket;
  }

  async addMessage(userId: string, ticketId: string, content: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.userId !== userId)
      throw new ForbiddenException('Not your ticket');

    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: 'IN_PROGRESS', updatedAt: new Date() },
    });

    return this.prisma.supportMessage.create({
      data: { ticketId, senderType: 'USER', content },
    });
  }

  // ---- FAQs ----

  async listFaqs(category?: string) {
    return this.prisma.faq.findMany({
      where: category ? { category } : undefined,
      orderBy: { order: 'asc' },
    });
  }

  // ---- PLATFORM FEEDBACK ----

  async submitFeedback(userId: string, rating: number, comment?: string) {
    return this.prisma.platformFeedback.create({
      data: { userId, rating, comment },
    });
  }
}
