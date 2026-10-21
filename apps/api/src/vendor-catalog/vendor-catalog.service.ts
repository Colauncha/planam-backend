import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@planam/shared';

@Injectable()
export class VendorCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOwnedVendorProfile(userId: string) {
    const vendorProfile = await this.prisma.vendorProfile.findUnique({
      where: { userId },
    });
    if (!vendorProfile) throw new NotFoundException('Vendor profile not found');
    return vendorProfile;
  }

  // ---- PACKAGES ----

  async createPackage(userId: string, dto: any) {
    const vendorProfile = await this.getOwnedVendorProfile(userId);
    return this.prisma.vendorPackage.create({
      data: { vendorProfileId: vendorProfile.id, ...dto },
    });
  }

  async updatePackage(userId: string, packageId: string, dto: any) {
    const vendorPackage = await this.prisma.vendorPackage.findUnique({
      where: { id: packageId },
      include: { vendorProfile: true },
    });
    if (!vendorPackage) throw new NotFoundException('Package not found');
    if (vendorPackage.vendorProfile.userId !== userId)
      throw new ForbiddenException('Not your package');

    return this.prisma.vendorPackage.update({
      where: { id: packageId },
      data: dto,
    });
  }

  async deletePackage(userId: string, packageId: string) {
    const vendorPackage = await this.prisma.vendorPackage.findUnique({
      where: { id: packageId },
      include: { vendorProfile: true },
    });
    if (!vendorPackage) throw new NotFoundException('Package not found');
    if (vendorPackage.vendorProfile.userId !== userId)
      throw new ForbiddenException('Not your package');

    return this.prisma.vendorPackage.delete({ where: { id: packageId } });
  }

  async listPackagesForVendor(vendorProfileId: string) {
    return this.prisma.vendorPackage.findMany({
      where: { vendorProfileId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ---- MENU ITEMS (caterer-only) ----

  async createMenuItem(
    userId: string,
    dto: { category: string; name: string },
  ) {
    const vendorProfile = await this.getOwnedVendorProfile(userId);
    if (vendorProfile.category !== 'CATERING') {
      throw new ForbiddenException('Only catering vendors can manage a menu');
    }

    return this.prisma.menuItem.create({
      data: { vendorProfileId: vendorProfile.id, ...dto } as any,
    });
  }

  async deleteMenuItem(userId: string, menuItemId: string) {
    const item = await this.prisma.menuItem.findUnique({
      where: { id: menuItemId },
      include: { vendorProfile: true },
    });
    if (!item) throw new NotFoundException('Menu item not found');
    if (item.vendorProfile.userId !== userId)
      throw new ForbiddenException('Not your menu item');

    return this.prisma.menuItem.delete({ where: { id: menuItemId } });
  }

  async listMenuForVendor(vendorProfileId: string) {
    const vendorProfile = await this.prisma.vendorProfile.findUnique({
      where: { id: vendorProfileId },
    });
    if (!vendorProfile) throw new NotFoundException('Vendor not found');
    if (vendorProfile.category !== 'CATERING') {
      return []; // non-caterers simply have no menu — not an error, just an empty list
    }

    return this.prisma.menuItem.findMany({
      where: { vendorProfileId },
      orderBy: { category: 'asc' },
    });
  }

  async setPackageMenuItems(
    userId: string,
    packageId: string,
    menuItemIds: string[],
  ) {
    const pkg = await this.prisma.vendorPackage.findUnique({
      where: { id: packageId },
      include: { vendorProfile: true },
    });
    if (!pkg) throw new NotFoundException('Package not found');
    if (pkg.vendorProfile.userId !== userId)
      throw new ForbiddenException('Not your package');

    if (menuItemIds.length > 0) {
      const validCount = await this.prisma.menuItem.count({
        where: {
          id: { in: menuItemIds },
          vendorProfileId: pkg.vendorProfileId,
        },
      });
      if (validCount !== menuItemIds.length) {
        throw new BadRequestException(
          'One or more menu items do not belong to this vendor',
        );
      }
    }

    await this.prisma.$transaction([
      this.prisma.packageMenuItem.deleteMany({ where: { packageId } }),
      this.prisma.packageMenuItem.createMany({
        data: menuItemIds.map((menuItemId) => ({ packageId, menuItemId })),
      }),
    ]);

    return this.prisma.packageMenuItem.findMany({
      where: { packageId },
      include: { menuItem: true },
    });
  }

  async getPackageMenuItems(packageId: string) {
    return this.prisma.packageMenuItem.findMany({
      where: { packageId },
      include: { menuItem: true },
    });
  }

  // ---- ADD-ONS ----

  async createAddOn(userId: string, dto: { name: string; price: number }) {
    const vendorProfile = await this.getOwnedVendorProfile(userId);
    return this.prisma.vendorAddOn.create({
      data: { vendorProfileId: vendorProfile.id, ...dto },
    });
  }

  async deleteAddOn(userId: string, addOnId: string) {
    const addOn = await this.prisma.vendorAddOn.findUnique({
      where: { id: addOnId },
      include: { vendorProfile: true },
    });
    if (!addOn) throw new NotFoundException('Add-on not found');
    if (addOn.vendorProfile.userId !== userId)
      throw new ForbiddenException('Not your add-on');

    return this.prisma.vendorAddOn.delete({ where: { id: addOnId } });
  }

  async listAddOnsForVendor(vendorProfileId: string) {
    return this.prisma.vendorAddOn.findMany({
      where: { vendorProfileId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
