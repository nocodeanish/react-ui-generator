# Security Guidelines for React AI UI Generator

This document outlines the security measures implemented in React AI UI Generator and best practices for deployment.

## Critical Environment Variables

### Required for Production

**`JWT_SECRET`** (REQUIRED in production)
- Generate with: `openssl rand -base64 32`
- Must be set in production or the application will refuse to start
- Used for signing authentication tokens
- Keep this secret and never commit to version control

**`ANTHROPIC_API_KEY`** (Optional but recommended)
- Your Anthropic API key for Claude integration
- Without this, the app uses a mock provider with limited functionality
- Get your key from: https://console.anthropic.com/

### Example .env file

```bash
# REQUIRED: JWT secret for authentication (generate with: openssl rand -base64 32)
JWT_SECRET="your-super-secret-jwt-key-here-change-this"

# Optional: Anthropic API key for real AI generation
ANTHROPIC_API_KEY="sk-ant-..."

# Optional: Node environment
NODE_ENV="production"
```

## Security Features Implemented

### 1. Authentication & Authorization

- ✅ **Bcrypt password hashing** (10 rounds)
- ✅ **JWT-based session management** with 7-day expiration
- ✅ **Password complexity requirements**:
  - Minimum 8 characters
  - At least 1 uppercase letter
  - At least 1 lowercase letter
  - At least 1 number
- ✅ **Email validation** using regex
- ✅ **Timing attack prevention** in login (always runs bcrypt even if user doesn't exist)
- ✅ **User enumeration prevention** (generic error messages)
- ✅ **Session expiration handling** (auto-delete expired tokens)

### 2. Rate Limiting

- ✅ **Sign-in**: 5 attempts per 15 minutes per IP
- ✅ **Sign-up**: 3 attempts per hour per IP
- ✅ **Chat API (anonymous)**: 10 requests per hour per IP
- ✅ **Chat API (authenticated)**: Unlimited (subject to Anthropic API limits)

Note: Rate limiting is currently in-memory. For production with multiple servers, consider using Redis-based rate limiting (@upstash/ratelimit).

### 3. Input Validation & Sanitization

- ✅ **File path validation**: Prevents path traversal (no `..`, no null bytes)
- ✅ **File extension whitelist**: Only allows safe extensions (.js, .jsx, .ts, .tsx, .css, .json, .md, .txt)
- ✅ **File size limits**:
  - Max 100 files per project
  - Max 500KB per file
  - Max 5MB total project size
- ✅ **Project name sanitization**: Removes HTML tags, limits length to 100 chars
- ✅ **JSON parsing with error handling**: Safe defaults on parse errors
- ✅ **Content-Type validation**: Ensures JSON requests are actually JSON

### 4. XSS & Code Injection Prevention

- ✅ **Sandbox iframe for previews**: Runs AI-generated code in sandboxed iframe
- ✅ **No `allow-same-origin`**: Prevents malicious code from accessing parent window
- ✅ **Generic error messages**: Doesn't leak stack traces to clients

### 5. Data Protection

- ✅ **HTTP-only cookies**: Session tokens not accessible to JavaScript
- ✅ **Secure cookies in production**: Cookies only sent over HTTPS
- ✅ **SameSite=Lax**: Prevents CSRF attacks
- ✅ **Project ownership validation**: Users can only access their own projects

## Security Recommendations for Production

### 1. Environment Setup

```bash
# Generate a strong JWT secret
openssl rand -base64 32

# Set NODE_ENV to production
export NODE_ENV=production
```

### 2. Enable HTTPS

Always use HTTPS in production. The app sets `secure: true` for cookies when `NODE_ENV=production`.

### 3. Database Security

- Use proper file permissions for `prisma/dev.db`
- Consider migrating to PostgreSQL for production
- Set up regular backups
- Enable database encryption at rest

### 4. Redis for Rate Limiting (Recommended)

For multi-server deployments, replace the in-memory rate limiter with Redis:

```bash
npm install @upstash/ratelimit @upstash/redis
```

Update `src/lib/rate-limit.ts` to use Upstash Redis.

### 5. Add Content Security Policy

Add CSP headers to prevent XSS attacks:

```typescript
// In next.config.ts
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.tailwindcss.com https://esm.sh; style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.anthropic.com;"
  }
];
```

### 6. Monitor & Log

- Set up error tracking (Sentry, LogRocket, etc.)
- Monitor rate limit violations
- Track failed authentication attempts
- Log security-related events

### 7. Regular Updates

- Keep dependencies up to date: `npm audit fix`
- Review and update security policies quarterly
- Monitor Anthropic API for security advisories

## Known Limitations

### 1. In-Memory Rate Limiting

The current rate limiting implementation stores data in memory. This means:
- Rate limits reset on server restart
- Won't work properly in multi-server deployments
- Can cause memory issues with many unique IPs

**Solution**: Migrate to Redis-based rate limiting for production.

### 2. SQLite Database

SQLite is suitable for development but has limitations:
- No built-in replication
- Limited concurrent write performance
- File-based (potential permission issues)

**Solution**: Migrate to PostgreSQL or MySQL for production.

### 3. No Email Verification

Users can sign up without email verification.

**Solution**: Implement email verification flow with a service like SendGrid or AWS SES.

### 4. No 2FA

No two-factor authentication support.

**Solution**: Add 2FA using TOTP (time-based one-time passwords) or SMS.

### 5. No Account Recovery

No password reset functionality.

**Solution**: Implement password reset flow with email verification.

## Reporting Security Issues

If you discover a security vulnerability, please email: [your-security-email@domain.com]

Do NOT open a public GitHub issue for security vulnerabilities.

## Compliance

This application:
- ✅ Hashes passwords (GDPR/CCPA requirement)
- ✅ Allows account deletion (GDPR right to erasure)
- ✅ Implements access controls
- ⚠️ Does NOT have data export (GDPR right to portability) - to be implemented
- ⚠️ Does NOT have audit logging - to be implemented
- ⚠️ Does NOT have data retention policies - to be implemented

## Security Checklist for Deployment

Before deploying to production:

- [ ] Set `JWT_SECRET` environment variable
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS
- [ ] Review and restrict CORS settings
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Configure database backups
- [ ] Review file permissions on server
- [ ] Test rate limiting
- [ ] Review and update allowed file extensions
- [ ] Set up monitoring and alerting
- [ ] Document incident response procedures
- [ ] Set up Redis for rate limiting (multi-server)
- [ ] Migrate from SQLite to PostgreSQL (recommended)

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)
- [Anthropic API Security](https://docs.anthropic.com/claude/docs/security)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
