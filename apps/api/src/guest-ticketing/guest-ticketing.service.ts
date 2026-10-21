import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@planam/shared';
import * as crypto from 'crypto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class GuestTicketingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private generateTicketCode(): string {
    return crypto.randomBytes(6).toString('hex'); // 12-character code, e.g. "a3f9c1e02b7d"
  }

  private async getOwnedEvent(eventId: string, hostId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event) throw new NotFoundException('Event not found');
    if (event.hostId !== hostId)
      throw new ForbiddenException('You do not own this event');
    return event;
  }

  // ---- HOST SIDE ----

  async addGuest(
    hostId: string,
    eventId: string,
    dto: {
      fullName: string;
      email?: string;
      phone?: string;
      plusOneAllowed?: boolean;
    },
  ) {
    await this.getOwnedEvent(eventId, hostId);
    return this.prisma.guest.create({
      data: { eventId, ...dto, ticketCode: this.generateTicketCode() },
    });
  }

  async bulkAddGuests(
    hostId: string,
    eventId: string,
    guests: { fullName: string; email?: string; phone?: string }[],
  ) {
    await this.getOwnedEvent(eventId, hostId);
    const data = guests.map((g) => ({
      eventId,
      ...g,
      ticketCode: this.generateTicketCode(),
    }));
    await this.prisma.guest.createMany({ data });
    return { added: data.length };
  }

  async listGuests(hostId: string, eventId: string) {
    await this.getOwnedEvent(eventId, hostId);
    return this.prisma.guest.findMany({
      where: { eventId },
      orderBy: { invitedAt: 'asc' },
    });
  }

  async assignSeat(
    hostId: string,
    guestId: string,
    dto: { seatingHall?: string; tableNumber?: string; seatNumber?: string },
  ) {
    const guest = await this.prisma.guest.findUnique({
      where: { id: guestId },
      include: { event: true },
    });
    if (!guest) throw new NotFoundException('Guest not found');
    if (guest.event.hostId !== hostId)
      throw new ForbiddenException('Not your event');

    return this.prisma.guest.update({ where: { id: guestId }, data: dto });
  }

  // ---- PUBLIC / ATTENDEE SIDE ----

  async getInvitationByTicketCode(ticketCode: string) {
    const guest = await this.prisma.guest.findUnique({
      where: { ticketCode },
      include: {
        event: {
          select: {
            title: true,
            eventDate: true,
            location: true,
            eventType: true,
          },
        },
      },
    });
    if (!guest) throw new NotFoundException('Invitation not found');
    return guest;
  }

  async respondToInvitation(
    ticketCode: string,
    status: 'ACCEPTED' | 'DECLINED',
    plusOneName?: string,
  ) {
    const guest = await this.prisma.guest.findUnique({
      where: { ticketCode },
      include: { event: true },
    });
    if (!guest) throw new NotFoundException('Invitation not found');
    if (guest.rsvpStatus !== 'PENDING') {
      throw new BadRequestException(
        'You have already responded to this invitation',
      );
    }

    if (plusOneName && !guest.plusOneAllowed) {
      throw new ForbiddenException(
        'A plus one was not offered for this invitation',
      );
    }

    const updated = await this.prisma.guest.update({
      where: { ticketCode },
      data: {
        rsvpStatus: status,
        respondedAt: new Date(),
        plusOneName: status === 'ACCEPTED' ? plusOneName : undefined,
      },
    });

    await this.notificationsService.create(
      guest.event.hostId,
      'RSVP_RECEIVED',
      `${guest.fullName} ${status === 'ACCEPTED' ? 'accepted' : 'declined'} your invitation`,
      undefined,
      { guestId: guest.id, eventId: guest.eventId },
    );

    return updated;
  }
}
