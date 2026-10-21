import {
  Body,
  Controller,
  Get,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users/me/settings/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationPreferencesController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  get(@Request() req) {
    return this.settingsService.getNotificationPreferences(req.user.userId);
  }

  @Patch()
  update(@Request() req, @Body() dto: UpdateNotificationPreferencesDto) {
    return this.settingsService.updateNotificationPreferences(
      req.user.userId,
      dto,
    );
  }
}
