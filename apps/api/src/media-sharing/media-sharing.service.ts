import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@planam/shared';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class MediaSharingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

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

  private async assertCanUpload(userId: string, eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event) throw new NotFoundException('Event not found');
    if (event.hostId === userId) return; // host always allowed

    const vendorProfile = await this.prisma.vendorProfile.findUnique({
      where: { userId },
    });
    if (vendorProfile) {
      const booking = await this.prisma.booking.findFirst({
        where: { eventId, vendorProfileId: vendorProfile.id },
      });
      if (booking) return; // booked vendor allowed
    }

    throw new ForbiddenException(
      'You are not authorized to upload media for this event',
    );
  }

  async uploadMedia(
    userId: string,
    eventId: string,
    file: Express.Multer.File,
    dto: { type: 'PHOTO' | 'VIDEO'; caption?: string },
  ) {
    await this.assertCanUpload(userId, eventId);

    const client = this.getConfiguredCloudinary();

    const uploadResult = await new Promise<{
      secure_url: string;
      public_id: string;
    }>((resolve, reject) => {
      const stream = client.uploader.upload_stream(
        {
          folder: `planam/events/${eventId}`,
          resource_type: dto.type === 'VIDEO' ? 'video' : 'image',
        },
        (error, result) => {
          if (error || !result) return reject(error);
          resolve(result as any);
        },
      );
      stream.end(file.buffer);
    });

    return this.prisma.media.create({
      data: {
        eventId,
        uploaderId: userId,
        type: dto.type as any,
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        caption: dto.caption,
      },
    });
  }

  async listMediaForEvent(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event) throw new NotFoundException('Event not found');

    return this.prisma.media.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listMediaForGuestTicket(ticketCode: string) {
    const guest = await this.prisma.guest.findUnique({ where: { ticketCode } });
    if (!guest) throw new NotFoundException('Invitation not found');

    return this.prisma.media.findMany({
      where: { eventId: guest.eventId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteMedia(userId: string, mediaId: string) {
    const media = await this.prisma.media.findUnique({
      where: { id: mediaId },
      include: { event: true },
    });
    if (!media) throw new NotFoundException('Media not found');

    if (media.uploaderId !== userId && media.event.hostId !== userId) {
      throw new ForbiddenException(
        'Only the uploader or the event host can delete this',
      );
    }

    const client = this.getConfiguredCloudinary();
    await client.uploader.destroy(media.publicId, {
      resource_type: media.type === 'VIDEO' ? 'video' : 'image',
    });

    return this.prisma.media.delete({ where: { id: mediaId } });
  }
}
