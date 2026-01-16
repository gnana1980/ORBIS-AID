import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Tenant Context Middleware
 * Sets the tenant context in Prisma for Row-Level Security
 * This runs after JWT authentication
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Get user from request (set by JWT strategy)
    const user = (req as any).user;

    if (user && user.tenantId && !user.isSuperAdmin) {
      // Set tenant context for RLS
      await this.prisma.setTenantContext(user.tenantId);
    }

    // Continue to next middleware
    next();

    // Clean up after response
    res.on('finish', async () => {
      if (user && user.tenantId && !user.isSuperAdmin) {
        await this.prisma.clearTenantContext();
      }
    });
  }
}