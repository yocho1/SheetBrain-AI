# SheetBrain AI - Premium Google Sheets Formula Auditing

## Overview

SheetBrain AI is an enterprise-grade Google Sheets add-on that audits spreadsheet formulas against company policies using retrieval-augmented generation (RAG) and AI-powered analysis.

**Key Features:**
- 🤖 AI-powered formula analysis using Claude 3.5 Sonnet
- 🔍 Policy compliance checking with RAG against company documents
- 💡 Intelligent formula suggestions with impact analysis
- 🛡️ Enterprise security (SSO, audit trails, encryption)
- 📊 Real-time performance analytics
- 💳 Usage-based billing via Stripe

## Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- Vercel account (for backend deployment)
- Google Cloud project (for Apps Script)

### Development Setup

```bash
# Clone repository
git clone https://github.com/yocho1/SheetBrain-AI.git
cd SheetBrain-AI

# Install dependencies
npm install

# Start development environment
docker-compose up -d
npm run dev

# In separate terminal - watch builds
npm run build -- --watch
```

### Environment Configuration

```bash
# Copy example environment file
cp backend/.env.example backend/.env.local

# Fill in required credentials:
# - ANTHROPIC_API_KEY (for Claude)
# - OPENAI_API_KEY (for embeddings)
# - PINECONE_API_KEY (for vector search)
# - STRIPE_API_KEY (for billing)
# - CLERK_SECRET_KEY (for auth)
```

## Architecture

### Tech Stack

**Frontend:**
- Google Apps Script (ES6+)
- Lit Web Components
- Tailwind CSS
- Google Workspace Design System

**Backend:**
- Next.js 15 (Edge Runtime)
- TypeScript 5.5+
- tRPC 11 (type-safe APIs)
- Zod (validation)

**AI/ML:**
- Claude 3.5 Sonnet (analysis)
- OpenAI Embeddings (vectors)
- Pinecone (vector DB)
- Supabase + pgvector (hybrid search)

**Infrastructure:**
- Vercel (hosting)
- PostgreSQL 15 (database)
- Redis 7 (caching/rate-limiting)
- Stripe (billing)

## Project Structure

```
sheets-brain-ai/
├── apps-script/          # Google Sheets Add-on
│   ├── src/
│   │   ├── ui/          # Lit Web Components
│   │   ├── services/    # API clients
│   │   ├── auth/        # OAuth flow
│   │   └── utils/       # Sheet parsing
│   ├── appsscript.json  # Manifest
│   └── clasp.json       # Clasp config
│
├── backend/             # Next.js API
│   ├── src/
│   │   ├── app/api/     # Route handlers
│   │   ├── lib/ai/      # RAG pipeline
│   │   ├── middleware.ts # Auth & rate limiting
│   │   └── types/       # TypeScript definitions
│   ├── next.config.js
│   └── .env.example
│
├── shared/              # Shared types
│   └── types.ts         # Zod schemas
│
├── docker-compose.yml
├── .github/workflows/   # CI/CD pipelines
└── README.md
```

## Core Features

### 1. Formula Auditing

Analyzes formulas against company policies:
```
POST /api/v1/audit
{
  "range": "Sheet1!A1:B10",
  "context": {
    "sheetName": "Budget",
    "organization": "ACME Inc",
    "department": "Finance"
  }
}
```

Returns:
- Complexity analysis (low/medium/high)
- Policy compliance status
- Issues found with severity levels
- Actionable suggestions with new formulas
- Confidence scores

### 2. Document Ingestion

Upload company policies to build knowledge base:
```
POST /api/v1/ingest
Content-Type: multipart/form-data

file: <policy_document.pdf>
```

Automatically:
- Extracts text with Unstructured.io
- Creates semantic embeddings
- Stores in vector database (Pinecone)
- Indexes in PostgreSQL for hybrid search

### 3. RAG Retrieval

Multi-stage retrieval with re-ranking:
1. Generate sub-queries for nuanced search
2. Parallel vector search in Pinecone
3. Keyword search in PostgreSQL
4. Cross-encoder re-ranking
5. Context compression

### 4. Billing & Rate Limiting

Metered billing with Stripe:
```typescript
await stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
  quantity: 1,
  timestamp: Math.floor(Date.now() / 1000),
  action: 'increment'
});
```

Rate limits: 100 audits per minute per user
- Enforced via Redis
- Graceful degradation
- Usage tracking for analytics

## Deployment

### Backend (Vercel)

```bash
cd backend
npm run build
vercel deploy --prod
```

### Apps Script (Google Workspace)

```bash
cd apps-script
npm install
npm run build
clasp push
```

### Database (Supabase)

1. Create new Supabase project
2. Run `init.sql` to set up schema
3. Configure pgvector extension
4. Update connection strings

## Security

- **Authentication:** Clerk + Google OAuth
- **Authorization:** Role-based access control (RBAC)
- **Data Protection:** 
  - End-to-end encryption for sensitive data
  - PII detection and redaction
  - GDPR/CCPA compliance by design
- **API Security:**
  - Rate limiting (100 req/min per user)
  - SQL injection prevention (Prisma)
  - XSS/CSRF protection headers
  - JWT tokens (15-minute expiry)

## Monitoring

- **Error Tracking:** Sentry
- **Analytics:** PostHog
- **Logging:** Axiom
- **APM:** Vercel Analytics
- **Performance:** <100ms response time target

## API Documentation

### Authentication
All requests require Bearer token:
```
Authorization: Bearer {jwt_token}
```

### Endpoints

- `POST /api/v1/audit` - Submit formula for audit
- `POST /api/v1/ingest` - Upload policy document
- `POST /api/stripe/webhook` - Stripe events
- `GET /api/health` - Health check

## Development Workflow

```bash
# Feature branch
git checkout -b feature/new-feature

# Make changes
npm run lint --fix
npm run test

# Commit
git add .
git commit -m "feat: new feature"

# Push and create PR
git push origin feature/new-feature
```

Pull requests trigger:
- Automated tests
- Security scans (Semgrep, CodeQL, TruffleHog)
- SonarQube analysis
- Deployment preview on Vercel

## Performance Targets

- ⚡ API response time: <100ms
- 📱 Sidebar load time: <2s
- 🔄 Document ingestion: 500+ pages/min
- 📊 Concurrent users: 10,000+

## Roadmap

### Phase 1 (Week 1-2)
- ✅ Monorepo setup
- ✅ Database schema
- ✅ Auth foundation

### Phase 2 (Week 3-4)
- ⏳ RAG pipeline
- ⏳ Audit API
- ⏳ Billing integration

### Phase 3 (Week 5-6)
- ⏳ GAS sidebar UI
- ⏳ Suggestion engine
- ⏳ Admin dashboard

### Phase 4 (Week 7+)
- ⏳ Security hardening
- ⏳ Performance optimization
- ⏳ Google Marketplace submission

## Contributing

1. Fork repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

## Support

- 📖 [Documentation](https://docs.sheetbrain.ai)
- 🐛 [Issue Tracker](https://github.com/yocho1/SheetBrain-AI/issues)
- 💬 [Discord Community](https://discord.gg/sheetbrain)

## License

Proprietary - All rights reserved

## Contact

- Email: hello@sheetbrain.ai
- Website: https://sheetbrain.ai