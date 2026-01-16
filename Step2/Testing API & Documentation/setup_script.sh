#!/bin/bash

# NGO SaaS Platform - Quick Setup Script
# This script sets up the backend with all STEP 1 & 2 components

echo "🚀 NGO SaaS Platform - Setup Script"
echo "===================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+ first.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js found: $(node -v)${NC}"

# Check if Docker is running (optional)
if command -v docker &> /dev/null; then
    if docker info &> /dev/null; then
        echo -e "${GREEN}✓ Docker is running${NC}"
        USE_DOCKER=true
    else
        echo -e "${YELLOW}⚠ Docker is installed but not running${NC}"
        USE_DOCKER=false
    fi
else
    echo -e "${YELLOW}⚠ Docker not found. Will use local PostgreSQL${NC}"
    USE_DOCKER=false
fi

echo ""
echo "📦 Step 1: Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Dependencies installed${NC}"

echo ""
echo "📝 Step 2: Setting up environment variables..."

if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✓ Created .env file from .env.example${NC}"
        echo -e "${YELLOW}⚠ Please update .env with your configuration${NC}"
    else
        echo -e "${RED}❌ .env.example not found${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi

echo ""
echo "🗄️  Step 3: Setting up database..."

if [ "$USE_DOCKER" = true ]; then
    echo "Starting PostgreSQL with Docker Compose..."
    docker-compose up -d postgres
    
    # Wait for PostgreSQL to be ready
    echo "Waiting for PostgreSQL to be ready..."
    sleep 5
    
    echo -e "${GREEN}✓ PostgreSQL started with Docker${NC}"
else
    echo -e "${YELLOW}⚠ Using local PostgreSQL. Make sure it's running and DATABASE_URL is correct in .env${NC}"
fi

echo ""
echo "🔄 Step 4: Running Prisma migrations..."
npx prisma generate

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to generate Prisma client${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Prisma client generated${NC}"

npx prisma migrate deploy

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to run migrations${NC}"
    echo -e "${YELLOW}💡 Try: npx prisma migrate dev${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Migrations completed${NC}"

echo ""
echo "🌱 Step 5: Seeding database..."
npx prisma db seed

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to seed database${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Database seeded${NC}"

echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo -e "${GREEN}✓ Backend setup completed successfully!${NC}"
echo ""
echo "📋 Default Credentials:"
echo "   Super Admin:"
echo "   - Email: admin@ngosaas.com"
echo "   - Password: SuperAdmin@123"
echo ""
echo "   Demo Tenant:"
echo "   - Email: admin@demo.ngosaas.com"
echo "   - Password: Demo@123"
echo ""
echo "🚀 To start the development server:"
echo "   npm run start:dev"
echo ""
echo "📚 API Documentation:"
echo "   http://localhost:3000/api"
echo ""
echo "🔍 Prisma Studio (Database GUI):"
echo "   npx prisma studio"
echo ""
echo -e "${YELLOW}⚠️  Remember to change default passwords in production!${NC}"