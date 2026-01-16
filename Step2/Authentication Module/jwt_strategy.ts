import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '../../../config/config.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserPayload } from '../../../common/decorators/current-user.decorator';

/**
 * JWT Strategy
 * Validates JWT tokens and extracts user information
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.jwtSecret,
    });
  }

  /**
   * Validate JWT payload and return user information
   * This method is called automatically by Passport after token verification
   */
  async validate(payload: any): Promise<UserPayload> {
    // Find user with role information
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        role: true,
        tenant: {
          select: {
            id: true,
            subdomain: true,
            name: true,
            isActive: true,
            status: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    // Check tenant status for non-super-admin users
    if (!user.isSuperAdmin && user.tenant) {
      if (!user.tenant.isActive) {
        throw new UnauthorizedException('Organization account is inactive');
      }
      if (user.tenant.status === 'SUSPENDED') {
        throw new UnauthorizedException('Organization account is suspended');
      }
      if (user.tenant.status === 'EXPIRED') {
        throw new UnauthorizedException('Organization subscription has expired');
      }
    }

    // Return user payload that will be attached to request.user
    return {
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roleId: user.roleId,
      roleName: user.role.name,
      isSuperAdmin: user.isSuperAdmin,
    };
  }
}