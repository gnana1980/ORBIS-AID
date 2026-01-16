import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '../../config/config.service';
import { LoginDto, RegisterDto, RefreshTokenDto, ChangePasswordDto } from './dto/auth.dto';

/**
 * Authentication Service
 * Handles all authentication-related business logic
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Login user and return JWT tokens
   */
  async login(loginDto: LoginDto) {
    this.logger.log(`Login attempt for email: ${loginDto.email}`);

    // Find user with role and tenant
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
      include: {
        role: true,
        tenant: {
          select: {
            id: true,
            name: true,
            subdomain: true,
            isActive: true,
            status: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Your account has been deactivated');
    }

    // Check tenant status for non-super-admin users
    if (!user.isSuperAdmin && user.tenant) {
      if (!user.tenant.isActive) {
        throw new UnauthorizedException('Organization account is inactive');
      }
      if (user.tenant.status === 'SUSPENDED') {
        throw new UnauthorizedException('Organization account is suspended. Please contact support.');
      }
      if (user.tenant.status === 'EXPIRED') {
        throw new UnauthorizedException('Organization subscription has expired. Please renew.');
      }
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Save refresh token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken: tokens.refreshToken,
        lastLoginAt: new Date(),
      },
    });

    this.logger.log(`User ${user.email} logged in successfully`);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role.name,
        isSuperAdmin: user.isSuperAdmin,
        tenant: user.tenant ? {
          id: user.tenant.id,
          name: user.tenant.name,
          subdomain: user.tenant.subdomain,
        } : null,
      },
      ...tokens,
    };
  }

  /**
   * Register new tenant with admin user
   */
  async register(registerDto: RegisterDto) {
    this.logger.log(`Registration attempt for organization: ${registerDto.organizationName}`);

    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Check if subdomain already exists
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { subdomain: registerDto.subdomain },
    });

    if (existingTenant) {
      throw new ConflictException('Subdomain already taken');
    }

    // Validate subdomain format (alphanumeric and hyphens only)
    const subdomainRegex = /^[a-z0-9-]+$/;
    if (!subdomainRegex.test(registerDto.subdomain)) {
      throw new BadRequestException('Subdomain can only contain lowercase letters, numbers, and hyphens');
    }

    // Get default starter plan
    const starterPlan = await this.prisma.plan.findFirst({
      where: { name: 'STARTER' },
    });

    if (!starterPlan) {
      throw new BadRequestException('Default plan not found. Please contact support.');
    }

    // Get NGO_ADMIN role
    const adminRole = await this.prisma.role.findUnique({
      where: { name: 'NGO_ADMIN' },
    });

    if (!adminRole) {
      throw new BadRequestException('Admin role not found. Please contact support.');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(registerDto.password, 10);

    try {
      // Create tenant, subscription, and admin user in a transaction
      const result = await this.prisma.$transaction(async (tx) => {
        // Create tenant
        const tenant = await tx.tenant.create({
          data: {
            name: registerDto.organizationName,
            subdomain: registerDto.subdomain,
            email: registerDto.email,
            phone: registerDto.phone,
            status: 'TRIAL',
            isActive: true,
            trialEndsAt: new Date(Date.now() + this.configService.defaultTrialDays * 24 * 60 * 60 * 1000),
          },
        });

        // Create subscription
        const subscription = await tx.subscription.create({
          data: {
            tenantId: tenant.id,
            planId: starterPlan.id,
            status: 'TRIAL',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + this.configService.defaultTrialDays * 24 * 60 * 60 * 1000),
          },
        });

        // Create admin user
        const user = await tx.user.create({
          data: {
            tenantId: tenant.id,
            email: registerDto.email,
            passwordHash,
            firstName: registerDto.firstName,
            lastName: registerDto.lastName,
            phone: registerDto.phone,
            roleId: adminRole.id,
            isActive: true,
            isSuperAdmin: false,
          },
          include: {
            role: true,
            tenant: true,
          },
        });

        return { tenant, subscription, user };
      });

      this.logger.log(`New tenant registered: ${result.tenant.subdomain}`);

      // Generate tokens for the new user
      const tokens = await this.generateTokens(result.user);

      // Save refresh token
      await this.prisma.user.update({
        where: { id: result.user.id },
        data: { refreshToken: tokens.refreshToken },
      });

      return {
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          role: result.user.role.name,
          isSuperAdmin: false,
          tenant: {
            id: result.tenant.id,
            name: result.tenant.name,
            subdomain: result.tenant.subdomain,
          },
        },
        ...tokens,
      };
    } catch (error) {
      this.logger.error(`Registration failed: ${error.message}`);
      throw new BadRequestException('Registration failed. Please try again.');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refreshTokenDto.refreshToken, {
        secret: this.configService.jwtRefreshSecret,
      });

      // Find user
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: {
          role: true,
          tenant: true,
        },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Verify stored refresh token matches
      if (user.refreshToken !== refreshTokenDto.refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      // Update refresh token
      await this.prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: tokens.refreshToken },
      });

      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Logout user (invalidate refresh token)
   */
  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });

    this.logger.log(`User ${userId} logged out`);

    return { message: 'Logged out successfully' };
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(changePasswordDto.newPassword, 10);

    // Update password and invalidate refresh token
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        refreshToken: null, // Force re-login
      },
    });

    this.logger.log(`User ${userId} changed password`);

    return { message: 'Password changed successfully. Please login again.' };
  }

  /**
   * Generate JWT access and refresh tokens
   */
  private async generateTokens(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roleId: user.roleId,
      roleName: user.role.name,
      isSuperAdmin: user.isSuperAdmin,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.jwtSecret,
        expiresIn: this.configService.jwtExpiration,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.jwtRefreshSecret,
        expiresIn: this.configService.jwtRefreshExpiration,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.configService.jwtExpiration,
    };
  }
}