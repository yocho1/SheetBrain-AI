# SheetBrain AI - Complete Deployment Guide

## 🚀 Quick Deploy (5 Minutes)

### Step 1: Deploy Database Schema

**CRITICAL - Do this first or the app won't work!**

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy entire contents of `backend/src/lib/db/schema.sql`
6. Paste into SQL Editor
7. Click **Run** (or press Ctrl+Enter)
8. ✅ Verify: You should see 9 tables created

### Step 2: Deploy Google Apps Script

#### Option A: Copy-Paste (Easiest - 2 minutes)

1. Open [Google Sheets](https://sheets.google.com)
2. Create or open a spreadsheet
3. Go to **Extensions** → **Apps Script**
4. Delete any existing code in `Code.gs`
5. Copy **ALL** content from `apps-script-standalone-enhanced.js`
6. Paste into `Code.gs`
7. Save (Ctrl+S) - Name it "SheetBrain AI"
8. Click **Run** button (play icon) → Select `onOpen` function
9. Click **Review permissions** → Choose your Google account
10. Click **Advanced** → **Go to SheetBrain AI (unsafe)**
11. Click **Allow**
12. ✅ Verify: Go back to your spreadsheet, refresh page, see "SheetBrain AI" menu

#### Option B: Build from Source (For developers)

```bash
cd apps-script
pnpm install
pnpm build
# Deploy manually or use clasp
```

### Step 3: Configure Webhooks

#### Clerk Webhook (User sync)

1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Select your application
3. Click **Webhooks** (left sidebar)
4. Click **Add Endpoint**
5. Enter URL: `https://sheetbrain-ai.vercel.app/api/webhooks/clerk`
6. Select events:
   - `user.created`
   - `user.updated`
   - `user.deleted`
   - `organization.created`
   - `organization.updated`
7. Copy the **Signing Secret**
8. Add to Vercel environment variables:
   - Key: `CLERK_WEBHOOK_SECRET`
   - Value: `whsec_xxxxx...`

#### Stripe Webhook (Payment sync)

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Click **Developers** → **Webhooks**
3. Click **Add endpoint**
4. Enter URL: `https://sheetbrain-ai.vercel.app/api/webhooks/stripe`
5. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
6. Copy the **Signing Secret**
7. Add to Vercel environment variables:
   - Key: `STRIPE_WEBHOOK_SECRET`
   - Value: `whsec_xxxxx...`

### Step 4: Test End-to-End

1. **Test Health Endpoint**

```bash
curl https://sheetbrain-ai.vercel.app/api/health
# Expected: {"status":"ok","timestamp":"..."}
```

2. **Test Authentication**

```powershell
$response = Invoke-RestMethod -Method POST -Uri "https://sheetbrain-ai.vercel.app/api/auth/debug-login" `
  -ContentType "application/json" `
  -Body '{"userId":"test-user","email":"test@example.com","orgId":"test-org","role":"editor"}'
$token = $response.accessToken
Write-Host "Token: $token"
```

3. **Test in Google Sheets**
   - Open your spreadsheet
   - Enter a formula in cell A1: `=SUM(B1:B10)`
   - Select cell A1
   - Click **SheetBrain AI** → **Open Audit Panel**
   - Click **Audit Selected Formulas**
   - ✅ Should see results (not a 500 error)

4. **Test Policy Upload**
   - Click **SheetBrain AI** → **Open Audit Panel**
   - Click **Upload Policy Document**
   - Enter name: "Test Policy"
   - Enter content: "All formulas must use absolute cell references"
   - ✅ Should see success message

5. **Test Billing Info**
   - Click **SheetBrain AI** → **View Billing & Usage**
   - ✅ Should see plan and usage stats

---

## 📋 Feature Checklist

### Backend API Endpoints (15 total)

- ✅ `/api/health` - Health check
- ✅ `/api/auth/debug-login` - JWT generation
- ✅ `/api/auth/login` - User login
- ✅ `/api/auth/logout` - User logout
- ✅ `/api/auth/me` - Get current user
- ✅ `/api/auth/token` - Refresh token
- ✅ `/api/audit` - Formula auditing (OpenRouter + RAG)
- ✅ `/api/ingest` - Policy document upload
- ✅ `/api/policies` - List/create policies
- ✅ `/api/billing` - Get billing info
- ✅ `/api/stripe` - Create checkout session
- ✅ `/api/webhooks/clerk` - Clerk webhook handler
- ✅ `/api/webhooks/stripe` - Stripe webhook handler

### Google Apps Script Features

- ✅ Formula auditing with AI
- ✅ Policy document upload (RAG)
- ✅ Billing & usage display
- ✅ View uploaded policies
- ✅ Apply formula suggestions
- ✅ Settings configuration
- ✅ Enhanced UI (gradient purple theme)

### Infrastructure

- ✅ Backend deployed to Vercel
- ✅ Environment variables configured
- ✅ Database schema (9 tables)
- ⚠️ Database schema deployed to Supabase (DO THIS NOW!)
- ⚠️ Webhooks configured (Clerk + Stripe)
- ✅ Monitoring (Sentry, PostHog, Axiom)

---

## 🔧 Environment Variables

Make sure these are set in Vercel:

### Required

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
CLERK_WEBHOOK_SECRET=whsec_xxxxx

DATABASE_URL=postgresql://postgres:password@host:5432/db

OPENROUTER_API_KEY=sk-or-xxxxx
OPENAI_API_KEY=sk-xxxxx

STRIPE_API_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
```

### Optional (Monitoring)

```
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxx
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
AXIOM_TOKEN=xaat-xxxxx
AXIOM_DATASET=sheetbrain-logs
```

---

## 🐛 Troubleshooting

### Issue: 500 Error on Audit

**Symptom**: Sidebar shows "Audit failed: Backend error (500)"

**Cause**: Database schema not deployed

**Fix**:

1. Copy `backend/src/lib/db/schema.sql`
2. Run in Supabase SQL Editor
3. Verify all 9 tables created:
   - organizations
   - users
   - subscriptions
   - audit_usage
   - rate_limit_buckets
   - policies
   - audit_logs
   - ingestion_logs
   - embeddings

### Issue: "No cells selected"

**Symptom**: Sidebar shows "No cells selected"

**Cause**: No range selected before opening sidebar

**Fix**:

1. Select cells with formulas FIRST
2. Then open the sidebar

### Issue: "Failed to obtain backend token"

**Symptom**: Can't authenticate with backend

**Cause**: Backend not responding or Clerk not configured

**Fix**:

1. Test health endpoint: `curl https://sheetbrain-ai.vercel.app/api/health`
2. Check Vercel deployment logs
3. Verify Clerk API keys in Vercel environment variables

### Issue: Sidebar not loading

**Symptom**: Menu appears but sidebar doesn't open

**Cause**: Authorization not granted

**Fix**:

1. Go to Extensions → Apps Script
2. Run `onOpen` function
3. Grant all permissions
4. Refresh spreadsheet

---

## 📊 Current Status

- **Backend**: ✅ Live at https://sheetbrain-ai.vercel.app
- **Database**: ⚠️ Schema ready but NOT deployed
- **Apps Script**: ✅ Code ready to deploy
- **Webhooks**: ⚠️ Endpoints ready but not configured
- **Testing**: ⚠️ Partial (health + auth work, audit fails)

**Next Critical Step**: Deploy database schema to Supabase!

---

## 🎯 Post-Deployment Testing Checklist

- [ ] Health endpoint returns 200
- [ ] Auth endpoint generates JWT token
- [ ] Database has 9 tables
- [ ] Audit endpoint returns results (not 500 error)
- [ ] Policy upload works
- [ ] Billing info displays correctly
- [ ] Sidebar UI loads with gradient theme
- [ ] Apply suggestion modifies cell formula
- [ ] Webhooks receive events (check logs)
- [ ] Rate limiting prevents abuse (>100 req/min)

---

## 📞 Support

- **GitHub**: https://github.com/yocho1/SheetBrain-AI
- **Backend URL**: https://sheetbrain-ai.vercel.app
- **Issues**: https://github.com/yocho1/SheetBrain-AI/issues

---

**Last Updated**: January 4, 2026
**Version**: 1.0.0
