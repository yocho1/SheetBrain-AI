# Authentication Testing Guide

## Overview

This guide covers how to test the SheetBrain AI authentication system locally and in production environments.

## Prerequisites

- Node.js 18+ and npm/pnpm installed
- Docker and Docker Compose for local services (PostgreSQL, Redis)
- Valid Clerk developer account with credentials
- Postman or curl for manual API testing

## Local Setup

### 1. Start Development Services

```bash
# From workspace root
docker-compose -f docker-compose.dev.yml up -d

# Verify services are running
docker ps
```

Expected services:
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- pgAdmin: `http://localhost:5050`

### 2. Environment Variables

Create `backend/.env.local` with test credentials:

```bash
# Copy from template
cp backend/.env.example backend/.env.local

# Update with your test values:
# - CLERK_SECRET_KEY from Clerk Dashboard → API Keys → Secret Key
# - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY from same location
# - CLERK_WEBHOOK_SECRET from Dashboard → Webhooks
# - SESSION_SECRET: Generate with: openssl rand -base64 32
```

### 3. Initialize Database

```bash
# Run migrations
pnpm --filter backend db:migrate

# Seed test data (optional)
pnpm --filter backend db:seed
```

## Running Tests

### Unit Tests (Auth Utilities)

```bash
# Test JWT token generation and verification
pnpm --filter backend test:unit backend/src/lib/auth/jwt.test.ts

# Test Clerk integration
pnpm --filter backend test:unit backend/src/lib/auth/clerk.test.ts

# All unit tests
pnpm --filter backend test:unit
```

### Integration Tests

```bash
# Start dev server in another terminal
pnpm --filter backend dev

# Run integration tests
pnpm --filter backend test:integration backend/__tests__/integration/auth.test.ts

# Watch mode (re-run on changes)
pnpm --filter backend test:integration --watch
```

### End-to-End Tests

```bash
# Requires dev server running and all services up
pnpm --filter backend test:e2e
```

## Manual Testing with cURL

### Test 1: Webhook Event Processing

```bash
# Install webhook testing tool
npm install -g wh-cli

# Or test with curl by generating HMAC signature
# See Svix documentation for proper signature generation

curl -X POST http://localhost:3000/api/auth/webhook \
  -H "Content-Type: application/json" \
  -H "svix-id: msg_test$(date +%s)" \
  -H "svix-timestamp: $(date +%s)" \
  -H "svix-signature: v1,test_signature" \
  -d '{
    "type": "user.created",
    "data": {
      "id": "user_test_001",
      "email_addresses": [{"email_address": "test@example.com"}],
      "first_name": "Test",
      "last_name": "User",
      "profile_image_url": "https://example.com/avatar.jpg"
    }
  }'

# Expected response: { "received": true }
```

### Test 2: Login Flow

```bash
# Step 1: Get Clerk session token
# For testing, use Clerk's testing token from Dashboard
# Or generate a real token via browser OAuth flow

# Step 2: Exchange for API access token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "token": "YOUR_CLERK_SESSION_TOKEN"
  }'

# Expected response:
# {
#   "user": { "id": "...", "email": "...", "organization": {...} },
#   "accessToken": "eyJhbGc...",
#   "refreshToken": "eyJhbGc..."
# }

# Save the accessToken for next requests
export ACCESS_TOKEN="<token_from_response>"
```

### Test 3: Get Current User

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Expected response:
# {
#   "user": {
#     "id": "...",
#     "email": "test@example.com",
#     "name": "Test User",
#     "role": "member",
#     "organization": {
#       "id": "...",
#       "name": "Test Organization",
#       "plan": "pro",
#       "members": 1
#     },
#     "createdAt": "2024-01-15T10:30:00Z"
#   }
# }
```

### Test 4: Token Refresh

```bash
# Get refresh token from login response
export REFRESH_TOKEN="<token_from_login_response>"

curl -X POST http://localhost:3000/api/auth/token \
  -H "Content-Type: application/json" \
  -d "{
    \"refreshToken\": \"$REFRESH_TOKEN\"
  }"

# Expected response:
# { "accessToken": "eyJhbGc..." }

# Update ACCESS_TOKEN for subsequent requests
export ACCESS_TOKEN="<new_token>"
```

### Test 5: Logout

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Content-Type: application/json"

# Expected response:
# { "message": "Successfully logged out" }

# Verify token no longer works (optional)
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Response: 401 Unauthorized (after session TTL)
```

### Test 6: Protected Route Access

```bash
# Without token (should fail)
curl -X POST http://localhost:3000/api/v1/audit \
  -H "Content-Type: application/json" \
  -d '{"range": "A1:B10"}'

# Response: 401 Unauthorized

# With token (should work)
curl -X POST http://localhost:3000/api/v1/audit \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "range": "A1:B10",
    "context": {
      "sheetPurpose": "Financial Analysis"
    }
  }'

# Response: 200 with audit results
```

## Testing with Postman

### Import Collection

1. Open Postman
2. Create new collection: "SheetBrain AI Auth"
3. Add requests:

#### Request 1: POST /api/auth/login

```
URL: http://localhost:3000/api/auth/login
Method: POST
Headers:
  Content-Type: application/json
Body (JSON):
{
  "token": "{{clerk_session_token}}"
}

Tests:
pm.test("Login successful", function () {
  pm.response.to.have.status(200);
  pm.environment.set("access_token", pm.response.json().accessToken);
  pm.environment.set("refresh_token", pm.response.json().refreshToken);
});
```

