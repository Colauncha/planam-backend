import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@planam/shared';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ReviewsFeedbackService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async assertEventCompleted(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event) throw new NotFoundException('Event not found');
    if (event.status !== 'COMPLETED') {
      throw new BadRequestException(
        'Reviews can only be submitted after the event has concluded',
      );
    }
    return event;
  }

  // ---- guest submitting a review via their ticket ----

  async submitReviewAsGuest(
    ticketCode: string,
    dto: { vendorProfileId?: string; rating: number; comment?: string },
  ) {
    const guest = await this.prisma.guest.findUnique({ where: { ticketCode } });
    if (!guest) throw new NotFoundException('Invitation not found');

    await this.assertEventCompleted(guest.eventId);

    const review = await this.prisma.review.create({
      data: {
        eventId: guest.eventId,
        guestId: guest.id,
        vendorProfileId: dto.vendorProfileId,
        rating: dto.rating,
        comment: dto.comment,
      },
    });
    await this.notifyVendorOfReview(dto.vendorProfileId, review.id);
    return review;
  }

  // ---- host submitting a review ----

  async submitReviewAsHost(
    userId: string,
    eventId: string,
    dto: { vendorProfileId?: string; rating: number; comment?: string },
  ) {
    const event = await this.assertEventCompleted(eventId);
    if (event.hostId !== userId)
      throw new ForbiddenException('You do not own this event');

    const review = await this.prisma.review.create({
      data: {
        eventId,
        authorUserId: userId,
        vendorProfileId: dto.vendorProfileId,
        rating: dto.rating,
        comment: dto.comment,
      },
    });

    await this.notifyVendorOfReview(dto.vendorProfileId, review.id);
    return review;
  }

  // ---- vendor replying to a review ----

  async respondToReview(userId: string, reviewId: string, response: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: { vendorProfile: true },
    });
    if (!review) throw new NotFoundException('Review not found');
    if (!review.vendorProfile || review.vendorProfile.userId !== userId) {
      throw new ForbiddenException(
        'You can only respond to reviews about your own business',
      );
    }

    return this.prisma.review.update({
      where: { id: reviewId },
      data: { vendorResponse: response },
    });
  }

  // ---- public reads ----

  async listReviewsForVendor(vendorProfileId: string) {
    return this.prisma.review.findMany({
      where: { vendorProfileId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        rating: true,
        comment: true,
        vendorResponse: true,
        createdAt: true,
        guest: { select: { fullName: true } },
        authorUser: { select: { fullName: true } },
      },
    });
  }

  async listReviewsForEvent(eventId: string) {
    return this.prisma.review.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async notifyVendorOfReview(
    vendorProfileId: string | undefined,
    reviewId: string,
  ) {
    if (!vendorProfileId) return; // general event review, no specific vendor to notify
    const vendorProfile = await this.prisma.vendorProfile.findUnique({
      where: { id: vendorProfileId },
    });
    if (!vendorProfile) return;

    await this.notificationsService.create(
      vendorProfile.userId,
      'REVIEW_RECEIVED',
      'You received a new review',
      undefined,
      { reviewId },
    );
  }
}
