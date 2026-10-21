import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { MediaSharingService } from './media-sharing.service';
import { UploadMediaDto } from './dto/upload-media.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller()
export class MediaSharingController {
  constructor(private readonly mediaSharingService: MediaSharingService) {}

  @UseGuards(JwtAuthGuard)
  @Post('events/:eventId/media')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async upload(
    @Request() req,
    @Param('eventId') eventId: string,
    @Body() dto: UploadMediaDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.mediaSharingService.uploadMedia(
      req.user.userId,
      eventId,
      file,
      dto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('events/:eventId/media')
  list(@Param('eventId') eventId: string) {
    return this.mediaSharingService.listMediaForEvent(eventId);
  }

  // public — guests view event memories via their ticket, no login required
  @Get('invitations/:ticketCode/media')
  listForGuest(@Param('ticketCode') ticketCode: string) {
    return this.mediaSharingService.listMediaForGuestTicket(ticketCode);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('media/:mediaId')
  delete(@Request() req, @Param('mediaId') mediaId: string) {
    return this.mediaSharingService.deleteMedia(req.user.userId, mediaId);
  }
}
