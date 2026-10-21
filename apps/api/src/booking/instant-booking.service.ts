import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@planam/shared';
import { VendorAvailabilityService } from '../vendor-availability/vendor-availability.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PricePreviewDto } from './dto/price-preview.dto';
import { InstantBookDto } from './dto/instant-book.dto';
import {
  buildMilestones,
  generateInvoiceNumber,
} from './booking-milestones.util';
import { snapshotPolicy } from './booking-policy.util';

// Prisma's transaction client type differs from PrismaService, so it is typed loosely here
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Tx = any;

const DEFAULT_POLICY = {
  depositPercent: 30,
  fullRefundDaysBefore: 45,
  lateCancelDaysBefore: 30,
  midCancelPercentDue: 30,
  lateCancelPercentDue: 50,
  terms: null as string | null,
};

@Injectable()
export class InstantBookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vendorAvailabilityService: VendorAvailabilityService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async buildPricing(hostId: string, dto: PricePreviewDto) {
    const event = await this.prisma.event.findUnique({
      where: { id: dto.eventId },
    });
    if (!event) throw new NotFoundException('Event not found');
    if (event.hostId !== hostId)
      throw new ForbiddenException('You do not own this event');

    const vendor = await this.prisma.vendorProfile.findUnique({
      where: { id: dto.vendorProfileId },
      include: { policy: true },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');
    if (!vendor.isAcceptingBookings) {
      throw new BadRequestException(
        'This vendor is not currently accepting new bookings',
      );
    }

    const pkg = await this.prisma.vendorPackage.findUnique({
      where: { id: dto.packageId },
    });
    if (!pkg || pkg.vendorProfileId !== vendor.id) {
      throw new BadRequestException('Invalid package for this vendor');
    }

    const requested = new Map<string, number>();
    for (const a of dto.addOns ?? []) {
      requested.set(a.vendorAddOnId, a.quantity ?? 1);
    }
    const addOns = requested.size
      ? await this.prisma.vendorAddOn.findMany({
          where: {
            id: { in: [...requested.keys()] },
            vendorProfileId: vendor.id,
          },
        })
      : [];
    if (addOns.length !== requested.size) {
      throw new BadRequestException('One or more add-ons are invalid');
    }

    const needsGuestCount =
      pkg.pricingType === 'PER_GUEST' ||
      addOns.some((a) => a.pricingType === 'PER_GUEST');
    const guestCount = dto.guestCount ?? event.guestCapacity ?? undefined;
    if (needsGuestCount && !guestCount) {
      throw new BadRequestException(
        'Guest count is required for per-guest pricing',
      );
    }

    const lineItems: any[] = [];

    const pkgQty = pkg.pricingType === 'PER_GUEST' ? guestCount! : 1;
    const pkgUnit = Number(pkg.basePrice);
    lineItems.push({
      kind: 'PACKAGE',
      refId: pkg.id,
      label: pkg.name,
      pricingType: pkg.pricingType,
      unitPrice: pkgUnit,
      quantity: pkgQty,
      amount: pkgUnit * pkgQty,
    });

    for (const addOn of addOns) {
      const qty =
        addOn.pricingType === 'PER_GUEST'
          ? guestCount!
          : (requested.get(addOn.id) ?? 1);
      const unit = Number(addOn.price);
      lineItems.push({
        kind: 'ADD_ON',
        refId: addOn.id,
        label: addOn.name,
        pricingType: addOn.pricingType,
        unitPrice: unit,
        quantity: qty,
        amount: unit * qty,
      });
    }

    const subtotal = lineItems.reduce((s, i) => s + i.amount, 0);

    // PLACEHOLDER: the designs are inconsistent on what the service fee is.
    // Kept configurable until that is decided.
    const feePercent = Number(process.env.PLATFORM_SERVICE_FEE_PERCENT ?? 5);
    const serviceFee = Math.round((subtotal * feePercent) / 100);
    const total = subtotal + serviceFee;

    const allocation = await this.prisma.eventBudgetAllocation.findUnique({
      where: {
        eventId_category: { eventId: event.id, category: vendor.category },
      },
    });
    const budget = allocation
      ? {
          min: Number(allocation.minAmount),
          max: Number(allocation.maxAmount),
          withinBudget: total <= Number(allocation.maxAmount),
        }
      : null;

    const policy = vendor.policy ?? DEFAULT_POLICY;

    return {
      event,
      vendor,
      pkg,
      addOns,
      guestCount,
      lineItems,
      subtotal,
      serviceFee,
      total,
      budget,
      policy,
    };
  }

  async getPricePreview(hostId: string, dto: PricePreviewDto) {
    const p = await this.buildPricing(hostId, dto);

    const available = await this.vendorAvailabilityService.isDateAvailable(
      p.vendor.id,
      p.event.eventDate,
    );

    return {
      eventDate: p.event.eventDate,
      guestCount: p.guestCount ?? null,
      lineItems: p.lineItems,
      subtotal: p.subtotal,
      serviceFee: p.serviceFee,
      estimatedTotal: p.total,
      budget: p.budget,
      vendorAvailable: available,
      policy: p.policy,
    };
  }

  // throws if this vendor cannot be booked for this event right now
  async assertBookable(p: PricingResult, now: Date = new Date()) {
    if (p.event.eventDate < now) {
      throw new BadRequestException('This event date has already passed');
    }

    const isAvailable = await this.vendorAvailabilityService.isDateAvailable(
      p.vendor.id,
      p.event.eventDate,
    );
    if (!isAvailable) {
      throw new ConflictException(
        `${p.vendor.businessName} is not available on the event date`,
      );
    }

    const existing = await this.prisma.booking.findFirst({
      where: {
        eventId: p.event.id,
        vendorProfileId: p.vendor.id,
        status: { not: 'CANCELLED' },
      },
    });
    if (existing) {
      throw new ConflictException(
        `This event already has a booking with ${p.vendor.businessName}`,
      );
    }
  }

  // creates every record for one booking; must run inside a transaction
  async createBookingRecords(
    tx: Tx,
    p: PricingResult,
    now: Date,
    opts: { bookingGroupId?: string; discountShare?: number } = {},
  ) {
    const discount = opts.discountShare ?? 0;
    const finalTotal = p.total - discount;
    const eventDate = p.event.eventDate;

    // the service fee and the team discount are separate line items so
    // earnings can treat them differently from vendor charges
    const lineItems: any[] = [
      ...p.lineItems,
      {
        kind: 'SERVICE_FEE',
        label: 'Service Fee',
        unitPrice: p.serviceFee,
        quantity: 1,
        amount: p.serviceFee,
      },
    ];
    if (discount > 0) {
      lineItems.push({
        kind: 'TEAM_DISCOUNT',
        label: 'Team bundle discount',
        unitPrice: -discount,
        quantity: 1,
        amount: -discount,
      });
    }

    const lead = await tx.lead.create({
      data: {
        eventId: p.event.id,
        vendorProfileId: p.vendor.id,
        status: 'CLOSED',
        message: opts.bookingGroupId ? 'Team booking' : 'Instant booking',
        viewedAt: now,
      },
    });

    const quotation = await tx.quotation.create({
      data: {
        leadId: lead.id,
        packageId: p.pkg.id,
        lineItems,
        subtotal: finalTotal,
        taxRate: 0,
        taxAmount: 0,
        totalAmount: finalTotal,
        terms: p.policy.terms ?? undefined,
        status: 'ACCEPTED',
        sentAt: now,
      },
    });

    await tx.quotationVersion.create({
      data: {
        quotationId: quotation.id,
        version: 1,
        packageId: p.pkg.id,
        lineItems,
        subtotal: finalTotal,
        taxRate: 0,
        taxAmount: 0,
        totalAmount: finalTotal,
        terms: p.policy.terms ?? undefined,
      },
    });

    await tx.quotationActivityLog.createMany({
      data: [
        {
          quotationId: quotation.id,
          type: 'CREATED',
          actor: 'SYSTEM',
          description: 'Quotation generated from an instant booking',
        },
        {
          quotationId: quotation.id,
          type: 'ACCEPTED',
          actor: 'HOST',
          description: 'Host booked instantly and accepted the terms',
        },
      ],
    });

    const booking = await tx.booking.create({
      data: {
        eventId: p.event.id,
        vendorProfileId: p.vendor.id,
        quotationId: quotation.id,
        confirmedAmount: finalTotal,
        packageId: p.pkg.id,
        guestCount: p.guestCount,
        source: 'INSTANT',
        serviceFee: p.serviceFee,
        termsAcceptedAt: now,
        policySnapshot: snapshotPolicy(p.policy),
        bookingGroupId: opts.bookingGroupId,
      },
    });

    const addOnItems = lineItems.filter((i) => i.kind === 'ADD_ON');
    if (addOnItems.length) {
      await tx.bookingAddOnSelection.createMany({
        data: addOnItems.map((i) => ({
          bookingId: booking.id,
          vendorAddOnId: i.refId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
      });
    }

    const milestones = buildMilestones(
      booking.id,
      eventDate,
      p.policy.depositPercent,
      now,
    );
    await tx.bookingMilestone.createMany({ data: milestones });

    const depositDue = milestones.find(
      (m) => m.type === 'PAY_DEPOSIT',
    )!.dueDate;
    const depositAmount = Math.round(
      (finalTotal * p.policy.depositPercent) / 100,
    );
    await tx.invoice.createMany({
      data: [
        {
          bookingId: booking.id,
          invoiceNumber: generateInvoiceNumber(),
          type: 'DEPOSIT',
          subtotal: finalTotal,
          taxRate: 0,
          taxAmount: 0,
          amount: depositAmount,
          dueDate: depositDue,
          note: 'Deposit for instant booking',
        },
        {
          bookingId: booking.id,
          invoiceNumber: generateInvoiceNumber(),
          type: 'BALANCE',
          subtotal: finalTotal,
          taxRate: 0,
          taxAmount: 0,
          amount: finalTotal - depositAmount,
          dueDate: eventDate,
          balanceDueTiming: 'BEFORE_EVENT',
          note: 'Balance for instant booking',
        },
      ],
    });

    return booking as { id: string };
  }

  // side effects that must only happen after the transaction has committed
  async afterBooking(p: PricingResult, booking: { id: string }) {
    await this.vendorAvailabilityService.blockDateInternal(
      p.vendor.id,
      p.event.eventDate,
    );

    await this.notificationsService.create(
      p.vendor.userId,
      'BOOKING_CONFIRMED',
      'Booking confirmed!',
      `"${p.event.title}" was booked instantly`,
      { bookingId: booking.id },
    );
  }

  async instantBook(hostId: string, dto: InstantBookDto) {
    if (!dto.acceptTerms) {
      throw new BadRequestException(
        'You must accept the terms and cancellation policy to book',
      );
    }

    const p = await this.buildPricing(hostId, dto);
    const now = new Date();
    await this.assertBookable(p, now);

    const booking = await this.prisma.$transaction(
      (tx) => this.createBookingRecords(tx, p, now),
      { timeout: 15000 },
    );

    await this.afterBooking(p, booking);

    return this.prisma.booking.findUnique({
      where: { id: booking.id },
      include: {
        milestones: { orderBy: { dueDate: 'asc' } },
        addOnSelections: true,
        invoices: true,
        vendorProfile: { select: { id: true, businessName: true } },
      },
    });
  }
}

export type PricingResult = Awaited<
  ReturnType<InstantBookingService['buildPricing']>
>;
