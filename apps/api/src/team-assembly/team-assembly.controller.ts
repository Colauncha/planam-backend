import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { TeamAssemblyService } from './team-assembly.service';
import { BookTeamDto, SetTeamSlotDto } from './dto/team.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@planam/shared';

@Controller('events')
export class TeamAssemblyController {
  constructor(private readonly team: TeamAssemblyService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOST)
  @Get(':eventId/team')
  board(@Request() req, @Param('eventId') eventId: string): Promise<any> {
    return this.team.getBoard(req.user.userId, eventId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOST)
  @Put(':eventId/team/slots/:slot')
  setSlot(
    @Request() req,
    @Param('eventId') eventId: string,
    @Param('slot') slot: string,
    @Body() dto: SetTeamSlotDto,
  ): Promise<any> {
    return this.team.setSlot(req.user.userId, eventId, slot, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOST)
  @Delete(':eventId/team/slots/:slot')
  removeSlot(
    @Request() req,
    @Param('eventId') eventId: string,
    @Param('slot') slot: string,
  ): Promise<any> {
    return this.team.removeSlot(req.user.userId, eventId, slot);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOST)
  @Post(':eventId/team/book')
  book(
    @Request() req,
    @Param('eventId') eventId: string,
    @Body() dto: BookTeamDto,
  ): Promise<any> {
    return this.team.bookTeam(req.user.userId, eventId, dto.acceptTerms);
  }
}
