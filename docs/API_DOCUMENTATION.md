# API Documentation

> **Status: PLANNED** — These endpoints are designed but not yet implemented. Only the health check endpoint is currently active.

## Base URL

```
Development: http://localhost:5000/api
Production: https://api.your-domain.com/api
```

## Currently Implemented

### Health Check

```
GET /api/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "collaborative-code-editor-server"
}
```

### API Info

```
GET /api
```

**Response:**
```json
{
  "message": "Collaborative Code Editor API",
  "version": "0.1.0"
}
```

---

## Planned Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| POST | `/api/auth/register` | Register new user | 🔲 Planned |
| POST | `/api/auth/login` | Login user | 🔲 Planned |
| POST | `/api/auth/refresh` | Refresh JWT token | 🔲 Planned |
| POST | `/api/auth/logout` | Logout (invalidate token) | 🔲 Planned |
| GET | `/api/auth/me` | Get current user profile | 🔲 Planned |

### Users (`/api/users`)

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/api/users/:id` | Get user by ID | 🔲 Planned |
| PATCH | `/api/users/:id` | Update user profile | 🔲 Planned |
| GET | `/api/users/search?q=` | Search users | 🔲 Planned |

### Projects (`/api/projects`)

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/api/projects` | List user's projects | 🔲 Planned |
| POST | `/api/projects` | Create project | 🔲 Planned |
| GET | `/api/projects/:id` | Get project details | 🔲 Planned |
| PATCH | `/api/projects/:id` | Update project | 🔲 Planned |
| DELETE | `/api/projects/:id` | Delete project | 🔲 Planned |
| POST | `/api/projects/:id/members` | Add member | 🔲 Planned |
| DELETE | `/api/projects/:id/members/:userId` | Remove member | 🔲 Planned |

### Rooms (`/api/rooms`)

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/api/projects/:projectId/rooms` | List rooms in project | 🔲 Planned |
| POST | `/api/projects/:projectId/rooms` | Create room | 🔲 Planned |
| GET | `/api/rooms/:id` | Get room details | 🔲 Planned |
| PATCH | `/api/rooms/:id` | Update room | 🔲 Planned |
| DELETE | `/api/rooms/:id` | Delete room | 🔲 Planned |

### Execution (`/api/execution`)

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| POST | `/api/execution/run` | Execute code | 🔲 Planned |
| GET | `/api/execution/:id` | Get execution result | 🔲 Planned |
| GET | `/api/rooms/:roomId/executions` | List room executions | 🔲 Planned |

## Authentication

All endpoints except `/api/auth/register`, `/api/auth/login`, and `/api/health` will require a valid JWT token in the `Authorization` header:

```
Authorization: Bearer <token>
```

## Response Format

### Success
```json
{
  "success": true,
  "data": { ... }
}
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [...]
  }
}
```

## Rate Limiting (Planned)

- Auth endpoints: 10 requests per minute
- API endpoints: 100 requests per minute
- Execution endpoints: 20 requests per minute
