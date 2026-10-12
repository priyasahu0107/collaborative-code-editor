# Folder Structure

This document explains the purpose of each directory and which code belongs where.

## Root Level

```
collaborative-code-editor/
├── client/              # Frontend React application
├── server/              # Backend Express application
├── execution-service/   # Execution API (source execution disabled)
├── docs/                # Project documentation
├── .gitignore           # Git ignore rules
├── .prettierrc.json     # Prettier formatting config
├── .prettierignore      # Prettier ignore rules
├── package.json         # Workspace root (npm workspaces)
└── README.md            # Project readme
```

## Client (`client/`)

```
client/
├── public/
│   ├── images/          # Static images (logos, backgrounds)
│   └── icons/           # Favicon and app icons
├── src/
│   ├── assets/          # Imported assets (SVGs, fonts)
│   ├── components/
│   │   ├── common/      # Shared UI primitives (Button, Input, Modal)
│   │   ├── ui/          # Design system components
│   │   ├── layout/      # Layout wrappers (Header, Sidebar, Footer)
│   │   ├── editor/      # Monaco editor wrapper and config
│   │   ├── collaboration/ # Presence indicators, cursor overlays
│   │   └── chat/        # Chat message components
│   ├── pages/           # Route-level page components
│   ├── features/        # Feature-specific logic grouped by domain
│   │   ├── auth/        # Login, register, token management
│   │   ├── projects/    # Project CRUD, project list
│   │   ├── rooms/       # Room creation, room list, room settings
│   │   ├── collaboration/ # Yjs document management, sync logic
│   │   ├── chat/        # Chat message handling, message list
│   │   └── execution/   # Code execution requests and results
│   ├── hooks/           # Custom React hooks
│   ├── services/        # API client, HTTP helpers
│   ├── sockets/         # Socket.IO client connection and event handlers
│   ├── stores/          # Zustand stores (global state)
│   ├── schemas/         # Zod validation schemas
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Pure utility functions
│   ├── routes/          # React Router route definitions
│   ├── styles/          # Global styles, Tailwind config extensions
│   ├── App.tsx          # Root component
│   └── main.tsx         # React entry point
├── .env.example         # Environment variable template
├── index.html           # HTML entry point
├── package.json         # Client dependencies
├── tsconfig.json        # TypeScript config
├── vite.config.ts       # Vite config with proxy
└── vite-env.d.ts        # Vite environment type declarations
```

### Where to put new client code:
- **Reusable UI components** → `components/common/` or `components/ui/`
- **Page-level components** → `pages/`
- **Feature logic (hooks, stores, API calls)** → `features/<domain>/`
- **Socket event handlers** → `sockets/`
- **Zustand stores** → `stores/`
- **API service functions** → `services/`
- **Type definitions** → `types/`
- **Validation schemas** → `schemas/`

## Server (`server/`)

```
server/
├── src/
│   ├── config/          # Environment config, database connection
│   ├── models/          # Mongoose model definitions
│   ├── controllers/     # Route handler logic
│   ├── services/        # Business logic layer
│   ├── repositories/    # Data access layer (MongoDB queries)
│   ├── routes/          # Express route definitions
│   ├── middleware/       # Auth, error handling, validation middleware
│   ├── sockets/         # Socket.IO event handlers
│   ├── modules/         # Feature modules (domain-driven)
│   │   ├── auth/        # Authentication logic
│   │   ├── users/       # User management
│   │   ├── projects/    # Project operations
│   │   ├── rooms/       # Room management
│   │   ├── collaboration/ # Real-time sync logic
│   │   ├── chat/        # Chat functionality
│   │   └── execution/   # Code execution proxy
│   ├── validators/      # Zod request validation schemas
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   ├── app.ts           # Express app setup (middleware, routes)
│   └── server.ts        # HTTP server + Socket.IO initialization
├── tests/               # Server test files
├── .env.example         # Environment variable template
├── package.json         # Server dependencies
└── tsconfig.json        # TypeScript config
```

### Where to put new server code:
- **Mongoose models** → `models/`
- **Route handlers** → `controllers/` or `modules/<domain>/`
- **Business logic** → `services/` or `modules/<domain>/`
- **Database queries** → `repositories/`
- **Route definitions** → `routes/`
- **Socket event handlers** → `sockets/` or `modules/<domain>/`
- **Middleware** → `middleware/`
- **Validation schemas** → `validators/`

## Execution Service (`execution-service/`)

```
execution-service/
├── src/
│   ├── app.ts            # Disabled execution API
│   ├── validators/       # Request validation
│   └── server.ts         # Express server entry point
├── tests/               # API and fail-closed behavior tests
└── package.json         # Dependencies
```

## Documentation (`docs/`)

```
docs/
├── PROJECT_OVERVIEW.md  # Scope, users, features, milestones
├── ARCHITECTURE.md      # System design and communication flow
├── FOLDER_STRUCTURE.md  # This file
├── DATABASE_SCHEMA.md   # Planned MongoDB collections
├── API_DOCUMENTATION.md # Planned API endpoints
├── SOCKET_EVENTS.md     # Planned Socket.IO events
├── SECURITY.md          # Security requirements and design
├── TESTING.md           # Testing strategy
├── SETUP.md             # Installation and setup guide
└── PROGRESS.md          # Task tracking and status
```
