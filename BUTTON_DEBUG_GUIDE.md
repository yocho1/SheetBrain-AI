# SheetBrain AI - Button Click Debug Guide

## Issue: Buttons Not Working

If clicking "Audit Selected Formulas" or "Upload Policy Document" does nothing, follow these steps:

### Step 1: Check Console for Errors

1. Open your Google Sheet
2. Open **Extensions** → **Apps Script**
3. In the Apps Script editor, click **View** → **Logs** (or press Ctrl+Enter after running)
4. Go back to your sheet and click the buttons
5. Return to Apps Script → **Executions** (clock icon on left sidebar)
6. Look for error messages

### Step 2: Check Browser Console

1. In your Google Sheet, press **F12** (or right-click → Inspect)
2. Go to **Console** tab
3. Click the buttons in the sidebar
4. Look for error messages like:
   - `google.script.run is not defined`
   - `ReferenceError: runAudit is not defined`
   - Permission errors

### Step 3: Verify Permissions

The buttons might not work if Apps Script doesn't have permission:

1. Go to **Extensions** → **Apps Script**
2. Click **Run** (▶️) button → Select `onOpen` function
3. Click **Review permissions**
4. Choose your Google account
5. Click **Advanced** → **Go to SheetBrain AI (unsafe)**
6. Click **Allow**
7. Close Apps Script editor
8. **Refresh** your Google Sheet (F5)
9. The "SheetBrain AI" menu should appear
10. Click **SheetBrain AI** → **Open Audit Panel**
11. Try clicking the buttons again

### Step 4: Verify Functions Exist

In Apps Script editor, check that these functions exist:

```javascript
function onOpen() { ... }
function showSidebar() { ... }
function getAuditResults() { ... }
function getBillingInfo() { ... }
function uploadPolicy(fileName, content) { ... }
```

If any are missing, copy the entire `apps-script-standalone-enhanced.js` file again.

### Step 5: Test Backend Connection

Open PowerShell and test:

```powershell
# Test health endpoint
curl https://sheetbrain-ai.vercel.app/api/health

# Test auth endpoint
$body = @{
    userId = "test-user"
    email = "test@example.com"
    orgId = "test-org"
    role = "editor"
} | ConvertTo-Json

Invoke-RestMethod -Method POST -Uri "https://sheetbrain-ai.vercel.app/api/auth/debug-login" -Body $body -ContentType "application/json"
```

Expected: Should see `{"status":"ok"}` and a JWT token.

### Step 6: Check Database Schema

The 500 error happens when database tables don't exist:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **Table Editor** (left sidebar)
4. Verify these 9 tables exist:
   - ✅ organizations
   - ✅ users
   - ✅ subscriptions
   - ✅ audit_usage
   - ✅ rate_limit_buckets
   - ✅ policies
   - ✅ audit_logs
   - ✅ ingestion_logs
   - ✅ embeddings

If tables are missing:

1. Click **SQL Editor**
2. Copy all content from `backend/src/lib/db/schema.sql`
3. Paste and click **Run**

### Step 7: Manual Button Test

If buttons still don't work, test functions manually:

1. Select a cell with a formula (e.g., `=SUM(A1:A10)`)
2. In Apps Script editor, click **Run** → Select `getAuditResults`
3. Check **Executions** for results
4. Look for errors in the logs

### Common Issues & Fixes

| Issue                  | Symptom                             | Fix                                               |
| ---------------------- | ----------------------------------- | ------------------------------------------------- |
| **Not authorized**     | "Authorization required" popup      | Run `onOpen`, grant permissions                   |
| **500 error**          | "Audit failed: Backend error (500)" | Deploy database schema to Supabase                |
| **No cells selected**  | "No cells selected" message         | Select cells with formulas BEFORE opening sidebar |
| **Buttons greyed out** | Can't click buttons                 | Refresh page, reauthorize permissions             |
| **Loading forever**    | Spinner never stops                 | Check backend is live (curl health endpoint)      |
| **Popup blocked**      | No prompt appears                   | Allow popups for sheets.google.com                |

### Step 8: Enable Detailed Logging

To see what's happening, check the browser console (F12):

You should see:

```
SheetBrain AI script loaded
Window loaded, initializing...
Loading plan info...
Audit button listener attached
Upload button listener attached
All event listeners attached
```

When you click Audit:

```
Audit triggered
Calling getAuditResults...
Audit response: {...}
```

### Step 9: Test with Simple Formula

1. In cell A1, enter: `=1+1`
2. Select cell A1
3. Open **SheetBrain AI** → **Open Audit Panel**
4. Click **Audit Selected Formulas**
5. Should see: "Total Formulas: 1"

### Step 10: Verify Environment Variables

Check Vercel has all required keys:

```bash
CLERK_SECRET_KEY=sk_test_xxxxx
DATABASE_URL=postgresql://...
OPENROUTER_API_KEY=sk-or-xxxxx
OPENAI_API_KEY=sk-xxxxx
STRIPE_API_KEY=sk_test_xxxxx
```

Missing keys → Backend fails → Buttons don't work.

---

## Quick Fix Checklist

- [ ] Copied latest `apps-script-standalone-enhanced.js` to Code.gs
- [ ] Ran `onOpen` function and granted permissions
- [ ] Refreshed Google Sheet (F5)
- [ ] SheetBrain AI menu appears
- [ ] Opened sidebar via menu
- [ ] Selected cells with formulas
- [ ] Checked browser console (F12) for errors
- [ ] Verified backend is live (curl health endpoint)
- [ ] Deployed database schema to Supabase
- [ ] Tested with simple formula (=1+1)

---

## Still Not Working?

1. **Clear cache**: Ctrl+Shift+Delete → Clear browsing data
2. **Try incognito**: Open sheet in incognito/private mode
3. **Different browser**: Test in Chrome if using Firefox
4. **Re-deploy**: Delete Code.gs, paste fresh code, reauthorize
5. **Check status**: https://status.google.com/appstatus (Apps Script issues)

---

## Success Indicators

✅ **Working correctly:**

- Console shows "SheetBrain AI script loaded"
- Console shows "Audit button listener attached"
- Clicking audit shows "Audit triggered"
- Backend returns results (not 500 error)
- Plan info loads: "FREE Plan" or usage stats

❌ **Not working:**

- No console messages when clicking buttons
- "google.script.run is not defined" error
- "Authorization required" popup on every click
- Buttons are greyed out
- Sidebar is blank/white

---

## Contact

If still having issues, check:

- GitHub Issues: https://github.com/yocho1/SheetBrain-AI/issues
- Backend Status: https://sheetbrain-ai.vercel.app/api/health
- Supabase Status: Check project dashboard

**Last Updated**: January 4, 2026
