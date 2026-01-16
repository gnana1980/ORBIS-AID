import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Tenant Decorator
 * Extracts tenant information from the request
 * Usage: @Tenant() tenant: { id: string, subdomain: string }
 */
export const Tenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenant;
  },
);

/**
 * TenantId Decorator
 * Extracts only the tenant ID from the request
 * Usage: @TenantId() tenantId: string
 */
export const TenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenant?.id;
  },
);