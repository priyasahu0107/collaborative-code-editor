# Database Schema

> **Status: PLANNED** — These schemas are designed but not yet implemented. They will be created when Phase 2 (Authentication & Projects) begins.

## Overview

The application uses MongoDB Atlas with Mongoose ODM. All collections are defined below with their planned structure.

## Collections

### `users`

Stores registered user accounts.

```typescript
// Planned schema (not implemented)
interface User {
  _id: ObjectId;
  username: string;          // Unique, 3-30 chars
  email: string;             // Unique, valid email
  passwordHash: string;      // bcrypt hash
  displayName: string;       // Display name
  avatarUrl?: string;        // Optional avatar
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:**
- `username` — unique
- `email` — unique

### `projects`

Groups related rooms and files together.

```typescript
// Planned schema (not implemented)
interface Project {
  _id: ObjectId;
  name: string;              // Project name
  description?: string;      // Optional description
  owner: ObjectId;           // Reference to User
  members: Array<{
    user: ObjectId;          // Reference to User
    role: 'owner' | 'editor' | 'viewer';
    joinedAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:**
- `owner` — index
- `members.user` — index

### `rooms`

Individual collaboration sessions within a project.

```typescript
// Planned schema (not implemented)
interface Room {
  _id: ObjectId;
  name: string;              // Room name
  project: ObjectId;         // Reference to Project
  createdBy: ObjectId;       // Reference to User
  language: string;          // Primary language (javascript, python, etc.)
  isActive: boolean;         // Whether room is active
  documentState?: Buffer;    // Serialized Yjs document state
  maxParticipants: number;   // Max concurrent users
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:**
- `project` — index
- `isActive` — index

### `messages`

Chat messages within rooms.

```typescript
// Planned schema (not implemented)
interface Message {
  _id: ObjectId;
  room: ObjectId;            // Reference to Room
  sender: ObjectId;          // Reference to User
  content: string;           // Message text (max 2000 chars)
  type: 'text' | 'system';  // Message type
  createdAt: Date;
}
```

**Indexes:**
- `room` + `createdAt` — compound index
- `sender` — index

### `executions`

Log of code execution requests.

```typescript
// Planned schema (not implemented)
interface Execution {
  _id: ObjectId;
  room: ObjectId;            // Reference to Room
  user: ObjectId;            // Reference to User
  language: string;          // Execution language
  code: string;              // Submitted code
  input?: string;            // Standard input
  output?: string;           // Standard output
  error?: string;            // Standard error
  exitCode: number;          // Process exit code
  executionTime: number;     // Milliseconds
  status: 'pending' | 'running' | 'completed' | 'error' | 'timeout';
  createdAt: Date;
}
```

**Indexes:**
- `room` + `createdAt` — compound index
- `user` — index

## Relationships

```
User (1) ──── (N) Project (owner)
User (N) ──── (N) Project (members)
Project (1) ──── (N) Room
Room (1) ──── (N) Message
Room (1) ──── (N) Execution
User (1) ──── (N) Message (sender)
User (1) ──── (N) Execution (user)
```

## Notes

- All timestamps use `Date` type with automatic `createdAt`/`updatedAt` via Mongoose timestamps option
- ObjectId references use Mongoose `ref` for population
- The `documentState` field in Room stores the serialized Yjs document for persistence
- Password hashing will use bcrypt with a cost factor of 12
- Sensitive data (passwords) will never be returned in API responses
