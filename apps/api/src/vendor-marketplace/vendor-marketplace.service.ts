import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@planam/shared';

@Injectable()
export class VendorMarketplaceService {
  constructor(private readonly prisma: PrismaService) {}
  /*
  async search(filters: {
    category?: string;
    location?: string;
    maxBudget?: number;
  }) {
    return this.prisma.vendorProfile.findMany({
      where: {
        ...(filters.category && { category: filters.category as any }),
        ...(filters.location && {
          location: { contains: filters.location, mode: 'insensitive' },
        }),
        ...(filters.maxBudget !== undefined && {
          startingPrice: { lte: filters.maxBudget },
        }),
        isVerified: true,
      },
      select: {
        id: true,
        businessName: true,
        category: true,
        bio: true,
        location: true,
        startingPrice: true,
        isVerified: true,
      },
    });
  }
*/

  async search(filters: {
    category?: string;
    location?: string;
    maxBudget?: number;
  }) {
    const vendors = await this.prisma.vendorProfile.findMany({
      where: {
        ...(filters.category && { category: filters.category as any }),
        ...(filters.maxBudget !== undefined && {
          minPrice: { lte: filters.maxBudget },
        }),
        isVerified: true,
        isAcceptingBookings: true,
      },
      select: {
        id: true,
        businessName: true,
        category: true,
        bio: true,
        serviceAreas: true,
        minPrice: true,
        maxPrice: true,
        isVerified: true,
        isAcceptingBookings: true,
      },
    });

    if (!filters.location) return vendors;

    const needle = filters.location.toLowerCase();
    return vendors.filter((v) =>
      v.serviceAreas.some((area) => area.toLowerCase().includes(needle)),
    );
  }

  async findOne(vendorProfileId: string) {
    const vendor = await this.prisma.vendorProfile.findUnique({
      where: { id: vendorProfileId },
    });
    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }
    return vendor;
  }

  async getRatingSummary(vendorProfileId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { vendorProfileId },
      select: { rating: true },
    });

    const total = reviews.length;
    if (total === 0) {
      return {
        average: 0,
        total: 0,
        breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      };
    }

    const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sum = 0;
    for (const r of reviews) {
      counts[r.rating] = (counts[r.rating] ?? 0) + 1;
      sum += r.rating;
    }

    const breakdown: Record<number, number> = {};
    for (const star of [5, 4, 3, 2, 1]) {
      breakdown[star] = Math.round((counts[star] / total) * 100);
    }

    return { average: Math.round((sum / total) * 10) / 10, total, breakdown };
  }

  async submitPublicReview(
    vendorProfileId: string,
    dto: {
      authorName: string;
      authorEmail: string;
      rating: number;
      comment?: string;
    },
  ) {
    const vendor = await this.prisma.vendorProfile.findUnique({
      where: { id: vendorProfileId },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');

    return this.prisma.review.create({
      data: {
        vendorProfileId,
        authorName: dto.authorName,
        authorEmail: dto.authorEmail,
        rating: dto.rating,
        comment: dto.comment,
      },
    });
  }
}
