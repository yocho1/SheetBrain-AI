# Quick Troubleshooting Guide - SheetBrain AI Auth

## 🚨 Common Issues & Solutions

### Setup & Installation

#### ❌ Problem: "Docker is not installed" when running setup script

**Solution:**
1. Install Docker: https://www.docker.com/products/docker-desktop
2. Verify installation: `docker --version`
3. Re-run setup script

---

#### ❌ Problem: "Permission denied" on setup-auth.sh

**Solution (macOS/Linux):**
```bash
chmod +x scripts/setup-auth.sh
./scripts/setup-auth.sh
```

**Solution (Windows):**
- Use `scripts\setup-auth.bat` instead (no chmod needed)
- Or run in PowerShell as Administrator

---

#### ❌ Problem: pnpm installation fails

**Solution:**
```bash
# Install pnpm globally
npm install -g pnpm

# Verify
pnpm --version

# Try again
pnpm install
```

---

### Database Issues

#### ❌ Problem: "PostgreSQL connection refused"

**Solution:**
1. Check if Docker services are running:
   ```bash
   docker ps | grep postgres
   ```

2. If not running, start them:
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

3. Wait 10 seconds for PostgreSQL to start, then try connecting:
   ```bash
   psql postgresql://postgres:postgres@localhost:5432/sheetbrain
   ```

4. If still fails, restart Docker:
   ```bash
   docker-compose -f docker-compose.dev.yml restart
   ```

---

#### ❌ Problem: "Database 'sheetbrain' does not exist"

**Solution:**
```bash
# Create database manually
createdb -U postgres sheetbrain

# Or run migrations
pnpm --filter backend db:migrate
```

---

#### ❌ Problem: "No such table: users"

**Solution:**
```bash
# Run migrations to create tables
pnpm --filter backend db:migrate

# Verify tables exist
psql postgresql://postgres:postgres@localhost:5432/sheetbrain
\dt  -- Lists all tables
```

---

### Authentication Issues

#### ❌ Problem: "Login returns 400: Missing required field: token"

**Solution:**
- Ensure you're sending token in request body:
  ```bash
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"token": "YOUR_TOKEN_HERE"}'
  ```

- Get a valid token:
  1. Go to Clerk Dashboard
  2. Create a test session
  3. Copy the session JWT
  4. Use it in the above request

---

#### ❌ Problem: "Login returns 401: Invalid token"

**Possible causes & solutions:**

1. **Token is from wrong Clerk environment**
   - Verify CLERK_SECRET_KEY matches token source
   - Check Clerk Dashboard → Settings → API Keys

2. **Token has expired**
   - Get a fresh token from Clerk Dashboard
   - Test tokens are usually short-lived

3. **CLERK_SECRET_KEY not set in .env.local**
   - Edit `backend/.env.local`
   - Add valid `CLERK_SECRET_KEY`
   - Restart dev server: `pnpm dev`

4. **Wrong Clerk credentials entirely**
   - Go to Clerk Dashboard
   - Copy correct Secret Key
   - Update `.env.local`
   - Restart dev server

---

#### ❌ Problem: "POST /api/auth/me returns 401: No authorization token"

**Solution:**
```bash
# Make sure you're sending Bearer token
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"  # ← Must have "Bearer " prefix
```

