import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

/**
 * Custom Configuration Service
 * Provides type-safe access to environment variables
 */
@Injectable()
export class ConfigService {
  constructor(private configService: NestConfigService) {}

  // Application
  get nodeEnv(): string {
    return this.configService.get<string>('NODE_ENV', 'development');
  }

  get port(): number {
    return this.configService.get<number>('PORT', 3000);
  }

  get appName(): string {
    return this.configService.get<string>('APP_NAME', 'NGO SaaS Platform');
  }

  get appUrl(): string {
    return this.configService.get<string>('APP_URL', 'http://localhost:3000');
  }

  get frontendUrl(): string {
    return this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
  }

  // Database
  get databaseUrl(): string {
    return this.configService.get<string>('DATABASE_URL');
  }

  // JWT
  get jwtSecret(): string {
    return this.configService.get<string>('JWT_SECRET');
  }

  get jwtRefreshSecret(): string {
    return this.configService.get<string>('JWT_REFRESH_SECRET');
  }

  get jwtExpiration(): string {
    return this.configService.get<string>('JWT_EXPIRATION', '15m');
  }

  get jwtRefreshExpiration(): string {
    return this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d');
  }

  // Razorpay
  get razorpayKeyId(): string {
    return this.configService.get<string>('RAZORPAY_KEY_ID');
  }

  get razorpayKeySecret(): string {
    return this.configService.get<string>('RAZORPAY_KEY_SECRET');
  }

  get razorpayWebhookSecret(): string {
    return this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET');
  }

  // Email
  get smtpHost(): string {
    return this.configService.get<string>('SMTP_HOST');
  }

  get smtpPort(): number {
    return this.configService.get<number>('SMTP_PORT', 587);
  }

  get smtpUser(): string {
    return this.configService.get<string>('SMTP_USER');
  }

  get smtpPassword(): string {
    return this.configService.get<string>('SMTP_PASSWORD');
  }

  get emailFrom(): string {
    return this.configService.get<string>('EMAIL_FROM');
  }

  // Storage
  get storageType(): string {
    return this.configService.get<string>('STORAGE_TYPE', 'local');
  }

  get storagePath(): string {
    return this.configService.get<string>('STORAGE_PATH', './uploads');
  }

  get maxFileSize(): number {
    return this.configService.get<number>('MAX_FILE_SIZE', 10485760); // 10MB
  }

  // Redis
  get redisHost(): string {
    return this.configService.get<string>('REDIS_HOST', 'localhost');
  }

  get redisPort(): number {
    return this.configService.get<number>('REDIS_PORT', 6379);
  }

  get redisPassword(): string {
    return this.configService.get<string>('REDIS_PASSWORD', '');
  }

  // CORS
  get corsOrigin(): string[] {
    const origins = this.configService.get<string>('CORS_ORIGIN', '');
    return origins.split(',').map(origin => origin.trim());
  }

  // Compliance
  get financialYearStartMonth(): number {
    return this.configService.get<number>('FINANCIAL_YEAR_START_MONTH', 4); // April
  }

  get defaultCurrency(): string {
    return this.configService.get<string>('DEFAULT_CURRENCY', 'INR');
  }

  // Trial
  get defaultTrialDays(): number {
    return this.configService.get<number>('DEFAULT_TRIAL_DAYS', 14);
  }

  // Super Admin
  get superAdminEmail(): string {
    return this.configService.get<string>('SUPER_ADMIN_EMAIL', 'admin@ngosaas.com');
  }

  get superAdminPassword(): string {
    return this.configService.get<string>('SUPER_ADMIN_PASSWORD', 'ChangeThisPassword123!');
  }

  // Feature Flags
  get enableEmailVerification(): boolean {
    return this.configService.get<string>('ENABLE_EMAIL_VERIFICATION', 'true') === 'true';
  }

  get enableAuditLogging(): boolean {
    return this.configService.get<string>('ENABLE_AUDIT_LOGGING', 'true') === 'true';
  }

  // Helper method to check if in production
  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }
}