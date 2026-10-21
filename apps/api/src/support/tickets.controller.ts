import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { SupportService } from './support.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { AddTicketMessageDto } from './dto/add-ticket-message.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('support/tickets')
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(private readonly supportService: SupportService) {}

  @Post()
  create(@Request() req, @Body() dto: CreateTicketDto) {
    return this.supportService.createTicket(
      req.user.userId,
      dto.subject,
      dto.message,
    );
  }

  @Get()
  list(@Request() req) {
    return this.supportService.listMyTickets(req.user.userId);
  }

  @Get(':id')
  get(@Request() req, @Param('id') id: string) {
    return this.supportService.getTicket(req.user.userId, id);
  }

  @Post(':id/messages')
  addMessage(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: AddTicketMessageDto,
  ) {
    return this.supportService.addMessage(req.user.userId, id, dto.content);
  }
}
