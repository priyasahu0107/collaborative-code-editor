# Collaborative Code Editor

A real-time collaborative code editor that allows multiple users to code together simultaneously, with features including live code editing, chat, and remote code execution.

## Technology Stack

### Frontend
- **React 18** + **TypeScript** — UI framework
- **Vite** — Build tool and dev server
- **Tailwind CSS** — Utility-first styling
- **Monaco Editor** — VS Code-powered code editor
- **Socket.IO Client** — Real-time communication
- **Yjs** — CRDT-based collaborative editing
- **Zustand** — State management
- **Zod** — Runtime validation

### Backend
- **Node.js** + **Express.js** + **TypeScript** — API server
- **MongoDB Atlas** + **Mongoose** — Database
- **Socket.IO** — WebSocket server
- **Yjs** + **y-websocket** — CRDT synchronization
- **Zod** — Request validation

### Infrastructure
- **Docker** + **Docker Compose** — Containerization
- **npm workspaces** — Monorepo management
- **Isolated execution service** — Safe code execution

## Prerequisites

- Node.js >= 18.x
- npm >= 9.x
- MongoDB Atlas account (or local MongoDB for development)
- Docker (optional, for containerized development)

## Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd collaborative-code-editor

# Install all workspace dependencies
npm install

# Copy environment files
cp client/.env.example client/.env
cp server/.env.example server/.env

# Start development servers
npm run dev:client   # Frontend on http://localhost:3000
npm run dev:server   # Backend on http://localhost:5000

# Verify the backend is running
curl http://localhost:5000/api/v1/health
curl http://localhost:5000/api/v1/health/live
curl http://localhost:5000/api/v1/health/ready

# Run server tests
npm run test:server
```

> **Note**: The server starts without MongoDB in development mode. Health endpoints work immediately.
> Set `MONGODB_URI` in `server/.env` to enable database connectivity.

## Project Structure

```
collaborative-code-editor/
├── client/              # React frontend
├── server/              # Express backend
├── execution-service/   # Isolated code execution
├── docs/                # Project documentation
└── package.json         # Workspace root
```

See [docs/FOLDER_STRUCTURE.md](docs/FOLDER_STRUCTURE.md) for detailed structure.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start frontend dev server |
| `npm run dev:server` | Start backend dev server |
| `npm run dev:execution` | Start execution service |
| `npm run build` | Build frontend for production |
| `npm run build:all` | Build all workspaces |
| `npm run typecheck` | Type-check all workspaces |
| `npm run test` | Run all workspace tests |
| `npm run test:server` | Run server tests |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check formatting |

## Current Status

- ✅ **Step 1**: Foundation setup (monorepo, configs, docs)
- ✅ **Step 2**: Backend foundation (Express, env validation, MongoDB, health checks)
- ✅ **Step 3**: Authentication & user management (JWT, bcrypt, HTTP-only cookies)
- ✅ **Step 4**: Project & file management (CRUD, optimistic concurrency, path validation)
- ✅ **Step 5**: Frontend dashboard, project management, file explorer, Monaco editor
- ✅ **Step 6**: Real-time collaboration (Yjs + Socket.IO + MongoDB persistence)
- ✅ **Step 7**: Chat, invitations & permissions (role-based access, real-time chat, project invitations)
- 🔲 **Step 8**: Code execution service (future)

## Documentation

- [Project Overview](docs/PROJECT_OVERVIEW.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Folder Structure](docs/FOLDER_STRUCTURE.md)
- [Database Schema](docs/DATABASE_SCHEMA.md)
- [API Documentation](docs/API_DOCUMENTATION.md)
- [Socket Events](docs/SOCKET_EVENTS.md)
- [Security](docs/SECURITY.md)
- [Testing](docs/TESTING.md)
- [Setup Guide](docs/SETUP.md)
- [Progress](docs/PROGRESS.md)

## License

MIT
