# Socket Events

> **Status: PLANNED** — These events are designed but not yet implemented. The Socket.IO server is initialized but no application events are handled yet.

## Connection

### Client → Server

| Event | Payload | Description | Status |
|-------|---------|-------------|--------|
| `connection` | — | Client connects (automatic) | ✅ Active (logging only) |
| `disconnect` | `reason: string` | Client disconnects | ✅ Active (logging only) |

---

## Room Events

### Join Room

**Client → Server:**
```typescript
// 🔲 Planned
socket.emit('room:join', {
  roomId: string,
  token?: string  // JWT for authenticated users
});
```

**Server → Client:**
```typescript
// 🔲 Planned
socket.on('room:joined', (data: {
  roomId: string,
  document: Uint8Array,  // Current Yjs document state
  participants: Participant[]
}));
```

### Leave Room

**Client → Server:**
```typescript
// 🔲 Planned
socket.emit('room:leave', { roomId: string });
```

---

## Collaboration Events (Yjs)

### Document Update

**Client → Server:**
```typescript
// 🔲 Planned
socket.emit('collaboration:update', {
  roomId: string,
  update: Uint8Array  // Yjs binary update
});
```

**Server → All Clients in Room:**
```typescript
// 🔲 Planned
socket.on('collaboration:update', (data: {
  roomId: string,
  update: Uint8Array,
  senderId: string
}));
```

### Awareness (Presence)

**Client → Server:**
```typescript
// 🔲 Planned
socket.emit('collaboration:awareness', {
  roomId: string,
  awareness: {
    cursor: { line: number, column: number },
    selection: { start: Position, end: Position } | null,
    color: string,
    displayName: string
  }
});
```

**Server → All Clients in Room:**
```typescript
// 🔲 Planned
socket.on('collaboration:awareness', (data: {
  roomId: string,
  clientId: string,
  awareness: AwarenessState
}));
```

---

## Chat Events

### Send Message

**Client → Server:**
```typescript
// 🔲 Planned
socket.emit('chat:message', {
  roomId: string,
  content: string  // Max 2000 characters
});
```

**Server → All Clients in Room:**
```typescript
// 🔲 Planned
socket.on('chat:message', (data: {
  id: string,
  roomId: string,
  sender: {
    id: string,
    displayName: string,
    color: string
  },
  content: string,
  createdAt: string
}));
```

---

## Presence Events

### User Joined

**Server → All Clients in Room:**
```typescript
// 🔲 Planned
socket.on('presence:joined', (data: {
  roomId: string,
  user: {
    id: string,
    displayName: string,
    color: string,
    joinedAt: string
  }
}));
```

### User Left

**Server → All Clients in Room:**
```typescript
// 🔲 Planned
socket.on('presence:left', (data: {
  roomId: string,
  userId: string
}));
```

### Participant List

**Server → Client:**
```typescript
// 🔲 Planned
socket.on('presence:list', (data: {
  roomId: string,
  participants: Array<{
    id: string,
    displayName: string,
    color: string,
    cursor?: CursorPosition,
    isTyping: boolean
  }>
}));
```

---

## Execution Events

### Execute Code

**Client → Server:**
```typescript
// 🔲 Planned
socket.emit('execution:run', {
  roomId: string,
  language: string,
  code: string,
  input?: string
});
```

### Execution Result

**Server → All Clients in Room:**
```typescript
// 🔲 Planned
socket.on('execution:result', (data: {
  roomId: string,
  executionId: string,
  userId: string,
  language: string,
  output: string,
  error: string,
  exitCode: number,
  executionTime: number,
  status: 'completed' | 'error' | 'timeout'
}));
```

---

## Error Events

**Server → Client:**
```typescript
// 🔲 Planned
socket.on('error', (data: {
  code: string,
  message: string
}));
```

## Event Naming Convention

- `namespace:action` format
- Namespaces: `room`, `collaboration`, `chat`, `presence`, `execution`
- Actions: `join`, `leave`, `update`, `message`, `joined`, `left`, `run`, `result`
