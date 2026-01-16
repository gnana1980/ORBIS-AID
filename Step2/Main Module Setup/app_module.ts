import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { TenantGuard } from './common/guards/tenant.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { TenantContextMiddleware } from './common/middleware/tenant-context.middleware';

/**
 * Root Application Module
 * Configures global modules, guards, and middleware
 */
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    AuthModule,
    // Add more modules here as we build them
  ],
  controllers: [],
  providers: [
    // Global Guards (applied to all routes)
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // Require authentication by default
    },
    {
      provide: APP_GUARD,
      useClass: TenantGuard, // Enforce tenant isolation
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard, // Check role permissions
    },
  ],
})
export class AppModule implements NestModule {
  /**
   * Configure middleware
   */
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantContextMiddleware)
      .forRoutes('*'); // Apply to all routes
  }
}