import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Public } from '../../common/decorators/public.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

/**
 * Payments Controller
 * Handles payment operations and webhooks
 */
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  /**
   * Razorpay Webhook Handler
   * POST /payments/webhook
   * 
   * IMPORTANT: This endpoint must be public and accept raw body
   */
  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() payload: any,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    return this.paymentsService.handleWebhook(payload, signature);
  }

  /**
   * Get payment history for tenant
   * GET /payments/history
   */
  @Get('history')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @Roles('NGO_ADMIN', 'FINANCE_MANAGER')
  async getPaymentHistory(@TenantId() tenantId: string) {
    return this.paymentsService.getPaymentHistory(tenantId);
  }

  /**
   * Get invoices for tenant
   * GET /payments/invoices
   */
  @Get('invoices')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @Roles('NGO_ADMIN', 'FINANCE_MANAGER')
  async getInvoices(@TenantId() tenantId: string) {
    return this.paymentsService.getInvoices(tenantId);
  }
}