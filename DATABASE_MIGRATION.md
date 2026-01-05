# Database Migration Guide for SheetBrain AI

## Overview

This guide will help you migrate from in-memory storage to PostgreSQL persistence for:

- User & Organization sync (Clerk → Supabase)
- Subscriptions & billing data
- Policies storage
- Rate limiting buckets
- Audit logs & ingestion logs

## Prerequisites

- Supabase project set up
- DATABASE_URL configured in `.env.local`
- Supabase credentials (URL, anon key, service role key)

## Step 1: Run Database Schema

1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Copy and paste the entire contents of `backend/src/lib/db/schema.sql`
4. Click "Run" to execute the schema

This will create:

- All tables (organizations, users, subscriptions, policies, audit_usage, rate_limit_buckets, audit_logs, ingestion_logs)
- All indexes for performance
- Database functions for atomic operations

## Step 2: Verify Tables Created

Run this query in Supabase SQL Editor to verify:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

You should see:

- audit_logs
- audit_usage
- ingestion_logs
- organizations
- policies
- rate_limit_buckets
- subscriptions
- users

## Step 3: Configure Clerk Webhook

1. Go to Clerk Dashboard → Webhooks
2. Add endpoint: `https://sheetbrain-ai.vercel.app/api/auth/webhook`
   - For local testing: `http://localhost:3000/api/auth/webhook` (use ngrok for webhooks)
3. Subscribe to these events:
   - user.created
   - user.updated
   - user.deleted
   - organization.created
   - organization.updated
   - organization.deleted
   - organizationMembership.created
   - organizationMembership.updated
4. Copy the webhook secret to `.env.local` as `CLERK_WEBHOOK_SECRET`

## Step 4: Test User Sync

Create a test user in Clerk and verify it syncs to Supabase:

```sql
-- Check if users are syncing
SELECT * FROM users ORDER BY created_at DESC LIMIT 5;

-- Check if organizations are syncing
SELECT * FROM organizations ORDER BY created_at DESC LIMIT 5;
```

## Step 5: Test Subscription Management

Make a test API call to create a subscription:

```bash
curl -X POST https://sheetbrain-ai.vercel.app/api/billing \\
  -H "Content-Type: application/json" \\
  -H "x-user-id: your_clerk_user_id" \\
  -H "x-user-org: your_clerk_org_id" \\
  -d '{"plan": "free"}'
```

Verify in Supabase:

```sql
SELECT * FROM subscriptions;
```

## Step 6: Test Policy Storage

Create a test policy:

```bash
curl -X POST https://sheetbrain-ai.vercel.app/api/ingest \\
  -H "Content-Type: application/json" \\
  -H "x-user-id: your_clerk_user_id" \\
  -H "x-user-org: your_clerk_org_id" \\
  -d '{
    "title": "Test Policy",
    "content": "This is a test policy for formula compliance.",
    "department": "IT"
  }'
```

Verify in Supabase:

```sql
SELECT * FROM policies;
SELECT * FROM ingestion_logs;
```

## Step 7: Test Audit with Database Logging

Run an audit:

```bash
curl -X POST https://sheetbrain-ai.vercel.app/api/audit \\
  -H "Content-Type: application/json" \\
  -H "x-user-id: your_clerk_user_id" \\
  -H "x-user-org: your_clerk_org_id" \\
  -d '{
    "formulas": ["=SUM(A1:A10)", "=VLOOKUP(B2, Sheet1!A:B, 2, FALSE)"],
    "context": {
      "sheetName": "Test Sheet",
      "range": "A1:B2"
    }
  }'
```

Verify in Supabase:

```sql
-- Check audit logs
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 5;

-- Check usage tracking
SELECT * FROM audit_usage;

-- Check rate limiting
SELECT * FROM rate_limit_buckets;
```

## Step 8: Monitor and Optimize

### Check Statistics

```sql
-- Get organization stats
SELECT * FROM get_org_stats('org-uuid-here');

-- View usage by month
SELECT
  o.name as organization,
  au.month_year,
  au.count as audits
FROM audit_usage au
JOIN organizations o ON o.id = au.organization_id
ORDER BY au.month_year DESC, o.name;

-- View rate limit status
SELECT
  o.name as organization,
  rl.request_count,
  rl.window_reset_at
FROM rate_limit_buckets rl
JOIN organizations o ON o.id = rl.organization_id;
```

### Cleanup Old Data

```sql
-- Clean up expired rate limits (run periodically)
SELECT cleanup_expired_rate_limits();

-- Archive old audit logs (optional, run monthly)
-- Create an audit_logs_archive table first, then:
INSERT INTO audit_logs_archive
SELECT * FROM audit_logs
WHERE created_at < NOW() - INTERVAL '90 days';

DELETE FROM audit_logs
WHERE created_at < NOW() - INTERVAL '90 days';
```

## Troubleshooting

### Users Not Syncing

- Check Clerk webhook is configured correctly
- Verify webhook secret matches `.env.local`
- Check Supabase logs for errors
- Ensure `organizations` table exists

### Policies Not Saving

- Check organization exists in database
- Verify Supabase service role key has write permissions
- Check `policies` table schema

### Rate Limiting Not Working

- Verify `rate_limit_buckets` table exists
- Check database functions were created
- Ensure organization ID is being passed correctly

### Audit Logs Not Recording

- Check foreign key constraints (organization_id must exist)
- Verify user ID mapping from Clerk to Supabase
- Check database function `increment_audit_usage` exists

## Rollback Plan

If you need to rollback to in-memory storage:

1. Revert code changes using git:

   ```bash
   git checkout HEAD~1 -- backend/src/lib/billing/stripe.ts
   git checkout HEAD~1 -- backend/src/lib/policies/store.ts
   git checkout HEAD~1 -- backend/src/lib/auth/rate-limit.ts
   ```

2. Restart the application

3. Database tables will remain but won't be used

## Performance Tips

1. **Add indexes for your query patterns**

   ```sql
   CREATE INDEX idx_audit_logs_user_created
   ON audit_logs(user_id, created_at DESC);
   ```

2. **Enable connection pooling** in Supabase dashboard

3. **Use database functions** for complex queries instead of multiple API calls

4. **Monitor slow queries** in Supabase dashboard

## Next Steps

- Set up automated backups in Supabase
- Configure row-level security (RLS) policies
- Set up monitoring alerts for database health
- Create admin dashboard to view statistics
- Implement data retention policies

## Support

If you encounter issues:

1. Check Supabase logs in dashboard
2. Review application logs
3. Verify environment variables
4. Test database connectivity
5. Check network/firewall settings
