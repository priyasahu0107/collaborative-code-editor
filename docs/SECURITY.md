# Security

## Overview

This document outlines the security requirements, design decisions, and implementation plan for the Collaborative Code Editor.

## Authentication & Authorization

### Planned Implementation (Phase 2)
- **Password hashing**: bcrypt with cost factor 12
- **Token format**: JWT (JSON Web Tokens)
- **Token storage**: HttpOnly cookies (preferred) or localStorage
- **Token expiration**: Access tokens (15min), Refresh tokens (7 days)
- **Password requirements**: Minimum 8 characters, complexity rules

### Authorization Model
- Role-based access control (RBAC)
- Project roles: `owner`, `editor`, `viewer`
- Room access tied to project membership
- API middleware validates JWT and checks permissions

## Secrets Management

### Rules
1. **Never commit secrets** — `.env` files are in `.gitignore`
2. **Use `.env.example`** — Contains variable names with safe placeholder values only
3. **Environment variables** — All secrets loaded from environment
4. **No hardcoded credentials** — Not even in test files

### Secret Variables
| Variable | Location | Purpose |
|----------|----------|---------|
| `JWT_SECRET` | Server | JWT signing key |
| `MONGODB_URI` | Server | Database connection string |
| `SESSION_SECRET` | Server | Session encryption (if used) |

## CORS Configuration

- Server allows requests only from configured `CLIENT_ORIGIN`
- Credentials enabled for cookie-based auth
- Socket.IO CORS matches Express CORS settings

## Input Validation

- All API inputs validated with Zod schemas before processing
- Socket.IO event payloads validated before handling
- Maximum payload sizes configured (10MB JSON)
- String length limits on user inputs

## Code Execution Security

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

## Socket.IO Security

- Connection authentication via JWT token
- Room membership validation before allowing join
- Event payload size limits
- Rate limiting on event emission
- Disconnect inactive connections

## MongoDB Security

- Connection via MongoDB Atlas with authentication
- Connection string stored in environment variable only
- Mongoose schemas enforce data types and validation
- No raw query injection — all queries through Mongoose methods

## HTTP Security Headers

Using `helmet` middleware:
- Content-Security-Policy
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- Strict-Transport-Security (in production)
- X-XSS-Protection

## Future Security Enhancements

- [ ] Rate limiting (express-rate-limit)
- [ ] Request logging and audit trail
- [ ] CSRF protection for cookie-based auth
- [ ] Content Security Policy for client
- [ ] Dependency vulnerability scanning in CI
- [ ] Security headers audit
- [ ] Penetration testing before production launch
