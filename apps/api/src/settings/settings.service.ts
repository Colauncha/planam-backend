import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@planam/shared';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---- GENERAL ----

  async getGeneralSettings(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { vendorProfile: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const { password, ...safeUser } = user;
    return safeUser;
  }

  async updateGeneralSettings(userId: string, dto: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { vendorProfile: true },
    });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        phone: dto.phone ?? undefined,
        language: dto.language ?? undefined,
      },
    });

    if (user.vendorProfile) {
      await this.prisma.vendorProfile.update({
        where: { userId },
        data: {
          businessName: dto.businessName ?? undefined,
          businessAddress: dto.businessAddress ?? undefined,
          zipCode: dto.zipCode ?? undefined,
          country: dto.country ?? undefined,
          state: dto.state ?? undefined,
        },
      });
    }

    return this.getGeneralSettings(userId);
  }

  async updateAvatar(userId: string, avatarUrl: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    });
  }

  // ---- NOTIFICATION PREFERENCES ----

  async getNotificationPreferences(userId: string) {
    let prefs = await this.prisma.notificationPreferences.findUnique({
      where: { userId },
    });
    if (!prefs) {
      prefs = await this.prisma.notificationPreferences.create({
        data: { userId },
      });
    }
    return prefs;
  }

  async updateNotificationPreferences(userId: string, dto: any) {
    await this.getNotificationPreferences(userId); // ensures the row exists first
    return this.prisma.notificationPreferences.update({
      where: { userId },
      data: dto,
    });
  }

  // ---- SECURITY ----

  async getSecuritySettings(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        isEmailVerified: true,
        recoveryEmail: true,
        recoveryPhone: true,
        isActive: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updatePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const matches = await bcrypt.compare(currentPassword, user.password);
    if (!matches)
      throw new BadRequestException('Current password is incorrect');

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Password updated successfully' };
  }

  async updateRecovery(
    userId: string,
    dto: { recoveryEmail?: string; recoveryPhone?: string },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        recoveryEmail: dto.recoveryEmail,
        recoveryPhone: dto.recoveryPhone,
      },
    });
  }

  async deactivateAccount(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
    return {
      message: 'Account deactivated. Signing in again will reactivate it.',
    };
  }
}
