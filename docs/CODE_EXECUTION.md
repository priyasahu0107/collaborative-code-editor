# Code Execution System

## Overview

The code execution system provides secure, isolated code execution capabilities for the collaborative code editor. It allows users to run code in multiple programming languages within Docker containers, ensuring complete isolation from the host system and other users' code.

## Architecture

### Components

1. **Execution Service** (`execution-service/`)
   - Standalone microservice running on port 4000
   - Handles actual code execution in Docker containers
   - Provides REST API for execution requests
   - Implements security controls and resource limits

2. **Main Server Integration** (`server/src/modules/execution/`)
   - API endpoints for execution requests
   - Authentication and authorization
   - Project and file validation
   - Communication with execution service

3. **Frontend Integration** (`client/src/components/execution/`)
   - Execution output panel
   - Real-time execution status
   - Result display with stdout/stderr

### Execution Flow

```
User clicks "Run" in editor
    ↓
Frontend sends POST /api/v1/execution/execute
    ↓
Main server validates:
  - User authentication
  - Project ownership/membership
  - File belongs to project
  - Input validation (size, language)
    ↓
Main server forwards to execution service
    ↓
Execution service:
  - Creates isolated Docker container
  - Applies security constraints
  - Executes code
  - Captures output
  - Enforces timeouts
    ↓
Results returned to main server
    ↓
Results returned to frontend
    ↓
Output displayed in execution panel
```

## Security Features

### Isolation

- **Docker Containers**: Each execution runs in a fresh, isolated container
- **No Network Access**: Containers have no outbound network connectivity
- **Read-Only Filesystem**: Container filesystem is read-only except for /tmp
- **Non-Root User**: Code executes as unprivileged user (UID 1000)
- **No Privilege Escalation**: `no-new-privileges` security option enabled

### Resource Limits

- **Memory**: 256MB per execution
- **CPU**: 1 CPU core
- **Process Limit**: 64 processes/threads
- **Execution Time**: 10 seconds default, 30 seconds maximum
- **Code Size**: 64KB maximum
- **Input Size**: 10KB maximum
- **Output Size**: 1MB maximum (stdout/stderr)

### Security Controls

- Temporary working directory created per execution
- Automatic cleanup after execution (success, failure, or timeout)
- No access to host filesystem
- No access to other containers
- No Docker socket access
- Seccomp profile for syscall filtering
- AppArmor profile (when available)

## Supported Languages

### Currently Supported

| Language | Version | Status | Notes |
|----------|---------|--------|-------|
| JavaScript | Node.js 20 | ✅ Active | Default language |
| TypeScript | Node.js 20 + tsc | ✅ Active | Compiled to JS before execution |
| Python | Python 3.11 | ✅ Active | |

### Planned Languages

| Language | Status | Notes |
|----------|--------|-------|
| Java | 🔲 Planned | Requires JDK, longer startup time |
| C++ | 🔲 Planned | Requires g++, compilation step |
| Go | 🔲 Planned | Requires Go toolchain |
| Rust | 🔲 Planned | Requires rustc, longer compilation |

## API Endpoints

### Execute Code

**POST** `/api/v1/execution/execute`

Execute code in a secure, isolated environment.

**Authentication**: Required (JWT cookie)

**Request Body**:
```json
{
  "projectId": "string (MongoDB ObjectId)",
  "fileId": "string (MongoDB ObjectId, optional)",
  "language": "string (javascript|typescript|python)",
  "code": "string (max 64KB)",
  "stdin": "string (max 10KB, optional)",
  "timeout": "number (milliseconds, 1000-30000, optional)"
}
```

**Response** (Success):
```json
{
  "success": true,
  "data": {
    "stdout": "string",
    "stderr": "string",
    "exitCode": 0,
    "executionTime": 1234,
    "timedOut": false
  }
}
```

