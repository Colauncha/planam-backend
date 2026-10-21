import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@planam/shared';

const BOOKING_MONEY_SELECT = {
  confirmedAmount: true,
  serviceFee: true,
  quotation: { select: { lineItems: true } },
} as const;

type BookingMoney = {
  confirmedAmount: unknown;
  serviceFee: unknown;
  quotation: { lineItems: unknown } | null;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class EarningsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOwnedVendorProfile(userId: string) {
    const vendorProfile = await this.prisma.vendorProfile.findUnique({
      where: { userId },
    });
    if (!vendorProfile) throw new NotFoundException('Vendor profile not found');
    return vendorProfile;
  }

  private teamDiscountOf(lineItems: unknown): number {
    if (!Array.isArray(lineItems)) return 0;
    return lineItems
      .filter((i: any) => i?.kind === 'TEAM_DISCOUNT')
      .reduce((s: number, i: any) => s + Math.abs(Number(i.amount) || 0), 0);
  }

  // What the vendor is owed for the booking's main plan (before additional charges).
  // The invoiced total includes the platform service fee and is reduced by any team
  // discount. The discount is treated as platform-funded, so it is added back.
  private vendorAmountOf(booking: BookingMoney): number {
    const confirmed = Number(booking.confirmedAmount);
    const fee = Number(booking.serviceFee ?? 0);
    const discount = this.teamDiscountOf(booking.quotation?.lineItems);
    return Math.max(0, confirmed - fee + discount);
  }

  // Share of an invoice that belongs to the vendor. Additional charges are 100% vendor's.
  private vendorShareRatio(invoiceType: string, booking: BookingMoney): number {
    if (invoiceType === 'ADDITIONAL' || invoiceType === 'CANCELLATION')
      return 1;
    const confirmed = Number(booking.confirmedAmount);
    if (!confirmed) return 1;
    return this.vendorAmountOf(booking) / confirmed;
  }

  // what is left of a payment after any refund that has not failed
  private netPaid(p: {
    amount: unknown;
    refund?: { amount: unknown; status: string } | null;
  }) {
    const refunded =
      p.refund && p.refund.status !== 'FAILED' ? Number(p.refund.amount) : 0;
    return Number(p.amount) - refunded;
  }

  private async sumPayments(vendorProfileId: string, from?: Date, to?: Date) {
    const payments = await this.prisma.payment.findMany({
      where: {
        status: 'SUCCESS',
        invoice: { booking: { vendorProfileId } },
        ...(from && to && { paidAt: { gte: from, lt: to } }),
      },
      select: {
        amount: true,
        refund: { select: { amount: true, status: true } },
        invoice: {
          select: {
            type: true,
            booking: { select: BOOKING_MONEY_SELECT },
          },
        },
      },
    });

    return round2(
      payments.reduce(
        (sum, p) =>
          sum +
          this.netPaid(p) *
            this.vendorShareRatio(p.invoice.type, p.invoice.booking),
        0,
      ),
    );
  }

  private async sumPendingInvoices(vendorProfileId: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        status: { in: ['PENDING', 'OVERDUE'] },
        booking: { vendorProfileId },
      },
      select: {
        amount: true,
        type: true,
        booking: { select: BOOKING_MONEY_SELECT },
      },
    });

    return round2(
      invoices.reduce(
        (sum, inv) =>
          sum +
          Number(inv.amount) * this.vendorShareRatio(inv.type, inv.booking),
        0,
      ),
    );
  }

  async getOverview(userId: string) {
    const vendorProfile = await this.getOwnedVendorProfile(userId);

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      totalEarnings,
      pendingPayments,
      thisMonthEarnings,
      lastMonthEarnings,
    ] = await Promise.all([
      this.sumPayments(vendorProfile.id),
      this.sumPendingInvoices(vendorProfile.id),
      this.sumPayments(vendorProfile.id, thisMonthStart, now),
      this.sumPayments(vendorProfile.id, lastMonthStart, thisMonthStart),
    ]);

    const growthPercent =
      lastMonthEarnings === 0
        ? thisMonthEarnings > 0
          ? 100
          : 0
        : Math.round(
            ((thisMonthEarnings - lastMonthEarnings) / lastMonthEarnings) *
              1000,
          ) / 10;

    return { totalEarnings, pendingPayments, growthPercent };
  }

  // status reflects the main plan only; additional charges are reported separately
  private computeStatusLabel(allInvoices: any[]): string {
    const invoices = allInvoices.filter(
      (inv) => inv.status !== 'CANCELLED' && inv.type !== 'ADDITIONAL',
    );
    if (invoices.length === 0) return 'No Invoice';

    const totalInvoiced = invoices.reduce(
      (sum, inv) => sum + Number(inv.amount),
      0,
    );
    const totalPaid = invoices.reduce(
      (sum, inv) =>
        sum +
        inv.payments
          .filter((p: any) => p.status === 'SUCCESS')
          .reduce((s: number, p: any) => s + Number(p.amount), 0),
      0,
    );

    if (totalPaid === 0) return 'Pending';
    if (totalPaid >= totalInvoiced) return 'Fully Paid';

    const depositInvoice = invoices.find((inv) => inv.type === 'DEPOSIT');
    const depositPaid =
      depositInvoice &&
      depositInvoice.payments
        .filter((p: any) => p.status === 'SUCCESS')
        .reduce((s: number, p: any) => s + Number(p.amount), 0) >=
        Number(depositInvoice.amount);

    if (depositPaid) return 'Deposit Paid';
    return `${Math.round((totalPaid / totalInvoiced) * 100)}% Paid`;
  }

  private summariseAdditionalCharges(invoices: any[]) {
    const extras = invoices.filter(
      (inv) => inv.type === 'ADDITIONAL' && inv.status !== 'CANCELLED',
    );
    const total = extras.reduce((s, inv) => s + Number(inv.amount), 0);
    const paid = extras.reduce(
      (s, inv) =>
        s +
        inv.payments
          .filter((p: any) => p.status === 'SUCCESS')
          .reduce((n: number, p: any) => n + Number(p.amount), 0),
      0,
    );
    return { total, paid, pending: total - paid };
  }

  async listRecentEarnings(userId: string, page = 1, pageSize = 12) {
    const vendorProfile = await this.getOwnedVendorProfile(userId);
    const skip = (page - 1) * pageSize;

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where: { vendorProfileId: vendorProfile.id },
        include: {
          event: {
            select: {
              title: true,
              eventType: true,
              eventDate: true,
              host: { select: { fullName: true } },
            },
          },
          quotation: { select: { lineItems: true } },
          invoices: { include: { payments: { include: { refund: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.booking.count({
        where: { vendorProfileId: vendorProfile.id },
      }),
    ]);

    const data = bookings.map((b) => {
      const cancelled = b.status === 'CANCELLED';
      // a cancelled booking earns only what was kept after refunds
      const amount = cancelled
        ? round2(
            b.invoices.reduce(
              (sum, inv) =>
                sum +
                inv.payments
                  .filter((p) => p.status === 'SUCCESS')
                  .reduce(
                    (s, p) =>
                      s + this.netPaid(p) * this.vendorShareRatio(inv.type, b),
                    0,
                  ),
              0,
            ),
          )
        : round2(this.vendorAmountOf(b));

      return {
        bookingId: b.id,
        clientName: b.event.host.fullName,
        eventTitle: b.event.title,
        eventType: b.event.eventType,
        date: b.event.eventDate,
        amount,
        status: cancelled ? 'Cancelled' : this.computeStatusLabel(b.invoices),
        additionalCharges: this.summariseAdditionalCharges(b.invoices),
      };
    });

    return {
      data,
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  }
}
