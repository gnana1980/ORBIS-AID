import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Prisma Service
 * Manages database connection and provides Prisma Client instance
 * Implements connection lifecycle hooks
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
      ],
    });

    // Log all queries in development
    if (process.env.NODE_ENV === 'development') {
      // @ts-ignore
      this.$on('query', (e) => {
        this.logger.debug(`Query: ${e.query}`);
        this.logger.debug(`Duration: ${e.duration}ms`);
      });
    }
  }

  /**
   * Connect to database when module initializes
   */
  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Database connected successfully');
    } catch (error) {
      this.logger.error('❌ Database connection failed', error);
      throw error;
    }
  }

  /**
   * Disconnect from database when module destroys
   */
  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('Database disconnected');
    } catch (error) {
      this.logger.error('Error disconnecting database', error);
    }
  }

  /**
   * Clean all tables (for testing only!)
   * NEVER use in production
   */
  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production!');
    }

    const models = Reflect.ownKeys(this).filter(
      (key) => key !== '_transactionManager' && !key.toString().startsWith('$')
    );

    return Promise.all(
      models.map((modelKey) => {
        const model = this[modelKey as keyof typeof this];
        if (typeof model === 'object' && model !== null && 'deleteMany' in model) {
          return (model as any).deleteMany();
        }
      })
    );
  }

  /**
   * Enable Row-Level Security for a specific tenant
   * This sets the tenant context for PostgreSQL RLS
   */
  async setTenantContext(tenantId: string) {
    if (tenantId) {
      await this.$executeRaw`SET app.current_tenant_id = ${tenantId}`;
    }
  }

  /**
   * Clear tenant context
   */
  async clearTenantContext() {
    await this.$executeRaw`RESET app.current_tenant_id`;
  }
}