**Response** (Error):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR|EXECUTION_ERROR|TIMEOUT|SERVICE_UNAVAILABLE",
    "message": "string"
  }
}
```

**Authorization**:
- User must be authenticated
- User must be project owner or editor (not viewer)
- File (if provided) must belong to the project

**Error Codes**:
- `VALIDATION_ERROR`: Invalid input (size, format, etc.)
- `EXECUTION_ERROR`: Code execution failed
- `TIMEOUT`: Execution exceeded time limit
- `SERVICE_UNAVAILABLE`: Execution service not running
- `PERMISSION_DENIED`: User lacks execution permission
- `PROJECT_NOT_FOUND`: Project doesn't exist
- `FILE_NOT_FOUND`: File doesn't exist or doesn't belong to project

### Get Supported Languages

**GET** `/api/v1/execution/languages`

Get list of supported programming languages.

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "javascript",
      "name": "JavaScript",
      "supported": true
    },
    {
      "id": "typescript",
      "name": "TypeScript",
      "supported": true
    },
    {
      "id": "python",
      "name": "Python",
      "supported": true
    }
  ]
}
```

### Health Check

**GET** `/api/v1/execution/health`

Check execution service health status.

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "data": {
    "status": "healthy|unhealthy",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

## Execution Service API

The execution service runs independently and provides its own API.

### Health Check

**GET** `/health`

```json
{
  "status": "ok",
  "service": "execution-service",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "activeExecutions": 2,
  "maxConcurrent": 10
}
```

### Get Languages

**GET** `/languages`

```json
{
  "success": true,
  "data": [
    {
      "id": "javascript",
      "name": "JavaScript",
      "supported": true
    }
  ]
}
```

### Execute Code

**POST** `/execute`

```json
{
  "code": "console.log('Hello, World!');",
  "language": "javascript",
  "stdin": "",
  "timeout": 10000
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "stdout": "Hello, World!\n",
    "stderr": "",
    "exitCode": 0,
    "executionTime": 123,
    "timedOut": false
  }
}
```

## Configuration

### Environment Variables

#### Main Server

```bash
# Execution service URL
EXECUTION_SERVICE_URL=http://localhost:4000
```

#### Execution Service

```bash
# Server port
PORT=4000

# API server URL (for CORS)
API_SERVER_URL=http://localhost:5000

# Node environment
NODE_ENV=development
```

### Docker Configuration

The execution service uses a multi-stage Docker build:

1. **Builder Stage**: Compiles TypeScript
2. **Production Stage**: Minimal runtime image with security hardening

**Security Features**:
- Non-root user (nodejs:1001)
- Read-only root filesystem
- No new privileges
- Minimal attack surface

## Usage Examples

### JavaScript Execution

```javascript
// Input
console.log('Hello, World!');

// Output
// stdout: "Hello, World!\n"
// exitCode: 0
```

### TypeScript Execution

```typescript
// Input
interface User {
  name: string;
  age: number;
}

const user: User = { name: 'Alice', age: 30 };
console.log(`User: ${user.name}, Age: ${user.age}`);

// Output
// stdout: "User: Alice, Age: 30\n"
// exitCode: 0
```

### Python Execution

```python
# Input
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

print(fibonacci(10))

# Output
// stdout: "55\n"
// exitCode: 0
```

### Standard Input

```javascript
// Input (code)
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('What is your name? ', (name) => {
  console.log(`Hello, ${name}!`);
  rl.close();
});

// Input (stdin)
Alice

// Output
// stdout: "What is your name? Hello, Alice!\n"
// exitCode: 0
```

### Error Handling

```javascript
// Input
throw new Error('Something went wrong');

// Output
// stdout: ""
// stderr: "Error: Something went wrong\n    at Object.<anonymous> (/workspace/solution.js:1:7)\n..."
// exitCode: 1
```

### Timeout

```javascript
// Input (timeout: 2000ms)
while (true) {
  // Infinite loop
}

// Output
// stdout: ""
// stderr: ""
// exitCode: 137 (killed)
// timedOut: true
```

## Frontend Integration

### Execution Output Panel

The execution output panel is integrated into the workspace and provides:

- **Run Button**: Execute current file
- **Status Indicator**: Shows execution state (idle, running, completed)
- **Output Display**: 
  - Standard output (stdout)
  - Standard error (stderr)
  - Exit code
  - Execution time
  - Timeout indicator
- **Error Messages**: Clear error messages for validation failures

### Usage

1. Open a file in the editor
2. Click the "Run" button in the toolbar
3. Execution panel opens at the bottom
4. Click "Run" in the execution panel
5. View results in real-time

### Permissions

- **Owners**: Can execute code in their projects
- **Editors**: Can execute code in projects they're members of
- **Viewers**: Cannot execute code (read-only access)

## Testing

### Unit Tests

Located in `server/tests/execution.test.ts`:

- Input validation
- Permission checks
- Error handling
- Service communication

### Integration Tests

Test the complete execution flow:

1. Create project and file
2. Execute code
3. Verify output
4. Test timeouts
5. Test error cases

### Manual Testing

```bash
# Start execution service
cd execution-service
npm run dev

# Start main server
cd server
npm run dev

# Start frontend
cd client
npm run dev

# Test execution
curl -X POST http://localhost:5000/api/v1/execution/execute \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=YOUR_JWT_TOKEN" \
  -d '{
    "projectId": "YOUR_PROJECT_ID",
    "language": "javascript",
    "code": "console.log(\"Hello, World!\");"
  }'
```

## Deployment

### Docker Compose

Add execution service to `docker-compose.yml`:

```yaml
services:
  execution-service:
    build:
      context: ./execution-service
      dockerfile: Dockerfile
    ports:
      - "4000:4000"
    environment:
      - PORT=4000
      - API_SERVER_URL=http://server:5000
      - NODE_ENV=production
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    restart: unless-stopped
```

### Production Considerations

1. **Docker Socket Access**: Execution service needs Docker socket access to create containers
2. **Resource Limits**: Configure container resource limits in production
3. **Monitoring**: Monitor execution service health and active executions
4. **Scaling**: Consider running multiple execution service instances behind a load balancer
5. **Security**: 
   - Use Docker in Docker (DinD) or rootless Docker for additional isolation
   - Implement execution quotas per user
   - Add rate limiting
   - Monitor for abuse

## Troubleshooting

### Execution Service Not Starting

**Symptoms**: Service fails to start or health check fails

**Solutions**:
1. Check Docker is running: `docker ps`
2. Verify Docker socket access: `ls -l /var/run/docker.sock`
3. Check logs: `docker logs execution-service`
4. Verify environment variables

### Execution Timeout

**Symptoms**: Code execution times out unexpectedly

**Solutions**:
1. Increase timeout parameter (max 30 seconds)
2. Optimize code for performance
3. Check for infinite loops
4. Verify Docker resource limits

### Permission Denied

**Symptoms**: User cannot execute code

**Solutions**:
1. Verify user is authenticated
2. Check user is project owner or editor (not viewer)
3. Verify file belongs to project
4. Check execution service is running

### Output Truncated

**Symptoms**: Output is cut off

**Solutions**:
1. Output is limited to 1MB (stdout/stderr)
2. Reduce output size in code
3. Write output to file instead of console

## Future Enhancements

### Planned Features

1. **Additional Languages**: Java, C++, Go, Rust
2. **Package Management**: Allow installing packages (with security controls)
3. **Multi-File Execution**: Execute projects with multiple files
4. **Execution History**: Store and retrieve past executions
5. **Performance Metrics**: Track execution time, memory usage
6. **User Quotas**: Limit executions per user per day
7. **Caching**: Cache compilation results for compiled languages
8. **Debugging**: Add debugging capabilities (breakpoints, step-through)

### Security Enhancements

1. **gVisor Integration**: Additional syscall filtering
2. **Firewall Rules**: More granular network controls
3. **Resource Monitoring**: Real-time resource usage tracking
4. **Audit Logging**: Detailed execution audit trail
5. **Malware Detection**: Scan code for malicious patterns

## References

- [Docker Security](https://docs.docker.com/engine/security/)
- [Node.js Child Process](https://nodejs.org/api/child_process.html)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [OWASP Code Execution Prevention](https://owasp.org/www-community/attacks/Code_Injection)
