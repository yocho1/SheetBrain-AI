git clone https://github.com/yocho1/SheetBrain-AI.git
docker-compose up -d
git checkout -b feature/new-feature
git add .
git commit -m "feat: new feature"
git push origin feature/new-feature

# SheetBrain AI

AI-assisted formula auditing for Google Sheets, with policy-aware checks and a Lit-based sidebar.

## What’s inside

- Next.js 15 backend (API routes for audit, policies, ingest)
- Clerk auth + JWT helpers (debug login for local/testing)
- OpenRouter + Anthropic SDK for audits
- In-memory policy store with default seeds
- Google Apps Script sidebar (Lit) that calls the audit API

## Repo layout

- `backend/` – Next.js app, APIs, auth, audit logic
- `apps-script/` – Sidebar UI and Apps Script helpers
- `shared/` – Shared types

## Prerequisites

- Node.js 20+
- pnpm 8+
- Vercel account (backend deploy)
- Google account with Apps Script enabled

## Quick start (backend)

```bash
pnpm install
cd backend
cp .env.example .env.local
# Set at least: CLERK_SECRET_KEY, SESSION_SECRET, OPENROUTER_API_KEY
pnpm dev
```

Test the audit API locally:

```bash
pnpm dev  # in one terminal

# new terminal
$jwt = (Invoke-RestMethod -Uri "http://localhost:3000/api/auth/debug-login" -Method Post -Body (@{ userId="test_user"; email="test@sheetbrain.com"; orgId="test_org"; role="editor" } | ConvertTo-Json) -ContentType "application/json").accessToken
$body = @{ range = "A1:B2"; context = @{ sheetName="Sheet1"; range="A1:B2"; organization="Test Corp"; department="Finance"; sheetPurpose="Monthly reconciliation"; data=@{ formulas=@( @("=SUM(A1:A10)", "=IF(B1>100,C1,0)"), @("=VLOOKUP(D1,Sheet2!A:B,2,FALSE)", "" ) ) } } } | ConvertTo-Json -Depth 6
Invoke-RestMethod -Uri "http://localhost:3000/api/audit" -Method Post -Headers @{ Authorization = "Bearer $jwt" } -Body $body -ContentType "application/json" | ConvertTo-Json -Depth 6
```

## Quick start (Apps Script sidebar)

```bash
cd apps-script
pnpm install
pnpm build
# Update backend URL in script properties or default to http://localhost:3000
# Push to your Apps Script project
pnpm clasp push
```

## Deployment (Vercel)

```bash
cd backend
pnpm build
vercel deploy --prod
```

If lint config misbehaves, build still works because lint is skipped during Next.js build (see `next.config.js`).

## Key environment variables

- `CLERK_SECRET_KEY` – Clerk backend key
- `SESSION_SECRET` – JWT signing secret
- `OPENROUTER_API_KEY` – OpenRouter key for audits
- `STRICT_AUDIT` – `true` to require real LLM responses (no mock fallback)

## Notes

- Auth for the sidebar/dev flow uses `/api/auth/debug-login` to mint a JWT quickly.
- Policy store is in-memory; restart resets defaults (seeded on boot).
- Linting is disabled during build to keep deployments unblocked; run lint separately when configs are stable.

## Support

- Issues: https://github.com/yocho1/SheetBrain-AI/issues
- Docs (internal): see `DOCUMENTATION_INDEX.md`
