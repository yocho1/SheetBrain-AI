# DEVELOPMENT GUIDE

## Setup Instructions

### 1. Prerequisites

- Node.js 20+ ([Download](https://nodejs.org))
- Git
- Docker & Docker Compose
- Vercel CLI: `npm install -g vercel`
- Google Cloud Project with Apps Script enabled

### 2. Environment Setup

```bash
# Clone repository
git clone https://github.com/yocho1/SheetBrain-AI.git
cd SheetBrain-AI

# Install dependencies
npm install

# Setup environment variables
cp backend/.env.example backend/.env.local

# Edit .env.local with your credentials
nano backend/.env.local
```

### 3. Required API Keys

#### Anthropic (Claude)
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create API key
3. Add to `.env.local`: `ANTHROPIC_API_KEY=sk-ant-...`

#### OpenAI (Embeddings)
1. Go to [platform.openai.com](https://platform.openai.com)
2. Create API key
3. Add to `.env.local`: `OPENAI_API_KEY=sk-...`

#### Pinecone (Vector DB)
1. Go to [app.pinecone.io](https://app.pinecone.io)
2. Create project and index named "sheetbrain-docs"
3. Add to `.env.local`:
   ```
   PINECONE_API_KEY=pcak-...
   PINECONE_ENVIRONMENT=gcp-starter
   ```

#### Stripe (Billing)
1. Go to [dashboard.stripe.com](https://dashboard.stripe.com)
2. Create API keys
3. Add to `.env.local`:
   ```
   STRIPE_API_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

#### Clerk (Auth)
1. Go to [dashboard.clerk.com](https://dashboard.clerk.com)
2. Create application
3. Add to `.env.local`:
   ```
   CLERK_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   ```

### 4. Database Setup

```bash
# Start PostgreSQL
docker-compose up -d postgres

# Run migrations
npm run db:migrate

# Seed development data (optional)
npm run db:seed
```

### 5. Development Server

```bash
# Terminal 1: Backend API
cd backend
npm run dev

# Terminal 2: Apps Script build
cd apps-script
npm run dev

# Terminal 3: Watch shared types
cd shared
npm run dev
```

Backend will start at http://localhost:3000
Shared types will compile to `dist/`

### 6. Google Workspace Development

#### Setup clasp
```bash
npm install -g @clasp/clasp
clasp login  # Authenticate with Google account
```

#### Create Apps Script project
```bash
cd apps-script
clasp create --type sheets  # Select "Google Sheets" when prompted
```

#### Deploy to development
```bash
npm run build
clasp push
clasp open  # Opens the Apps Script editor
```

## Project Structure Deep Dive

### Backend Architecture

```
backend/
├── src/
│   ├── app/
│   │   └── api/
│   │       ├── audit/route.ts      # POST /api/v1/audit
│   │       ├── ingest/route.ts     # POST /api/v1/ingest
│   │       ├── health/route.ts     # GET /api/health
│   │       └── stripe/route.ts     # POST /api/stripe/webhook
│   │
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── retrieval/          # RAG pipeline
│   │   │   ├── generation/         # LLM responses
│   │   │   └── evaluation/         # Quality checks
│   │   │
│   │   ├── db/index.ts             # Database queries
│   │   ├── auth/
│   │   │   ├── rate-limit.ts       # Redis rate limiting
│   │   │   ├── logging.ts          # Sentry + PostHog
│   │   │   └── middleware.ts       # Auth checks
│   │   │
│   │   ├── stripe/index.ts         # Stripe integration
│   │   └── jobs/inngest.ts         # Background jobs
│   │
│   ├── middleware.ts               # Edge middleware
│   ├── trpc/trpc.ts               # tRPC setup
│   └── types/                     # Type definitions
│
├── public/                        # Static assets
├── .env.local                     # Secrets (git-ignored)
├── .eslintrc.json                # Linting rules
├── next.config.js                # Next.js config
└── tsconfig.json                 # TypeScript config
```

### Apps Script Structure

```
apps-script/
├── src/
│   ├── index.ts                 # Entry point (onOpen, onHomepage)
│   ├── ui/
│   │   ├── sidebar.ts          # Lit component
│   │   └── sidebar.html        # HTML template
│   │
│   ├── auth/
│   │   └── oauth.ts            # OAuth 2.0 flow
│   │
│   ├── services/
│   │   └── api.ts              # API client
│   │
│   └── utils/
│       └── sheet-parser.ts     # Sheet utilities
│
├── appsscript.json             # Manifest
├── clasp.json                  # Clasp config
└── webpack.config.js           # Build config
```

### Shared Types

All types are defined in `shared/types.ts` using Zod:
- API request/response schemas
- Database models
- Audit data structures
- Authentication tokens

## Common Tasks

### Adding a New API Endpoint

```typescript
// backend/src/app/api/v1/new-endpoint/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { logError } from '@/lib/auth/logging';

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    // Validate with Zod schema

    // Process request
    const result = await supabase.from('table').insert(body);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    logError(error as Error, { endpoint: '/api/v1/new-endpoint' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Adding a Database Migration

```bash
# Create migration file
touch backend/migrations/001_create_table.sql

# Edit file with SQL
nano backend/migrations/001_create_table.sql

# Run migrations
npm run db:migrate
```

### Adding a Lit Component

```typescript
// apps-script/src/ui/my-component.ts

import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';

export class MyComponent extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
  `;

  @property({ type: String })
  title = '';

  render() {
    return html`<h2>${this.title}</h2>`;
  }
}

customElements.define('my-component', MyComponent);
```

### Testing

```bash
# Run tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### Linting & Formatting

```bash
# Lint
npm run lint

# Fix automatically
npm run lint -- --fix

# Format code
npm run format
```

## Debugging

### Backend Debugging

```bash
# Start with inspector
NODE_OPTIONS='--inspect' npm run dev:backend

# Open chrome://inspect in Chrome
```

### Apps Script Debugging

1. Open Apps Script editor: `clasp open`
2. Use `console.log()` - view logs in Execution log
3. Set breakpoints in editor

### Database Debugging

```bash
# Connect to local PostgreSQL
psql -h localhost -U postgres -d sheetbrain

# Query examples
SELECT * FROM users;
SELECT * FROM audit_results ORDER BY created_at DESC LIMIT 10;
```

## Performance Tips

1. **Caching**: Use Redis for frequently accessed data
2. **Batch Operations**: Collect requests and process in batches
3. **Lazy Loading**: Load components on demand in Lit
4. **Database Indexes**: Create indexes on commonly filtered columns
5. **Vector Search**: Use appropriate top-k values (5-10 usually optimal)

## Security Checklist

- [ ] Never commit `.env.local` to Git
- [ ] Validate all user input with Zod
- [ ] Use parameterized queries (Supabase handles this)
- [ ] Implement CORS properly in `next.config.js`
- [ ] Rotate API keys regularly
- [ ] Enable 2FA on all external services
- [ ] Review Sentry alerts weekly
- [ ] Audit rate-limiting thresholds

## Deployment

### Preview Deployment (PR)
GitHub Actions automatically creates Vercel preview on PR

### Staging Deployment
```bash
git checkout develop
git pull origin develop
npm run build
vercel deploy --env staging
```

### Production Deployment
Merged PRs to `main` auto-deploy:
- Backend to Vercel (production)
- Apps Script to Google Workspace
- Slack notification sent

## Getting Help

- **Docs**: https://docs.sheetbrain.ai
- **Issues**: https://github.com/yocho1/SheetBrain-AI/issues
- **Discord**: https://discord.gg/sheetbrain
- **Email**: hello@sheetbrain.ai

## Useful Links

- [Next.js Docs](https://nextjs.org/docs)
- [Lit Docs](https://lit.dev)
- [tRPC Docs](https://trpc.io)
- [Google Apps Script Docs](https://developers.google.com/apps-script)
- [Supabase Docs](https://supabase.com/docs)
- [Pinecone Docs](https://docs.pinecone.io)
