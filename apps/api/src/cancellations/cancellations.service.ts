import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@planam/shared';
import { NotificationsService } from '../notifications/notifications.service';
import { RefundsService } from '../payments/refunds.service';
import { generateInvoiceNumber } from '../booking/booking-milestones.util';
import { computeSettlement, pickPolicy } from './cancellation-calculator';

const DAY_MS = 24 * 60 * 60 * 1000;
const PLAN_TYPES = ['DEPOSIT', 'BALANCE', 'FULL'];
const NOT_CANCELLABLE = ['CANCELLED', 'COMPLETED', 'IN_PROGRESS'];

const naira = (n: number) => `₦${n.toLocaleString('en-NG')}`;
const round2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class CancellationsService {
  private readonly logger = new Logger(CancellationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly refundsService: RefundsService,
  ) {}

  private async loadBooking(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        event: true,
        vendorProfile: {
          select: { id: true, userId: true, businessName: true },
        },
        invoices: {
          include: { payments: { include: { refund: true } } },
        },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const isHost = booking.event.hostId === userId;
    const isVendor = booking.vendorProfile.userId === userId;
    if (!isHost && !isVendor) {
      throw new ForbiddenException('Not authorized for this booking');
    }
    return { booking, role: (isHost ? 'HOST' : 'VENDOR') as 'HOST' | 'VENDOR' };
  }

  // successful payments that have not already been refunded, newest first
  private successfulPayments(invoices: any[], types: string[]) {
    return invoices
      .filter((i) => types.includes(i.type))
      .flatMap((i) => i.payments)
      .filter((p: any) => p.status === 'SUCCESS' && !p.refund)
      .sort(
        (a: any, b: any) =>
          (b.paidAt?.getTime() ?? 0) - (a.paidAt?.getTime() ?? 0),
      );
  }

  private async resolvePolicy(booking: any) {
    // the terms the host agreed to at booking time win over the vendor's current policy
    const source =
      booking.policySnapshot ??
      (await this.prisma.vendorPolicy.findUnique({
        where: { vendorProfileId: booking.vendorProfile.id },
      }));
    return pickPolicy(source);
  }

  private async buildSettlement(booking: any, role: 'HOST' | 'VENDOR') {
    const now = new Date();
    if (NOT_CANCELLABLE.includes(booking.status)) {
      throw new BadRequestException(
        booking.status === 'CANCELLED'
          ? 'This booking has already been cancelled'
          : 'This booking can no longer be cancelled',
      );
    }
    if (booking.event.eventDate <= now) {
      throw new BadRequestException('The event date has already passed');
    }

    const policy = await this.resolvePolicy(booking);
    const sum = (payments: any[]) =>
      payments.reduce((s, p) => s + Number(p.amount), 0);

    const settlement = computeSettlement({
      cancelledBy: role,
      eventDate: booking.event.eventDate,
      now,
      confirmedAmount: Number(booking.confirmedAmount),
      planPaid: sum(this.successfulPayments(booking.invoices, PLAN_TYPES)),
      additionalPaid: sum(
        this.successfulPayments(booking.invoices, ['ADDITIONAL']),
      ),
      policy,
    });
    return { settlement, policy, now };
  }

  // plan refunds come out of the newest payments first; additional charges are refunded in full
  private allocateRefunds(invoices: any[], settlement: { planRefund: number }) {
    const allocations: { paymentId: string; amount: number }[] = [];

    let remaining = settlement.planRefund;
    for (const payment of this.successfulPayments(invoices, PLAN_TYPES)) {
      if (remaining <= 0) break;
      const take = round2(Math.min(Number(payment.amount), remaining));
      allocations.push({ paymentId: payment.id, amount: take });
      remaining = round2(remaining - take);
    }
    for (const payment of this.successfulPayments(invoices, ['ADDITIONAL'])) {
      allocations.push({
        paymentId: payment.id,
        amount: Number(payment.amount),
      });
    }
    return allocations;
  }

  async getQuote(userId: string, bookingId: string) {
    const { booking, role } = await this.loadBooking(bookingId, userId);
    const { settlement, policy } = await this.buildSettlement(booking, role);

    return {
      bookingId,
      cancelledBy: role,
      currency: 'NGN',
      tier: settlement.tier,
      daysBeforeEvent: Math.round(settlement.daysBeforeEvent * 10) / 10,
      policy,
      percentOwed: settlement.percentOwed,
      totalPaid: settlement.totalPaid,
      amountOwed: settlement.amountOwed,
      refundAmount: settlement.refundAmount,
      amountStillDue: settlement.amountStillDue,
    };
  }

  async cancel(
    userId: string,
    bookingId: string,
    dto: { confirm: boolean; reason?: string },
  ) {
    if (!dto.confirm) {
      throw new BadRequestException('Please confirm the cancellation');
    }
    const { booking, role } = await this.loadBooking(bookingId, userId);
    if (role === 'VENDOR' && (dto.reason ?? '').trim().length < 5) {
      throw new BadRequestException(
        'A reason is required when a vendor cancels a booking',
      );
    }
    const { settlement, policy, now } = await this.buildSettlement(
      booking,
      role,
    );

    const result = await this.prisma.$transaction(
      async (tx) => {
        // compare-and-set so two simultaneous cancels cannot both succeed
        const claimed = await tx.booking.updateMany({
          where: { id: booking.id, status: { notIn: NOT_CANCELLABLE as any } },
          data: { status: 'CANCELLED' },
        });
        if (claimed.count === 0) {
          throw new ConflictException(
            'This booking can no longer be cancelled',
          );
        }

        const cancellation = await tx.bookingCancellation.create({
          data: {
            bookingId: booking.id,
            cancelledBy: role,
            cancelledByUserId: userId,
            reason: dto.reason?.trim() || null,
            tier: settlement.tier as any,
            daysBeforeEvent: settlement.daysBeforeEvent,
            policy: policy as any,
            totalPaid: settlement.totalPaid,
            amountOwed: settlement.amountOwed,
            refundAmount: settlement.refundAmount,
            amountStillDue: settlement.amountStillDue,
          },
        });

        // anything unpaid is cancelled; a payment still in progress is refunded by the webhook path
        const unpaidIds = booking.invoices
          .filter(
            (i: any) =>
              i.status !== 'PAID' &&
              i.status !== 'CANCELLED' &&
              !i.payments.some((p: any) => p.status === 'SUCCESS'),
          )
          .map((i: any) => i.id);
        if (unpaidIds.length) {
          await tx.invoice.updateMany({
            where: { id: { in: unpaidIds } },
            data: { status: 'CANCELLED' },
          });
        }

        if (settlement.amountStillDue > 0) {
          await tx.invoice.create({
            data: {
              bookingId: booking.id,
              invoiceNumber: generateInvoiceNumber(),
              type: 'CANCELLATION',
              subtotal: settlement.amountStillDue,
              taxRate: 0,
              taxAmount: 0,
              amount: settlement.amountStillDue,
              dueDate: new Date(now.getTime() + 7 * DAY_MS),
              lineItems: [
                {
                  description: `Cancellation charge (${settlement.percentOwed}% of booking total)`,
                  amount: settlement.amountStillDue,
                },
              ],
              note: `Cancellation charge (${settlement.percentOwed}% of booking total, less what was already paid)`,
            },
          });
        }

        const refundIds: string[] = [];
        for (const a of this.allocateRefunds(booking.invoices, settlement)) {
          const refund = await tx.refund.create({
            data: {
              cancellationId: cancellation.id,
              paymentId: a.paymentId,
              amount: a.amount,
            },
          });
          refundIds.push(refund.id);
        }

        await tx.calendarEvent.deleteMany({ where: { bookingId: booking.id } });

        return { refundIds };
      },
      { timeout: 20000 },
    );

    // everything below happens after the cancellation is safely committed
    await this.releaseVendorDate(booking).catch((e) =>
      this.logger.warn(`Could not release vendor date: ${e?.message}`),
    );

    for (const refundId of result.refundIds) {
      await this.refundsService.submitRefund(refundId);
    }

    const title = booking.event.title;
    if (role === 'HOST') {
      await this.notificationsService.create(
        booking.vendorProfile.userId,
        'BOOKING_CANCELLED',
        'Booking cancelled',
        `"${title}" was cancelled by the host`,
        { bookingId },
      );
    } else {
      await this.notificationsService.create(
        booking.event.hostId,
        'BOOKING_CANCELLED',
        `${booking.vendorProfile.businessName} cancelled your booking`,
        `A full refund of ${naira(settlement.refundAmount)} is being processed for "${title}".`,
        { bookingId },
      );
    }

    return this.getCancellation(userId, bookingId);
  }

  async getCancellation(userId: string, bookingId: string) {
    await this.loadBooking(bookingId, userId);

    const cancellation = await this.prisma.bookingCancellation.findUnique({
      where: { bookingId },
      include: { refunds: { orderBy: { createdAt: 'asc' } } },
    });
    if (!cancellation) {
      throw new NotFoundException('This booking has not been cancelled');
    }
    const shortfallInvoice = await this.prisma.invoice.findFirst({
      where: { bookingId, type: 'CANCELLATION' },
    });
    return { cancellation, shortfallInvoice };
  }

  // free the vendor's date again, unless they have another live booking that day
  private async releaseVendorDate(booking: any) {
    const eventDate: Date = booking.event.eventDate;
    const dayStart = new Date(
      Date.UTC(
        eventDate.getUTCFullYear(),
        eventDate.getUTCMonth(),
        eventDate.getUTCDate(),
      ),
    );
    const dayEnd = new Date(dayStart.getTime() + DAY_MS);

    const others = await this.prisma.booking.count({
      where: {
        vendorProfileId: booking.vendorProfile.id,
        id: { not: booking.id },
        status: { not: 'CANCELLED' },
        event: { eventDate: { gte: dayStart, lt: dayEnd } },
      },
    });
    if (others > 0) return;

    await this.prisma.vendorAvailability.updateMany({
      where: { vendorProfileId: booking.vendorProfile.id, date: dayStart },
      data: { isBlocked: false },
    });
  }
}
