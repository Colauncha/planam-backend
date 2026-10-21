import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Req,
  Request,
  UseGuards,
  Delete
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { PaymentsService } from './payments.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@planam/shared';
import { GenerateSplitInvoicesDto } from './dto/generate-split-invoices.dto';
import { CreateAdditionalChargeDto } from './dto/create-additional-charge.dto';

@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR, Role.PLANNER)
  @Post('bookings/:bookingId/invoices')
  createInvoice(
    @Request() req,
    @Param('bookingId') bookingId: string,
    @Body() dto: CreateInvoiceDto,
  ) {
    return this.paymentsService.createInvoice(req.user.userId, bookingId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('bookings/:bookingId/invoices')
  findInvoices(@Request() req, @Param('bookingId') bookingId: string) {
    // works for either side — service checks ownership against whichever role applies
    const as = req.user.role === 'HOST' ? 'host' : 'vendor';
    return this.paymentsService.findInvoicesForBooking(
      req.user.userId,
      bookingId,
      as,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOST)
  @Post('invoices/:invoiceId/pay')
  initiatePayment(@Request() req, @Param('invoiceId') invoiceId: string) {
    return this.paymentsService.initiatePayment(req.user.userId, invoiceId);
  }

  @Post('webhooks/paystack')
  @HttpCode(200)
  async handleWebhook(
    @Req() req: ExpressRequest,
    @Headers('x-paystack-signature') signature: string,
  ) {
    const rawBody = (req as any).rawBody;
    if (
      !rawBody ||
      !this.paymentsService.verifyWebhookSignature(rawBody, signature)
    ) {
      throw new NotFoundException(); // deliberately vague — don't confirm/deny endpoint details to an attacker
    }

    await this.paymentsService.handlePaystackEvent(req.body);
    return { received: true };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR, Role.PLANNER)
  @Post('bookings/:bookingId/invoices/generate-split')
  generateSplit(
    @Request() req,
    @Param('bookingId') bookingId: string,
    @Body() dto: GenerateSplitInvoicesDto,
  ) {
    return this.paymentsService.generateSplitInvoices(
      req.user.userId,
      bookingId,
      dto,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOST)
  @Get('payments/verify/:reference')
  verifyPayment(@Request() req, @Param('reference') reference: string) {
    return this.paymentsService.verifyPayment(req.user.userId, reference);
  }

    @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR, Role.PLANNER)
  @Post('bookings/:bookingId/additional-charges')
  createAdditionalCharge(
    @Request() req,
    @Param('bookingId') bookingId: string,
    @Body() dto: CreateAdditionalChargeDto,
  ) {
    return this.paymentsService.createAdditionalCharge(
      req.user.userId,
      bookingId,
      dto,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR, Role.PLANNER)
  @Delete('bookings/:bookingId/additional-charges/:invoiceId')
  cancelAdditionalCharge(
    @Request() req,
    @Param('bookingId') bookingId: string,
    @Param('invoiceId') invoiceId: string,
  ) {
    return this.paymentsService.cancelAdditionalCharge(
      req.user.userId,
      bookingId,
      invoiceId,
    );
  }
}
