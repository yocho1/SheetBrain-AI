# 🚀 DEPLOYMENT CHECKLIST & GUIDE

**Status**: Ready to Deploy  
**Date**: January 3, 2026  
**Target**: Supabase + Clerk Webhook

---

## 📋 3-STEP DEPLOYMENT PROCESS

### ✅ STEP 1: Deploy Database Schema to Supabase (5 minutes)

**What to do:**

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the entire schema from: `backend/src/lib/db/schema.sql`
5. Paste into the SQL editor
6. Click **Run** (or Cmd/Ctrl + Enter)

**Expected output:**

```
Query executed successfully
```

**Verify it worked:**

```sql
-- Run this in SQL Editor to confirm
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

**You should see 8 tables:**

- [ ] audit_logs
- [ ] audit_usage
- [ ] ingestion_logs
- [ ] organizations
- [ ] policies
- [ ] rate_limit_buckets
- [ ] subscriptions
- [ ] users

---

### ✅ STEP 2: Configure Clerk Webhook (3 minutes)

**What to do:**

1. Go to **Clerk Dashboard** → **Webhooks**
2. Click **Add Endpoint**
3. **Endpoint URL**: Enter one of these:
   - Production: `https://sheetbrain-ai.vercel.app/api/auth/webhook`
   - Local testing: Use ngrok tunnel or `http://localhost:3000/api/auth/webhook`
4. **Subscribe to events:**
   - [ ] `user.created`
   - [ ] `user.updated`
   - [ ] `user.deleted`
   - [ ] `organization.created`
   - [ ] `organization.updated`
   - [ ] `organization.deleted`
   - [ ] `organizationMembership.created`
   - [ ] `organizationMembership.updated`
5. Click **Create**
6. Copy the **Signing Secret**
7. **Update `.env.local`:**
   ```
   CLERK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```

**Verify it worked:**

```
✅ Webhook should show in Clerk Dashboard
✅ Signing secret should match .env.local
```

---

### ✅ STEP 3: Verify Setup Works (10 minutes)

**Quick Health Check:**

```bash
# From project root
cd backend
pnpm dev
```

**Test endpoints:**

```bash
# 1. Health check
curl http://localhost:3000/api/health

# Expected response:
# {"status":"ok"}

# 2. Test auth me endpoint
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Monitor webhook:**

1. Go to Clerk Dashboard → **Webhooks**
2. Click your webhook endpoint
3. Look for **Recent Deliveries**
4. Should show successful (✅) webhook calls

---

## 🔧 ENVIRONMENT VARIABLES - ALREADY SET ✅

Your `.env.local` currently has:

```dotenv
# Supabase (required for schema + data)
SUPABASE_URL=https://wndpkjevrarzsvadbhsk.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_publishable_LvyiDFED0p_Or6JS5gopxA_GFN6QijF

# Clerk (required for webhook)
CLERK_SECRET_KEY=sk_test_DIIRJbCsBSh9STHZqYNOJ6r1UYREXp1LZiosHronXJ
CLERK_WEBHOOK_SECRET=whsec_Cjny6oA9i+qEF6ElEajSrx9NG8wN/hKN ✅ ALREADY SET

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sheetbrain

# Stripe (for billing integration)
STRIPE_API_KEY=sk_test_your_stripe_test_key_here
```

**Status**: ✅ All required environment variables are configured

---

## 🎯 DEPLOYMENT SEQUENCE

### Phase 1: Database Setup

```
1. Deploy schema.sql to Supabase
   └─ Creates 8 tables + 9 indexes + 4 functions
2. Verify tables exist
   └─ Run SELECT query in Supabase
```

### Phase 2: Webhook Configuration

```
1. Create webhook in Clerk Dashboard
   └─ Point to https://sheetbrain-ai.vercel.app/api/auth/webhook
2. Subscribe to 8 events
   └─ user.*, organization.*, organizationMembership.*
3. Copy webhook secret to .env.local
   └─ CLERK_WEBHOOK_SECRET=whsec_...
```

### Phase 3: Integration Testing

```
1. Start backend: pnpm dev
2. Create test user in Clerk
3. Verify synced to Supabase users table
4. Create test organization in Clerk
5. Verify synced to Supabase organizations table
6. Run manual integration tests (see INTEGRATION_TESTING.md)
```

---

## 📊 DETAILED DEPLOYMENT STEPS

### STEP 1A: Copy Schema SQL

The schema file is located at:

```
backend/src/lib/db/schema.sql (191 lines)
```

**Content includes:**

- UUID extension enable
- 8 table definitions
- 9 index definitions
- 4 function definitions
- Foreign key constraints
- Cascade delete rules

### STEP 1B: Deploy to Supabase

1. **Open Supabase Dashboard**
   - Go to: https://app.supabase.com
   - Select your project

2. **Navigate to SQL Editor**
   - Left sidebar → SQL Editor
   - Click "New Query"

3. **Paste Schema**
   - Copy entire content of `backend/src/lib/db/schema.sql`
   - Paste into SQL editor

4. **Execute**
   - Click "Run" button (or Cmd/Ctrl + Enter)
   - Wait for success message

5. **Verify Tables**
   ```sql
   -- Copy & paste this into a new SQL query
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
   ORDER BY table_name;
   ```
   Expected: 8 tables listed

### STEP 2A: Create Webhook in Clerk

1. **Open Clerk Dashboard**
   - Go to: https://dashboard.clerk.com
   - Select your project

2. **Navigate to Webhooks**
   - Left sidebar → Webhooks
   - Click "Add Endpoint"

3. **Configure Endpoint**
   - **URL**: `https://sheetbrain-ai.vercel.app/api/auth/webhook`
   - (Local testing: use ngrok or localhost tunnel)

