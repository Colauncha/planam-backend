import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  Request,
  Patch,
} from '@nestjs/common';
import { IdentityAccessService } from './identity-access.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateVendorProfileDto } from './dto/create-vendor-profile.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@planam/shared';
import { UpdateVendorProfileDto } from './dto/update-vendor-profile.dto';

@Controller('users')
export class IdentityAccessController {
  constructor(private readonly identityAccessService: IdentityAccessService) {}

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.identityAccessService.createUser(
      dto.email,
      dto.password,
      dto.fullName,
      dto.phone,
      dto.role,
    );
  }

  @Get()
  findAll() {
    return this.identityAccessService.findAllUsers();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR, Role.PLANNER)
  @Post('me/vendor-profile')
  createVendorProfile(@Request() req, @Body() dto: CreateVendorProfileDto) {
    return this.identityAccessService.createVendorProfile(req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR, Role.PLANNER)
  @Get('me/vendor-profile')
  getMyVendorProfile(@Request() req) {
    return this.identityAccessService.getMyVendorProfile(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR, Role.PLANNER)
  @Patch('me/vendor-profile')
  updateVendorProfile(@Request() req, @Body() dto: UpdateVendorProfileDto) {
    return this.identityAccessService.updateVendorProfile(req.user.userId, dto);
  }
}
