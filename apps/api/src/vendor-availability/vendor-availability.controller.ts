import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import { VendorAvailabilityService } from './vendor-availability.service';
import { BlockDateDto } from './dto/block-date.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@planam/shared';

@Controller()
export class VendorAvailabilityController {
  constructor(
    private readonly availabilityService: VendorAvailabilityService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR, Role.PLANNER)
  @Patch('vendors/me/availability/block')
  block(@Request() req, @Body() dto: BlockDateDto) {
    return this.availabilityService.blockDate(req.user.userId, dto.date);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR, Role.PLANNER)
  @Patch('vendors/me/availability/unblock')
  unblock(@Request() req, @Body() dto: BlockDateDto) {
    return this.availabilityService.unblockDate(req.user.userId, dto.date);
  }

  @Get('vendors/:vendorProfileId/availability')
  calendar(@Param('vendorProfileId') vendorProfileId: string) {
    return this.availabilityService.getCalendar(vendorProfileId);
  }
}
