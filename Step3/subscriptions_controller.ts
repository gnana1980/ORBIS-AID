import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto, UpdateSubscriptionDto, CancelSubscriptionDto } from './dto/subscription.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';

/**
 * Subscriptions Controller
 * Manages subscription operations for NGO tenants
 */
@Controller('subscriptions')
@UseGuards(JwtAuthGuard, TenantGuard)
export class SubscriptionsController {
  constructor(private subscriptionsService: SubscriptionsService) {}

  /**
   * Get current subscription
   * GET /subscriptions/current
   */
  @Get('current')
  @Roles('NGO_ADMIN')
  async getCurrentSubscription(@TenantId() tenantId: string) {
    return this.subscriptionsService.getCurrentSubscription(tenantId);
  }

  /**
   * Create new subscription
   * POST /subscriptions
   */
  @Post()
  @Roles('NGO_ADMIN')
  @HttpCode(HttpStatus.CREATED)
  async createSubscription(
    @TenantId() tenantId: string,
    @Body() createDto: CreateSubscriptionDto,
  ) {
    return this.subscriptionsService.create(tenantId, createDto);
  }

  /**
   * Update subscription (upgrade/downgrade)
   * PUT /subscriptions
   */
  @Put()
  @Roles('NGO_ADMIN')
  @HttpCode(HttpStatus.OK)
  async updateSubscription(
    @TenantId() tenantId: string,
    @Body() updateDto: UpdateSubscriptionDto,
  ) {
    return this.subscriptionsService.updateSubscription(tenantId, updateDto);
  }

  /**
   * Cancel subscription
   * POST /subscriptions/cancel
   */
  @Post('cancel')
  @Roles('NGO_ADMIN')
  @HttpCode(HttpStatus.OK)
  async cancelSubscription(
    @TenantId() tenantId: string,
    @Body() cancelDto: CancelSubscriptionDto,
  ) {
    return this.subscriptionsService.cancelSubscription(tenantId, cancelDto);
  }
}