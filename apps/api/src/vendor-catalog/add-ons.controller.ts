import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { VendorCatalogService } from './vendor-catalog.service';
import { CreateAddOnDto } from './dto/create-add-on.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@planam/shared';

@Controller()
export class AddOnsController {
  constructor(private readonly vendorCatalogService: VendorCatalogService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR, Role.PLANNER)
  @Post('vendors/me/add-ons')
  create(@Request() req, @Body() dto: CreateAddOnDto) {
    return this.vendorCatalogService.createAddOn(req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR, Role.PLANNER)
  @Delete('add-ons/:id')
  delete(@Request() req, @Param('id') id: string) {
    return this.vendorCatalogService.deleteAddOn(req.user.userId, id);
  }

  @Get('vendors/:vendorProfileId/add-ons')
  listForVendor(@Param('vendorProfileId') vendorProfileId: string) {
    return this.vendorCatalogService.listAddOnsForVendor(vendorProfileId);
  }
}
