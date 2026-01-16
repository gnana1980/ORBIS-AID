import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RazorpayService } from './razorpay.service';

/**
 * Payments Service
 * Handles payment processing and webhook events
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private razorpay: RazorpayService,
  ) {}

  /**
   * Handle Razorpay Webhook Events
   * CRITICAL: Always verify webhook signature before processing
   */
  async handleWebhook(payload: any, signature: string) {
    this.logger.log(`Received webhook: ${payload.event}`);

    // Verify webhook signature
    const isValid = this.razorpay.verifyWebhookSignature(
      JSON.stringify(payload),
      signature,
    );

    if (!isValid) {
      this.logger.error('❌ Invalid webhook signature');
      throw new BadRequestException('Invalid webhook signature');
    }

    const event = payload.event;
    const data = payload.payload;

    try {
      switch (event) {
        // Subscription Events
        case 'subscription.activated':
          await this.handleSubscriptionActivated(data.subscription.entity);
          break;

        case 'subscription.charged':
          await this.handleSubscriptionCharged(data.payment.entity, data.subscription.entity);
          break;

        case 'subscription.completed':
          await this.handleSubscriptionCompleted(data.subscription.entity);
          break;

        case 'subscription.cancelled':
          await this.handleSubscriptionCancelled(data.subscription.entity);
          break;

        case 'subscription.paused':
          await this.handleSubscriptionPaused(data.subscription.entity);
          break;

        case 'subscription.resumed':
          await this.handleSubscriptionResumed(data.subscription.entity);
          break;

        // Payment Events
        case 'payment.authorized':
          await this.handlePaymentAuthorized(data.payment.entity);
          break;

        case 'payment.captured':
          await this.handlePaymentCaptured(data.payment.entity);
          break;

        case 'payment.failed':
          await this.handlePaymentFailed(data.payment.entity);
          break;

        // Invoice Events
        case 'invoice.paid':
          await this.handleInvoicePaid(data.invoice.entity);
          break;

        default:
          this.logger.warn(`Unhandled webhook event: ${event}`);
      }

      this.logger.log(`✅ Webhook processed: ${event}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to process webhook: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle subscription activated
   */
  private async handleSubscriptionActivated(subscription: any) {
    this.logger.log(`Subscription activated: ${subscription.id}`);

    await this.prisma.subscription.update({
      where: { razorpaySubscriptionId: subscription.id },
      data: {
        status: 'ACTIVE',
        currentPeriodStart: new Date(subscription.current_start * 1000),
        currentPeriodEnd: new Date(subscription.current_end * 1000),
      },
    });

    // Update tenant status
    const sub = await this.prisma.subscription.findUnique({
      where: { razorpaySubscriptionId: subscription.id },
      select: { tenantId: true },
    });

    if (sub) {
      await this.prisma.tenant.update({
        where: { id: sub.tenantId },
        data: { status: 'ACTIVE' },
      });
    }
  }

  /**
   * Handle subscription charged (payment successful)
   */
  private async handleSubscriptionCharged(payment: any, subscription: any) {
    this.logger.log(`Subscription charged: ${subscription.id}, Payment: ${payment.id}`);

    // Get subscription from database
    const dbSubscription = await this.prisma.subscription.findUnique({
      where: { razorpaySubscriptionId: subscription.id },
      include: { plan: true, tenant: true },
    });

    if (!dbSubscription) {
      this.logger.error(`Subscription not found: ${subscription.id}`);
      return;
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        // Create payment record
        const paymentRecord = await tx.payment.create({
          data: {
            subscriptionId: dbSubscription.id,
            amount: this.razorpay.toRupees(payment.amount),
            currency: payment.currency,
            status: 'SUCCESS',
            razorpayPaymentId: payment.id,
            razorpayOrderId: payment.order_id,
            paymentMethod: payment.method,
            paymentDate: new Date(payment.created_at * 1000),
            metadata: payment,
          },
        });

        // Generate invoice
        const invoiceNumber = await this.generateInvoiceNumber();
        await tx.invoice.create({
          data: {
            subscriptionId: dbSubscription.id,
            paymentId: paymentRecord.id,
            invoiceNumber,
            amount: this.razorpay.toRupees(payment.amount),
            tax: this.razorpay.toRupees(payment.tax || 0),
            total: this.razorpay.toRupees(payment.amount),
            currency: payment.currency,
            status: 'PAID',
            dueDate: new Date(),
            paidAt: new Date(payment.created_at * 1000),
            billingPeriodStart: dbSubscription.currentPeriodStart,
            billingPeriodEnd: dbSubscription.currentPeriodEnd,
          },
        });

        // Update subscription period
        await tx.subscription.update({
          where: { id: dbSubscription.id },
          data: {
            status: 'ACTIVE',
            currentPeriodStart: new Date(subscription.current_start * 1000),
            currentPeriodEnd: new Date(subscription.current_end * 1000),
          },
        });
      });

      this.logger.log(`✅ Payment processed and invoice generated`);

      // TODO: Send email with invoice
    } catch (error) {
      this.logger.error(`Failed to process subscription charge: ${error.message}`);
    }
  }

  /**
   * Handle subscription completed
   */
  private async handleSubscriptionCompleted(subscription: any) {
    this.logger.log(`Subscription completed: ${subscription.id}`);

    await this.prisma.subscription.update({
      where: { razorpaySubscriptionId: subscription.id },
      data: { status: 'EXPIRED' },
    });
  }

  /**
   * Handle subscription cancelled
   */
  private async handleSubscriptionCancelled(subscription: any) {
    this.logger.log(`Subscription cancelled: ${subscription.id}`);

    await this.prisma.subscription.update({
      where: { razorpaySubscriptionId: subscription.id },
      data: {
        status: 'CANCELLED',
        canceledAt: new Date(),
      },
    });

    // Update tenant status
    const sub = await this.prisma.subscription.findUnique({
      where: { razorpaySubscriptionId: subscription.id },
      select: { tenantId: true },
    });

    if (sub) {
      await this.prisma.tenant.update({
        where: { id: sub.tenantId },
        data: { status: 'CANCELLED' },
      });
    }
  }

  /**
   * Handle subscription paused
   */
  private async handleSubscriptionPaused(subscription: any) {
    this.logger.log(`Subscription paused: ${subscription.id}`);
    // Handle pause logic if needed
  }

  /**
   * Handle subscription resumed
   */
  private async handleSubscriptionResumed(subscription: any) {
    this.logger.log(`Subscription resumed: ${subscription.id}`);
    // Handle resume logic
  }

  /**
   * Handle payment authorized
   */
  private async handlePaymentAuthorized(payment: any) {
    this.logger.log(`Payment authorized: ${payment.id}`);
    // Payment is authorized but not captured yet
    // Auto-capture if needed
  }

  /**
   * Handle payment captured
   */
  private async handlePaymentCaptured(payment: any) {
    this.logger.log(`Payment captured: ${payment.id}`);
    // Update payment status to captured
  }

  /**
   * Handle payment failed
   */
  private async handlePaymentFailed(payment: any) {
    this.logger.error(`Payment failed: ${payment.id}`);

    // Find subscription
    const subscription = await this.prisma.subscription.findFirst({
      where: { razorpaySubscriptionId: payment.subscription_id },
    });

    if (subscription) {
      // Create failed payment record
      await this.prisma.payment.create({
        data: {
          subscriptionId: subscription.id,
          amount: this.razorpay.toRupees(payment.amount),
          currency: payment.currency,
          status: 'FAILED',
          razorpayPaymentId: payment.id,
          razorpayOrderId: payment.order_id,
          failureReason: payment.error_description,
          metadata: payment,
        },
      });

      // Update subscription to PAST_DUE
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: 'PAST_DUE' },
      });

      // TODO: Send email notification about failed payment
      // Give 3-day grace period before suspending account
    }
  }

  /**
   * Handle invoice paid
   */
  private async handleInvoicePaid(invoice: any) {
    this.logger.log(`Invoice paid: ${invoice.id}`);
    // Update invoice status if needed
  }

  /**
   * Generate unique invoice number
   */
  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    
    const count = await this.prisma.invoice.count({
      where: {
        createdAt: {
          gte: new Date(`${year}-${month}-01`),
        },
      },
    });

    return `INV-${year}${month}-${String(count + 1).padStart(4, '0')}`;
  }

  /**
   * Get payment history for tenant
   */
  async getPaymentHistory(tenantId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: { in: ['ACTIVE', 'TRIAL', 'PAST_DUE'] },
      },
    });

    if (!subscription) {
      return [];
    }

    return this.prisma.payment.findMany({
      where: { subscriptionId: subscription.id },
      orderBy: { createdAt: 'desc' },
      include: {
        invoice: true,
      },
    });
  }

  /**
   * Get invoices for tenant
   */
  async getInvoices(tenantId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: { in: ['ACTIVE', 'TRIAL', 'PAST_DUE'] },
      },
    });

    if (!subscription) {
      return [];
    }

    return this.prisma.invoice.findMany({
      where: { subscriptionId: subscription.id },
      orderBy: { createdAt: 'desc' },
      include: {
        payment: true,
      },
    });
  }
}