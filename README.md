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
```

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
| `npm run build` | Build frontend for production |
| `npm run build:all` | Build all workspaces |
| `npm run typecheck` | Type-check all workspaces |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check formatting |

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
