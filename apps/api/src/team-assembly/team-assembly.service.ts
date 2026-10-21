import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@planam/shared';
import {
  InstantBookingService,
  PricingResult,
} from '../booking/instant-booking.service';

const SLOT_CATEGORIES: Record<string, string[]> = {
  CATERING: ['CATERING'],
  ENTERTAINMENT: ['DJ', 'MC'],
  DECOR: ['DECORATION'],
  PHOTOGRAPHY: ['PHOTOGRAPHY'],
};
const SLOT_LABELS: Record<string, string> = {
  CATERING: 'Catering',
  ENTERTAINMENT: 'Entertainment',
  DECOR: 'Decor',
  PHOTOGRAPHY: 'Photography',
};
const SLOTS = Object.keys(SLOT_CATEGORIES);

// flat team discount, applied only when all four slots are covered
const bundleDiscount = () => Number(process.env.TEAM_BUNDLE_DISCOUNT ?? 150000);

interface SlotView {
  slot: string;
  label: string;
  status: 'EMPTY' | 'SELECTED' | 'BOOKED' | 'UNAVAILABLE';
  vendorProfileId: string | null;
  vendorName: string | null;
  packageName: string | null;
  amount: number | null;
  bookingId: string | null;
  note: string;
}

@Injectable()
export class TeamAssemblyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly instant: InstantBookingService,
  ) {}

  private async getOwnedEvent(eventId: string, hostId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event) throw new NotFoundException('Event not found');
    if (event.hostId !== hostId)
      throw new ForbiddenException('You do not own this event');
    return event;
  }

  private assertSlot(slot: string) {
    if (!SLOT_CATEGORIES[slot]) {
      throw new BadRequestException(
        `Unknown slot. Use one of: ${SLOTS.join(', ')}`,
      );
    }
  }

  private async getBookedSlots(eventId: string) {
    const bookings = await this.prisma.booking.findMany({
      where: { eventId, status: { not: 'CANCELLED' } },
      include: {
        vendorProfile: {
          select: { id: true, businessName: true, category: true },
        },
      },
    });
    return bookings;
  }

  async setSlot(
    hostId: string,
    eventId: string,
    slot: string,
    dto: {
      vendorProfileId: string;
      packageId: string;
      addOns?: { vendorAddOnId: string; quantity?: number }[];
    },
  ) {
    await this.getOwnedEvent(eventId, hostId);
    this.assertSlot(slot);

    const pricing = await this.instant.buildPricing(hostId, {
      eventId,
      vendorProfileId: dto.vendorProfileId,
      packageId: dto.packageId,
      addOns: dto.addOns,
    });

    if (!SLOT_CATEGORIES[slot].includes(pricing.vendor.category)) {
      throw new BadRequestException(
        `${pricing.vendor.businessName} is not a ${SLOT_LABELS[slot]} vendor`,
      );
    }

    const bookings = await this.getBookedSlots(eventId);
    if (
      bookings.some((b) =>
        SLOT_CATEGORIES[slot].includes(b.vendorProfile.category),
      )
    ) {
      throw new ConflictException(
        `${SLOT_LABELS[slot]} is already booked for this event`,
      );
    }

    let group = await this.prisma.bookingGroup.findFirst({
      where: { eventId, status: 'DRAFT' },
    });
    if (!group) {
      group = await this.prisma.bookingGroup.create({ data: { eventId } });
    }

    const data = {
      vendorProfileId: dto.vendorProfileId,
      packageId: dto.packageId,
      addOns: (dto.addOns ?? []) as any,
    };
    await this.prisma.bookingGroupItem.upsert({
      where: {
        bookingGroupId_slot: { bookingGroupId: group.id, slot: slot as any },
      },
      create: { bookingGroupId: group.id, slot: slot as any, ...data },
      update: data,
    });

    return this.getBoard(hostId, eventId);
  }

  async removeSlot(hostId: string, eventId: string, slot: string) {
    await this.getOwnedEvent(eventId, hostId);
    this.assertSlot(slot);

    await this.prisma.bookingGroupItem.deleteMany({
      where: {
        slot: slot as any,
        bookingGroup: { eventId, status: 'DRAFT' },
      },
    });
    return this.getBoard(hostId, eventId);
  }

  async getBoard(hostId: string, eventId: string) {
    const event = await this.getOwnedEvent(eventId, hostId);

    const draft = await this.prisma.bookingGroup.findFirst({
      where: { eventId, status: 'DRAFT' },
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
          include: {
            vendorProfile: { select: { businessName: true } },
            package: { select: { name: true } },
          },
        },
      },
    });
    const bookings = await this.getBookedSlots(eventId);
    const applied = await this.prisma.bookingGroup.aggregate({
      where: { eventId, status: 'BOOKED' },
      _sum: { discountAmount: true },
    });
    const appliedDiscount = Number(applied._sum.discountAmount ?? 0);

    const slots: SlotView[] = [];
    for (const slot of SLOTS) {
      const label = SLOT_LABELS[slot];
      const categories = SLOT_CATEGORIES[slot];

      const booked = bookings.find((b) =>
        categories.includes(b.vendorProfile.category),
      );
      if (booked) {
        slots.push({
          slot,
          label,
          status: 'BOOKED',
          vendorProfileId: booked.vendorProfile.id,
          vendorName: booked.vendorProfile.businessName,
          packageName: null,
          amount: Number(booked.confirmedAmount),
          bookingId: booked.id,
          note: `${booked.vendorProfile.businessName} is booked`,
        });
        continue;
      }

      const item = draft?.items.find((i) => i.slot === slot);
      if (!item) {
        slots.push({
          slot,
          label,
          status: 'EMPTY',
          vendorProfileId: null,
          vendorName: null,
          packageName: null,
          amount: null,
          bookingId: null,
          note: 'No vendor selected',
        });
        continue;
      }

      let pricing: PricingResult | null = null;
      let issue: string | null = null;
      try {
        pricing = await this.instant.buildPricing(hostId, {
          eventId,
          vendorProfileId: item.vendorProfileId,
          packageId: item.packageId,
          addOns: item.addOns as any,
        });
        await this.instant.assertBookable(pricing);
      } catch (e) {
        issue = (e as Error).message;
      }

      slots.push({
        slot,
        label,
        status: issue ? 'UNAVAILABLE' : 'SELECTED',
        vendorProfileId: item.vendorProfileId,
        vendorName: item.vendorProfile.businessName,
        packageName: item.package.name,
        amount: pricing?.total ?? null,
        bookingId: null,
        note:
          issue ??
          `${item.vendorProfile.businessName} selected, not yet booked`,
      });
    }

    const selectedTotal = slots
      .filter((s) => s.status === 'SELECTED')
      .reduce((n, s) => n + (s.amount ?? 0), 0);
    const isComplete = slots.every(
      (s) => s.status === 'BOOKED' || s.status === 'SELECTED',
    );
    const hasUnavailable = slots.some((s) => s.status === 'UNAVAILABLE');
    const pendingDiscount =
      isComplete && selectedTotal > 0
        ? Math.min(bundleDiscount(), selectedTotal)
        : 0;

    // booked amounts are already net of any applied discount, so add it back
    const totalVendorCosts =
      slots.reduce((n, s) => n + (s.amount ?? 0), 0) + appliedDiscount;
    const bundleDiscountTotal = appliedDiscount + pendingDiscount;

    return {
      eventId,
      eventDate: event.eventDate,
      guestCount: event.guestCapacity,
      slots,
      checklist: slots.map((s) => ({
        slot: s.slot,
        label: s.label,
        status: s.status,
        note: s.note,
      })),
      missing: slots.filter((s) => s.status === 'EMPTY').map((s) => s.label),
      isComplete,
      canBook: selectedTotal > 0 && !hasUnavailable,
      totals: {
        totalVendorCosts,
        bundleDiscount: bundleDiscountTotal,
        grandTotal: totalVendorCosts - bundleDiscountTotal,
      },
    };
  }

  async bookTeam(hostId: string, eventId: string, acceptTerms: boolean) {
    if (!acceptTerms) {
      throw new BadRequestException(
        'You must accept the terms and cancellation policy to book',
      );
    }
    await this.getOwnedEvent(eventId, hostId);

    const group = await this.prisma.bookingGroup.findFirst({
      where: { eventId, status: 'DRAFT' },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    });
    if (!group || group.items.length === 0) {
      throw new BadRequestException('Select at least one vendor first');
    }

    const bookedNow = await this.getBookedSlots(eventId);
    const covered = new Set<string>(group.items.map((i) => i.slot));
    for (const slot of SLOTS) {
      const alreadyBooked = bookedNow.some((b) =>
        SLOT_CATEGORIES[slot].includes(b.vendorProfile.category),
      );
      if (alreadyBooked) {
        if (group.items.some((i) => i.slot === slot)) {
          throw new ConflictException(
            `${SLOT_LABELS[slot]} is already booked for this event`,
          );
        }
        covered.add(slot);
      }
    }

    // validate everything before creating anything
    const now = new Date();
    const priced: { p: PricingResult }[] = [];
    for (const item of group.items) {
      const p = await this.instant.buildPricing(hostId, {
        eventId,
        vendorProfileId: item.vendorProfileId,
        packageId: item.packageId,
        addOns: item.addOns as any,
      });
      await this.instant.assertBookable(p, now);
      priced.push({ p });
    }

    const sum = priced.reduce((n, x) => n + x.p.total, 0);
    const complete = SLOTS.every((s) => covered.has(s));
    const totalDiscount = complete ? Math.min(bundleDiscount(), sum) : 0;

    // split the flat discount across bookings by price; the last one takes the rounding remainder
    let allocated = 0;
    const shares = priced.map((x, i) => {
      const share =
        i === priced.length - 1
          ? totalDiscount - allocated
          : Math.floor((totalDiscount * x.p.total) / sum);
      allocated += share;
      return share;
    });

    const bookings = await this.prisma.$transaction(
      async (tx) => {
        await tx.bookingGroup.update({
          where: { id: group.id },
          data: { discountAmount: totalDiscount, status: 'BOOKED' },
        });

        const created: { id: string }[] = [];
        for (let i = 0; i < priced.length; i++) {
          created.push(
            await this.instant.createBookingRecords(tx, priced[i].p, now, {
              bookingGroupId: group.id,
              discountShare: shares[i],
            }),
          );
        }
        return created;
      },
      { timeout: 30000 },
    );

    for (let i = 0; i < priced.length; i++) {
      await this.instant.afterBooking(priced[i].p, bookings[i]);
    }

    return {
      bookingGroupId: group.id,
      discountApplied: totalDiscount,
      totalBeforeDiscount: sum,
      totalCharged: sum - totalDiscount,
      bookings: await this.prisma.booking.findMany({
        where: { bookingGroupId: group.id },
        include: {
          milestones: { orderBy: { dueDate: 'asc' } },
          invoices: true,
          vendorProfile: { select: { id: true, businessName: true } },
        },
      }),
    };
  }
}
