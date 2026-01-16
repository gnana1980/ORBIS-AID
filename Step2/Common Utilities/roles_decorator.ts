import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Roles Decorator
 * Specifies which roles are allowed to access a route
 * Usage: @Roles('NGO_ADMIN', 'PROJECT_MANAGER')
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);