# 🧪 INTEGRATION TESTING GUIDE

## Overview

This guide walks you through testing the database persistence implementation step-by-step.

---

## Prerequisites

Before testing, you need:

- ✅ Supabase project created
- ✅ Schema deployed (ran schema.sql)
- ✅ Clerk organization created
- ✅ At least one Clerk user created
- ✅ Backend running (local or deployed)

---

## STEP 1: Verify Database Tables Created

### In Supabase SQL Editor, run:

```sql
-- Check if all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

### Expected Result (8 tables):

- [ ] audit_logs
- [ ] audit_usage
- [ ] ingestion_logs
- [ ] organizations
- [ ] policies
- [ ] rate_limit_buckets
- [ ] subscriptions
- [ ] users

### What to do if tables are missing:

- Copy entire [schema.sql](../../backend/src/lib/db/schema.sql) again
- Go to Supabase → SQL Editor
- Paste and run the entire script
- Re-run the verification query above

---

## STEP 2: Test Clerk → Supabase User Sync

### Option A: If you have an existing Clerk user, manually trigger sync

In Supabase SQL Editor, check if user exists:

```sql
SELECT * FROM users LIMIT 5;
```

If empty, continue to Option B.

### Option B: Create a test user in Clerk, then verify sync

1. Go to Clerk Dashboard
2. Click "Users" → "Create new user"
3. Enter email: `test@example.com`
4. Click "Create user"
5. Wait 2-3 seconds for webhook to fire

### Then in Supabase SQL Editor, run:

```sql
-- Check if user synced
SELECT id, clerk_user_id, email, name, organization_id, created_at
FROM users
ORDER BY created_at DESC
LIMIT 1;
```

### Expected Result:

```
id: <UUID>
clerk_user_id: user_xxx
email: test@example.com
name: <name from Clerk>
organization_id: NULL (if not in an org yet)
created_at: <recent timestamp>
```

### Status Checklist:

- [ ] User appears in Supabase users table
- [ ] Clerk user ID correctly mapped
- [ ] Email matches Clerk
- [ ] Timestamp is recent (within last few seconds)

---

## STEP 3: Test Organization Sync

### Create test organization in Clerk

1. Go to Clerk Dashboard → Organizations
2. Click "Create organization"
3. Enter name: `Test Org`
4. Click "Create"
5. Wait 2-3 seconds

### Then in Supabase SQL Editor, run:

```sql
-- Check if organization synced
SELECT id, clerk_org_id, name, slug, created_at
FROM organizations
ORDER BY created_at DESC
LIMIT 1;
```

### Expected Result:

```
id: <UUID>
clerk_org_id: org_xxx
name: Test Org
slug: test-org
created_at: <recent timestamp>
```

### Status Checklist:

- [ ] Organization appears in Supabase
- [ ] Clerk org ID correctly mapped
- [ ] Name matches
- [ ] Timestamp is recent

---

## STEP 4: Test Subscription Management

### Create subscription for organization

```bash
# Get your actual values first:
# ORG_UUID = from step 3 (organizations.id)
# USER_ID = from step 2 (users.clerk_user_id)

curl -X POST https://sheetbrain-ai.vercel.app/api/billing \
  -H "Content-Type: application/json" \
  -H "x-user-id: YOUR_CLERK_USER_ID" \
  -H "x-user-org: YOUR_CLERK_ORG_ID" \
  -d '{"plan": "free"}'
```

### Expected Response:

```json
{
  "plan": "free",
  "status": "active",
  "customerId": "cus_xxx",
  "subscriptionId": null,
  "quotaLimit": 10,
  "usageThisMonth": 0
}
```

### Then verify in Supabase:

```sql
-- Check subscriptions table
SELECT id, organization_id, stripe_customer_id, plan, status, created_at
FROM subscriptions
ORDER BY created_at DESC
LIMIT 1;
```

### Expected Result:

```
plan: free
status: active
created_at: <recent timestamp>
```

### Status Checklist:

- [ ] Subscription created in Supabase
- [ ] Plan is "free"
- [ ] Status is "active"
- [ ] Created timestamp is recent

---

## STEP 5: Test Policy Upload (Ingestion)

### Upload a test policy

```bash
curl -X POST https://sheetbrain-ai.vercel.app/api/ingest \
  -H "Content-Type: application/json" \
  -H "x-user-id: YOUR_CLERK_USER_ID" \
  -H "x-user-org: YOUR_CLERK_ORG_ID" \
  -d '{
    "title": "Test Formula Policy",
    "content": "Never use VOLATILE functions like TODAY() or NOW() in static reports. Always wrap calculations with error handling using IFERROR.",
    "department": "Finance",
    "tags": ["formulas", "best-practices"]
  }'
