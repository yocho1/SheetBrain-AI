# Authentication Quick Reference

## API Endpoints

### Authentication Endpoints

| Endpoint            | Method | Purpose                        | Auth      | Rate Limit |
| ------------------- | ------ | ------------------------------ | --------- | ---------- |
| `/api/auth/login`   | POST   | Login with Clerk session token | ❌        | 10/min     |
| `/api/auth/token`   | POST   | Refresh access token           | ❌        | 10/min     |
| `/api/auth/logout`  | POST   | Clear session                  | ❌        | -          |
| `/api/auth/webhook` | POST   | Clerk webhook events           | Signature | -          |
| `/api/auth/me`      | GET    | Get current user               | Bearer    | 100/min    |

### Protected Endpoints

| Endpoint         | Method | Purpose            | Auth   | Rate Limit |
| ---------------- | ------ | ------------------ | ------ | ---------- |
| `/api/v1/audit`  | POST   | Audit formulas     | Bearer | 100/min    |
| `/api/v1/ingest` | POST   | Upload policy docs | Bearer | 50/min     |

## Token Flow

```
┌─────────────┐
│   Browser   │
└─────────────┘
      │
      │ 1. OAuth redirect → Clerk
      ├──────────────────────────────>
      │                              [Clerk OAuth]
      │ 2. Callback with session
      │<──────────────────────────────
      │
      │ 3. POST /api/auth/login (session token)
      ├──────────────────────────────>
      │
      │ 4. Validate + Sync + Generate JWT
      │         [Supabase]
      │<──────────────────────────────
      │ accessToken (15 min) + refreshToken (7 days)
      │ Set secure cookies
      │
      │ 5. API Requests with Bearer token
      ├─── GET /api/v1/audit ─────────>
      │    Authorization: Bearer accessToken
      │<──────────────────────────────
      │
      │ 6. Token expires (15 min)
      │
      │ 7. POST /api/auth/token (refresh)
      ├──────────────────────────────>
      │    { refreshToken: "..." }
      │<──────────────────────────────
      │ New accessToken + new refreshToken
      │
      │ 8. POST /api/auth/logout
      ├──────────────────────────────>
      │<──────────────────────────────
      │ Clear cookies
```

## Request/Response Examples

### Login Request

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "token": "clerk_session_token_here"
  }'
