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
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@planam/shared';

@Controller()
export class MenuItemsController {
  constructor(private readonly vendorCatalogService: VendorCatalogService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR, Role.PLANNER)
  @Post('vendors/me/menu-items')
  create(@Request() req, @Body() dto: CreateMenuItemDto) {
    return this.vendorCatalogService.createMenuItem(req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR, Role.PLANNER)
  @Delete('menu-items/:id')
  delete(@Request() req, @Param('id') id: string) {
    return this.vendorCatalogService.deleteMenuItem(req.user.userId, id);
  }

  @Get('vendors/:vendorProfileId/menu-items')
  listForVendor(@Param('vendorProfileId') vendorProfileId: string) {
    return this.vendorCatalogService.listMenuForVendor(vendorProfileId);
  }
}
