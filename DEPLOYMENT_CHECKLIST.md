# Deployment Checklist - SheetBrain AI Authentication

## Pre-Deployment Phase

### Code Quality
- [ ] All TypeScript compilation errors resolved
  ```bash
  pnpm build
  ```
- [ ] No ESLint warnings in auth-related files
  ```bash
  pnpm --filter backend lint
  ```
- [ ] Code formatting correct (Prettier)
  ```bash
  pnpm --filter backend format:check
  ```
- [ ] No unused imports or variables
- [ ] No console.log statements in production code (use logger)
- [ ] All error types properly handled
- [ ] No hardcoded secrets or credentials

### Testing
- [ ] All unit tests passing
  ```bash
  pnpm --filter backend test:unit
  ```
- [ ] All integration tests passing
  ```bash
  pnpm --filter backend test:integration --run
  ```
- [ ] Manual testing completed with cURL/Postman:
  - [ ] Login flow works
  - [ ] Token refresh works
  - [ ] Logout works
  - [ ] Current user endpoint works
  - [ ] Rate limiting works
  - [ ] Error responses are correct
- [ ] Webhook testing completed with Clerk Dashboard
- [ ] No API response leakage (no stack traces, secrets in responses)
- [ ] Error messages are user-friendly (not technical)

### Documentation
- [ ] TESTING.md reviewed and accurate
- [ ] AUTH_QUICK_REFERENCE.md reviewed
- [ ] AUTH_IMPLEMENTATION.md complete
- [ ] README.md updated with setup instructions
- [ ] API documentation in sync with code
- [ ] Database schema documented
- [ ] Environment variables documented
- [ ] Known issues documented
- [ ] Troubleshooting guide complete

### Security Audit
- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities (httpOnly cookies set)
- [ ] No CSRF vulnerabilities (sameSite=strict)
- [ ] No credential exposure in logs
- [ ] Rate limiting configured and tested
- [ ] CORS properly configured for frontend domain
- [ ] Webhook signature verification enabled
- [ ] Token expiry times appropriate (15 min / 7 days)
- [ ] Cookie flags correct (httpOnly, secure, sameSite)
- [ ] Database connections use SSL/TLS
- [ ] Sensitive environment variables not in .env.example
- [ ] No debug mode enabled in production

### Dependencies
- [ ] All npm packages up to date
  ```bash
  pnpm outdated
  ```
- [ ] No security vulnerabilities in dependencies
  ```bash
  pnpm audit
  ```
- [ ] Package licenses reviewed and approved
- [ ] All required packages listed in package.json
- [ ] Lock file is up to date

## Staging Deployment

### Environment Setup
- [ ] Staging environment created in Clerk Dashboard
- [ ] Staging database provisioned (PostgreSQL 15+)
- [ ] Redis instance provisioned for staging
- [ ] Environment variables set in Vercel staging project:
  ```
  CLERK_SECRET_KEY
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  CLERK_WEBHOOK_SECRET
  SESSION_SECRET
  DATABASE_URL
  REDIS_URL
  SENTRY_DSN (staging)
  POSTHOG_API_KEY (staging)
  ```

### Database Preparation
- [ ] Database migrations run:
  ```bash
  pnpm --filter backend db:migrate
  ```
