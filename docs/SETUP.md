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

#### Client `.env` Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API URL | `http://localhost:5000` |
| `VITE_SOCKET_URL` | Socket.IO server URL | `http://localhost:5000` |

#### Server `.env` Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/collaborative-editor` |
| `CLIENT_ORIGIN` | Allowed frontend origin | `http://localhost:3000` |
| `JWT_SECRET` | JWT signing secret | `change-me-in-production` |
| `JWT_EXPIRES_IN` | JWT token expiration | `7d` |
| `EXECUTION_SERVICE_URL` | Execution service URL | `http://localhost:4000` |
| `NODE_ENV` | Environment | `development` |

### 4. MongoDB Setup

#### Option A: MongoDB Atlas (Recommended for production)

1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a cluster (free tier M0 is sufficient)
3. Create a database user
4. Add your IP to the network access whitelist
5. Get your connection string and update `MONGODB_URI` in `server/.env`

#### Option B: Local MongoDB

```bash
# Using Docker
docker run -d -p 27017:27017 --name mongo mongo:7

# Or install locally and start the service
```

## Development

### Start All Services

Open separate terminal windows:

```bash
# Terminal 1: Frontend
npm run dev:client
# → http://localhost:3000

# Terminal 2: Backend
npm run dev:server
# → http://localhost:5000

# Terminal 3: Execution Service (optional)
npm run dev:execution
# → http://localhost:4000
```

### Or use Docker Compose

```bash
docker-compose up --build
```

## Verification

After starting the services, verify they're working:

```bash
# Check server health
curl http://localhost:5000/api/health

# Check execution service health
curl http://localhost:4000/health

# Open frontend in browser
open http://localhost:3000
```

## Build for Production

```bash
# Build all services
npm run build:all

# Or build individually
npm run build:client
npm run build:server
npm run build:execution
```

## Troubleshooting

### Port already in use
```bash
# Find and kill the process
lsof -i :3000  # or :5000, :4000
kill -9 <PID>
```

### Dependencies issues
```bash
# Clean and reinstall
npm run clean
npm install
```

### TypeScript errors
```bash
# Run type checking
npm run typecheck
```

### Build errors
```bash
# Check individual workspace builds
npm run build:client
npm run build:server
```
