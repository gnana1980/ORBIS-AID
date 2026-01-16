import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * CurrentUser Decorator
 * Extracts the current authenticated user from the request
 * Usage: @CurrentUser() user: UserPayload
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

/**
 * User Payload Interface
 * Represents the decoded JWT payload
 */
export interface UserPayload {
  userId: string;
  email: string;
  tenantId: string | null;
  roleId: string;
  roleName: string;
  isSuperAdmin: boolean;
}