**Common mistake:**
```bash
# ❌ WRONG - Missing "Bearer "
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: YOUR_ACCESS_TOKEN"

# ✅ RIGHT
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

#### ❌ Problem: "GET /api/auth/me returns 401: Invalid token"

**Solution:**
1. Verify token is not expired (access tokens last 15 minutes)
2. Get a fresh token:
   ```bash
   # Login to get new token
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"token": "YOUR_CLERK_SESSION_TOKEN"}'
   
   # Extract accessToken from response
   # Use it in next request
   ```

3. If refresh token expired, need to re-login

---

#### ❌ Problem: "POST /api/auth/login returns 403: User has no organization"

**Solution:**
1. Go to Clerk Dashboard
2. Find test user
3. Add them to an organization:
   - Click user → Organizations tab
   - Click "Add to organization"
   - Select or create organization
4. Try login again

---

### Webhook Issues

#### ❌ Problem: "Webhook returns 401: Invalid signature"

**Possible causes:**

1. **CLERK_WEBHOOK_SECRET doesn't match**
   - Go to Clerk Dashboard → Webhooks
   - Find your endpoint
   - Copy the exact secret
   - Update CLERK_WEBHOOK_SECRET in `.env.local`
   - Restart server

2. **Webhook signature generation incorrect**
   - Ensure you're using Svix signature format
   - Use Clerk Dashboard to send test events (easier)
   - Or use Svix CLI to sign requests properly

3. **Timestamp too old (> 5 minutes)**
   - Use current timestamp
   - Ensure system clock is synchronized:
     ```bash
     # macOS/Linux
     ntpdate -s time.nist.gov
     
     # Windows (in PowerShell as admin)
     w32tm /resync
     ```

---

#### ❌ Problem: "Webhook events not syncing users to database"

**Solution:**

1. **Verify webhook is registered:**
   - Clerk Dashboard → Webhooks
   - Check endpoint URL is correct
   - Check endpoint is enabled

2. **Send test event:**
   - Click "Webhooks" → Your endpoint
   - Click "Send test event"
   - Select "user.created"
   - Check "Testing" section for response

3. **Check server logs:**
   ```bash
   # If running locally
   pnpm --filter backend dev 2>&1 | grep -i webhook
   ```

4. **Verify database:**
   ```bash
   psql postgresql://postgres:postgres@localhost:5432/sheetbrain
   SELECT * FROM users;  -- Should see synced users
   ```

5. **Check CLERK_WEBHOOK_SECRET:**
   - Regenerate in Clerk Dashboard if needed
   - Update `.env.local`
   - Restart server

---

### Rate Limiting Issues

#### ❌ Problem: "429 Too Many Requests: Rate limit exceeded"

**This is normal!** Rate limiting is working.

**Solutions:**

1. **Wait for limit to reset:**
   - Limits are 100 requests per 60 seconds per user
   - Wait 60 seconds and try again

2. **Modify rate limits (dev only):**
   - Edit `backend/src/lib/auth/rate-limit.ts`
   - Change RATE_LIMIT_REQUESTS or RATE_LIMIT_WINDOW_MS
   - Restart dev server

3. **Verify using different user:**
   - Each user has separate limit
   - Create test user and try again

---

### Performance Issues

#### ❌ Problem: "Login is very slow (> 1 second)"

**Likely causes:**

1. **Clerk API is slow**
   - Check Clerk status: https://status.clerk.dev
   - May be temporary outage

2. **Database is slow**
   ```bash
   # Check database performance
   psql postgresql://postgres:postgres@localhost:5432/sheetbrain
   EXPLAIN ANALYZE SELECT * FROM users WHERE id = 'xxx';
   ```

3. **Network issues**
   - Check internet connection
   - Try from different network

---

#### ❌ Problem: "Token validation is slow (> 100ms)"

**Usually not a problem**, but if needed:

1. **Verify local JWT verification:**
   ```bash
   # JWT verification should be < 10ms locally
   # If slower, check CPU usage and system load
   ```

2. **Move to edge runtime (production):**
   - Vercel edge middleware is faster
   - Only matters at scale

---

### Development Environment Issues

#### ❌ Problem: "Dev server won't start"

**Solution:**

1. **Check for port conflicts:**
   ```bash
   # Is port 3000 already in use?
   lsof -i :3000  # macOS/Linux
   netstat -ano | findstr :3000  # Windows
   
   # Kill process or use different port
   PORT=3001 pnpm dev
   ```

2. **Check environment variables:**
   - Verify `.env.local` exists
   - Verify all required vars are set
   - Check file permissions

3. **Clear Node modules cache:**
   ```bash
   rm -rf node_modules pnpm-lock.yaml
   pnpm install
   pnpm dev
   ```

---

#### ❌ Problem: "Tests are failing"

**Solution:**

1. **Ensure dev server is NOT running:**
   ```bash
   # Kill existing dev server
   pkill -f "next dev"
   
   # Or in Windows Task Manager, find "node" process
   ```

2. **Check test database:**
   ```bash
   # Tests might need separate test database
   psql postgresql://postgres:postgres@localhost:5432/sheetbrain_test
   ```

3. **Run tests with verbose output:**
   ```bash
   pnpm --filter backend test:integration --reporter=verbose
   ```

4. **Check for flaky tests:**
   - Run same test multiple times
   - Some timing issues are environment-dependent

---

### Clerk Configuration Issues

#### ❌ Problem: "CLERK_SECRET_KEY is missing" in production

**Prevention:**

1. **Ensure env var is set:**
   ```bash
   # Verify it's in Vercel environment variables
   vercel env pull
   
   # Or set via dashboard:
   # Vercel → Project → Settings → Environment Variables
   ```

2. **Verify in deployment:**
   ```bash
   # Check Vercel logs
   vercel logs
   ```

---

#### ❌ Problem: "OAuth redirect fails in production"

**Solution:**

1. **Verify Clerk callback URL:**
   - Clerk Dashboard → Settings → Redirects
   - Add production URL: `https://api.sheetbrain.ai/api/auth/login`

