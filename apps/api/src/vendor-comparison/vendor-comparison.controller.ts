import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { VendorComparisonService } from './vendor-comparison.service';
import { AddToShortlistDto, ShortlistQueryDto } from './dto/shortlist.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@planam/shared';

@Controller('events')
export class VendorComparisonController {
  constructor(private readonly comparison: VendorComparisonService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOST)
  @Post(':eventId/shortlist')
  add(
    @Request() req,
    @Param('eventId') eventId: string,
    @Body() dto: AddToShortlistDto,
  ) {
    return this.comparison.add(req.user.userId, eventId, dto.vendorProfileId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOST)
  @Delete(':eventId/shortlist/:vendorProfileId')
  remove(
    @Request() req,
    @Param('eventId') eventId: string,
    @Param('vendorProfileId') vendorProfileId: string,
  ) {
    return this.comparison.remove(req.user.userId, eventId, vendorProfileId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOST)
  @Get(':eventId/shortlist')
  board(
    @Request() req,
    @Param('eventId') eventId: string,
    @Query() query: ShortlistQueryDto,
  ) {
    return this.comparison.getBoard(req.user.userId, eventId, query.category);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOST)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="vendor-comparison.csv"')
  @Get(':eventId/shortlist/export')
  export(
    @Request() req,
    @Param('eventId') eventId: string,
    @Query() query: ShortlistQueryDto,
  ) {
    return this.comparison.exportCsv(req.user.userId, eventId, query.category);
  }
}
