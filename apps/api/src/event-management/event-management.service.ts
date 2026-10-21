import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@planam/shared';

@Injectable()
export class EventManagementService {
  constructor(private readonly prisma: PrismaService) {}

  async createEvent(hostId: string, dto: any) {
    return this.prisma.event.create({
      data: {
        hostId,
        title: dto.title,
        description: dto.description,
        eventType: dto.eventType,
        eventDate: new Date(dto.eventDate),
        location: dto.location,
        guestCapacity: dto.guestCapacity,
        budget: dto.budget,
        dressCode: dto.dressCode,
        suggestedColors: dto.suggestedColors,
        rsvpDeadline: dto.rsvpDeadline ? new Date(dto.rsvpDeadline) : undefined,
      },
    });
  }

  async findMyEvents(hostId: string) {
    return this.prisma.event.findMany({
      where: { hostId },
      orderBy: { eventDate: 'asc' },
    });
  }

  async findOne(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    return event;
  }

  async updateEvent(eventId: string, hostId: string, dto: any) {
    const event = await this.findOne(eventId);
    if (event.hostId !== hostId) {
      throw new ForbiddenException('You do not own this event');
    }

    const updated = await this.prisma.event.update({
      where: { id: eventId },
      data: {
        ...dto,
        eventDate: dto.eventDate ? new Date(dto.eventDate) : undefined,
      },
    });

    if (
      dto.guestCapacity !== undefined &&
      dto.guestCapacity !== event.guestCapacity
    ) {
      const openQuotations = await this.prisma.quotation.findMany({
        where: {
          lead: { eventId },
          status: { in: ['DRAFT', 'PENDING', 'NEGOTIATION'] },
        },
        select: { id: true },
      });

      if (openQuotations.length > 0) {
        await this.prisma.quotationActivityLog.createMany({
          data: openQuotations.map((q) => ({
            quotationId: q.id,
            type: 'GUEST_COUNT_CHANGED' as const,
            actor: 'HOST' as const,
            description: `Guest count changed from ${event.guestCapacity ?? 'not set'} to ${dto.guestCapacity}`,
          })),
        });
      }
    }

    return updated;
  }

  async markCompleted(eventId: string, hostId: string) {
    const event = await this.findOne(eventId);
    if (event.hostId !== hostId) {
      throw new ForbiddenException('You do not own this event');
    }
    return this.prisma.event.update({
      where: { id: eventId },
      data: { status: 'COMPLETED' },
    });
  }

  async addSession(
    eventId: string,
    hostId: string,
    dto: {
      type: string;
      venueName?: string;
      address?: string;
      startTime: string;
    },
  ) {
    const event = await this.findOne(eventId);
    if (event.hostId !== hostId)
      throw new ForbiddenException('You do not own this event');

    return this.prisma.eventSession.create({
      data: {
        eventId,
        type: dto.type as any,
        venueName: dto.venueName,
        address: dto.address,
        startTime: new Date(dto.startTime),
      },
    });
  }

  async removeSession(eventId: string, hostId: string, sessionId: string) {
    const event = await this.findOne(eventId);
    if (event.hostId !== hostId)
      throw new ForbiddenException('You do not own this event');

    return this.prisma.eventSession.deleteMany({
      where: { id: sessionId, eventId },
    });
  }

  async listSessions(eventId: string) {
    return this.prisma.eventSession.findMany({
      where: { eventId },
      orderBy: { startTime: 'asc' },
    });
  }

  private async assertOwner(eventId: string, hostId: string) {
    const event = await this.findOne(eventId);
    if (event.hostId !== hostId) {
      throw new ForbiddenException('You do not own this event');
    }
    return event;
  }

  async getBudgetAllocations(eventId: string, hostId: string) {
    const event = await this.assertOwner(eventId, hostId);

    const allocations = await this.prisma.eventBudgetAllocation.findMany({
      where: { eventId },
      orderBy: { category: 'asc' },
    });

    const totalMin = allocations.reduce((s, a) => s + Number(a.minAmount), 0);
    const totalMax = allocations.reduce((s, a) => s + Number(a.maxAmount), 0);
    const eventBudget = event.budget !== null ? Number(event.budget) : null;

    return {
      allocations,
      totalMin,
      totalMax,
      eventBudget,
      exceedsEventBudget: eventBudget !== null && totalMax > eventBudget,
    };
  }

  async setBudgetAllocations(
    eventId: string,
    hostId: string,
    dto: {
      allocations: {
        category: string;
        minAmount: number;
        maxAmount: number;
      }[];
    },
  ) {
    await this.assertOwner(eventId, hostId);

    const seen = new Set<string>();
    for (const a of dto.allocations) {
      if (seen.has(a.category)) {
        throw new BadRequestException(`Duplicate category: ${a.category}`);
      }
      seen.add(a.category);
      if (a.minAmount > a.maxAmount) {
        throw new BadRequestException(
          `${a.category}: minimum cannot be greater than maximum`,
        );
      }
    }

    await this.prisma.$transaction([
      this.prisma.eventBudgetAllocation.deleteMany({ where: { eventId } }),
      this.prisma.eventBudgetAllocation.createMany({
        data: dto.allocations.map((a) => ({
          eventId,
          category: a.category as any,
          minAmount: a.minAmount,
          maxAmount: a.maxAmount,
        })),
      }),
    ]);

    return this.getBudgetAllocations(eventId, hostId);
  }
}
