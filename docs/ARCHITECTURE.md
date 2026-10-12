# Architecture

## System Overview

The application follows a three-service architecture:

```
┌─────────────┐     HTTP/WS     ┌──────────────┐     HTTP      ┌─────────────────────┐
│   Client    │ ◄──────────────► │    Server    │ ◄───────────► │ Execution Service   │
│  (React)    │                 │  (Express)   │               │  (Isolated)         │
│  Port 3000  │                 │  Port 5000   │               │  Port 4000          │
└─────────────┘                 └──────┬───────┘               └─────────────────────┘
                                       │
                                       │ Mongoose
                                       ▼
                                ┌──────────────┐
                                │ MongoDB Atlas│
                                └──────────────┘
```

## Service Responsibilities

### Client (`client/`)
- **Role**: User interface and real-time collaboration frontend
- **Technology**: React 18, TypeScript, Vite, Tailwind CSS
- **Responsibilities**:
  - Render the Monaco code editor
  - Manage Socket.IO connections
  - Synchronize Yjs documents
  - Handle user authentication state
  - Display presence and collaboration indicators
  - Send/receive chat messages

### Server (`server/`)
- **Role**: API server and real-time coordination hub
- **Technology**: Node.js, Express, TypeScript, Socket.IO, Mongoose
- **Responsibilities**:
  - REST API for CRUD operations
  - WebSocket server for real-time events
  - Yjs document hosting and synchronization
  - User authentication and authorization
  - Room and project management
  - Proxy execution requests to the execution service

### Execution Service (`execution-service/`)
- **Role**: Separate execution API; execution is disabled until a secure sandbox runtime is deployed
- **Technology**: Node.js, Express, TypeScript
- **Responsibilities**:
  - Report execution availability and supported languages
  - Reject execution requests with `503 EXECUTION_DISABLED`
  - Never evaluate user code or spawn a process for user source

## Communication Flow

### REST API Flow
```
Client → HTTP Request → Server → MongoDB → Response → Client
```

### Real-Time Collaboration Flow
```
Client A → Socket.IO → Server → Yjs Sync → Socket.IO → Client B
                    ↕
                 MongoDB (persistence)
```

### Code Execution Flow
```
Authenticated client → API server → execution API
Execution API → 503 EXECUTION_DISABLED → API server → client
```

## Data Flow

1. **User opens a room**: Client connects via Socket.IO, server loads Yjs document from MongoDB
2. **User types code**: Monaco Editor captures changes, Yjs creates CRDT update, sent via Socket.IO
3. **Server broadcasts**: Server applies update to shared Yjs document, broadcasts to all clients
4. **Other clients receive**: Their Yjs instances merge the update, Monaco displays the change
5. **Periodic persistence**: Server saves document state to MongoDB

## Security Boundaries

- **Client ↔ Server**: HTTPS + WSS in production, JWT authentication
- **Server ↔ MongoDB**: Connection string with authentication
- **Server ↔ Execution Service**: Internal network, no external exposure
- **Execution Service**: Code remains disabled until isolation can be enforced by the host runtime

## Backend Structure (Step 2)

The server follows a layered architecture:

```
server/src/
├── config/          # Environment, database, CORS configuration
├── controllers/     # Route handler logic
├── middleware/       # Error handling, 404, auth (future)
├── routes/          # Express route definitions
├── types/           # TypeScript type augmentations
├── utils/           # Logger, helpers
├── app.ts           # Express app setup (no port binding)
└── server.ts        # HTTP server + startup + shutdown
```

### Configuration Layer
- `env.ts` — Zod-validated environment variables. Fails fast in production.
- `database.ts` — Mongoose connection with status tracking. Supports disabled mode.
- `cors.ts` — Origin-restricted CORS with credential support.

### Startup Policy
- **Development**: Server starts even without MongoDB (database-disabled mode).
- **Production**: Fails fast if required configuration is missing.
- **Test**: Does not connect to database or bind to real ports.

## Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| CRDT library | Yjs | Battle-tested, Monaco integration, language-agnostic |
| Real-time | Socket.IO | Reliable fallback, room support, TypeScript types |
| Database | MongoDB Atlas | Flexible schema, free tier, good Mongoose support |
| Editor | Monaco | VS Code quality, language support, extensible |
| State | Zustand | Lightweight, TypeScript-first, simple API |
| Validation | Zod | Runtime + compile-time types, composable schemas |
| Execution | Disabled pending OS-enforced isolation | Untrusted source must not run in the API process or an unrestricted child process |
| Testing | Vitest + Supertest | Fast, TypeScript-native, compatible with ESM |