#### Request 2: GET /api/auth/me

```
URL: http://localhost:3000/api/auth/me
Method: GET
Headers:
  Authorization: Bearer {{access_token}}

Tests:
pm.test("Get current user", function () {
  pm.response.to.have.status(200);
  pm.expect(pm.response.json().user).to.have.property("email");
  pm.expect(pm.response.json().user).to.have.property("organization");
});
```

#### Request 3: POST /api/auth/token

```
URL: http://localhost:3000/api/auth/token
Method: POST
Headers:
  Content-Type: application/json
Body (JSON):
{
  "refreshToken": "{{refresh_token}}"
}

Tests:
pm.test("Token refresh", function () {
  pm.response.to.have.status(200);
  pm.environment.set("access_token", pm.response.json().accessToken);
});
```

#### Request 4: POST /api/auth/logout

```
URL: http://localhost:3000/api/auth/logout
Method: POST

Tests:
pm.test("Logout successful", function () {
  pm.response.to.have.status(200);
});
```

## Testing Clerk Webhooks Locally

### Method 1: Use Clerk Dashboard Testing

1. Go to Clerk Dashboard → Webhooks
2. Find your endpoint
3. Click "Testing" or "Send Test Event"
4. Select event type (user.created, organization.created, etc.)
5. Review response in logs

### Method 2: Use Svix CLI (Recommended)

```bash
# Install Svix CLI
brew install svix-cli

# Create local tunnel
svix listen http://localhost:3000/api/auth/webhook

# This gives you a public URL for testing
# Use that URL in Clerk webhook configuration for testing

# Or send test events:
svix message create \
  --event-type user.created \
  --api-url http://localhost:3000/api/auth/webhook \
  --sample
```

## Debugging

### Check Logs

```bash
# Dev server logs
pnpm --filter backend dev 2>&1 | grep -A5 "auth"

# Check specific endpoint
curl -v http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### Database Inspection

```bash
# Connect to PostgreSQL
psql postgresql://postgres:postgres@localhost:5432/sheetbrain

# Check users table
SELECT id, email, name, role FROM users LIMIT 10;

# Check organizations
SELECT id, name, plan FROM organizations LIMIT 10;

# Check auth tokens
SELECT user_id, token_type, created_at FROM auth_sessions LIMIT 5;
```

### JWT Token Inspection

```bash
# Decode JWT token (without verification)
# Use jwt.io or:
node -e "console.log(JSON.parse(Buffer.from('$ACCESS_TOKEN'.split('.')[1], 'base64').toString()))"

# Verify signature is valid
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-Debug-Token: true"
```

## Common Issues & Solutions

### Issue: 401 Invalid Token

**Cause**: Token expired or invalid signature

**Solution**:
```bash
# Get new token
curl -X POST http://localhost:3000/api/auth/token \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}"

# Or re-login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$CLERK_SESSION_TOKEN\"}"
```

### Issue: 404 User Not Found After Webhook

**Cause**: Webhook event not received or Clerk sync failed

**Solution**:
```bash
# Check database
psql postgresql://postgres:postgres@localhost:5432/sheetbrain
SELECT * FROM users WHERE id = 'user_test_001';

# Check Clerk integration logs
grep -i "clerk" ~/.pm2/logs/*.log

# Retry webhook manually (see section above)
```

### Issue: Cookie Not Being Set

**Cause**: Secure flag, domain/path mismatch, or development environment

**Solution**:
```bash
# Check response headers
curl -v http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"...\"}

# Look for Set-Cookie header
# In development (localhost), secure flag is optional
# In production, ensure HTTPS and matching domain
```

### Issue: Webhook Signature Invalid

**Cause**: Incorrect CLERK_WEBHOOK_SECRET or timestamp too old

**Solution**:
1. Verify CLERK_WEBHOOK_SECRET matches Webhook secret in Clerk Dashboard
2. Ensure system clock is synchronized (`ntpdate -s time.nist.gov`)
3. Use fresh timestamps (within 5 minutes of server time)

## Production Testing

### Pre-Deployment Checklist

- [ ] All unit tests passing: `pnpm test:unit`
- [ ] All integration tests passing: `pnpm test:integration`
- [ ] No console errors in dev server
- [ ] Environment variables set in production
- [ ] Clerk webhook secret configured in Clerk Dashboard
- [ ] Database migrations run: `pnpm db:migrate`
- [ ] Rate limiting tested (should allow 100 req/min)
- [ ] Token refresh tested (15 min expiry)
- [ ] Cookie security tested (httpOnly, secure, sameSite)

### Production Testing Endpoints

```bash
# Health check
curl https://api.sheetbrain.ai/health

# Login
curl -X POST https://api.sheetbrain.ai/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$CLERK_SESSION_TOKEN\"}"

# Get user
curl -X GET https://api.sheetbrain.ai/api/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

## Performance Testing

### Load Test Authentication Endpoints

```bash
# Install k6
brew install k6

# Run load test
k6 run --vus 10 --duration 30s --summary-export results.json \
  __tests__/load/auth.test.js
```

See [load testing guide](./LOAD_TESTING.md) for details.

## Additional Resources

- [Clerk Documentation](https://clerk.com/docs)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8949)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
