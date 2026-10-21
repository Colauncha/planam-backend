import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@planam/shared';
import { UpdateVendorPolicyDto } from './dto/update-vendor-policy.dto';

const DEFAULTS = {
  depositPercent: 30,
  fullRefundDaysBefore: 45,
  lateCancelDaysBefore: 30,
  midCancelPercentDue: 30,
  lateCancelPercentDue: 50,
  terms: null as string | null,
};

type PolicyRow = typeof DEFAULTS;

@Injectable()
export class VendorPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  private view(policy: PolicyRow | null) {
    return policy
      ? {
          isDefault: false,
          depositPercent: policy.depositPercent,
          fullRefundDaysBefore: policy.fullRefundDaysBefore,
          lateCancelDaysBefore: policy.lateCancelDaysBefore,
          midCancelPercentDue: policy.midCancelPercentDue,
          lateCancelPercentDue: policy.lateCancelPercentDue,
          terms: policy.terms,
        }
      : { isDefault: true, ...DEFAULTS };
  }

  private async getOwnProfile(userId: string) {
    const vendor = await this.prisma.vendorProfile.findUnique({
      where: { userId },
    });
    if (!vendor) throw new NotFoundException('Vendor profile not found');
    return vendor;
  }

  async getMine(userId: string) {
    const vendor = await this.getOwnProfile(userId);
    const policy = await this.prisma.vendorPolicy.findUnique({
      where: { vendorProfileId: vendor.id },
    });
    return this.view(policy);
  }

  async updateMine(userId: string, dto: UpdateVendorPolicyDto) {
    const vendor = await this.getOwnProfile(userId);
    const current = await this.prisma.vendorPolicy.findUnique({
      where: { vendorProfileId: vendor.id },
    });
    const base = current ?? DEFAULTS;

    const next = {
      depositPercent: dto.depositPercent ?? base.depositPercent,
      fullRefundDaysBefore:
        dto.fullRefundDaysBefore ?? base.fullRefundDaysBefore,
      lateCancelDaysBefore:
        dto.lateCancelDaysBefore ?? base.lateCancelDaysBefore,
      midCancelPercentDue: dto.midCancelPercentDue ?? base.midCancelPercentDue,
      lateCancelPercentDue:
        dto.lateCancelPercentDue ?? base.lateCancelPercentDue,
      terms: dto.terms ?? base.terms,
    };

    if (next.fullRefundDaysBefore <= next.lateCancelDaysBefore) {
      throw new BadRequestException(
        'fullRefundDaysBefore must be greater than lateCancelDaysBefore',
      );
    }

    if (next.midCancelPercentDue > next.lateCancelPercentDue) {
      throw new BadRequestException(
        'midCancelPercentDue cannot be greater than lateCancelPercentDue',
      );
    }

    const saved = await this.prisma.vendorPolicy.upsert({
      where: { vendorProfileId: vendor.id },
      create: { vendorProfileId: vendor.id, ...next },
      update: next,
    });
    return this.view(saved);
  }

  async getPublic(vendorProfileId: string) {
    const vendor = await this.prisma.vendorProfile.findUnique({
      where: { id: vendorProfileId },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');
    const policy = await this.prisma.vendorPolicy.findUnique({
      where: { vendorProfileId },
    });
    return this.view(policy);
  }
}
