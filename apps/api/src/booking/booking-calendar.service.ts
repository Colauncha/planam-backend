import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@planam/shared';

const HOUR_MS = 60 * 60 * 1000;

@Injectable()
export class BookingCalendarService {
  constructor(private readonly prisma: PrismaService) {}

  private async getBookingForParticipant(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        event: true,
        vendorProfile: { select: { userId: true, businessName: true } },
        package: { select: { name: true, serviceDurationHours: true } },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const isHost = booking.event.hostId === userId;
    const isVendor = booking.vendorProfile.userId === userId;
    if (!isHost && !isVendor) {
      throw new ForbiddenException('Not authorized for this booking');
    }
    return { booking, isHost };
  }

  async add(userId: string, bookingId: string) {
    const { booking, isHost } = await this.getBookingForParticipant(
      bookingId,
      userId,
    );
    if (booking.status === 'CANCELLED') {
      throw new BadRequestException('This booking has been cancelled');
    }

    const existing = await this.prisma.calendarEvent.findFirst({
      where: { userId, bookingId },
    });
    if (existing) return existing;

    // timed entry when we know the service length, otherwise an all-day entry
    const hours =
      booking.serviceDurationHours ??
      booking.package?.serviceDurationHours ??
      null;
    const start = booking.event.eventDate;
    const end = new Date(start.getTime() + (hours ?? 24) * HOUR_MS);

    return this.prisma.calendarEvent.create({
      data: {
        userId,
        bookingId,
        title: isHost
          ? `${booking.event.title}: ${booking.vendorProfile.businessName}`
          : booking.event.title,
        description: booking.package
          ? `Package: ${booking.package.name}`
          : undefined,
        location: booking.venue ?? booking.event.location ?? undefined,
        startTime: start,
        endTime: end,
        allDay: hours === null,
        busyStatus: 'BUSY',
        reminders: [1440, 60], // a day before and an hour before
      },
    });
  }

  async remove(userId: string, bookingId: string) {
    await this.getBookingForParticipant(bookingId, userId);
    const result = await this.prisma.calendarEvent.deleteMany({
      where: { userId, bookingId },
    });
    return { removed: result.count };
  }
}
