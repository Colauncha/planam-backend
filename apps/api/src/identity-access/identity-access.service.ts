import {
  Injectable,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@planam/shared';
import * as bcrypt from 'bcrypt';
import { v2 as cloudinary } from 'cloudinary';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class IdentityAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

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

  async createVendorProfile(userId: string, dto: any) {
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

  private getConfiguredCloudinary() {
    const cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.config.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.config.get<string>('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      throw new BadRequestException(
        'Media uploads are not configured yet — Cloudinary credentials are missing',
      );
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
    return cloudinary;
  }

  async uploadPortfolioImage(
    userId: string,
    file: Express.Multer.File,
    caption?: string,
  ) {
    const vendorProfile = await this.prisma.vendorProfile.findUnique({
      where: { userId },
    });
    if (!vendorProfile) throw new NotFoundException('Vendor profile not found');

    const existingCount = await this.prisma.vendorPortfolioMedia.count({
      where: { vendorProfileId: vendorProfile.id },
    });
    if (existingCount >= 6) {
      throw new BadRequestException('Maximum of 6 portfolio images allowed');
    }

    const client = this.getConfiguredCloudinary();

    const uploadResult = await new Promise<{
      secure_url: string;
      public_id: string;
    }>((resolve, reject) => {
      const stream = client.uploader.upload_stream(
        { folder: `planam/vendors/${vendorProfile.id}/portfolio` },
        (error, result) => {
          if (error || !result) return reject(error);
          resolve(result as any);
        },
      );
      stream.end(file.buffer);
    });

    return this.prisma.vendorPortfolioMedia.create({
      data: {
        vendorProfileId: vendorProfile.id,
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        caption,
      },
    });
  }

  async listPortfolio(vendorProfileId: string) {
    return this.prisma.vendorPortfolioMedia.findMany({
      where: { vendorProfileId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async deletePortfolioImage(userId: string, mediaId: string) {
    const media = await this.prisma.vendorPortfolioMedia.findUnique({
      where: { id: mediaId },
      include: { vendorProfile: true },
    });
    if (!media) throw new NotFoundException('Portfolio image not found');
    if (media.vendorProfile.userId !== userId)
      throw new ForbiddenException('Not your portfolio image');

    const client = this.getConfiguredCloudinary();
    await client.uploader.destroy(media.publicId);

    return this.prisma.vendorPortfolioMedia.delete({ where: { id: mediaId } });
  }

  async updatePortfolioCaption(
    userId: string,
    mediaId: string,
    caption?: string,
  ) {
    const media = await this.prisma.vendorPortfolioMedia.findUnique({
      where: { id: mediaId },
      include: { vendorProfile: true },
    });
    if (!media) throw new NotFoundException('Portfolio image not found');
    if (media.vendorProfile.userId !== userId)
      throw new ForbiddenException('Not your portfolio image');

    return this.prisma.vendorPortfolioMedia.update({
      where: { id: mediaId },
      data: { caption },
    });
  }
}
