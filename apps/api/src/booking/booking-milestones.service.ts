import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@planam/shared';

@Injectable()
export class BookingMilestonesService {
  constructor(private readonly prisma: PrismaService) {}

  private async getBookingForParticipant(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        event: { select: { hostId: true } },
        vendorProfile: { select: { userId: true } },
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

  async list(userId: string, bookingId: string) {
    await this.getBookingForParticipant(bookingId, userId);

    const milestones = await this.prisma.bookingMilestone.findMany({
      where: { bookingId },
      orderBy: { dueDate: 'asc' },
    });

    const now = new Date();
    return milestones.map((m) => ({
      ...m,
      // overdue is derived on read, not stored
      displayStatus:
        m.status === 'PENDING' && m.dueDate && m.dueDate < now
          ? 'OVERDUE'
          : m.status,
    }));
  }

  async complete(userId: string, bookingId: string, milestoneId: string) {
    const { isHost } = await this.getBookingForParticipant(bookingId, userId);
    if (!isHost) {
      throw new ForbiddenException('Only the host can complete milestones');
    }

    const milestone = await this.prisma.bookingMilestone.findFirst({
      where: { id: milestoneId, bookingId },
    });
    if (!milestone) throw new NotFoundException('Milestone not found');

    if (milestone.type === 'PAY_DEPOSIT') {
      throw new BadRequestException(
        'This milestone is completed automatically when the deposit invoice is paid',
      );
    }
    if (milestone.status === 'COMPLETED') {
      throw new BadRequestException('This milestone is already completed');
    }

    return this.prisma.bookingMilestone.update({
      where: { id: milestoneId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
  }
}
