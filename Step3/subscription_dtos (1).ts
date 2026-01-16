import { IsUUID, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

/**
 * Create Subscription DTO
 */
export class CreateSubscriptionDto {
  @IsUUID()
  @IsNotEmpty({ message: 'Plan ID is required' })
  planId: string;

  @IsBoolean()
  @IsOptional()
  isYearly?: boolean; // false = monthly, true = yearly
}

/**
 * Update Subscription DTO
 */
export class UpdateSubscriptionDto {
  @IsUUID()
  @IsNotEmpty({ message: 'New plan ID is required' })
  newPlanId: string;
}

/**
 * Cancel Subscription DTO
 */
export class CancelSubscriptionDto {
  @IsBoolean()
  @IsOptional()
  cancelAtPeriodEnd?: boolean; // false = cancel immediately, true = cancel at end
}

/**
 * Verify Payment DTO
 */
export class VerifyPaymentDto {
  @IsNotEmpty()
  razorpayPaymentId: string;

  @IsNotEmpty()
  razorpayOrderId: string;

  @IsNotEmpty()
  razorpaySignature: string;
}