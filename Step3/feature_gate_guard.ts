import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';

export const FEATURE_KEY = 'feature';

/**
 * Feature decorator - marks routes that require specific features
 * Usage: @Feature('finance')
 */
export const Feature = (feature: string) => {
  const { SetMetadata } = require('@nestjs/common');
  return SetMetadata(FEATURE_KEY, feature);
};

/**
 * Feature Gate Guard
 * Checks if tenant's plan includes the required feature
 */
@Injectable()
export class FeatureGateGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeature = this.reflector.get<string>(
      FEATURE_KEY,
      context.getHandler(),
    );

    if (!requiredFeature) {
      return true; // No feature requirement
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Super admins bypass feature gates
    if (user?.isSuperAdmin) {
      return true;
    }

    if (!user?.tenantId) {
      throw new ForbiddenException('Tenant ID not found');
    }

    // Get tenant's active subscription
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        tenantId: user.tenantId,
        status: { in: ['ACTIVE', 'TRIAL'] },
      },
      include: { plan: true },
    });

    if (!subscription) {
      throw new ForbiddenException('No active subscription found');
    }

    // Check if plan includes the required feature
    const hasFeature = this.checkFeature(subscription.plan, requiredFeature);

    if (!hasFeature) {
      throw new ForbiddenException(
        `This feature is not available in your current plan. Please upgrade to access ${requiredFeature}.`,
      );
    }

    return true;
  }

  /**
   * Check if plan has the required feature
   */
  private checkFeature(plan: any, feature: string): boolean {
    switch (feature) {
      case 'finance':
        return plan.financeEnabled;
      case 'compliance':
        return plan.complianceEnabled;
      case 'api':
        return plan.apiAccess;
      case 'branding':
        return plan.customBranding;
      default:
        return true;
    }
  }
}