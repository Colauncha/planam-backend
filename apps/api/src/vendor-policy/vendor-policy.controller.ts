import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { VendorPolicyService } from './vendor-policy.service';
import { UpdateVendorPolicyDto } from './dto/update-vendor-policy.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@planam/shared';

@Controller('vendors')
export class VendorPolicyController {
  constructor(private readonly policies: VendorPolicyService) {}

  // "me" routes are declared first so ":id" cannot swallow them
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR, Role.PLANNER)
  @Get('me/policy')
  getMine(@Request() req) {
    return this.policies.getMine(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR, Role.PLANNER)
  @Put('me/policy')
  updateMine(@Request() req, @Body() dto: UpdateVendorPolicyDto) {
    return this.policies.updateMine(req.user.userId, dto);
  }

  @Get(':id/policy')
  getPublic(@Param('id') id: string) {
    return this.policies.getPublic(id);
  }
}
