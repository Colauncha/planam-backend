import {
  Injectable,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@planam/shared';
import * as bcrypt from 'bcrypt';

@Injectable()
export class IdentityAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(
    email: string,
    password: string,
    fullName: string,
    phone?: string,
    role?: string,
  ) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName,
        phone,
        role: role as any,
      },
    });

    const { password: _, ...safeUser } = user;
    return safeUser;
  }

  async findAllUsers() {
    const users = await this.prisma.user.findMany();
    return users.map(({ password, ...safeUser }) => safeUser);
  }

  async createVendorProfile(
    userId: string,
    dto: {
      businessName: string;
      category: any;
      bio?: string;
      location?: string;
    },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role !== 'VENDOR' && user.role !== 'PLANNER') {
      throw new ForbiddenException(
        'Only vendor or planner accounts can create a vendor profile',
      );
    }

    return this.prisma.vendorProfile.create({
      data: { userId, ...dto },
    });
  }

  async updateVendorProfile(
    userId: string,
    dto: Partial<{
      businessName: string;
      category: any;
      bio?: string;
      location?: string;
    }>,
  ) {
    const profile = await this.prisma.vendorProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException('No vendor profile found — create one first');
    }

    return this.prisma.vendorProfile.update({
      where: { userId },
      data: dto,
    });
  }

  async getMyVendorProfile(userId: string) {
    const profile = await this.prisma.vendorProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException('No vendor profile found');
    }
    return profile;
  }
}
