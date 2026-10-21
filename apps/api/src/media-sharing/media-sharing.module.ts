import { Module } from '@nestjs/common';
import { MediaSharingController } from './media-sharing.controller';
import { MediaSharingService } from './media-sharing.service';
import { PrismaService } from '@planam/shared';

@Module({
  controllers: [MediaSharingController],
  providers: [MediaSharingService, PrismaService],
})
export class MediaSharingModule {}
