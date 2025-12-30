# SheetBrain AI - Security Policy

## Reporting Security Vulnerabilities

**DO NOT** open a public GitHub issue for security vulnerabilities.

Instead, please email: **security@sheetbrain.ai**

Include the following:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will respond within 48 hours and work with you on a fix.

## Security Practices

### Data Protection
- All data encrypted in transit (HTTPS/TLS 1.3)
- Sensitive data encrypted at rest
- PII redacted from logs
- Regular security audits

### Authentication
- OAuth 2.0 with Google
- JWT tokens with 15-minute expiry
- Refresh token rotation
- Session invalidation on logout

### API Security
- Rate limiting (100 req/min per user)
- CORS configured strictly
- No sensitive data in URLs
- Request validation with Zod

### Infrastructure
- Vercel Edge Network with DDoS protection
- PostgreSQL with row-level security
- Redis with auth enabled
- Firewall rules enforced

### Code Security
- Automated dependency updates (Dependabot)
- SAST scanning (Semgrep)
- Secret scanning (TruffleHog)
- CodeQL analysis

### Monitoring
- Sentry error tracking
- Real-time alerts for suspicious activity
- 99.9% uptime SLA
- Incident response plan

## Compliance

- GDPR compliant (right to be forgotten, data portability)
- CCPA compliant (privacy notice, opt-out)
- SOC 2 Type II compliant design
- HIPAA-friendly (if needed)

## Responsible Disclosure

We appreciate security researchers who:
- Report vulnerabilities responsibly
- Allow reasonable time for fixes
- Don't publicly disclose before fix
- Avoid accessing other users' data
- Don't perform destructive testing

Fixed vulnerabilities will be:
- Patched immediately
- Included in security advisory
- Credit given to researcher

## Vulnerable Dependency Reporting

If you find a vulnerable dependency:
1. Check if it's already reported
2. Create a private security advisory on GitHub
3. Email security@sheetbrain.ai

We'll upgrade or patch within 48 hours for critical vulnerabilities.

## Version Support

| Version | Status | Security Support Until |
|---------|--------|------------------------|
| 1.0.x   | Active | Sep 2025               |
| 0.x.x   | EOL    | Dec 2024               |

## Security Updates

Follow our security advisories:
- [GitHub Advisories](https://github.com/yocho1/SheetBrain-AI/security/advisories)
- [Email Notifications](https://sheetbrain.ai/security/subscribe)
- [RSS Feed](https://github.com/yocho1/SheetBrain-AI/security.atom)

## Third-party Security

- Stripe PCI DSS Level 1 compliant
- Anthropic SOC 2 Type II certified
- OpenAI enterprise security
- Pinecone encrypted vectors
- Supabase encrypted backups

## Questions?

- Security concerns: security@sheetbrain.ai
- General questions: hello@sheetbrain.ai
- Documentation: https://docs.sheetbrain.ai/security
