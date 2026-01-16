# =====================================================
# APPLICATION CONFIGURATION
# =====================================================
NODE_ENV=development
PORT=3000
APP_NAME="NGO SaaS Platform"
APP_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173

# =====================================================
# DATABASE CONFIGURATION
# =====================================================
DATABASE_URL="postgresql://username:password@localhost:5432/ngo_saas_db?schema=public"

# =====================================================
# JWT CONFIGURATION
# =====================================================
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# =====================================================
# RAZORPAY CONFIGURATION (India)
# =====================================================
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret

# =====================================================
# EMAIL CONFIGURATION (SMTP)
# =====================================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password
EMAIL_FROM=noreply@ngosaas.com
EMAIL_FROM_NAME="NGO SaaS Platform"

# =====================================================
# FILE STORAGE CONFIGURATION
# =====================================================
STORAGE_TYPE=local # local, s3, gcs, azure
STORAGE_PATH=./uploads
MAX_FILE_SIZE=10485760 # 10MB in bytes

# AWS S3 (if using S3)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=ap-south-1
AWS_S3_BUCKET=

# =====================================================
# REDIS CONFIGURATION (Optional - for caching)
# =====================================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# =====================================================
# RATE LIMITING
# =====================================================
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100

# =====================================================
# CORS CONFIGURATION
# =====================================================
CORS_ORIGIN=http://localhost:5173,http://localhost:3000

# =====================================================
# LOGGING
# =====================================================
LOG_LEVEL=debug # error, warn, info, debug
LOG_FORMAT=json # json, pretty

# =====================================================
# SUPER ADMIN CONFIGURATION
# =====================================================
SUPER_ADMIN_EMAIL=admin@ngosaas.com
SUPER_ADMIN_PASSWORD=ChangeThisPassword123!
SUPER_ADMIN_FIRST_NAME=Super
SUPER_ADMIN_LAST_NAME=Admin

# =====================================================
# COMPLIANCE & FINANCIAL
# =====================================================
FINANCIAL_YEAR_START_MONTH=4 # April (1-12)
DEFAULT_CURRENCY=INR
SUPPORTED_CURRENCIES=INR,USD,EUR

# =====================================================
# TRIAL CONFIGURATION
# =====================================================
DEFAULT_TRIAL_DAYS=14
TRIAL_REMINDER_DAYS=3 # Days before trial ends to send reminder

# =====================================================
# FEATURE FLAGS
# =====================================================
ENABLE_EMAIL_VERIFICATION=true
ENABLE_TWO_FACTOR_AUTH=false
ENABLE_API_ACCESS=false

# =====================================================
# WEBHOOK ENDPOINTS
# =====================================================
RAZORPAY_WEBHOOK_URL=/api/webhooks/razorpay

# =====================================================
# PDF GENERATION
# =====================================================
PDF_GENERATOR=puppeteer # puppeteer, pdfkit

# =====================================================
# AUDIT & SECURITY
# =====================================================
ENABLE_AUDIT_LOGGING=true
PASSWORD_MIN_LENGTH=8
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_LOWERCASE=true
PASSWORD_REQUIRE_NUMBER=true
PASSWORD_REQUIRE_SPECIAL=true
SESSION_TIMEOUT=3600 # seconds

# =====================================================
# NOTIFICATION PREFERENCES
# =====================================================
ENABLE_EMAIL_NOTIFICATIONS=true
ENABLE_SMS_NOTIFICATIONS=false
ENABLE_PUSH_NOTIFICATIONS=false

# =====================================================
# BACKUP & MAINTENANCE
# =====================================================
BACKUP_ENABLED=true
BACKUP_SCHEDULE="0 2 * * *" # Daily at 2 AM
BACKUP_RETENTION_DAYS=30