# Setup Guide

## Prerequisites

- **Node.js** >= 18.x (LTS recommended)
- **npm** >= 9.x
- **Git**
- **MongoDB Atlas** account (free tier works) — or local MongoDB for development
- **Docker** (optional, for containerized development)

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd collaborative-code-editor
```

### 2. Install Dependencies

This project uses npm workspaces. Running install at the root installs all workspace dependencies:

```bash
npm install
```

This will install dependencies for:
- `client/` — React frontend
- `server/` — Express backend
- `execution-service/` — Code execution service

### 3. Configure Environment Variables

Copy the example environment files and fill in your values:

```bash
# Client environment
cp client/.env.example client/.env

# Server environment
cp server/.env.example server/.env
```

#### Server `.env` Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORT` | Server port | No | `5000` |
| `NODE_ENV` | Environment mode (`development`, `production`, `test`) | No | `development` |
| `CLIENT_URL` | Allowed frontend origin(s) for CORS | No | `http://localhost:5173` |
| `MONGODB_URI` | MongoDB Atlas connection string | Production only | — |
| `JWT_SECRET` | JWT signing secret | Production (future) | — |
| `EXECUTION_SERVICE_URL` | Execution service URL | Future | — |

**Notes:**
- `MONGODB_URI` is optional in development. The server starts in "database-disabled" mode if not set.
- `MONGODB_URI` is **required** in production. The server will fail to start without it.
- Multiple CORS origins can be comma-separated: `http://localhost:5173,https://myapp.com`
- Never commit real credentials. Only use `.env.example` as a template.

#### Client `.env` Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API URL | `http://localhost:5000` |
| `VITE_SOCKET_URL` | Socket.IO server URL | `http://localhost:5000` |

### 4. MongoDB Setup

#### Option A: MongoDB Atlas (Recommended for production)

1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a cluster (free tier M0 is sufficient)
3. Create a database user
4. Add your IP to the network access whitelist
5. Get your connection string and set `MONGODB_URI` in `server/.env`

#### Option B: Local MongoDB

```bash
# Using Docker
docker run -d -p 27017:27017 --name mongo mongo:7

# Or install locally and start the service
```

## Development

### Start the Backend Server

```bash
npm run dev:server
```

The server will start on `http://localhost:5000`.

**Without MongoDB** (development mode):
- Server starts in database-disabled mode
- Health endpoints work normally
- `/api/v1/health/ready` reports database as "disabled"

**With MongoDB**:
- Server connects to MongoDB on startup
- `/api/v1/health/ready` reports database as "connected"

### Start the Frontend

```bash
npm run dev:client
```

The client will start on `http://localhost:3000` with API proxy to the backend.

### Start All Services

```bash
# Terminal 1: Backend
npm run dev:server

# Terminal 2: Frontend
npm run dev:client

# Terminal 3: Execution Service (optional)
npm run dev:execution
```

## Verification

### Check Server Health

```bash
# General health
curl http://localhost:5000/api/v1/health

# Liveness probe
curl http://localhost:5000/api/v1/health/live

# Readiness probe
curl http://localhost:5000/api/v1/health/ready
```

### Expected Responses

**Health** (always 200):
```json
{
  "success": true,
  "message": "Service is running",
  "data": {
    "service": "collaborative-code-editor-api",
    "version": "0.2.0",
    "status": "ok",
    "timestamp": "...",
    "uptime": 42
  }
}
```

**Readiness without MongoDB** (200, database disabled):
```json
{
  "success": true,
  "message": "Service is ready",
  "data": {
    "checks": {
      "database": { "status": "disabled" }
    }
  }
}
```

## Build

```bash
# Build all services
npm run build:all

# Build individually
npm run build:client    # Frontend → dist/
npm run build:server    # Backend → server/dist/
npm run build:execution # Execution service → execution-service/dist/
```

## Testing

```bash
# Run all workspace tests
npm run test

# Run server tests only
npm run test:server

# Run server tests in watch mode
npm run test:watch --workspace=server
```

## Type Checking

```bash
# Type check all workspaces
npm run typecheck

# Type check server only
npm run typecheck:server
```

## Troubleshooting

### Server won't start
```bash
# Check environment variables
cat server/.env

# Ensure PORT is valid (1-65535)
# Ensure CLIENT_URL is a valid URL
```

### Port already in use
```bash
# Find and kill the process
lsof -i :5000
kill -9 <PID>

# Or change PORT in server/.env
```

### Database connection fails
```bash
# Check MONGODB_URI format
# Must start with mongodb:// or mongodb+srv://

# In development, you can start without MongoDB
# Remove MONGODB_URI from server/.env
```

### TypeScript errors
```bash
npm run typecheck:server
```