```

### Login Response (200 OK)

```json
{
  "user": {
    "id": "user_abc123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "member",
    "organization": {
      "id": "org_xyz789",
      "name": "Acme Corp",
      "plan": "pro",
      "members": 5
    },
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Get Current User Request

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Get Current User Response (200 OK)

```json
{
  "user": {
    "id": "user_abc123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "member",
    "organization": {
      "id": "org_xyz789",
      "name": "Acme Corp",
      "plan": "pro",
      "members": 5
    },
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### Token Refresh Request

```bash
curl -X POST http://localhost:3000/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

### Token Refresh Response (200 OK)

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Audit Request

```bash
curl -X POST http://localhost:3000/api/v1/audit \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "range": "A1:D100",
    "context": {
      "sheetPurpose": "Q1 Financial Analysis",
      "department": "Finance",
      "includeRedactions": false
    }
  }'
```

### Audit Response (200 OK)

```json
{
  "audits": [
    {
      "id": "audit_001",
      "cell": "B5",
      "formula": "=SUM(A1:A100)",
      "issues": [
        {
          "severity": "warning",
          "message": "Range includes empty cells",
          "suggestion": "Consider filtering empty rows"
        }
      ],
      "confidence": 0.92,
      "tokensUsed": 245
    }
  ],
  "count": 1,
  "failed": 0,
  "timestamp": "2024-01-15T10:30:00Z",
  "duration": "1.24s"
}
```

## Error Responses

### 400 Bad Request

```json
{
  "error": "Missing required field: range",
  "code": "VALIDATION_ERROR"
}
```

### 401 Unauthorized

```json
{
  "error": "No authorization token provided",
  "code": "NO_TOKEN"
}
```

### 403 Forbidden

```json
{
  "error": "User has no organization",
  "code": "NO_ORGANIZATION"
}
```

### 429 Too Many Requests

```json
{
  "error": "Rate limit exceeded: 100 requests per minute",
  "code": "RATE_LIMIT",
  "retryAfter": 45
}
```

### 500 Internal Server Error

```json
{
  "error": "Failed to analyze formula",
  "code": "ANALYSIS_ERROR",
  "requestId": "req_abc123"
}
```

## Environment Variables

### Required for Authentication

```
CLERK_SECRET_KEY=sk_test_xxx...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx...
CLERK_WEBHOOK_SECRET=whsec_xxx...
SESSION_SECRET=<random 32-char secret>
```

### Database

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sheetbrain
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

### Redis (Rate Limiting)

```
REDIS_URL=redis://localhost:6379
```

## Database Schema (Auth)

### users table

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'member',
  organization_id TEXT REFERENCES organizations(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### organizations table

```sql
CREATE TABLE organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT DEFAULT 'free',
  members_count INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### auth_sessions table

```sql
CREATE TABLE auth_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Token Structure

### Access Token (JWT)

```
Header:
{
  "alg": "HS256",
  "typ": "JWT"
}

Payload:
{
  "sub": "user_abc123",      // User ID
  "email": "user@example.com",
  "orgId": "org_xyz789",
  "role": "member",
  "tokenType": "access",
  "iat": 1705318200,
  "exp": 1705319100           // 15 minutes later
}

Signature:
HMAC-SHA256(header + payload, SESSION_SECRET)
```

### Refresh Token (JWT)

```
Payload:
{
  "sub": "user_abc123",
  "tokenType": "refresh",
  "iat": 1705318200,
  "exp": 1705923000           // 7 days later
}
```

## Common Commands

### Start Development

```bash
# Install dependencies
pnpm install

# Start Docker services
docker-compose -f docker-compose.dev.yml up -d

# Run migrations
pnpm --filter backend db:migrate

# Start dev server
pnpm --filter backend dev
```

### Testing

```bash
# Unit tests
pnpm --filter backend test:unit

# Integration tests
pnpm --filter backend test:integration

# Watch mode
pnpm --filter backend test --watch
```

### Database

```bash
# Connect to PostgreSQL
psql postgresql://postgres:postgres@localhost:5432/sheetbrain

# View users
SELECT id, email, name, role FROM users;

# View organizations
SELECT id, name, plan FROM organizations;

# Reset database (dev only)
pnpm --filter backend db:reset
```

### Debugging

```bash
# Check logs
pnpm --filter backend dev 2>&1 | grep -i auth

# Decode JWT token
node -e "console.log(JSON.parse(Buffer.from('TOKEN_PART_2'.split('.')[1], 'base64').toString()))"

# Test rate limiting (100 req/min)
for i in {1..101}; do
  curl -X GET http://localhost:3000/api/auth/me \
    -H "Authorization: Bearer $TOKEN"
done
```

## Security Checklist

- [ ] Access tokens expire after 15 minutes
- [ ] Refresh tokens expire after 7 days
- [ ] Cookies are httpOnly (no JavaScript access)
- [ ] Cookies are secure (HTTPS only in production)
- [ ] Cookies have sameSite=strict
- [ ] JWT signature verified on every request
- [ ] Rate limiting enforced (100/min per user)
- [ ] Clerk webhook signature verified
- [ ] Environment variables not committed to git
- [ ] Sensitive data logged only in development
- [ ] CORS properly configured for frontend domain
- [ ] Database connections use SSL in production

## Troubleshooting

### Token not working after login

1. Check token is not expired: `exp` should be > current time
2. Verify header format: `Authorization: Bearer <token>`
3. Check `tokenType` is "access" (not "refresh")

### Webhook not syncing users

1. Verify `CLERK_WEBHOOK_SECRET` matches Clerk Dashboard
2. Check Clerk → Webhooks → Your endpoint has "Recent Attempts"
3. Review server logs for sync errors
4. Ensure database is running: `docker ps | grep postgres`

### Rate limiting too strict/lenient

1. Modify in `backend/src/lib/auth/rate-limit.ts`:
   - `RATE_LIMIT_REQUESTS` (default: 100)
   - `RATE_LIMIT_WINDOW_MS` (default: 60000ms)

### PostgreSQL connection refused

1. Check Docker container running: `docker ps`
2. Restart services: `docker-compose restart`
3. Check logs: `docker logs sheetbrain-postgres`

## Additional Resources

- [Clerk Documentation](https://clerk.com/docs)
- [JWT.io Debugger](https://jwt.io)
- [OAuth 2.0 Flow Diagram](https://tools.ietf.org/html/rfc6749)
- [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