```

### Expected Response:

```json
{
  "success": true,
  "policy": {
    "id": "uuid",
    "title": "Test Formula Policy",
    "content": "...",
    "createdAt": "2026-01-03T..."
  }
}
```

### Then verify in Supabase:

```sql
-- Check policies
SELECT id, organization_id, title, content, created_at
FROM policies
ORDER BY created_at DESC
LIMIT 1;

-- Check ingestion logs
SELECT id, organization_id, policy_id, document_size, success, created_at
FROM ingestion_logs
ORDER BY created_at DESC
LIMIT 1;
```

### Expected Results:

**Policies table:**

```
title: Test Formula Policy
content: Never use VOLATILE functions...
created_at: <recent timestamp>
```

**Ingestion_logs table:**

```
success: true
document_size: <length of content>
created_at: <recent timestamp>
```

### Status Checklist:

- [ ] Policy appears in policies table
- [ ] Ingestion log created
- [ ] Document size recorded correctly
- [ ] Success = true

---

## STEP 6: Test Audit with Database Logging

### Run an audit

```bash
curl -X POST https://sheetbrain-ai.vercel.app/api/audit \
  -H "Content-Type: application/json" \
  -H "x-user-id: YOUR_CLERK_USER_ID" \
  -H "x-user-org: YOUR_CLERK_ORG_ID" \
  -d '{
    "formulas": [
      "=SUM(A1:A10)",
      "=VLOOKUP(B2, Sheet1!A:B, 2, FALSE)",
      "=IF(ISNUMBER(C5), C5*2, 0)"
    ],
    "context": {
      "sheetName": "Test Sheet",
      "range": "A1:C10",
      "organization": "Test Org"
    }
  }'
```

### Expected Response:

```json
{
  "success": true,
  "audits": [
    {
      "cellAddress": "A1",
      "compliant": true,
      "risk": "low",
      "issues": [],
      "recommendations": [...]
    },
    ...
  ],
  "count": 3,
  "compliant": 3,
  "duration": 1234
}
```

### Then verify in Supabase:

```sql
-- Check audit logs
SELECT id, organization_id, user_id, formula_count, compliant_count, issues_found, duration_ms, created_at
FROM audit_logs
ORDER BY created_at DESC
LIMIT 1;

-- Check usage tracking
SELECT organization_id, month_year, count
FROM audit_usage
ORDER BY created_at DESC
LIMIT 1;

-- Check rate limit buckets
SELECT organization_id, request_count, window_reset_at
FROM rate_limit_buckets
ORDER BY updated_at DESC
LIMIT 1;
```

### Expected Results:

**Audit_logs:**

```
formula_count: 3
compliant_count: 3
issues_found: 0
duration_ms: <positive number>
created_at: <recent timestamp>
```

**Audit_usage:**

```
month_year: 2026-01
count: 1
```

**Rate_limit_buckets:**

```
request_count: 1 (or higher if made multiple requests)
window_reset_at: <future timestamp>
```

### Status Checklist:

- [ ] Audit log created in database
- [ ] Formula count correct (3)
- [ ] Usage recorded in audit_usage
- [ ] Rate limit bucket created/updated
- [ ] Timestamps all recent

---

## STEP 7: Test Rate Limiting

### Make multiple rapid requests

```bash
# Run this 5+ times quickly to exceed the default 100 req/min limit
for i in {1..5}; do
  curl -X POST https://sheetbrain-ai.vercel.app/api/audit \
    -H "Content-Type: application/json" \
    -H "x-user-id: YOUR_CLERK_USER_ID" \
    -H "x-user-org: YOUR_CLERK_ORG_ID" \
    -d '{"formulas": ["=SUM(A1:A10)"], "context": {"sheetName": "Test"}}'
  echo "Request $i"
