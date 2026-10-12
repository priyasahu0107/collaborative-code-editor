# API Documentation

> **Status**: Health endpoints are implemented. All other endpoints are planned for future steps.

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
    "version": "0.2.0",
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
- Use for Kubernetes liveness probes or load balancer health checks.

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
- Use for Kubernetes readiness probes.

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
      "database": {
        "status": "connected"
      },
      "environment": "production"
    }
  }
}
```

**Response** (503 Service Unavailable — when not ready):
```json
{
  "success": false,
  "message": "Service is not ready",
  "data": {
    "service": "collaborative-code-editor-api",
    "status": "not_ready",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "checks": {
      "database": {
        "status": "error",
        "message": "Connection timed out. Check network connectivity and firewall rules."
      },
      "environment": "production"
    }
  }
}
```

**Database status values:**
- `connected` — Database is connected and ready
- `connecting` — Connection in progress
- `disconnected` — Not connected
- `error` — Connection failed (safe diagnostic message included)
- `disabled` — No database configured (development mode)

### API Root

#### GET /api/v1

Returns API information.

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Collaborative Code Editor API",
  "data": {
    "version": "0.2.0",
    "documentation": "/api/v1/health"
  }
}
```

---

## Planned Endpoints (Not Yet Implemented)

### Authentication (`/api/v1/auth`)

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| POST | `/api/v1/auth/register` | Register new user | 🔲 Planned |
| POST | `/api/v1/auth/login` | Login user | 🔲 Planned |
| POST | `/api/v1/auth/refresh` | Refresh JWT token | 🔲 Planned |
| POST | `/api/v1/auth/logout` | Logout | 🔲 Planned |
| GET | `/api/v1/auth/me` | Get current user | 🔲 Planned |

### Users (`/api/v1/users`)

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/api/v1/users/:id` | Get user by ID | 🔲 Planned |
| PATCH | `/api/v1/users/:id` | Update user profile | 🔲 Planned |

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

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `NOT_FOUND` | 404 | Route or resource not found |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `INVALID_JSON` | 400 | Malformed JSON in request body |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

## Authentication (Future)

All endpoints except health checks will require a valid JWT token:

```
Authorization: Bearer <token>
```
