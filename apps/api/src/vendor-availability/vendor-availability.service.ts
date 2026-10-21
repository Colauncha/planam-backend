import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@planam/shared';

@Injectable()
export class VendorAvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOwnedVendorProfile(userId: string) {
    const vendorProfile = await this.prisma.vendorProfile.findUnique({
      where: { userId },
    });
    if (!vendorProfile) throw new NotFoundException('Vendor profile not found');
    return vendorProfile;
  }

  async blockDate(userId: string, date: string) {
    const vendorProfile = await this.getOwnedVendorProfile(userId);
    return this.blockDateInternal(vendorProfile.id, new Date(date));
  }

  async unblockDate(userId: string, date: string) {
    const vendorProfile = await this.getOwnedVendorProfile(userId);
    const existing = await this.prisma.vendorAvailability.findUnique({
      where: {
        vendorProfileId_date: {
          vendorProfileId: vendorProfile.id,
          date: new Date(date),
        },
      },
    });
    if (!existing) {
      return { message: 'Date was already available' };
    }
    return this.prisma.vendorAvailability.delete({
      where: { id: existing.id },
    });
  }

  async getCalendar(vendorProfileId: string) {
    return this.prisma.vendorAvailability.findMany({
      where: { vendorProfileId, isBlocked: true },
      select: { date: true },
      orderBy: { date: 'asc' },
    });
  }

  async isDateAvailable(vendorProfileId: string, date: Date): Promise<boolean> {
    const record = await this.prisma.vendorAvailability.findUnique({
      where: { vendorProfileId_date: { vendorProfileId, date } },
    });
    return !record?.isBlocked;
  }

  // Called internally (not via HTTP) when a booking is confirmed
  async blockDateInternal(vendorProfileId: string, date: Date) {
    return this.prisma.vendorAvailability.upsert({
      where: { vendorProfileId_date: { vendorProfileId, date } },
      update: { isBlocked: true },
      create: { vendorProfileId, date, isBlocked: true },
    });
  }
}