4. **Select Events**
   - Check all 8 events:
     - [ ] user.created
     - [ ] user.updated
     - [ ] user.deleted
     - [ ] organization.created
     - [ ] organization.updated
     - [ ] organization.deleted
     - [ ] organizationMembership.created
     - [ ] organizationMembership.updated

5. **Create Webhook**
   - Click "Create Endpoint"
   - Copy the **Signing Secret**

### STEP 2B: Update Environment Variables

Edit `backend/.env.local`:

```dotenv
# Update this line with the secret from Clerk
CLERK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx
```

**Already configured:**

- ✅ CLERK_SECRET_KEY
- ✅ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
- ✅ SUPABASE_URL
- ✅ SUPABASE_SERVICE_ROLE_KEY

---

## ✅ VERIFICATION CHECKLIST

### After STEP 1 (Schema Deployed)

- [ ] Supabase SQL Editor shows "Query executed successfully"
- [ ] SELECT query returns 8 tables
- [ ] No errors in browser console

### After STEP 2 (Webhook Configured)

- [ ] Clerk Dashboard shows webhook endpoint created
- [ ] Webhook secret copied to .env.local
- [ ] All 8 events are checked in Clerk

### After STEP 3 (Testing)

- [ ] `pnpm dev` starts backend without errors
- [ ] Health check endpoint responds with {"status":"ok"}
- [ ] Clerk webhook shows "Recent Deliveries" with success

---

## 🧪 QUICK INTEGRATION TEST

### Test 1: User Sync

```sql
-- Create a test user in Clerk Dashboard

-- Then check if it synced to Supabase
SELECT * FROM users ORDER BY created_at DESC LIMIT 1;

-- Expected:
-- id: <UUID>
-- clerk_user_id: user_xxx
-- email: <test email>
-- name: <name>
```

### Test 2: Organization Sync

```sql
-- Create a test organization in Clerk Dashboard

-- Then check if it synced to Supabase
SELECT * FROM organizations ORDER BY created_at DESC LIMIT 1;

-- Expected:
-- id: <UUID>
-- clerk_org_id: org_xxx
-- name: <org name>
```

### Test 3: Webhook Health

```bash
# Check webhook delivery logs in Clerk Dashboard
# Should show ✅ success status

# Or test locally with curl:
curl http://localhost:3000/api/health
# Expected: {"status":"ok"}
```

---

## 🚨 TROUBLESHOOTING

### Schema deployment fails

**Problem**: "Table already exists" error
**Solution**:

- The schema uses `CREATE TABLE IF NOT EXISTS`
- This error shouldn't occur
- Try again in a fresh SQL query

### Webhook not receiving events

**Problem**: No events showing in Clerk Dashboard
**Solution**:

1. Verify endpoint URL is correct
2. Verify webhook secret in `.env.local` matches Clerk
3. Check backend logs for errors
4. Use ngrok for local testing: `ngrok http 3000`

### Users not syncing

**Problem**: New Clerk users don't appear in Supabase
**Solution**:

1. Verify webhook is configured with user.created event
2. Check Clerk Dashboard → Webhooks → Recent Deliveries
3. Look for errors in backend logs
4. Run manual sync test

### Database connection fails

**Problem**: "Unable to connect to Supabase"
**Solution**:

1. Verify SUPABASE_URL in .env.local
2. Verify SUPABASE_SERVICE_ROLE_KEY in .env.local
3. Check Supabase project status
4. Test connection: `psql $DATABASE_URL`

---

## 📞 SUPPORT RESOURCES

**Deployment Guide**: [DATABASE_MIGRATION.md](DATABASE_MIGRATION.md)  
**Integration Tests**: [INTEGRATION_TESTING.md](INTEGRATION_TESTING.md)  
**Technical Details**: [DATABASE_PERSISTENCE_COMPLETE.md](DATABASE_PERSISTENCE_COMPLETE.md)  
**Test Results**: [TEST_RESULTS.md](TEST_RESULTS.md)

---

## ⏱️ TIMELINE

| Step | Task                      | Time        | Status     |
| ---- | ------------------------- | ----------- | ---------- |
| 1    | Deploy Schema to Supabase | 5 min       | ⏳ Pending |
| 2    | Configure Clerk Webhook   | 3 min       | ⏳ Pending |
| 3    | Verify Setup              | 5 min       | ⏳ Pending |
| 4    | Run Integration Tests     | 30 min      | ⏳ Pending |
|      | **TOTAL**                 | **~45 min** | ⏳ Ready   |

---

## 🎉 NEXT ACTION

**Ready to deploy?**

1. Open your **Supabase Dashboard**
2. Go to **SQL Editor** → **New Query**
3. Copy the schema from: `backend/src/lib/db/schema.sql`
4. Paste and **Run**
5. Then come back and we'll configure the webhook

**Or**, if you need help with any step, let me know! 👍