- [ ] pgvector extension enabled:
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  ```
- [ ] Initial schema verified:
  ```sql
  \dt  -- List tables
  SELECT * FROM users;
  SELECT * FROM organizations;
  ```
- [ ] Indexes created for performance:
  ```sql
  CREATE INDEX idx_users_org_id ON users(organization_id);
  CREATE INDEX idx_auth_sessions_user_id ON auth_sessions(user_id);
  ```

### Deployment
- [ ] Push code to staging branch
  ```bash
  git checkout -b staging
  git push origin staging
  ```
- [ ] Deploy to staging environment:
  ```bash
  vercel --prod --scope <team-slug> --confirm
  ```
- [ ] Verify deployment succeeded:
  ```bash
  curl https://api-staging.sheetbrain.ai/api/health
  ```

### Staging Testing
- [ ] Login flow works end-to-end
  - [ ] Clerk OAuth redirects correctly
  - [ ] Tokens generated and stored
  - [ ] Cookies set properly
- [ ] Token refresh works
  - [ ] Old token expires
  - [ ] New token generated
  - [ ] Refresh token rotated
- [ ] Rate limiting active
  - [ ] Allows 100 req/min per user
  - [ ] Returns 429 when exceeded
  - [ ] Resets after window
- [ ] Database sync working
  - [ ] Webhook events processed
  - [ ] Users synced correctly
  - [ ] Organizations synced correctly
- [ ] Error handling works
  - [ ] Invalid tokens rejected
  - [ ] Missing headers handled
  - [ ] Database errors logged
- [ ] Monitoring active
  - [ ] Sentry receiving errors
  - [ ] PostHog tracking events
  - [ ] Database connection pooled
- [ ] Performance acceptable
  - [ ] Login < 500ms
  - [ ] Token validation < 50ms
  - [ ] Rate limit check < 100ms

### Load Testing (Optional but Recommended)
- [ ] Create load test script:
  ```bash
  pnpm --filter backend test:load
  ```
- [ ] Test with 10-100 concurrent users
- [ ] Verify no degradation under load
- [ ] Check database connection pool limits
- [ ] Monitor Redis memory usage

### Clerk Webhook Configuration
- [ ] Verify webhook endpoint in Clerk Dashboard:
  - [ ] URL: https://api-staging.sheetbrain.ai/api/auth/webhook
  - [ ] Events: user.created, user.updated, user.deleted, organization.*
  - [ ] Secret matches CLERK_WEBHOOK_SECRET
- [ ] Test webhook delivery:
  - [ ] Send test event from Clerk
  - [ ] Verify event received in logs
  - [ ] Verify user/org synced to database

## Production Deployment

### Pre-Production Checklist
- [ ] All staging tests passed
- [ ] No critical issues in staging logs
- [ ] Staging security audit passed
- [ ] Team approval obtained
- [ ] Rollback plan documented
- [ ] On-call engineer assigned
- [ ] Incident response plan reviewed

### Environment Setup
- [ ] Production environment created in Clerk Dashboard
- [ ] Production database provisioned:
  - [ ] PostgreSQL 15+
  - [ ] Backups enabled
  - [ ] SSL/TLS connections enforced
  - [ ] Connection pooling configured
- [ ] Redis cluster provisioned for production
  - [ ] High availability enabled
  - [ ] Persistence enabled
  - [ ] Monitoring enabled
- [ ] All environment variables set in Vercel production:
  ```
  CLERK_SECRET_KEY (production)
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (production)
  CLERK_WEBHOOK_SECRET (production)
  SESSION_SECRET (strong random)
  DATABASE_URL (production)
  REDIS_URL (production)
  SENTRY_DSN (production)
  POSTHOG_API_KEY (production)
  NODE_ENV=production
  ```
- [ ] Secrets stored securely (not in version control)

### Database Preparation
- [ ] Database migrations run on production:
  ```bash
  pnpm db:migrate --env production
  ```
- [ ] Backups automated (daily minimum)
- [ ] pgvector extension enabled
- [ ] Indexes created and verified
- [ ] Query performance optimized:
  ```sql
  ANALYZE;
  EXPLAIN ANALYZE SELECT * FROM users WHERE organization_id = 'xxx';
  ```
- [ ] Database users configured with least privilege

### Deployment Strategy
- [ ] Choose deployment window:
  - [ ] Off-peak hours preferred
  - [ ] Notify users of maintenance if needed
  - [ ] Schedule 30-min deployment window
- [ ] Tag release version:
  ```bash
  git tag -a v1.0.0-auth -m "Authentication system v1.0"
  git push origin v1.0.0-auth
  ```
- [ ] Deploy to production:
  ```bash
  vercel --prod --scope <team-slug> --confirm
  ```
- [ ] Verify deployment:
  ```bash
  curl https://api.sheetbrain.ai/api/health
  curl https://api.sheetbrain.ai/api/auth/me \
    -H "Authorization: Bearer <test_token>"
  ```

### Post-Deployment Verification
- [ ] Health endpoint responds (200 OK)
- [ ] Auth endpoints responding:
  - [ ] POST /api/auth/login
  - [ ] GET /api/auth/me
  - [ ] POST /api/auth/token
- [ ] Error handling working
- [ ] No error 500s in logs
- [ ] No database connection errors
- [ ] Redis connection active
- [ ] Clerk webhook processing events
- [ ] Monitoring systems active:
  - [ ] Sentry collecting errors
  - [ ] PostHog tracking events
  - [ ] CloudFlare analytics
- [ ] Database backups working
- [ ] SSL/TLS certificates valid
- [ ] CORS headers correct

### Production Testing
- [ ] Login with real Google account works
- [ ] Multiple concurrent logins succeed
- [ ] Token refresh works
- [ ] Rate limiting enforced
- [ ] Webhook events processed
- [ ] Error messages appropriate
- [ ] Response times acceptable:
  - [ ] Login: < 500ms
  - [ ] Token validation: < 50ms
  - [ ] Rate limit check: < 100ms
- [ ] No leakage of sensitive data:
  - [ ] No stack traces in responses
  - [ ] No database credentials in logs
  - [ ] No API keys in error messages

### Monitoring & Alerting
- [ ] Sentry alerts configured:
  - [ ] Error threshold: > 5 errors/min
  - [ ] Alert channel: Slack/email
  - [ ] On-call rotation setup
- [ ] PostHog dashboards created:
  - [ ] Login success rate
  - [ ] Token refresh frequency
  - [ ] Auth error tracking
- [ ] Database monitoring:
  - [ ] Connection pool usage
  - [ ] Query performance
  - [ ] Backup status
- [ ] Application metrics:
  - [ ] Endpoint latency
  - [ ] Request count
  - [ ] Error rates

### Documentation Updates
- [ ] Production URLs documented
- [ ] API documentation updated
- [ ] Troubleshooting guide updated for production
- [ ] On-call runbook created
- [ ] Incident response procedures documented
- [ ] Change log updated

## Post-Deployment (24-48 Hours)

### Monitoring
- [ ] No critical errors in production logs
- [ ] Error rate normal (< 0.1%)
- [ ] Response times acceptable
- [ ] Database performance stable
- [ ] Redis memory usage stable
- [ ] Webhook processing on schedule

### Cleanup
- [ ] Remove staging data if applicable
- [ ] Archive deployment logs
- [ ] Update deployment documentation
- [ ] Close deployment issue/PR

### Team Communication
- [ ] Send deployment notification to team
- [ ] Document deployment details
- [ ] Share monitoring dashboards
- [ ] Request feedback from QA/product

## Rollback Plan

If critical issues occur:

1. **Identify Issue**:
   - [ ] Review error logs in Sentry
   - [ ] Check database integrity
   - [ ] Verify Clerk connectivity

2. **Immediate Actions**:
   - [ ] Enable maintenance mode (if needed)
   - [ ] Notify stakeholders
   - [ ] Initiate incident response

3. **Rollback Procedure**:
   ```bash
   # Revert to previous version in Vercel
   vercel rollback
   
   # Or redeploy previous tag:
   git checkout v0.x.x
   vercel --prod --confirm
   ```

4. **Post-Rollback**:
   - [ ] Verify system stable
   - [ ] Assess data consistency
   - [ ] Plan fix for next deployment
   - [ ] Document incident

## Sign-Off Checklist

Before marking deployment complete:

- [ ] Product Manager: Feature meets requirements
- [ ] QA: All tests passed
- [ ] Security: Security audit complete
- [ ] DevOps: Infrastructure healthy
- [ ] Engineering Lead: Code quality approved
- [ ] CTO: Architecture verified

**Deployed By**: _________________ **Date**: _________

**Verified By**: _________________ **Date**: _________

## Post-Go-Live Support (Week 1)

- [ ] Monitor error rates continuously
- [ ] Respond to user feedback
- [ ] Fix critical bugs immediately
- [ ] Plan patch releases if needed
- [ ] Document lessons learned
- [ ] Optimize based on analytics

---

**Version**: 1.0
**Last Updated**: January 2024
**Deployment Contact**: [your-team@sheetbrain.ai]
