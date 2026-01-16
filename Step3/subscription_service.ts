import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RazorpayService } from '../payments/razorpay.service';
import { ConfigService } from '../../config/config.service';
import { CreateSubscriptionDto, UpdateSubscriptionDto, CancelSubscriptionDto } from './dto/subscription.dto';

/**
 * Subscriptions Service
 * Handles subscription lifecycle management
 */
@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private prisma: PrismaService,
    private razorpay: RazorpayService,
    private config: ConfigService,
  ) {}

  /**
   * Create new subscription
   */
  async create(tenantId: string, createDto: CreateSubscriptionDto) {
    this.logger.log(`Creating subscription for tenant: ${tenantId}`);

    // Get tenant
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { subscriptions: { where: { status: { in: ['ACTIVE', 'TRIAL'] } } } },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Check if tenant already has active subscription
    if (tenant.subscriptions.length > 0) {
      throw new BadRequestException('Tenant already has an active subscription');
    }

    // Get plan details
    const plan = await this.prisma.plan.findUnique({
      where: { id: createDto.planId },
    });

    if (!plan || !plan.isActive) {
      throw new NotFoundException('Plan not found or inactive');
    }

    // Calculate amount based on interval
    const isYearly = createDto.isYearly || plan.interval === 'YEARLY';
    let amount = plan.price;
    let interval: 'MONTHLY' | 'YEARLY' | 'QUARTERLY' = plan.interval;

    if (isYearly && plan.interval === 'MONTHLY') {
      amount = plan.price * 10; // 2 months free for yearly
      interval = 'YEARLY';
    }

    // If free plan, create subscription directly without payment
    if (amount === 0) {
      return this.createFreeSubscription(tenantId, plan.id);
    }

    try {
      // Create Razorpay plan if not exists
      const razorpayPlanId = await this.getOrCreateRazorpayPlan(plan, interval);

      // Create Razorpay subscription
      const razorpaySubscription = await this.razorpay.createSubscription({
        planId: razorpayPlanId,
        totalCount: 0, // Unlimited renewals
        customerNotify: 1,
        notes: {
          tenantId: tenant.id,
          tenantName: tenant.name,
          planName: plan.name,
        },
      });

      // Save subscription in database
      const subscription = await this.prisma.subscription.create({
        data: {
          tenantId: tenant.id,
          planId: plan.id,
          status: 'ACTIVE',
          razorpaySubscriptionId: razorpaySubscription.id,
          currentPeriodStart: new Date(),
          currentPeriodEnd: this.calculatePeriodEnd(interval),
        },
        include: { plan: true },
      });

      // Update tenant status
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          status: 'ACTIVE',
          trialEndsAt: null,
        },
      });

      this.logger.log(`✅ Subscription created: ${subscription.id}`);

      return {
        subscription,
        paymentLink: razorpaySubscription.short_url,
        razorpaySubscriptionId: razorpaySubscription.id,
      };
    } catch (error) {
      this.logger.error(`Failed to create subscription: ${error.message}`);
      throw new BadRequestException('Failed to create subscription');
    }
  }

  /**
   * Create free subscription (no payment required)
   */
  private async createFreeSubscription(tenantId: string, planId: string) {
    const subscription = await this.prisma.subscription.create({
      data: {
        tenantId,
        planId,
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      },
      include: { plan: true },
    });

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        status: 'ACTIVE',
        trialEndsAt: null,
      },
    });

    return { subscription, paymentLink: null };
  }

  /**
   * Get current subscription for tenant
   */
  async getCurrentSubscription(tenantId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: { in: ['ACTIVE', 'TRIAL', 'PAST_DUE'] },
      },
      include: {
        plan: true,
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }

    // Check if trial has expired
    if (subscription.status === 'TRIAL') {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { trialEndsAt: true },
      });

      if (tenant?.trialEndsAt && new Date() > tenant.trialEndsAt) {
        await this.expireSubscription(subscription.id);
        throw new ForbiddenException('Trial period has expired. Please upgrade to continue.');
      }
    }

    return subscription;
  }

  /**
   * Upgrade/Downgrade subscription
   */
  async updateSubscription(tenantId: string, updateDto: UpdateSubscriptionDto) {
    this.logger.log(`Updating subscription for tenant: ${tenantId}`);

    // Get current subscription
    const currentSubscription = await this.getCurrentSubscription(tenantId);

    // Get new plan
    const newPlan = await this.prisma.plan.findUnique({
      where: { id: updateDto.newPlanId },
    });

    if (!newPlan || !newPlan.isActive) {
      throw new NotFoundException('New plan not found or inactive');
    }

    // Check if same plan
    if (currentSubscription.planId === newPlan.id) {
      throw new BadRequestException('Already subscribed to this plan');
    }

    try {
      // Cancel current Razorpay subscription
      if (currentSubscription.razorpaySubscriptionId) {
        await this.razorpay.cancelSubscription(
          currentSubscription.razorpaySubscriptionId,
          false, // Cancel immediately
        );
      }

      // Create new subscription
      const interval = newPlan.interval;
      const razorpayPlanId = await this.getOrCreateRazorpayPlan(newPlan, interval);

      const razorpaySubscription = await this.razorpay.createSubscription({
        planId: razorpayPlanId,
        totalCount: 0,
        customerNotify: 1,
        notes: {
          tenantId,
          planName: newPlan.name,
          upgradeFrom: currentSubscription.plan.name,
        },
      });

      // Update subscription in database
      const updatedSubscription = await this.prisma.subscription.update({
        where: { id: currentSubscription.id },
        data: {
          planId: newPlan.id,
          razorpaySubscriptionId: razorpaySubscription.id,
          currentPeriodStart: new Date(),
          currentPeriodEnd: this.calculatePeriodEnd(interval),
          status: 'ACTIVE',
        },
        include: { plan: true },
      });

      this.logger.log(`✅ Subscription updated: ${updatedSubscription.id}`);

      return {
        subscription: updatedSubscription,
        paymentLink: razorpaySubscription.short_url,
      };
    } catch (error) {
      this.logger.error(`Failed to update subscription: ${error.message}`);
      throw new BadRequestException('Failed to update subscription');
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(tenantId: string, cancelDto: CancelSubscriptionDto) {
    this.logger.log(`Cancelling subscription for tenant: ${tenantId}`);

    const subscription = await this.getCurrentSubscription(tenantId);

    try {
      // Cancel in Razorpay
      if (subscription.razorpaySubscriptionId) {
        await this.razorpay.cancelSubscription(
          subscription.razorpaySubscriptionId,
          cancelDto.cancelAtPeriodEnd || false,
        );
      }

      // Update subscription status
      const canceledAt = new Date();
      const cancelAt = cancelDto.cancelAtPeriodEnd
        ? subscription.currentPeriodEnd
        : canceledAt;

      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'CANCELLED',
          canceledAt,
          cancelAt,
        },
      });

      // Update tenant status if immediate cancellation
      if (!cancelDto.cancelAtPeriodEnd) {
        await this.prisma.tenant.update({
          where: { id: tenantId },
          data: { status: 'CANCELLED' },
        });
      }

      this.logger.log(`✅ Subscription cancelled: ${subscription.id}`);

      return {
        message: cancelDto.cancelAtPeriodEnd
          ? 'Subscription will be cancelled at the end of current period'
          : 'Subscription cancelled immediately',
        cancelAt,
      };
    } catch (error) {
      this.logger.error(`Failed to cancel subscription: ${error.message}`);
      throw new BadRequestException('Failed to cancel subscription');
    }
  }

  /**
   * Handle subscription expiration
   */
  async expireSubscription(subscriptionId: string) {
    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status: 'EXPIRED' },
    });

    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      select: { tenantId: true },
    });

    if (subscription) {
      await this.prisma.tenant.update({
        where: { id: subscription.tenantId },
        data: { status: 'EXPIRED' },
      });
    }
  }

  /**
   * Get or create Razorpay plan
   */
  private async getOrCreateRazorpayPlan(
    plan: any,
    interval: 'MONTHLY' | 'YEARLY' | 'QUARTERLY',
  ): Promise<string> {
    // In production, you might want to cache Razorpay plan IDs
    const period = interval === 'MONTHLY' ? 'monthly' : 'yearly';
    const intervalCount = interval === 'QUARTERLY' ? 3 : 1;

    const razorpayPlan = await this.razorpay.createPlan({
      period: period as 'monthly' | 'yearly',
      interval: intervalCount,
      amount: this.razorpay.toPaise(parseFloat(plan.price.toString())),
      currency: plan.currency,
      name: `${plan.displayName} - ${interval}`,
      description: plan.description,
    });

    return razorpayPlan.id;
  }

  /**
   * Calculate period end date based on interval
   */
  private calculatePeriodEnd(interval: 'MONTHLY' | 'YEARLY' | 'QUARTERLY'): Date {
    const now = new Date();
    switch (interval) {
      case 'MONTHLY':
        return new Date(now.setMonth(now.getMonth() + 1));
      case 'QUARTERLY':
        return new Date(now.setMonth(now.getMonth() + 3));
      case 'YEARLY':
        return new Date(now.setFullYear(now.getFullYear() + 1));
      default:
        return new Date(now.setMonth(now.getMonth() + 1));
    }
  }
}