import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdateRecoveryDto } from './dto/update-recovery.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users/me/settings/security')
@UseGuards(JwtAuthGuard)
export class SecurityController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  get(@Request() req) {
    return this.settingsService.getSecuritySettings(req.user.userId);
  }

  @Patch('password')
  updatePassword(@Request() req, @Body() dto: UpdatePasswordDto) {
    return this.settingsService.updatePassword(
      req.user.userId,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @Patch('recovery')
  updateRecovery(@Request() req, @Body() dto: UpdateRecoveryDto) {
    return this.settingsService.updateRecovery(req.user.userId, dto);
  }

  @Post('deactivate')
  deactivate(@Request() req) {
    return this.settingsService.deactivateAccount(req.user.userId);
  }
}
