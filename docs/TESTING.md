# Testing

## Testing Strategy

### Overview

The project uses a comprehensive testing approach with different tools for different layers:

| Layer | Tool | Purpose |
|-------|------|---------|
| Frontend unit tests | Vitest + React Testing Library | Component and hook testing |
| Backend unit tests | Vitest + Supertest | API and service testing |
| Integration tests | Vitest + Supertest | End-to-end API flows |
| E2E tests | (Future) Playwright | Full user flow testing |

### Status

> **Note:** Testing infrastructure is planned for future phases. Currently, test scripts are configured as placeholders. Actual test files will be added as features are implemented.

## Test Commands

```bash
# Run all workspace tests
npm run test

# Run client tests
npm run test:client

# Run server tests
npm run test:server

# Run with coverage
npm run test -- --coverage
```

## Testing Principles

1. **Test behavior, not implementation** — Focus on what the code does, not how
2. **Arrange-Act-Assert** — Clear test structure
3. **One assertion per test** — Each test verifies one thing
4. **Descriptive names** — Test names explain the expected behavior
5. **No test interdependencies** — Tests can run in any order

## Planned Test Structure

### Client Tests (`client/src/**/*.test.tsx`)

```
client/src/
├── components/
│   └── common/
│       ├── Button.test.tsx
│       └── Input.test.tsx
├── features/
│   ├── auth/
│   │   └── LoginForm.test.tsx
│   └── rooms/
│       └── RoomList.test.tsx
├── hooks/
│   └── useSocket.test.ts
└── stores/
    └── authStore.test.ts
```

### Server Tests (`server/tests/`)

```
server/tests/
├── unit/
│   ├── controllers/
│   │   └── authController.test.ts
│   ├── services/
│   │   └── authService.test.ts
│   └── validators/
│       └── authValidator.test.ts
├── integration/
│   ├── auth.test.ts
│   ├── projects.test.ts
│   └── rooms.test.ts
└── helpers/
    ├── setup.ts
    └── fixtures.ts
```

### Execution Service Tests (`execution-service/tests/`)

```
execution-service/tests/
├── unit/
│   ├── runners/
│   │   └── javascriptRunner.test.ts
│   └── validators/
│       └── inputValidator.test.ts
└── integration/
    └── execution.test.ts
```

## Coverage Goals

- **Client components**: 80%+ coverage
- **Server controllers**: 90%+ coverage
- **Server services**: 90%+ coverage
- **Validators**: 100% coverage
- **Critical paths**: 100% coverage

## Mocking Strategy

- **API calls**: Mock with MSW (Mock Service Worker) for client tests
- **Database**: Use in-memory MongoDB (mongodb-memory-server) for server tests
- **Socket.IO**: Mock socket connections for real-time tests
- **Execution service**: Mock HTTP responses for server tests
- **File system**: Mock for execution service tests

## CI Integration (Planned)

Tests will run in CI on every push and pull request:
1. Install dependencies
2. Type check
3. Lint
4. Run tests with coverage
5. Report coverage to dashboard
