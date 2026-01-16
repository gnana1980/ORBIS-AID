import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export const USAGE_LIMIT_KEY = 'usageLimit';

/**
 * UsageLimit decorator - checks resource limits
 * Usage: @UsageLimit('projects')
 */
export const UsageLimit = (resource: 'projects' | 'users' | 'beneficiaries') => {
  const { SetMetadata } = require('@nestjs/common');
  return SetMetadata(USAGE_LIMIT_KEY, resource);
};

/**
 * Usage Limit Guard
 * Enforces plan-based usage limits
 */
@Injectable()
export class UsageLimitGuard implements CanActivate {
  private readonly logger = new Logger(UsageLimitGuard.name);

  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const resource = this.reflector.get<string>(
      USAGE_LIMIT_KEY,
      context.getHandler(),
    );

    if (!resource) {
      return true; // No limit check required
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Super admins bypass limits
    if (user?.isSuperAdmin) {
      return true;
    }

    if (!user?.tenantId) {
      throw new ForbiddenException('Tenant ID not found');
    }

    // Get tenant's subscription
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

    // Check usage against limits
    const currentUsage = await this.getCurrentUsage(user.tenantId, resource);
    const limit = this.getLimit(subscription.plan, resource);

    this.logger.debug(`${resource} usage: ${currentUsage}/${limit}`);

    if (currentUsage >= limit) {
      throw new ForbiddenException(
        `You have reached the maximum limit of ${limit} ${resource} for your plan. Please upgrade to add more.`,
      );
    }

    return true;
  }

  /**
   * Get current usage count for resource
   */
  private async getCurrentUsage(
    tenantId: string,
    resource: string,
  ): Promise<number> {
    switch (resource) {
      case 'projects':
        return this.prisma.project.count({
          where: { tenantId, deletedAt: null },
        });
      case 'users':
        return this.prisma.user.count({
          where: { tenantId, deletedAt: null },
        });
      case 'beneficiaries':
        return this.prisma.beneficiary.count({
          where: { tenantId, deletedAt: null },
        });
      default:
        return 0;
    }
  }

  /**
   * Get limit from plan
   */
  private getLimit(plan: any, resource: string): number {
    switch (resource) {
      case 'projects':
        return plan.maxProjects;
      case 'users':
        return plan.maxUsers;
      case 'beneficiaries':
        return plan.maxBeneficiaries;
      default:
        return Infinity;
    }
  }
}