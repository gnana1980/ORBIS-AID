import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import * as Razorpay from 'razorpay';
import * as crypto from 'crypto';

/**
 * Razorpay Service
 * Handles all Razorpay API interactions
 */
@Injectable()
export class RazorpayService {
  private readonly logger = new Logger(RazorpayService.name);
  private razorpay: Razorpay;

  constructor(private configService: ConfigService) {
    this.razorpay = new Razorpay({
      key_id: this.configService.razorpayKeyId,
      key_secret: this.configService.razorpayKeySecret,
    });

    this.logger.log('✅ Razorpay service initialized');
  }

  /**
   * Create Razorpay Plan
   * Plans are reusable subscription templates
   */
  async createPlan(planData: {
    period: 'monthly' | 'quarterly' | 'yearly';
    interval: number;
    amount: number; // in paise (1 INR = 100 paise)
    currency: string;
    name: string;
    description?: string;
  }) {
    try {
      this.logger.log(`Creating Razorpay plan: ${planData.name}`);

      const plan = await this.razorpay.plans.create({
        period: planData.period,
        interval: planData.interval,
        item: {
          name: planData.name,
          description: planData.description || '',
          amount: planData.amount,
          currency: planData.currency,
        },
      });

      this.logger.log(`✅ Razorpay plan created: ${plan.id}`);
      return plan;
    } catch (error) {
      this.logger.error(`Failed to create Razorpay plan: ${error.message}`);
      throw new BadRequestException('Failed to create payment plan');
    }
  }

  /**
   * Create Razorpay Subscription
   */
  async createSubscription(subscriptionData: {
    planId: string;
    totalCount?: number;
    quantity?: number;
    startAt?: number; // Unix timestamp
    customerNotify?: 0 | 1;
    notes?: Record<string, string>;
    addons?: Array<{ item: { name: string; amount: number; currency: string } }>;
  }) {
    try {
      this.logger.log(`Creating Razorpay subscription for plan: ${subscriptionData.planId}`);

      const subscription = await this.razorpay.subscriptions.create({
        plan_id: subscriptionData.planId,
        total_count: subscriptionData.totalCount || 0, // 0 = unlimited
        quantity: subscriptionData.quantity || 1,
        customer_notify: subscriptionData.customerNotify ?? 1,
        start_at: subscriptionData.startAt,
        notes: subscriptionData.notes,
        addons: subscriptionData.addons,
      });

      this.logger.log(`✅ Razorpay subscription created: ${subscription.id}`);
      return subscription;
    } catch (error) {
      this.logger.error(`Failed to create Razorpay subscription: ${error.message}`);
      throw new BadRequestException('Failed to create subscription');
    }
  }

  /**
   * Fetch Subscription Details
   */
  async fetchSubscription(subscriptionId: string) {
    try {
      const subscription = await this.razorpay.subscriptions.fetch(subscriptionId);
      return subscription;
    } catch (error) {
      this.logger.error(`Failed to fetch subscription: ${error.message}`);
      throw new BadRequestException('Failed to fetch subscription details');
    }
  }

  /**
   * Cancel Subscription
   */
  async cancelSubscription(subscriptionId: string, cancelAtCycleEnd: boolean = false) {
    try {
      this.logger.log(`Cancelling Razorpay subscription: ${subscriptionId}`);

      const subscription = await this.razorpay.subscriptions.cancel(
        subscriptionId,
        cancelAtCycleEnd,
      );

      this.logger.log(`✅ Subscription cancelled: ${subscriptionId}`);
      return subscription;
    } catch (error) {
      this.logger.error(`Failed to cancel subscription: ${error.message}`);
      throw new BadRequestException('Failed to cancel subscription');
    }
  }

  /**
   * Create Payment Order
   * For one-time payments or subscription setup
   */
  async createOrder(orderData: {
    amount: number; // in paise
    currency: string;
    receipt: string;
    notes?: Record<string, string>;
  }) {
    try {
      this.logger.log(`Creating Razorpay order: ${orderData.receipt}`);

      const order = await this.razorpay.orders.create({
        amount: orderData.amount,
        currency: orderData.currency,
        receipt: orderData.receipt,
        notes: orderData.notes,
      });

      this.logger.log(`✅ Razorpay order created: ${order.id}`);
      return order;
    } catch (error) {
      this.logger.error(`Failed to create order: ${error.message}`);
      throw new BadRequestException('Failed to create payment order');
    }
  }

  /**
   * Fetch Payment Details
   */
  async fetchPayment(paymentId: string) {
    try {
      const payment = await this.razorpay.payments.fetch(paymentId);
      return payment;
    } catch (error) {
      this.logger.error(`Failed to fetch payment: ${error.message}`);
      throw new BadRequestException('Failed to fetch payment details');
    }
  }

  /**
   * Capture Payment
   * Required for authorized payments
   */
  async capturePayment(paymentId: string, amount: number, currency: string = 'INR') {
    try {
      this.logger.log(`Capturing payment: ${paymentId}`);

      const payment = await this.razorpay.payments.capture(paymentId, amount, currency);

      this.logger.log(`✅ Payment captured: ${paymentId}`);
      return payment;
    } catch (error) {
      this.logger.error(`Failed to capture payment: ${error.message}`);
      throw new BadRequestException('Failed to capture payment');
    }
  }

  /**
   * Verify Webhook Signature
   * CRITICAL: Always verify webhooks to prevent fraud
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.configService.razorpayWebhookSecret)
        .update(payload)
        .digest('hex');

      return expectedSignature === signature;
    } catch (error) {
      this.logger.error(`Failed to verify webhook signature: ${error.message}`);
      return false;
    }
  }

  /**
   * Verify Payment Signature
   * Used for frontend payment verification
   */
  verifyPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string,
  ): boolean {
    try {
      const text = `${orderId}|${paymentId}`;
      const expectedSignature = crypto
        .createHmac('sha256', this.configService.razorpayKeySecret)
        .update(text)
        .digest('hex');

      return expectedSignature === signature;
    } catch (error) {
      this.logger.error(`Failed to verify payment signature: ${error.message}`);
      return false;
    }
  }

  /**
   * Create Refund
   */
  async createRefund(paymentId: string, amount?: number, notes?: Record<string, string>) {
    try {
      this.logger.log(`Creating refund for payment: ${paymentId}`);

      const refund = await this.razorpay.payments.refund(paymentId, {
        amount,
        notes,
      });

      this.logger.log(`✅ Refund created: ${refund.id}`);
      return refund;
    } catch (error) {
      this.logger.error(`Failed to create refund: ${error.message}`);
      throw new BadRequestException('Failed to process refund');
    }
  }

  /**
   * Get all invoices for a subscription
   */
  async fetchInvoices(subscriptionId: string) {
    try {
      const invoices = await this.razorpay.invoices.all({
        subscription_id: subscriptionId,
      });
      return invoices;
    } catch (error) {
      this.logger.error(`Failed to fetch invoices: ${error.message}`);
      throw new BadRequestException('Failed to fetch invoices');
    }
  }

  /**
   * Convert amount to paise (Razorpay uses smallest currency unit)
   */
  toPaise(amount: number): number {
    return Math.round(amount * 100);
  }

  /**
   * Convert paise to rupees
   */
  toRupees(paise: number): number {
    return paise / 100;
  }
}