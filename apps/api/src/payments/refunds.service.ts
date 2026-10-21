import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@planam/shared';
import { NotificationsService } from '../notifications/notifications.service';

type RefundStatusValue =
  'PENDING' | 'PROCESSING' | 'NEEDS_ATTENTION' | 'PROCESSED' | 'FAILED';

// Paystack statuses: pending, processing, needs-attention, processed, failed
function mapStatus(status: string): RefundStatusValue {
  switch (status) {
    case 'processing':
      return 'PROCESSING';
    case 'needs-attention':
      return 'NEEDS_ATTENTION';
    case 'processed':
      return 'PROCESSED';
    case 'failed':
      return 'FAILED';
    default:
      return 'PENDING';
  }
}

const naira = (n: number) => `₦${n.toLocaleString('en-NG')}`;

@Injectable()
export class RefundsService {
  private readonly logger = new Logger(RefundsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async loadRefund(refundId: string) {
    const refund = await this.prisma.refund.findUnique({
      where: { id: refundId },
      include: {
        payment: {
          include: {
            invoice: { include: { booking: { include: { event: true } } } },
          },
        },
      },
    });
    if (!refund) throw new NotFoundException('Refund not found');
    return refund;
  }

  private markFailed(refundId: string, reason: string) {
    return this.prisma.refund.update({
      where: { id: refundId },
      data: { status: 'FAILED', failureReason: reason.slice(0, 500) },
    });
  }

  // sends one refund to Paystack; never throws, a failure is recorded on the row
  async submitRefund(refundId: string) {
    const refund = await this.loadRefund(refundId);
    if (refund.paystackRefundId || refund.status === 'PROCESSED') return refund;

    const secret = this.config.get<string>('PAYSTACK_SECRET_KEY');
    if (!secret) {
      return this.markFailed(
        refund.id,
        'Payments are not configured (PAYSTACK_SECRET_KEY is missing)',
      );
    }

    try {
      const response = await fetch('https://api.paystack.co/refund', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction: refund.payment.paystackReference,
          amount: Math.round(Number(refund.amount) * 100), // kobo
          currency: refund.payment.invoice.currency,
          customer_note: `Refund for "${refund.payment.invoice.booking.event.title}"`,
          merchant_note: `PlanAm refund ${refund.id}`,
        }),
      });
      const data = await response.json();
      if (!data.status) {
        throw new Error(data.message || 'Paystack rejected the refund request');
      }

      await this.prisma.refund.update({
        where: { id: refund.id },
        data: { paystackRefundId: String(data.data.id), failureReason: null },
      });
      // a webhook may already have moved the status forward, so only apply non-initial states
      const mapped = mapStatus(data.data.status);
      if (mapped !== 'PENDING') {
        await this.prisma.refund.update({
          where: { id: refund.id },
          data: { status: mapped },
        });
      }
      return this.prisma.refund.findUnique({ where: { id: refund.id } });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Refund ${refund.id} could not be submitted: ${message}`,
      );
      return this.markFailed(refund.id, message);
    }
  }

  // admin retry for a refund that failed
  async retry(refundId: string) {
    const refund = await this.loadRefund(refundId);
    if (refund.status !== 'FAILED') {
      throw new BadRequestException('Only failed refunds can be retried');
    }
    await this.prisma.refund.update({
      where: { id: refundId },
      data: { status: 'PENDING', paystackRefundId: null, failureReason: null },
    });
    return this.submitRefund(refundId);
  }

  // a payment succeeded after its invoice was cancelled: give the money straight back
  async refundLatePayment(paymentId: string) {
    const existing = await this.prisma.refund.findUnique({
      where: { paymentId },
    });
    if (existing) return existing;

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        invoice: { include: { booking: { include: { cancellation: true } } } },
      },
    });
    if (!payment) throw new NotFoundException('Payment not found');

    const refund = await this.prisma.refund.create({
      data: {
        paymentId,
        amount: payment.amount,
        cancellationId: payment.invoice.booking.cancellation?.id ?? null,
      },
    });
    return this.submitRefund(refund.id);
  }

  async handleRefundWebhook(event: { event: string; data: any }) {
    const reference = event.data?.transaction_reference;
    if (!reference) return;

    const refund = await this.prisma.refund.findFirst({
      where: { payment: { paystackReference: reference } },
      include: {
        payment: {
          include: {
            invoice: { include: { booking: { include: { event: true } } } },
          },
        },
      },
    });
    if (!refund) return; // not one of ours

    const status = mapStatus(String(event.data.status));
    if (refund.status === 'PROCESSED' || refund.status === status) return;

    await this.prisma.refund.update({
      where: { id: refund.id },
      data: {
        status,
        processedAt: status === 'PROCESSED' ? new Date() : undefined,
        failureReason:
          status === 'FAILED'
            ? 'Paystack could not process this refund'
            : undefined,
      },
    });

    const booking = refund.payment.invoice.booking;
    const amount = naira(Number(refund.amount));

    if (status === 'PROCESSED') {
      await this.notificationsService.create(
        booking.event.hostId,
        'REFUND_UPDATE',
        `Your refund of ${amount} was processed`,
        'It can take up to 10 business days to appear in your account.',
        { refundId: refund.id, bookingId: booking.id },
      );
    } else if (status === 'FAILED' || status === 'NEEDS_ATTENTION') {
      this.logger.error(
        `Refund ${refund.id} is ${status}; manual follow-up needed in the Paystack dashboard`,
      );
      await this.notificationsService.create(
        booking.event.hostId,
        'REFUND_UPDATE',
        `There is a problem with your refund of ${amount}`,
        'Our team has been alerted and will contact you.',
        { refundId: refund.id, bookingId: booking.id },
      );
    }
  }
}
