import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { VendorCatalogService } from './vendor-catalog.service';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@planam/shared';
import { SetPackageMenuItemsDto } from './dto/set-package-menu-items.dto';

@Controller()
export class PackagesController {
  constructor(private readonly vendorCatalogService: VendorCatalogService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR, Role.PLANNER)
  @Post('vendors/me/packages')
  create(@Request() req, @Body() dto: CreatePackageDto) {
    return this.vendorCatalogService.createPackage(req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR, Role.PLANNER)
  @Patch('packages/:id')
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdatePackageDto,
  ) {
    return this.vendorCatalogService.updatePackage(req.user.userId, id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR, Role.PLANNER)
  @Delete('packages/:id')
  delete(@Request() req, @Param('id') id: string) {
    return this.vendorCatalogService.deletePackage(req.user.userId, id);
  }

  @Get('vendors/:vendorProfileId/packages')
  listForVendor(@Param('vendorProfileId') vendorProfileId: string) {
    return this.vendorCatalogService.listPackagesForVendor(vendorProfileId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR, Role.PLANNER)
  @Post('packages/:id/menu-items')
  setMenuItems(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: SetPackageMenuItemsDto,
  ) {
    return this.vendorCatalogService.setPackageMenuItems(
      req.user.userId,
      id,
      dto.menuItemIds,
    );
  }

  @Get('packages/:id/menu-items')
  getMenuItems(@Param('id') id: string) {
    return this.vendorCatalogService.getPackageMenuItems(id);
  }
}
