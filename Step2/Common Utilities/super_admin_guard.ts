import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

/**
 * Super Admin Guard
 * Ensures only Super Admins can access platform-level routes
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (!user.isSuperAdmin) {
      throw new ForbiddenException('Super Admin access required');
    }

    return true;
  }
}