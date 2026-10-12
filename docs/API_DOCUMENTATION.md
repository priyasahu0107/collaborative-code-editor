# API Documentation

> **Status**: Health endpoints and authentication are implemented. Project management, collaboration, and execution endpoints are planned for future steps.

## Base URL

```
Development: http://localhost:5000/api/v1
Production: https://api.your-domain.com/api/v1
```

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "message": "Description of the result",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Human-readable error description",
  "error": {
    "code": "ERROR_CODE",
    "statusCode": 400
  }
}
```

---

## Implemented Endpoints

### Health Check

#### GET /api/v1/health

Returns general service status. Does not depend on database connectivity.

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Service is running",
  "data": {
    "service": "collaborative-code-editor-api",
    "version": "0.3.0",
    "status": "ok",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "uptime": 3600
  }
}
```

#### GET /api/v1/health/live

**Liveness probe** — confirms the application process is alive.
- Always returns 200 if the process is running.
- Does NOT check database connectivity.

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Service is alive",
  "data": {
    "service": "collaborative-code-editor-api",
    "status": "alive",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

#### GET /api/v1/health/ready

**Readiness probe** — confirms the application is ready to serve requests.
- Returns 200 when all dependencies (database) are ready.
- Returns 503 when a dependency is unavailable.

**Response** (200 OK — when ready):
```json
{
  "success": true,
  "message": "Service is ready",
  "data": {
    "service": "collaborative-code-editor-api",
    "status": "ready",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "checks": {
      "database": { "status": "connected" },
      "environment": "production"
    }
  }
}
```

---

### Authentication

All authentication endpoints use HTTP-only cookies for session management. The JWT token is never exposed to client-side JavaScript.

#### POST /api/v1/auth/register

Register a new user account.

**Request:**
```json
{
  "name": "Example User",
  "email": "user@example.com",
  "password": "StrongPassword123!"
}
```

**Validation Rules:**
- `name`: 1-100 characters, required
- `email`: Valid email format, max 255 characters, required
- `password`: 8-128 characters, must contain uppercase, lowercase, and number

**Response** (201 Created):
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "name": "Example User",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Headers:**
- `Set-Cookie: auth_token=<jwt>; HttpOnly; Secure; SameSite=Lax; Path=/`

**Errors:**
- `400` — Validation error (invalid input)
- `409` — Email already registered
- `429` — Rate limit exceeded (10 attempts per 15 minutes)

#### POST /api/v1/auth/login

Authenticate a user and establish a session.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "StrongPassword123!"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "name": "Example User",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Headers:**
- `Set-Cookie: auth_token=<jwt>; HttpOnly; Secure; SameSite=Lax; Path=/`

**Errors:**
- `400` — Validation error
- `401` — Invalid email or password (generic message to prevent enumeration)
- `403` — Account is disabled
- `429` — Rate limit exceeded

#### GET /api/v1/auth/me

Get the current authenticated user's profile.

**Headers:**
- `Cookie: auth_token=<jwt>`

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Current user retrieved",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "name": "Example User",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Errors:**
- `401` — Not authenticated or token expired/invalid

#### POST /api/v1/auth/logout

Clear the authentication session.

**Headers:**
- `Cookie: auth_token=<jwt>`

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Logout successful"
}
```

**Headers:**
- `Set-Cookie: auth_token=; Max-Age=0; Path=/`

**Note:** The JWT token remains valid until expiration (15 minutes by default). Logout only clears the cookie. For immediate token invalidation, a token revocation list would be needed (not implemented).

---

## Planned Endpoints (Not Yet Implemented)

### Projects (`/api/v1/projects`)

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/api/v1/projects` | List user's projects | 🔲 Planned |
| POST | `/api/v1/projects` | Create project | 🔲 Planned |
| GET | `/api/v1/projects/:id` | Get project details | 🔲 Planned |
| PATCH | `/api/v1/projects/:id` | Update project | 🔲 Planned |
| DELETE | `/api/v1/projects/:id` | Delete project | 🔲 Planned |

### Rooms (`/api/v1/rooms`)

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/api/v1/rooms` | List rooms | 🔲 Planned |
| POST | `/api/v1/rooms` | Create room | 🔲 Planned |
| GET | `/api/v1/rooms/:id` | Get room details | 🔲 Planned |

### Execution (`/api/v1/execution`)

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| POST | `/api/v1/execution/run` | Execute code | 🔲 Planned |
| GET | `/api/v1/execution/:id` | Get execution result | 🔲 Planned |

---

## Authentication Flow

### Registration
1. Client sends POST `/api/v1/auth/register` with name, email, password
2. Server validates input with Zod
3. Server checks if email already exists
4. Server hashes password with bcrypt (12 rounds)
5. Server creates user in MongoDB
6. Server generates JWT (15 min expiry)
7. Server sets HTTP-only cookie with JWT
8. Server returns user profile (no password hash)

### Login
1. Client sends POST `/api/v1/auth/login` with email, password
2. Server validates input with Zod
3. Server finds user by email
4. Server compares password with bcrypt
5. Server generates JWT (15 min expiry)
6. Server sets HTTP-only cookie with JWT
7. Server returns user profile

### Protected Requests
1. Client includes cookie automatically (withCredentials: true)
2. Server extracts JWT from cookie
3. Server verifies JWT signature, expiration, issuer, audience
4. Server attaches user context to request
5. Route handler accesses `req.auth.userId` and `req.auth.email`

### Logout
1. Client sends POST `/api/v1/auth/logout`
2. Server clears the authentication cookie
3. JWT remains valid until expiration (no server-side revocation)

## Rate Limiting

- **Authentication endpoints** (register, login): 10 requests per 15 minutes per IP
- **General API**: 100 requests per 15 minutes per IP

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `NOT_FOUND` | 404 | Route or resource not found |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `INVALID_JSON` | 400 | Malformed JSON in request body |
| `UNAUTHORIZED` | 401 | Authentication required or failed |
| `FORBIDDEN` | 403 | Account disabled or insufficient permissions |
| `CONFLICT` | 409 | Resource already exists (e.g., duplicate email) |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

## Frontend Integration

### Axios Configuration
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
  withCredentials: true, // Required for cookie-based auth
});

// Register
await api.post('/api/v1/auth/register', {
  name: 'User Name',
  email: 'user@example.com',
  password: 'Password123!',
});

// Login
await api.post('/api/v1/auth/login', {
  email: 'user@example.com',
  password: 'Password123!',
});

// Get current user
const { data } = await api.get('/api/v1/auth/me');

// Logout
await api.post('/api/v1/auth/logout');
```

### CORS Configuration
The server is configured to accept credentials from `CLIENT_URL` (default: `http://localhost:5173`). Multiple origins can be comma-separated.
