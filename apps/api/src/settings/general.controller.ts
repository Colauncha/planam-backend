import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { ConfigService } from '@nestjs/config';
import { SettingsService } from './settings.service';
import { UpdateGeneralSettingsDto } from './dto/update-general-settings.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users/me/settings/general')
@UseGuards(JwtAuthGuard)
export class GeneralController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  get(@Request() req) {
    return this.settingsService.getGeneralSettings(req.user.userId);
  }

  @Patch()
  update(@Request() req, @Body() dto: UpdateGeneralSettingsDto) {
    return this.settingsService.updateGeneralSettings(req.user.userId, dto);
  }

  @Post('avatar')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadAvatar(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');

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

    const uploadResult = await new Promise<{ secure_url: string }>(
      (resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: `planam/users/${req.user.userId}/avatar` },
          (error, result) => {
            if (error || !result) return reject(error);
            resolve(result as any);
          },
        );
        stream.end(file.buffer);
      },
    );

    return this.settingsService.updateAvatar(
      req.user.userId,
      uploadResult.secure_url,
    );
  }
}
