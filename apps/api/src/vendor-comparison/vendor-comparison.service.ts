import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@planam/shared';
import { AiRecommendationService } from '../ai-recommendation/ai-recommendation.service';
import { VendorAvailabilityService } from '../vendor-availability/vendor-availability.service';

const MAX_PER_CATEGORY = 5;

function csvCell(value: unknown): string {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

@Injectable()
export class VendorComparisonService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiRecommendationService: AiRecommendationService,
    private readonly vendorAvailabilityService: VendorAvailabilityService,
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

  async add(hostId: string, eventId: string, vendorProfileId: string) {
    await this.getOwnedEvent(eventId, hostId);

    const vendor = await this.prisma.vendorProfile.findUnique({
      where: { id: vendorProfileId },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');

    // adding the same vendor twice just returns the existing entry
    const existing = await this.prisma.shortlistedVendor.findUnique({
      where: { eventId_vendorProfileId: { eventId, vendorProfileId } },
    });
    if (existing) return existing;

    const count = await this.prisma.shortlistedVendor.count({
      where: { eventId, category: vendor.category },
    });
    if (count >= MAX_PER_CATEGORY) {
      throw new BadRequestException(
        `You can compare at most ${MAX_PER_CATEGORY} vendors per category`,
      );
    }

    return this.prisma.shortlistedVendor.create({
      data: { eventId, vendorProfileId, category: vendor.category },
    });
  }

  async remove(hostId: string, eventId: string, vendorProfileId: string) {
    await this.getOwnedEvent(eventId, hostId);
    const result = await this.prisma.shortlistedVendor.deleteMany({
      where: { eventId, vendorProfileId },
    });
    return { removed: result.count };
  }

  async getBoard(hostId: string, eventId: string, category?: string) {
    const event = await this.getOwnedEvent(eventId, hostId);

    const entries = await this.prisma.shortlistedVendor.findMany({
      where: { eventId, ...(category && { category: category as any }) },
    });

    const vendors = entries.length
      ? await this.prisma.vendorProfile.findMany({
          where: { id: { in: entries.map((e) => e.vendorProfileId) } },
          include: { packages: { orderBy: { basePrice: 'asc' }, take: 1 } },
        })
      : [];

    const allocations = await this.prisma.eventBudgetAllocation.findMany({
      where: { eventId },
    });
    const allocationByCategory = new Map(
      allocations.map((a) => [
        a.category,
        { min: Number(a.minAmount), max: Number(a.maxAmount) },
      ]),
    );

    // score each category separately so each uses its own budget range
    const scores = new Map<
      string,
      { score: number; averageRating: number | null; reviewCount: number }
    >();
    for (const cat of new Set(vendors.map((v) => v.category))) {
      const group = vendors.filter((v) => v.category === cat);
      const groupScores =
        await this.aiRecommendationService.scoreVendorsForEvent(
          event,
          group,
          allocationByCategory.get(cat)?.max ?? null,
        );
      groupScores.forEach((value, key) => scores.set(key, value));
    }

    const availableFlags = await Promise.all(
      vendors.map((v) =>
        this.vendorAvailabilityService.isDateAvailable(v.id, event.eventDate),
      ),
    );

    const rows = vendors.map((v, i) => {
      // the cheapest package is the basis for the board's estimate
      const pkg = v.packages[0];
      const units = pkg?.pricingType === 'PER_GUEST' ? event.guestCapacity : 1;

      const estimatedTotal = pkg
        ? units
          ? Number(pkg.basePrice) * units
          : null
        : v.minPrice
          ? Number(v.minPrice)
          : null;
      // negotiablePrice is stored in the same unit as basePrice
      const negotiablePrice =
        pkg?.negotiablePrice && units
          ? Number(pkg.negotiablePrice) * units
          : null;

      const score = scores.get(v.id);
      const range = allocationByCategory.get(v.category);

      return {
        vendorProfileId: v.id,
        businessName: v.businessName,
        category: v.category,
        isVerified: v.isVerified,
        packageId: pkg?.id ?? null,
        packageName: pkg?.name ?? null,
        estimatedTotal,
        negotiablePrice,
        aiMatchScore: score?.score ?? null,
        inclusions: pkg?.includes ?? [],
        rating: {
          average: score?.averageRating ?? null,
          count: score?.reviewCount ?? 0,
        },
        availability: availableFlags[i] ? 'AVAILABLE' : 'BOOKED',
        withinBudget:
          range && estimatedTotal !== null ? estimatedTotal <= range.max : null,
      };
    });

    rows.sort((a, b) => (b.aiMatchScore ?? -1) - (a.aiMatchScore ?? -1));

    // top match = best score among vendors who are free on the event date
    const topByCategory = new Map<string, string>();
    for (const r of rows) {
      if (r.availability === 'AVAILABLE' && !topByCategory.has(r.category)) {
        topByCategory.set(r.category, r.vendorProfileId);
      }
    }

    const vendorsWithTop = rows.map((r) => ({
      ...r,
      isTopMatch: topByCategory.get(r.category) === r.vendorProfileId,
    }));

    const top = category
      ? vendorsWithTop.find((r) => r.isTopMatch && r.category === category)
      : undefined;

    return {
      eventId,
      eventDate: event.eventDate,
      guestCount: event.guestCapacity,
      budget: category
        ? (allocationByCategory.get(category as any) ?? null)
        : null,
      vendors: vendorsWithTop,
      insight: top
        ? `${top.businessName} is the best match for this event (${top.aiMatchScore}%), based on budget fit, ratings and service area.`
        : null,
    };
  }

  async exportCsv(hostId: string, eventId: string, category?: string) {
    const board = await this.getBoard(hostId, eventId, category);

    const header = [
      'Vendor',
      'Category',
      'Package',
      'Estimated Total',
      'Negotiable Price',
      'AI Match Score (%)',
      'Rating',
      'Reviews',
      'Availability',
      'Inclusions',
    ];

    const lines = board.vendors.map((v) =>
      [
        v.businessName,
        v.category,
        v.packageName,
        v.estimatedTotal,
        v.negotiablePrice,
        v.aiMatchScore,
        v.rating.average,
        v.rating.count,
        v.availability,
        v.inclusions.join('; '),
      ]
        .map(csvCell)
        .join(','),
    );

    return [header.map(csvCell).join(','), ...lines].join('\n');
  }
}