2. **Verify CORS settings:**
   - Frontend must be whitelisted
   - Check `middleware.ts` for CORS headers

3. **Check HTTPS:**
   - Production must use HTTPS
   - Verify SSL certificate is valid

---

## 🔍 Debugging Techniques

### See Full Request/Response

```bash
# Add -v flag for verbose output
curl -v -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"token": "..."}'
```

### Check Token Contents

```bash
# Decode JWT token (without verification)
# Use https://jwt.io or:

NODE_OPTIONS="--no-warnings" node -e "
const token = 'eyJhbGc...';
const parts = token.split('.');
console.log('Header:', JSON.parse(Buffer.from(parts[0], 'base64').toString()));
console.log('Payload:', JSON.parse(Buffer.from(parts[1], 'base64').toString()));
"
```

### Check Database

```bash
# Connect to database
psql postgresql://postgres:postgres@localhost:5432/sheetbrain

# View users
SELECT id, email, name, role FROM users;

# View organizations  
SELECT id, name, plan FROM organizations;

# View sessions
SELECT user_id, created_at FROM auth_sessions;

# Count records
SELECT COUNT(*) FROM users;
```

### View Server Logs

```bash
# Show all logs including warnings
pnpm --filter backend dev 2>&1 | head -50

# Filter for errors
pnpm --filter backend dev 2>&1 | grep -i error

# Filter for auth
pnpm --filter backend dev 2>&1 | grep -i auth
```

### Use Postman

1. Import auth collection
2. Set environment variables:
   - `base_url`: http://localhost:3000
   - `access_token`: (leave blank, auto-populate from login)
3. Run requests in order
4. Check response tabs: Body, Headers, Tests

---

## 📋 Pre-Deployment Checklist

Before reporting issues, verify:

- [ ] Docker services running: `docker ps`
- [ ] PostgreSQL accessible: `psql postgresql://...`
- [ ] Dev server starting: `pnpm dev`
- [ ] Sample endpoint responding: `curl http://localhost:3000/api/health`
- [ ] Tests passing: `pnpm test:integration`
- [ ] All env vars set: `cat backend/.env.local`
- [ ] No port conflicts: `lsof -i :3000`

---

## 🆘 When All Else Fails

### Complete Reset

```bash
# 1. Stop everything
docker-compose down -v  # Remove volumes too
pkill -f "next dev"

# 2. Clean Node modules
rm -rf node_modules pnpm-lock.yaml

# 3. Reinstall
pnpm install

# 4. Recreate .env.local
cp backend/.env.example backend/.env.local
# Edit with your Clerk credentials

# 5. Start fresh
docker-compose -f docker-compose.dev.yml up -d
pnpm --filter backend db:migrate
pnpm --filter backend dev
```

### Get Help

1. **Check logs:**
   ```bash
   pnpm dev 2>&1 | tee debug.log
   ```

2. **Look for similar issues:**
   - [Clerk Discord](https://discord.com/invite/b5rXHjAg7b)
   - [GitHub Issues](https://github.com/search)

3. **Create minimal reproduction:**
   - Save curl command that fails
   - Save response
   - Note environment details

4. **Report issue with:**
   - Error message (full text)
   - Debug logs (from above)
   - Steps to reproduce
   - Your environment (OS, Node version, etc.)

---

## 📞 Support Resources

- [Clerk Support](https://clerk.com/support)
- [Clerk Discord Community](https://discord.com/invite/b5rXHjAg7b)
- [GitHub Issues](https://github.com/search)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/clerk)

---

**Last Updated**: January 2024  
**Version**: 1.0
