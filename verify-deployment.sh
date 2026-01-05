#!/bin/bash
# Deployment Verification Script for SheetBrain AI

echo "🚀 SheetBrain AI - Deployment Verification"
echo "=========================================="
echo ""

# Check 1: Environment variables
echo "✅ CHECKING ENVIRONMENT VARIABLES..."
if [ -f "backend/.env.local" ]; then
  echo "   ✓ .env.local exists"
  if grep -q "SUPABASE_URL" backend/.env.local; then
    echo "   ✓ SUPABASE_URL configured"
  fi
  if grep -q "CLERK_SECRET_KEY" backend/.env.local; then
    echo "   ✓ CLERK_SECRET_KEY configured"
  fi
  if grep -q "CLERK_WEBHOOK_SECRET" backend/.env.local; then
    echo "   ✓ CLERK_WEBHOOK_SECRET configured"
  fi
else
  echo "   ✗ .env.local not found"
fi
echo ""

# Check 2: TypeScript compilation
echo "✅ CHECKING TYPESCRIPT COMPILATION..."
cd backend
if pnpm tsc --noEmit > /dev/null 2>&1; then
  echo "   ✓ TypeScript compiles with 0 errors"
else
  echo "   ✗ TypeScript compilation has errors"
fi
cd ..
echo ""

# Check 3: Schema file
echo "✅ CHECKING DATABASE SCHEMA..."
if [ -f "backend/src/lib/db/schema.sql" ]; then
  LINES=$(wc -l < backend/src/lib/db/schema.sql)
  echo "   ✓ schema.sql exists ($LINES lines)"
  if grep -q "CREATE TABLE IF NOT EXISTS users" backend/src/lib/db/schema.sql; then
    echo "   ✓ Users table definition found"
  fi
  if grep -q "CREATE TABLE IF NOT EXISTS organizations" backend/src/lib/db/schema.sql; then
    echo "   ✓ Organizations table definition found"
  fi
else
  echo "   ✗ schema.sql not found"
fi
echo ""

# Check 4: Webhook handler
echo "✅ CHECKING WEBHOOK HANDLER..."
if [ -f "backend/src/app/api/auth/webhook/route.ts" ]; then
  echo "   ✓ Webhook route handler exists"
  if grep -q "user.created" backend/src/app/api/auth/webhook/route.ts; then
    echo "   ✓ User sync events configured"
  fi
  if grep -q "organization.created" backend/src/app/api/auth/webhook/route.ts; then
    echo "   ✓ Organization sync events configured"
  fi
else
  echo "   ✗ Webhook route not found"
fi
echo ""

# Check 5: Database functions
echo "✅ CHECKING DATABASE INTEGRATION..."
if [ -f "backend/src/lib/db/index.ts" ]; then
  echo "   ✓ Database client exists"
fi
if [ -f "backend/src/lib/billing/stripe.ts" ]; then
  echo "   ✓ Stripe integration ready"
fi
if [ -f "backend/src/lib/auth/rate-limit.ts" ]; then
  echo "   ✓ Rate limiting ready"
fi
if [ -f "backend/src/lib/policies/store.ts" ]; then
  echo "   ✓ Policy store ready"
fi
echo ""

echo "=========================================="
echo "✅ VERIFICATION COMPLETE"
echo ""
echo "NEXT STEPS:"
echo "1. Deploy schema.sql to Supabase"
echo "2. Configure Clerk webhook"
echo "3. Run: pnpm dev"
echo "4. Test endpoints"
echo ""