done
```

### Expected Behavior:

- First requests succeed (status 200)
- After ~100 requests in 60 seconds, get rate limit error (status 429)

### If you get 429, verify in Supabase:

```sql
-- Check rate limit bucket
SELECT organization_id, request_count, window_reset_at
FROM rate_limit_buckets
WHERE window_reset_at > NOW();
```

### Expected Result:

```
request_count: 100+ (or configured limit)
window_reset_at: <time in the future>
```

### Status Checklist:

- [ ] Requests work normally
- [ ] Rate limit bucket tracking requests
- [ ] Window reset time is in the future

---

## STEP 8: Test Webhook Events

### Verify webhook is configured

1. Go to Clerk Dashboard → Webhooks
2. Add endpoint: `https://sheetbrain-ai.vercel.app/api/auth/webhook`
3. Copy webhook secret to `.env.local` as `CLERK_WEBHOOK_SECRET`
4. Subscribe to:
   - user.created
   - user.updated
   - user.deleted
   - organization.created
   - organization.updated
   - organization.deleted
   - organizationMembership.created
   - organizationMembership.updated

### Test webhook delivery

In Clerk Dashboard → Webhooks → click on your endpoint:

- You should see recent deliveries (green checkmarks)
- Click on each to see the payload

### Check Supabase logs

In Supabase Dashboard → Logs:

```
Filter by: api.auth.webhook
Look for: POST /api/auth/webhook
Expected: Status 200 (received)
```

### Status Checklist:

- [ ] Webhook endpoint configured in Clerk
- [ ] Recent deliveries show green checkmarks
- [ ] Supabase logs show 200 responses
- [ ] Users sync when created in Clerk

---

## STEP 9: Query Organization Statistics

### Get full org stats

```sql
-- Use the stats function
SELECT * FROM get_org_stats('YOUR_ORG_UUID'::UUID);
```

Replace `YOUR_ORG_UUID` with the actual UUID from the organizations table.

### Expected Result:

```
total_users: 1+
total_policies: 1+
total_audits: 1+
audits_this_month: 1+
plan: free
subscription_status: active
```

### Status Checklist:

- [ ] Function returns correct counts
- [ ] Audits_this_month matches audit_usage
- [ ] Plan matches subscriptions table

---

## FINAL VERIFICATION CHECKLIST

Complete all tests above and verify:

### Database Layer

- [ ] All 8 tables created
- [ ] All 9 indexes created
- [ ] All 4 functions created

### Data Sync

- [ ] Users sync from Clerk to Supabase
- [ ] Organizations sync from Clerk to Supabase
- [ ] Memberships update user's organization_id

### Billing

- [ ] Subscriptions created and persisted
- [ ] Usage tracked monthly in audit_usage
- [ ] Quota checking works

### Policies

- [ ] Policies saved to database
- [ ] Ingestion logs track uploads
- [ ] Default policies seeded

### Audits

- [ ] Audit logs saved to database
- [ ] All audit data recorded (formulas, issues, duration)
- [ ] RAG usage tracked

### Rate Limiting

- [ ] Rate limit buckets created
- [ ] Requests counted per window
- [ ] 429 response when limit exceeded

### Webhooks

- [ ] Clerk sends webhooks
- [ ] Backend receives and processes
- [ ] Data syncs to Supabase

---

## Troubleshooting

### Issue: Users not syncing from Clerk

**Solution:**

1. Check `.env.local` has `CLERK_WEBHOOK_SECRET` set
2. Verify webhook endpoint in Clerk is correct
3. Check Clerk webhook delivery logs
4. Restart backend
5. Create new user in Clerk to trigger webhook

### Issue: No records in audit_logs

**Solution:**

1. Ensure organization exists in database
2. Check x-user-org header is being sent
3. Verify audit endpoint is being called
4. Check backend logs for errors

### Issue: Rate limiting not working

**Solution:**

1. Verify rate_limit_buckets table exists
2. Check RATE_LIMIT_ENABLED is not 'false'
3. Verify x-user-org header sent with requests
4. Check database function increment_rate_limit exists

### Issue: Database functions not working

**Solution:**

1. Go to Supabase → SQL Editor
2. Run: `SELECT * FROM pg_proc WHERE proname LIKE 'increment%';`
3. If empty, re-run schema.sql
4. Check for SQL syntax errors in functions

---

## Success Criteria

✅ **All tests passed** if you see:

- All tables have data
- Clerk events sync to Supabase automatically
- Audit logs record formula audits
- Rate limiting tracks requests
- Usage is counted monthly

---

## Next Steps After Testing

1. ✅ Verify all tests pass
2. Monitor Supabase dashboard for data
3. Check application logs for errors
4. Set up automated backups in Supabase
5. Configure Row-Level Security (RLS) policies
6. Add monitoring alerts

---

**Ready to test?** Start with Step 1 and work your way through! 🚀
