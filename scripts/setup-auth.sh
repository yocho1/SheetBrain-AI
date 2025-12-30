#!/bin/bash

# SheetBrain AI - Authentication Setup Script
# This script sets up the local environment for testing the authentication system

set -e

echo "🚀 SheetBrain AI - Auth Setup Script"
echo "===================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker is installed${NC}"

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker Compose is installed${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js is installed ($(node --version))${NC}"

if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}⚠ pnpm is not installed. Installing...${NC}"
    npm install -g pnpm
fi
echo -e "${GREEN}✓ pnpm is installed ($(pnpm --version))${NC}"

echo ""
echo "📦 Starting Docker services..."

# Start Docker services
if [ ! -f "docker-compose.dev.yml" ]; then
    echo -e "${RED}❌ docker-compose.dev.yml not found${NC}"
    echo "Make sure you're running this script from the workspace root"
    exit 1
fi

docker-compose -f docker-compose.dev.yml up -d

echo -e "${GREEN}✓ Docker services started${NC}"
echo ""

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
    if docker exec sheetbrain-postgres pg_isready -U postgres > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PostgreSQL is ready${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ PostgreSQL failed to start${NC}"
        exit 1
    fi
    sleep 1
done

echo ""
echo "🔧 Setting up environment variables..."

# Create .env.local if it doesn't exist
if [ ! -f "backend/.env.local" ]; then
    echo "Creating backend/.env.local..."
    cp backend/.env.example backend/.env.local
    
    # Generate SESSION_SECRET
    SESSION_SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
    
    # Update .env.local with generated secret
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/SESSION_SECRET=.*/SESSION_SECRET=$SESSION_SECRET/" backend/.env.local
    else
        sed -i "s/SESSION_SECRET=.*/SESSION_SECRET=$SESSION_SECRET/" backend/.env.local
    fi
    
    echo -e "${GREEN}✓ Environment file created${NC}"
    echo ""
    echo "📝 IMPORTANT: Update these values in backend/.env.local:"
    echo "   - CLERK_SECRET_KEY"
    echo "   - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
    echo "   - CLERK_WEBHOOK_SECRET"
    echo ""
else
    echo -e "${GREEN}✓ Environment file already exists${NC}"
fi

echo ""
echo "📚 Installing dependencies..."
pnpm install

echo ""
echo "🗄️  Running database migrations..."
pnpm --filter backend db:migrate

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "📋 Next steps:"
echo "   1. Update CLERK credentials in backend/.env.local"
echo "   2. Start dev server: pnpm --filter backend dev"
echo "   3. Run auth tests: pnpm --filter backend test:integration"
echo "   4. Test login: curl -X POST http://localhost:3000/api/auth/login \\"
echo "                     -H 'Content-Type: application/json' \\"
echo "                     -d '{\"token\": \"YOUR_CLERK_SESSION_TOKEN\"}'"
echo ""
echo "🔗 Useful links:"
echo "   - PostgreSQL: postgresql://postgres:postgres@localhost:5432/sheetbrain"
echo "   - pgAdmin: http://localhost:5050 (admin@pgadmin.org / admin)"
echo "   - Redis: redis-cli -h localhost -p 6379"
echo ""
echo "📖 For more info, see TESTING.md"
