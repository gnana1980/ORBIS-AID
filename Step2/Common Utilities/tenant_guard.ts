import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Tenant Guard
 * Ensures user has access to the tenant they're trying to access
 * Super Admins bypass this check
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Super Admin can access all tenants
    if (user.isSuperAdmin) {
      return true;
    }

    // Regular users must have a tenant
    if (!user.tenantId) {
      throw new ForbiddenException('User does not belong to any tenant');
    }

    // Verify tenant is active
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { id: true, isActive: true, status: true },
    });

    if (!tenant) {
      throw new ForbiddenException('Tenant not found');
    }

    if (!tenant.isActive) {
      throw new ForbiddenException('Tenant account is inactive');
    }

    if (tenant.status === 'SUSPENDED') {
      throw new ForbiddenException('Tenant account is suspended');
    }

    if (tenant.status === 'EXPIRED') {
      throw new ForbiddenException('Tenant subscription has expired');
    }

    // Attach tenant info to request
    request.tenant = tenant;

    return true;
  }
}