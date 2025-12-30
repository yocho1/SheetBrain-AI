# OpenRouter Integration Guide

## Overview

SheetBrain now uses **OpenRouter** as the primary LLM provider. OpenRouter gives you access to 100+ models (Claude, GPT-4, Llama, Mistral, etc.) with:

- **Unified API** — one endpoint for all models
- **Cost-effective** — model arbitrage and fallback options
- **Fast switching** — change models without code changes
- **Transparent pricing** — pay-per-token, no subscriptions

## Setup

### 1. Get OpenRouter API Key

- Go to [openrouter.ai](https://openrouter.ai)
- Sign up / Log in
- Copy your API key from the dashboard

### 2. Set Environment Variables

Add to `backend/.env.local`:

```env
OPENROUTER_API_KEY=sk-or-YOUR_API_KEY_HERE
LLM_PROVIDER=openrouter
```

### 3. Restart Backend

```bash
cd backend
pnpm dev
```

## Available Models

### Fast & Cheap (Recommended for SheetBrain)

```
- anthropic/claude-3.5-haiku      (ultra-fast, low cost)
- anthropic/claude-3.5-sonnet     (balanced, default)
- openai/gpt-4o-mini              (small, fast)
```

### High Quality

```
- anthropic/claude-3-opus         (most powerful Claude)
- openai/gpt-4-turbo              (high reasoning)
- openai/gpt-4o                   (latest GPT-4)
```

### Open Source (No Proprietary Keys Needed)

```
- meta-llama/llama-3-70b-instruct (very capable)
- mistralai/mistral-large         (fast, good)
```

## Usage in Code

### Audit Formulas

```typescript
import { auditFormulas } from '@/lib/llm/openrouter';

const results = await auditFormulas({
  formulas: ['=SUM(A1:A10)', '=IF(B1>100,A1,0)'],
  policies: 'No complex nested IFs. Use SUMIF for conditional sums.',
  context: 'Finance department, quarterly reports',
});

// Returns: Array<{ formula, compliant, risk, issues, recommendations }>
```

### Analyze Documents

```typescript
import { analyzeDocument } from '@/lib/llm/openrouter';

const analysis = await analyzeDocument(
  'Document content here...',
  'Company policy on data handling'
);
```

### Generate Recommendations

```typescript
import { generateRecommendations } from '@/lib/llm/openrouter';

const suggestion = await generateRecommendations(
  '=SUMPRODUCT((A:A>100)*(B:B="target"))',
  'No array formulas using entire columns',
  'Formula references entire columns which may impact performance'
);
```

## Switching Models

Edit `backend/src/lib/llm/openrouter.ts`:

```typescript
// Change DEFAULT_MODEL
const DEFAULT_MODEL = MODELS.CLAUDE_3_5_HAIKU; // Fast & cheap
// or
const DEFAULT_MODEL = MODELS.GPT_4O; // Latest OpenAI
// or
const DEFAULT_MODEL = MODELS.LLAMA_3_70B; // Open source
```

No other code changes needed!

## API Endpoints Using OpenRouter

### POST /api/audit

Audits formulas using OpenRouter + RAG:

```bash
curl -X POST http://localhost:3000/api/audit \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "range": "A1:B10",
    "context": {
      "organization": "Acme Corp",
      "department": "Finance",
      "sheetPurpose": "Monthly budget reconciliation"
    }
  }'
```

Response:

```json
{
  "success": true,
  "audits": [
    {
      "formula": "=SUM(A1:A10)",
      "compliant": true,
      "risk": "low",
      "issues": [],
      "recommendations": []
    }
  ],
  "count": 1,
  "compliant": 1,
  "timestamp": "2025-12-29T15:00:00Z",
  "duration": 250
}
```

### POST /api/ingest

Ingests policy documents and analyzes them with OpenRouter:

```bash
curl -X POST http://localhost:3000/api/ingest \
  -H "Authorization: Bearer $JWT" \
  -F "file=@policy.pdf" \
  -F "department=Finance" \
  -F "tags=[\"compliance\",\"mandatory\"]"
```

## Cost Estimation

### Per-Formula Audit (Claude 3.5 Sonnet via OpenRouter)

- Input tokens: ~200 (policy + context)
- Output tokens: ~100 (analysis)
- **Cost**: ~$0.0015 per formula

### Per-Document Ingest (5KB analysis preview)

- Input tokens: ~1500 (document preview + analysis prompt)
- Output tokens: ~300 (analysis results)
- **Cost**: ~$0.01 per document

### Batch Operations

10 formulas + 1 document per month = ~$0.025 per user/month at scale

## Troubleshooting

### Missing API Key

```
Error: Missing OPENROUTER_API_KEY in environment
```

**Fix**: Add `OPENROUTER_API_KEY` to `.env.local`

### Model Not Found

```
Error: Could not parse JSON from OpenRouter response
```

**Fix**: Check model name in `MODELS` constant; verify spelling matches OpenRouter catalog

### Rate Limiting

OpenRouter has per-user limits. If you hit limits:

- Use faster models (Haiku instead of Opus)
- Batch requests
- Add retry logic with exponential backoff

### Token Limit Exceeded

Some models have 4K/8K context windows. For large documents:

- Use Claude Opus (200K context)
- Split documents into chunks
- Summarize before sending

## Advanced: Custom Model Fallbacks

To add fallback logic (try expensive model, fall back to cheap):

```typescript
// In openrouter.ts
const selectModel = (priority: 'speed' | 'quality' = 'speed') => {
  return priority === 'quality' ? MODELS.CLAUDE_3_OPUS : MODELS.CLAUDE_3_5_HAIKU;
};

// In auditFormulas()
const model = selectModel(process.env.LLM_QUALITY === 'high' ? 'quality' : 'speed');
```

## Production Checklist

- [ ] Set real `OPENROUTER_API_KEY` in production env
- [ ] Monitor token usage in OpenRouter dashboard
- [ ] Set up billing alerts
- [ ] Add request timeouts (30s recommended)
- [ ] Implement request retry logic (3 attempts with exponential backoff)
- [ ] Log model selection for analytics
- [ ] Test fallback models
- [ ] Document per-user/org usage for billing

## References

- [OpenRouter Docs](https://openrouter.ai/docs)
- [OpenRouter Models](https://openrouter.ai/models)
- [Pricing](https://openrouter.ai/pricing)
- [API Reference](https://openrouter.ai/api/v1)

---

**Next Steps:**

1. Get your OpenRouter API key
2. Add it to `.env.local`
3. Restart the backend: `pnpm dev`
4. Test with `/api/audit` or `/api/ingest`
5. Switch models as needed for cost/quality optimization
