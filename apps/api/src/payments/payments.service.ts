import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@planam/shared';
import * as crypto from 'crypto';
import { NotificationsService } from '../notifications/notifications.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { RefundsService } from './refunds.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly notificationsService: NotificationsService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly refundsService: RefundsService,
  ) {}

  private async getOwnedBooking(
    bookingId: string,
    userId: string,
    as: 'host' | 'vendor',
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { event: true, vendorProfile: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const ownerId =
      as === 'host' ? booking.event.hostId : booking.vendorProfile.userId;
    if (ownerId !== userId)
      throw new ForbiddenException('Not authorized for this booking');

    return booking;
  }

  // ---- INVOICES ----

  private generateInvoiceNumber(): string {
    const year = new Date().getFullYear().toString().slice(-2);
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const random = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `INV${year}${month}-${random}`;
  }
  async createInvoice(
    userId: string,
    bookingId: string,
    dto: {
      type: string;
      amount: number;
      lineItems?: any;
      dueDate?: string;
      taxRate?: number;
    },
  ) {
    const booking = await this.getOwnedBooking(bookingId, userId, 'vendor');

    const taxRate = dto.taxRate ?? 0;
    const taxAmount = (dto.amount * taxRate) / 100;

    const invoice = await this.prisma.invoice.create({
      data: {
        bookingId,
        invoiceNumber: this.generateInvoiceNumber(),
        type: dto.type as any,
        subtotal: dto.amount,
        taxRate,
        taxAmount,
        amount: dto.amount + taxAmount,
        lineItems: dto.lineItems,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
    });

    await this.notificationsService.create(
      booking.event.hostId,
      'INVOICE_CREATED',
      `New ${dto.type.toLowerCase()} invoice for "${booking.event.title}"`,
      undefined,
      { invoiceId: invoice.id, bookingId },
    );
    return invoice;
  }

  async findInvoicesForBooking(
    userId: string,
    bookingId: string,
    as: 'host' | 'vendor',
  ) {
    await this.getOwnedBooking(bookingId, userId, as);
    return this.prisma.invoice.findMany({
      where: { bookingId },
      include: { payments: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async generateSplitInvoices(
    userId: string,
    bookingId: string,
    dto: {
      depositType: 'PERCENTAGE' | 'FIXED_AMOUNT';
      depositPercentage?: number;
      depositFixedAmount?: number;
      taxRate?: number;
      depositDueDate: string;
      balanceDueTiming: string;
      balanceDueDate?: string;
      note?: string;
    },
  ) {
    const booking = await this.getOwnedBooking(bookingId, userId, 'vendor');

    const quotation = await this.prisma.quotation.findUnique({
      where: { id: booking.quotationId },
    });
    if (!quotation)
      throw new NotFoundException('Quotation not found for this booking');

    const subtotal = Number(quotation.totalAmount);
    const taxRate = dto.taxRate ?? 0;
    const taxAmount = (subtotal * taxRate) / 100;
    const total = subtotal + taxAmount;

    const depositAmount =
      dto.depositType === 'PERCENTAGE'
        ? total * ((dto.depositPercentage ?? 0) / 100)
        : (dto.depositFixedAmount ?? 0);

    if (depositAmount > total) {
      throw new BadRequestException('Deposit amount cannot exceed the total');
    }

    const balanceAmount = total - depositAmount;

    let balanceDueDate: Date | undefined;
    if (dto.balanceDueTiming === 'CUSTOM_DATE' && dto.balanceDueDate) {
      balanceDueDate = new Date(dto.balanceDueDate);
    } else if (
      dto.balanceDueTiming === 'IMMEDIATELY_AFTER_SERVICE' ||
      dto.balanceDueTiming === 'BEFORE_EVENT'
    ) {
      balanceDueDate = booking.event.eventDate;
    }

    const depositInvoice = await this.prisma.invoice.create({
      data: {
        bookingId,
        invoiceNumber: this.generateInvoiceNumber(),
        type: 'DEPOSIT',
        subtotal,
        taxRate,
        taxAmount,
        amount: depositAmount,
        dueDate: new Date(dto.depositDueDate),
        note: dto.note,
      },
    });

    const balanceInvoice = await this.prisma.invoice.create({
      data: {
        bookingId,
        invoiceNumber: this.generateInvoiceNumber(),
        type: 'BALANCE',
        subtotal,
        taxRate,
        taxAmount: 0, // tax already accounted for on the deposit invoice — avoid double-charging tax
        amount: balanceAmount,
        dueDate: balanceDueDate,
        balanceDueTiming: dto.balanceDueTiming as any,
        note: dto.note,
      },
    });

    await this.notificationsService.create(
      booking.event.hostId,
      'INVOICE_CREATED',
      `Deposit and balance invoices generated for "${booking.event.title}"`,
      undefined,
      {
        depositInvoiceId: depositInvoice.id,
        balanceInvoiceId: balanceInvoice.id,
        bookingId,
      },
    );

    return {
      depositInvoice,
      balanceInvoice,
      breakdown: { subtotal, taxAmount, total, depositAmount, balanceAmount },
    };
  }

  // ---- PAYSTACK ----

  private getPaystackSecretOrThrow(): string {
    const secret = this.config.get<string>('PAYSTACK_SECRET_KEY');
    if (!secret) {
      throw new BadRequestException(
        'Payments are not configured yet — PAYSTACK_SECRET_KEY is missing',
      );
    }
    return secret;
  }

  async initiatePayment(userId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { booking: { include: { event: true } } },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.booking.event.hostId !== userId)
      throw new ForbiddenException('Not authorized for this invoice');
    if (invoice.status === 'PAID')
      throw new BadRequestException('This invoice is already paid');
    if (invoice.status === 'CANCELLED')
      throw new BadRequestException('This invoice has been cancelled');

    const secret = this.getPaystackSecretOrThrow();

    const host = await this.prisma.user.findUnique({ where: { id: userId } });

    const reference = `plan-am-${invoice.id}-${Date.now()}`;

    const callbackUrl = this.config.get<string>('PAYSTACK_CALLBACK_URL');

    const response = await fetch(
      'https://api.paystack.co/transaction/initialize',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: host!.email,
          amount: Math.round(Number(invoice.amount) * 100), // Paystack expects kobo
          reference,
          ...(callbackUrl && { callback_url: callbackUrl }),
          metadata: { invoiceId: invoice.id },
        }),
      },
    );

    const data = await response.json();
    if (!data.status) {
      throw new BadRequestException(
        data.message || 'Failed to initiate payment',
      );
    }

    await this.prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        amount: invoice.amount,
        paystackReference: reference,
        status: 'PENDING',
      },
    });

    return { authorizationUrl: data.data.authorization_url, reference };
  }

  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
    const secret = this.config.get<string>('PAYSTACK_SECRET_KEY');
    if (!secret) return false;

    const hash = crypto
      .createHmac('sha512', secret)
      .update(rawBody)
      .digest('hex');
    return hash === signature;
  }

  /*
  async handlePaystackEvent(event: { event: string; data: any }) {
    if (event.event.startsWith('subscription.')) {
      return this.subscriptionsService.handleSubscriptionWebhookEvent(event);
    }

    if (event.event !== 'charge.success') {
      return; // ignore other event types for now
    }

    const payment = await this.prisma.payment.findUnique({
      where: { paystackReference: event.data.reference },
      include: {
        invoice: { include: { booking: { include: { vendorProfile: true } } } },
      },
    });
    if (!payment) return; // unknown reference — nothing to reconcile

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'SUCCESS', paidAt: new Date() },
    });

    await this.prisma.invoice.update({
      where: { id: payment.invoiceId },
      data: { status: 'PAID' },
    });

    if (payment.invoice.type === 'DEPOSIT' || payment.invoice.type === 'FULL') {
      await this.prisma.bookingMilestone.updateMany({
        where: {
          bookingId: payment.invoice.bookingId,
          type: 'PAY_DEPOSIT',
          status: { not: 'COMPLETED' },
        },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
    }

    await this.notificationsService.create(
      payment.invoice.booking.vendorProfile.userId,
      'PAYMENT_RECEIVED',
      'Payment received',
      `A payment of ₦${payment.amount} has been confirmed`,
      { invoiceId: payment.invoiceId },
    );
  }
  */
  async handlePaystackEvent(event: { event: string; data: any }) {
    if (event.event.startsWith('refund.')) {
      return this.refundsService.handleRefundWebhook(event);
    }

    if (event.event.startsWith('subscription.')) {
      return this.subscriptionsService.handleSubscriptionWebhookEvent(event);
    }

    if (event.event !== 'charge.success') {
      return; // ignore other event types for now
    }

    const payment = await this.prisma.payment.findUnique({
      where: { paystackReference: event.data.reference },
    });
    if (!payment) return; // unknown reference, nothing to reconcile

    await this.reconcileSuccessfulPayment(payment.id);
  }

  // shared by the webhook and the verify endpoint; safe to run twice
  private async reconcileSuccessfulPayment(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        invoice: { include: { booking: { include: { vendorProfile: true } } } },
      },
    });
    if (!payment || payment.status === 'SUCCESS') return;

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'SUCCESS', paidAt: new Date() },
    });

    // the invoice was cancelled while the host was still paying: hand the money back
    if (payment.invoice.status === 'CANCELLED') {
      await this.refundsService.refundLatePayment(payment.id);
      return;
    }

    await this.prisma.invoice.update({
      where: { id: payment.invoiceId },
      data: { status: 'PAID' },
    });

    if (payment.invoice.type === 'DEPOSIT' || payment.invoice.type === 'FULL') {
      await this.prisma.bookingMilestone.updateMany({
        where: {
          bookingId: payment.invoice.bookingId,
          type: 'PAY_DEPOSIT',
          status: { not: 'COMPLETED' },
        },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
    }

    await this.notificationsService.create(
      payment.invoice.booking.vendorProfile.userId,
      'PAYMENT_RECEIVED',
      'Payment received',
      `A payment of ₦${payment.amount} has been confirmed`,
      { invoiceId: payment.invoiceId },
    );
  }

  async verifyPayment(userId: string, reference: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { paystackReference: reference },
      include: {
        invoice: { include: { booking: { include: { event: true } } } },
      },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.invoice.booking.event.hostId !== userId)
      throw new ForbiddenException('Not authorized for this payment');

    if (payment.status === 'SUCCESS') return { status: 'SUCCESS', reference };

    const secret = this.getPaystackSecretOrThrow();
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${secret}` } },
    );
    const data = await response.json();
    if (!data.status) {
      throw new BadRequestException(
        data.message || 'Could not verify this payment',
      );
    }

    const paystackStatus: string = data.data.status;

    if (paystackStatus === 'success') {
      if (data.data.amount !== Math.round(Number(payment.amount) * 100)) {
        throw new BadRequestException(
          'Paid amount does not match the invoice amount',
        );
      }
      await this.reconcileSuccessfulPayment(payment.id);
      return { status: 'SUCCESS', reference };
    }

    if (paystackStatus === 'failed') {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      });
    }

    return { status: paystackStatus.toUpperCase(), reference };
  }

  async createAdditionalCharge(
    userId: string,
    bookingId: string,
    dto: { description: string; amount: number; dueDate?: string },
  ) {
    const booking = await this.getOwnedBooking(bookingId, userId, 'vendor');
    if (booking.status === 'CANCELLED') {
      throw new BadRequestException(
        'You cannot add charges to a cancelled booking',
      );
    }

    const invoice = await this.prisma.invoice.create({
      data: {
        bookingId,
        invoiceNumber: this.generateInvoiceNumber(),
        type: 'ADDITIONAL',
        subtotal: dto.amount,
        taxRate: 0,
        taxAmount: 0,
        amount: dto.amount,
        lineItems: [{ description: dto.description, amount: dto.amount }],
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        note: dto.description,
      },
    });

    await this.notificationsService.create(
      booking.event.hostId,
      'INVOICE_CREATED',
      `Additional charge for "${booking.event.title}"`,
      dto.description,
      { invoiceId: invoice.id, bookingId },
    );

    return invoice;
  }

  async cancelAdditionalCharge(
    userId: string,
    bookingId: string,
    invoiceId: string,
  ) {
    await this.getOwnedBooking(bookingId, userId, 'vendor');

    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, bookingId, type: 'ADDITIONAL' },
      include: { payments: true },
    });
    if (!invoice) throw new NotFoundException('Additional charge not found');

    if (
      invoice.status === 'PAID' ||
      invoice.payments.some((p) => p.status === 'SUCCESS')
    ) {
      throw new BadRequestException('A paid charge cannot be cancelled');
    }
    if (invoice.status === 'CANCELLED') return invoice;

    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'CANCELLED' },
    });
  }
}
