import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@planam/shared';

@Injectable()
export class AiRecommendationService {
  constructor(private readonly prisma: PrismaService) {}

  private scoreBudgetFit(
    startingPrice: number | null,
    budget: number | null,
  ): number {
    if (startingPrice === null || budget === null || budget === 0) return 0.5; // insufficient data — neutral
    if (startingPrice <= budget) return 1;
    const overage = (startingPrice - budget) / budget;
    return Math.max(0, 1 - overage);
  }

  private scoreLocation(
    vendorAreas: string[],
    eventLocation: string | null,
  ): number {
    if (!eventLocation) return 0.5;
    if (!vendorAreas || vendorAreas.length === 0) return 0;
    const needle = eventLocation.toLowerCase();
    return vendorAreas.some(
      (area) =>
        area.toLowerCase().includes(needle) ||
        needle.includes(area.toLowerCase()),
    )
      ? 1
      : 0;
  }

  async recommendVendors(hostId: string, eventId: string, category: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event) throw new NotFoundException('Event not found');
    if (event.hostId !== hostId)
      throw new ForbiddenException('You do not own this event');

    const candidates = await this.prisma.vendorProfile.findMany({
      where: {
        category: category as any,
        isVerified: true,
        isAcceptingBookings: true,
      },
    });

    // hard filter: exclude anyone already blocked on this event's date
    const blockedProfileIds = new Set(
      (
        await this.prisma.vendorAvailability.findMany({
          where: {
            date: event.eventDate,
            isBlocked: true,
            vendorProfileId: { in: candidates.map((c) => c.id) },
          },
          select: { vendorProfileId: true },
        })
      ).map((v) => v.vendorProfileId),
    );
    const available = candidates.filter((c) => !blockedProfileIds.has(c.id));

    const ratings = await this.prisma.review.groupBy({
      by: ['vendorProfileId'],
      where: { vendorProfileId: { in: available.map((c) => c.id) } },
      _avg: { rating: true },
    });
    const ratingMap = new Map(
      ratings.map((r) => [r.vendorProfileId, r._avg.rating ?? null]),
    );

    const scored = available.map((vendor) => {
      const avgRating = ratingMap.get(vendor.id) ?? null;
      const budgetScore = this.scoreBudgetFit(
        vendor.minPrice ? Number(vendor.minPrice) : null,
        event.budget ? Number(event.budget) : null,
      );
      const ratingScore = avgRating !== null ? avgRating / 5 : 0.5;
      const locationScore = this.scoreLocation(
        vendor.serviceAreas,
        event.location,
      );

      const totalScore =
        budgetScore * 0.4 + ratingScore * 0.4 + locationScore * 0.2;

      return {
        vendorProfileId: vendor.id,
        businessName: vendor.businessName,
        category: vendor.category,
        serviceAreas: vendor.serviceAreas,
        minPrice: vendor.minPrice,
        maxPrice: vendor.maxPrice,
        averageRating: avgRating,
        score: Math.round(totalScore * 100) / 100,
        scoreBreakdown: {
          budgetFit: budgetScore,
          rating: ratingScore,
          location: locationScore,
        },
      };
    });

    return scored.sort((a, b) => b.score - a.score);
  }

  // used by the comparison board; scores a given set of vendors against an event
  async scoreVendorsForEvent(
    event: { location: string | null; budget: unknown },
    vendors: { id: string; minPrice: unknown; serviceAreas: string[] }[],
    budgetCeiling: number | null = null,
  ) {
    const ratings = await this.prisma.review.groupBy({
      by: ['vendorProfileId'],
      where: { vendorProfileId: { in: vendors.map((v) => v.id) } },
      _avg: { rating: true },
      _count: { rating: true },
    });
    const ratingMap = new Map(
      ratings.map((r) => [
        r.vendorProfileId,
        { avg: r._avg.rating ?? null, count: r._count.rating },
      ]),
    );

    // a per-category budget, when set, is a better yardstick than the whole event budget
    const budget =
      budgetCeiling ?? (event.budget ? Number(event.budget) : null);

    const result = new Map<
      string,
      { score: number; averageRating: number | null; reviewCount: number }
    >();

    for (const vendor of vendors) {
      const r = ratingMap.get(vendor.id);
      const avg = r?.avg ?? null;

      const budgetScore = this.scoreBudgetFit(
        vendor.minPrice ? Number(vendor.minPrice) : null,
        budget,
      );
      const ratingScore = avg !== null ? avg / 5 : 0.5;
      const locationScore = this.scoreLocation(
        vendor.serviceAreas,
        event.location,
      );

      const total = budgetScore * 0.4 + ratingScore * 0.4 + locationScore * 0.2;

      result.set(vendor.id, {
        score: Math.round(total * 100),
        averageRating: avg === null ? null : Math.round(avg * 10) / 10,
        reviewCount: r?.count ?? 0,
      });
    }

    return result;
  }

  async scoreLeadForVendor(vendorProfileId: string, leadId: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: { event: true },
    });
    if (!lead) return null;

    const vendor = await this.prisma.vendorProfile.findUnique({
      where: { id: vendorProfileId },
    });
    if (!vendor) return null;

    const budgetScore = this.scoreBudgetRangeOverlap(
      vendor.minPrice ? Number(vendor.minPrice) : null,
      vendor.maxPrice ? Number(vendor.maxPrice) : null,
      lead.event.budget ? Number(lead.event.budget) : null,
    );

    const eventTypeScore =
      vendor.pastEventTypes.length === 0
        ? 0.5
        : vendor.pastEventTypes.includes(lead.event.eventType as any)
          ? 1
          : 0;

    const locationScore = this.scoreLocation(
      vendor.serviceAreas,
      lead.event.location,
    );

    const total =
      budgetScore * 0.4 + eventTypeScore * 0.3 + locationScore * 0.3;
    return Math.round(total * 100);
  }

  private scoreBudgetRangeOverlap(
    vendorMin: number | null,
    vendorMax: number | null,
    eventBudget: number | null,
  ): number {
    if (vendorMin === null || vendorMax === null || eventBudget === null)
      return 0.5;
    if (eventBudget >= vendorMin && eventBudget <= vendorMax) return 1;
    const distance =
      eventBudget < vendorMin
        ? vendorMin - eventBudget
        : eventBudget - vendorMax;
    const range = vendorMax - vendorMin || vendorMax;
    return Math.max(0, 1 - distance / range);
  }
}
