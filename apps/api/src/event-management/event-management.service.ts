import {
  Injectable,
  ForbiddenException,
  NotFoundException,
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

    return this.prisma.event.update({
      where: { id: eventId },
      data: {
        ...dto,
        eventDate: dto.eventDate ? new Date(dto.eventDate) : undefined,
      },
    });
  }
}
