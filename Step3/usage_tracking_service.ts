import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

/**
 * Usage Tracking Service
 * Records and monitors resource usage for each tenant
 */
@Injectable()
export class UsageTrackingService {
  private readonly logger = new Logger(UsageTrackingService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Record usage metric
   */
  async recordUsage(tenantId: string, metricType: string, value: number) {
    try {
      await this.prisma.usageMetric.create({
        data: {
          tenantId,
          metricType,
          value,
          recordedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to record usage: ${error.message}`);
    }
  }

  /**
   * Get current usage for tenant
   */
  async getCurrentUsage(tenantId: string) {
    const [projects, users, beneficiaries, storage] = await Promise.all([
      this.prisma.project.count({
        where: { tenantId, deletedAt: null },
      }),
      this.prisma.user.count({
        where: { tenantId, deletedAt: null },
      }),
      this.prisma.beneficiary.count({
        where: { tenantId, deletedAt: null },
      }),
      this.getStorageUsage(tenantId),
    ]);

    return {
      projects,
      users,
      beneficiaries,
      storage,
    };
  }

  /**
   * Get usage limits from plan
   */
  async getUsageLimits(tenantId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: { in: ['ACTIVE', 'TRIAL'] },
      },
      include: { plan: true },
    });

    if (!subscription) {
      return null;
    }

    return {
      maxProjects: subscription.plan.maxProjects,
      maxUsers: subscription.plan.maxUsers,
      maxBeneficiaries: subscription.plan.maxBeneficiaries,
      maxStorage: subscription.plan.maxStorage,
    };
  }

  /**
   * Check if tenant is within limits
   */
  async checkLimits(tenantId: string) {
    const [usage, limits] = await Promise.all([
      this.getCurrentUsage(tenantId),
      this.getUsageLimits(tenantId),
    ]);

    if (!limits) {
      return { withinLimits: false, message: 'No active subscription' };
    }

    const checks = {
      projects: usage.projects <= limits.maxProjects,
      users: usage.users <= limits.maxUsers,
      beneficiaries: usage.beneficiaries <= limits.maxBeneficiaries,
      storage: usage.storage <= limits.maxStorage,
    };

    const withinLimits = Object.values(checks).every((check) => check);

    return {
      withinLimits,
      usage,
      limits,
      checks,
    };
  }

  /**
   * Get storage usage (placeholder - implement based on your storage)
   */
  private async getStorageUsage(tenantId: string): Promise<number> {
    // TODO: Implement actual storage calculation
    // This would sum up file sizes from your storage service
    return 0;
  }

  /**
   * Daily usage snapshot (cron job)
   * Runs every day at midnight
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async recordDailySnapshots() {
    this.logger.log('Recording daily usage snapshots...');

    try {
      // Get all active tenants
      const tenants = await this.prisma.tenant.findMany({
        where: {
          isActive: true,
          status: { in: ['ACTIVE', 'TRIAL'] },
        },
      });

      for (const tenant of tenants) {
        const usage = await this.getCurrentUsage(tenant.id);

        // Record each metric
        await Promise.all([
          this.recordUsage(tenant.id, 'projects', usage.projects),
          this.recordUsage(tenant.id, 'users', usage.users),
          this.recordUsage(tenant.id, 'beneficiaries', usage.beneficiaries),
          this.recordUsage(tenant.id, 'storage', usage.storage),
        ]);
      }

      this.logger.log(`✅ Recorded usage for ${tenants.length} tenants`);
    } catch (error) {
      this.logger.error(`Failed to record daily snapshots: ${error.message}`);
    }
  }

  /**
   * Check for tenants nearing limits (cron job)
   * Runs every day at 9 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkLimitsAndNotify() {
    this.logger.log('Checking usage limits...');

    try {
      const tenants = await this.prisma.tenant.findMany({
        where: {
          isActive: true,
          status: { in: ['ACTIVE', 'TRIAL'] },
        },
      });

      for (const tenant of tenants) {
        const result = await this.checkLimits(tenant.id);

        // If usage is above 80%, send notification
        if (result.withinLimits && result.usage && result.limits) {
          const projectsPercentage =
            (result.usage.projects / result.limits.maxProjects) * 100;
          const usersPercentage =
            (result.usage.users / result.limits.maxUsers) * 100;

          if (projectsPercentage >= 80 || usersPercentage >= 80) {
            this.logger.warn(
              `Tenant ${tenant.name} is nearing limits: Projects ${projectsPercentage}%, Users ${usersPercentage}%`,
            );
            // TODO: Send email notification
          }
        }

        // If over limits, send warning
        if (!result.withinLimits) {
          this.logger.error(`Tenant ${tenant.name} has exceeded limits`);
          // TODO: Send email warning
        }
      }
    } catch (error) {
      this.logger.error(`Failed to check limits: ${error.message}`);
    }
  }

  /**
   * Get usage history for analytics
   */
  async getUsageHistory(tenantId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.prisma.usageMetric.findMany({
      where: {
        tenantId,
        recordedAt: { gte: startDate },
      },
      orderBy: { recordedAt: 'asc' },
    });
  }
}