# Security Guidelines for React AI UI Generator

This document outlines the security measures implemented in React AI UI Generator and best practices for deployment.

## Critical Environment Variables

### Required for Production

**`JWT_SECRET`** (REQUIRED in production)
- Generate with: `openssl rand -base64 32`
- Must be set in production or the application will refuse to start
- Used for signing authentication tokens
- Keep this secret and never commit to version control

**AI Provider API Keys** (At least one recommended)
| Provider | Environment Variable | Dashboard URL |
|----------|---------------------|---------------|
| Anthropic | `ANTHROPIC_API_KEY` | https://console.anthropic.com/ |
| OpenAI | `OPENAI_API_KEY` | https://platform.openai.com/api-keys |
| Google AI | `GOOGLE_AI_API_KEY` | https://aistudio.google.com/apikey |
| OpenRouter | `OPENROUTER_API_KEY` | https://openrouter.ai/keys |
| xAI | `XAI_API_KEY` | https://console.x.ai/ |

- Without any API key, the app uses a mock provider with limited functionality (demo mode)
- Users can also add their own API keys via Settings (stored encrypted)
- Environment keys take priority over user-stored keys

### Example .env file

```bash
# REQUIRED: JWT secret for authentication (generate with: openssl rand -base64 32)
JWT_SECRET="your-super-secret-jwt-key-here-change-this"

# Optional: AI provider API keys (at least one recommended)
ANTHROPIC_API_KEY="sk-ant-..."
OPENAI_API_KEY="sk-..."
GOOGLE_AI_API_KEY="..."
OPENROUTER_API_KEY="sk-or-..."
XAI_API_KEY="xai-..."

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
- ✅ **Chat API (authenticated)**: Unlimited (subject to provider API limits)
- ✅ **Settings API**: 10 changes per hour per user
- ✅ **API Key Validation**: 10 attempts per hour per user
- ✅ **API Key Check**: 20 checks per hour per user

**Implementation details:**
- In-memory rate limiting with automatic cleanup (5-minute interval)
- Rate limit entries tracked with count and resetAt timestamp
- Centralized configuration in `src/lib/constants.ts`

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

### 6. API Key Encryption (AES-256-GCM)

User-provided API keys are encrypted before database storage using industry-standard encryption:

- ✅ **Algorithm**: AES-256-GCM (authenticated encryption)
- ✅ **Key Derivation**: scrypt (memory-hard, resistant to brute-force)
- ✅ **Salt**: 32 bytes, randomly generated per encryption
- ✅ **IV**: 16 bytes, randomly generated per encryption
- ✅ **Auth Tag**: Included for integrity verification
- ✅ **Storage Format**: `salt:iv:authTag:encrypted` (all base64 encoded)

**Security properties:**
- Keys are never sent to the client (only last 4 characters shown for identification)
- Decryption only happens server-side when making API calls
- Each encryption uses unique salt and IV
- Encryption key derived from `JWT_SECRET` using scrypt

### 7. API Key Validation

API keys are validated before storage to prevent storing invalid keys:

- ✅ **Pre-save validation**: Keys tested with provider's API before encryption
- ✅ **10-second timeout**: Prevents hanging on slow provider responses
- ✅ **Provider-specific validation**:
  - Anthropic: `/v1/models` endpoint
  - OpenAI: `/v1/models` endpoint
  - Google AI: `/v1/models` endpoint
  - OpenRouter: `/v1/auth/key` endpoint
  - xAI: `/v1/models` endpoint
- ✅ **Error categorization**: Errors mapped to user-friendly messages without leaking sensitive details
- ✅ **Error categories**: `invalid_key`, `expired`, `rate_limit`, `insufficient_quota`, `network`, `unknown`

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
    value: `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.tailwindcss.com https://esm.sh blob:;
      style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com;
      img-src 'self' data: https:;
      font-src 'self' data:;
      connect-src 'self'
        https://api.anthropic.com
        https://api.openai.com
        https://generativelanguage.googleapis.com
        https://openrouter.ai
        https://api.x.ai;
    `.replace(/\s+/g, ' ').trim()
  }
];
```

**Note:** The `blob:` directive in script-src is required for the live preview iframe which uses blob URLs for transformed JSX modules.

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

**Required:**
- [ ] Set `JWT_SECRET` environment variable (used for both JWT signing and API key encryption)
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS

**API Keys:**
- [ ] Configure at least one AI provider API key (or rely on user-provided keys)
- [ ] Verify API key encryption is working (check `UserSettings.apiKeys` is encrypted, not plaintext)
- [ ] Test API key validation flow

**Infrastructure:**
- [ ] Review and restrict CORS settings
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Configure database backups
- [ ] Review file permissions on server
- [ ] Set up monitoring and alerting
- [ ] Document incident response procedures

**Rate Limiting:**
- [ ] Test rate limiting for all endpoints
- [ ] Set up Redis for rate limiting (multi-server deployments)
- [ ] Monitor rate limit violations

**Database:**
- [ ] Migrate from SQLite to PostgreSQL (recommended for production)
- [ ] Enable database encryption at rest
- [ ] Review and update allowed file extensions

## Additional Resources

**Security Standards:**
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

**Provider Security Documentation:**
- [Anthropic API Security](https://docs.anthropic.com/claude/docs/security)
- [OpenAI API Security](https://platform.openai.com/docs/guides/safety-best-practices)
- [Google AI Security](https://ai.google.dev/docs/safety_setting_gemini)
- [OpenRouter Documentation](https://openrouter.ai/docs)
- [xAI API Documentation](https://docs.x.ai/)

**API Key Management:**
- [Anthropic Console](https://console.anthropic.com/)
- [OpenAI API Keys](https://platform.openai.com/api-keys)
- [Google AI Studio](https://aistudio.google.com/apikey)
- [OpenRouter Keys](https://openrouter.ai/keys)
- [xAI Console](https://console.x.ai/)
