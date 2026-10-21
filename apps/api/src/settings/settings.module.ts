import { Module } from '@nestjs/common';
import { GeneralController } from './general.controller';
import { NotificationPreferencesController } from './notification-preferences.controller';
import { SecurityController } from './security.controller';
import { SettingsService } from './settings.service';
import { PrismaService } from '@planam/shared';

@Module({
  controllers: [
    GeneralController,
    NotificationPreferencesController,
    SecurityController,
  ],
  providers: [SettingsService, PrismaService],
})
export class SettingsModule {}
