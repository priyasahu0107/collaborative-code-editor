# Security

## Overview

This document outlines the security requirements, design decisions, and implementation for the Collaborative Code Editor.

## Authentication & Authorization (Implemented)

### Password Security
- **Hashing algorithm**: bcrypt with 12 salt rounds
- **Storage**: Only password hashes stored, never plaintext
- **Validation**: Minimum 8 characters, must contain uppercase, lowercase, and number
- **Max length**: 128 characters (prevents bcrypt DoS)

### JWT Tokens
- **Signing**: HMAC-SHA256 with high-entropy secret (min 32 chars)
- **Expiration**: 15 minutes (configurable via `JWT_EXPIRES_IN`)
- **Issuer/Audience**: Optional validation via `JWT_ISSUER` and `JWT_AUDIENCE`
- **Storage**: HTTP-only cookie (never exposed to JavaScript)

### Cookie Security
- **HttpOnly**: `true` — prevents XSS access to token
- **Secure**: `true` in production (HTTPS only)
- **SameSite**: `lax` (configurable: `strict`, `lax`, `none`)
- **Path**: `/` — cookie valid for all routes
- **Max-Age**: Matches JWT expiration (15 minutes)

### Session Management
- **Token lifetime**: Short-lived (15 minutes default)
- **Logout**: Clears cookie but token remains valid until expiration
- **Revocation**: Not implemented — stolen tokens valid until expiry
- **Refresh**: Not implemented — users must re-authenticate after expiry

### Authorization
- **Middleware**: `authenticate` middleware verifies JWT on protected routes
- **Context**: User ID and email attached to `req.auth`
- **Protected routes**: All non-health endpoints require authentication (future)

## CORS Configuration (Implemented)

- **Origin restriction**: Only `CLIENT_URL` origins allowed
- **Multiple origins**: Comma-separated list supported
- **Credentials**: Enabled for cookie-based auth
- **Wildcard**: Never used with credentials
- **Methods**: GET, POST, PUT, PATCH, DELETE, OPTIONS
- **Headers**: Content-Type, Authorization, X-Requested-With

## Rate Limiting (Implemented)

- **Authentication endpoints**: 10 requests per 15 minutes per IP
- **General API**: 100 requests per 15 minutes per IP
- **Key**: IP address (from `req.ip` or `req.socket.remoteAddress`)
- **Response**: 429 with `RATE_LIMIT_EXCEEDED` error code
- **Headers**: Standard `RateLimit-*` headers enabled

## Input Validation (Implemented)

- **Library**: Zod for runtime validation
- **Registration**: Name (1-100 chars), email (valid format, max 255), password (8-128 chars, complexity rules)
- **Login**: Email (valid format), password (1-128 chars)
- **Error messages**: Generic for authentication (prevents enumeration)
- **NoSQL injection**: Mongoose parameterized queries prevent injection

## Error Handling (Implemented)

- **Centralized**: All errors handled by `errorHandler` middleware
- **Stack traces**: Only exposed in development, never in production
- **Credentials**: Never logged or returned in error responses
- **Database URIs**: Masked in logs (protocol + hostname only)
- **Consistent format**: All errors return `{ success: false, message, error: { code, statusCode } }`

## Secrets Management

### Rules
1. **Never commit secrets** — `.env` files are in `.gitignore`
2. **Use `.env.example`** — Contains variable names with safe placeholder values only
3. **Environment variables** — All secrets loaded from environment
4. **No hardcoded credentials** — Not even in test files
5. **Production validation** — Server fails to start if `JWT_SECRET` missing in production

### Secret Variables
| Variable | Location | Purpose | Min Length |
|----------|----------|---------|------------|
| `JWT_SECRET` | Server | JWT signing key | 32 chars |
| `MONGODB_URI` | Server | Database connection string | — |

### Generation
```bash
# Generate JWT secret
openssl rand -base64 48

# Generate random password
openssl rand -base64 32
```

## HTTP Security Headers (Implemented)

Using `helmet` middleware:
- **Content-Security-Policy**: Default policy
- **X-Content-Type-Options**: `nosniff`
- **X-Frame-Options**: `DENY`
- **X-DNS-Prefetch-Control**: `off`
- **X-Download-Options**: `noopen`
- **X-Permitted-Cross-Domain-Policies**: `none`
- **Referrer-Policy**: `no-referrer`
- **Strict-Transport-Security**: Enabled in production (via HTTPS)

## Database Security (Implemented)

- **Connection**: MongoDB Atlas with authentication
- **Connection string**: Stored in environment variable only
- **Mongoose schemas**: Enforce data types and validation
- **No raw queries**: All queries through Mongoose methods
- **Indexes**: Unique indexes prevent duplicate accounts
- **Password hash**: Excluded from JSON serialization via `toJSON` transform

## Logging Security (Implemented)

- **Sensitive fields redacted**: authorization, cookie, password, secret, token, mongodb_uri, jwt_secret
- **Request bodies**: Never logged
- **Database URIs**: Masked (protocol + hostname only)
- **Stack traces**: Only in development logs
- **Authentication events**: Logged safely (user ID, email — no passwords)

## Code Execution Security (Planned)

### Isolation Strategy
The execution service runs in a **separate Docker container** with:

1. **No host filesystem access** — Container has isolated filesystem
2. **Resource limits**:
   - CPU: Limited via Docker `--cpus`
   - Memory: Limited via Docker `--memory`
   - Execution time: Hard timeout (e.g., 10 seconds)
   - Process count: Limited
3. **No network access** — Container cannot make outbound connections
4. **Read-only filesystem** — Where possible
5. **Non-root user** — Execution runs as unprivileged user
6. **Temporary workspace** — Cleaned up after each execution

### Planned Security Measures
- Input sanitization before execution
- Language-specific sandboxing
- Output size limits
- Execution queue with rate limiting
- Malicious code detection (basic patterns)

## Known Limitations

### Current
1. **No token revocation**: Logout clears cookie but JWT valid until expiry (15 min)
2. **No refresh tokens**: Users must re-authenticate after token expires
3. **No CSRF protection**: Relies on SameSite cookie attribute
4. **No account lockout**: Rate limiting prevents brute force but doesn't lock accounts
5. **No 2FA**: Single-factor authentication only

### Future Enhancements
- [ ] Token revocation list (Redis or MongoDB)
- [ ] Refresh token rotation
- [ ] CSRF tokens for state-changing requests
- [ ] Account lockout after failed attempts
- [ ] Two-factor authentication (TOTP)
- [ ] Session management (view active sessions, revoke specific sessions)
- [ ] Password reset flow with email verification
- [ ] Email verification on registration

## Security Checklist

- [x] Password hashing with bcrypt (12 rounds)
- [x] JWT signing with high-entropy secret
- [x] HTTP-only cookies for token storage
- [x] Secure cookies in production (HTTPS)
- [x] SameSite cookie attribute
- [x] CORS restricted to trusted origins
- [x] Rate limiting on authentication endpoints
- [x] Input validation with Zod
- [x] Generic authentication error messages
- [x] No password hash in API responses
- [x] No credentials in logs
- [x] No stack traces in production errors
- [x] Helmet security headers
- [x] Environment variable validation
- [x] No hardcoded secrets
- [x] MongoDB connection string masked in logs
- [x] Unique email index prevents duplicates
- [x] Mongoose parameterized queries (NoSQL injection prevention)
