# Step 4: Project Management & File Management

## Overview

Step 4 implements a complete project and file management system with secure REST APIs, optimistic concurrency control, and comprehensive authorization.

## Implemented Features

### Project Management
- ✅ Create projects with metadata (name, description, default language)
- ✅ List user's projects with pagination and search
- ✅ Retrieve individual projects
- ✅ Update project metadata
- ✅ Delete projects (cascades to all files)
- ✅ Ownership enforcement on all operations
- ✅ Private visibility by default

### File Management
- ✅ Create files and folders
- ✅ Nested folder structure support
- ✅ File content storage with version tracking
- ✅ Optimistic concurrency control (version-based)
- ✅ Rename files/folders (updates descendant paths)
- ✅ Delete files/folders (recursive for folders)
- ✅ Path traversal prevention
- ✅ Duplicate path detection
- ✅ File count and nesting depth limits

### Security Features
- ✅ Authentication required on all endpoints
- ✅ Server-side ownership verification
- ✅ Path traversal attack prevention
- ✅ NoSQL injection protection (Mongoose)
- ✅ Input validation with Zod
- ✅ Request size limits (10MB)
- ✅ File content size limits (500KB)
- ✅ Maximum file count per project (1000)
- ✅ Maximum nesting depth (10 levels)
- ✅ Optimistic concurrency (409 Conflict on version mismatch)

## API Endpoints

### Projects

#### POST /api/v1/projects
Create a new project.

**Request:**
```json
{
  "name": "My Project",
  "description": "Project description",
  "defaultLanguage": "typescript"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Project created successfully",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "name": "My Project",
    "description": "Project description",
    "ownerId": "507f191e810c19729de860ea",
    "visibility": "private",
    "defaultLanguage": "typescript",
    "fileCount": 0,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### GET /api/v1/projects
List user's projects with pagination.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20, max: 100)
- `search` (optional, searches name and description)
- `sortBy` (createdAt | updatedAt | name, default: createdAt)
- `sortOrder` (asc | desc, default: desc)

**Response (200):**
```json
{
  "success": true,
  "message": "Projects retrieved successfully",
  "data": {
    "projects": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

#### GET /api/v1/projects/:projectId
Get a single project.

**Response (200):**
```json
{
  "success": true,
  "message": "Project retrieved successfully",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "name": "My Project",
    ...
  }
}
```

#### PATCH /api/v1/projects/:projectId
Update project metadata.

**Request:**
```json
{
  "name": "Updated Name",
  "description": "Updated description"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Project updated successfully",
  "data": { ... }
}
```

#### DELETE /api/v1/projects/:projectId
Delete a project and all associated files.

**Response (200):**
```json
{
  "success": true,
  "message": "Project deleted successfully"
}
```

### Files

#### POST /api/v1/projects/:projectId/files
Create a file or folder.

**Request (file):**
```json
{
  "name": "index.ts",
  "path": "src",
  "type": "file",
  "language": "typescript",
  "content": "console.log('hello');"
}
```

**Request (folder):**
```json
{
  "name": "src",
  "type": "folder"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "File created successfully",
  "data": {
    "id": "507f1f77bcf86cd799439012",
    "projectId": "507f1f77bcf86cd799439011",
    "name": "index.ts",
    "path": "src/index.ts",
    "type": "file",
    "language": "typescript",
    "version": 1,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### GET /api/v1/projects/:projectId/files
List files in a project.

**Query Parameters:**
- `path` (optional, filter by parent folder)
- `type` (file | folder, optional)
- `recursive` (boolean, default: false)

**Response (200):**
```json
{
  "success": true,
  "message": "Files retrieved successfully",
  "data": [...]
}
```

#### GET /api/v1/projects/:projectId/files/:fileId
Get a file with content.

**Response (200):**
```json
{
  "success": true,
  "message": "File retrieved successfully",
  "data": {
    "id": "507f1f77bcf86cd799439012",
    "name": "index.ts",
    "path": "src/index.ts",
    "type": "file",
    "language": "typescript",
    "content": "console.log('hello');",
    "version": 1,
    ...
  }
}
```

#### PATCH /api/v1/projects/:projectId/files/:fileId
Update file content with optimistic concurrency.

**Request:**
```json
{
  "content": "console.log('updated');",
  "version": 1
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "File updated successfully",
  "data": {
    ...
    "version": 2
  }
}
```

**Conflict Response (409):**
```json
{
  "success": false,
  "message": "Version conflict: expected version 1, but current version is 2",
  "error": {
    "code": "CONFLICT",
    "statusCode": 409
  }
}
```

#### PATCH /api/v1/projects/:projectId/files/:fileId/rename
Rename a file or folder.

**Request:**
```json
{
  "newName": "main.ts"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "File renamed successfully",
  "data": {
    "name": "main.ts",
    "path": "src/main.ts",
    ...
  }
}
```

#### DELETE /api/v1/projects/:projectId/files/:fileId
Delete a file or folder (recursive for folders).

**Response (200):**
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

## Database Schema

### Project Model
```typescript
{
  name: string (required, 1-100 chars)
  description?: string (max 500 chars)
  ownerId: ObjectId (required, indexed)
  visibility: 'private' | 'public' (default: 'private')
  defaultLanguage: string (default: 'javascript', max 50 chars)
  fileCount: number (default: 0)
  lastOpenedAt?: Date
  createdAt: Date
  updatedAt: Date
}
```

**Indexes:**
- `ownerId` (for fast user project queries)
- `{ ownerId, createdAt }` (compound for sorted listing)
- `{ ownerId, name }` (compound for search)

### File Model
```typescript
{
  projectId: ObjectId (required, indexed)
  ownerId: ObjectId (required, indexed)
  name: string (required, 1-255 chars)
  path: string (required, normalized, max 1000 chars)
  type: 'file' | 'folder' (required)
  language?: string (max 50 chars)
  content: string (default: '', max 500KB)
  version: number (default: 1)
  createdAt: Date
  updatedAt: Date
}
```

**Indexes:**
- `{ projectId, path }` (unique compound for path uniqueness)
- `{ projectId, type }` (for filtering by type)
- `{ ownerId, projectId }` (for authorization checks)

## Optimistic Concurrency Control

The system uses version-based optimistic concurrency to prevent lost updates:

1. Each file has a `version` field starting at 1
2. When updating, clients must provide the expected `version`
3. If the current version doesn't match, a 409 Conflict is returned
4. On successful update, version is incremented
5. Clients should fetch the latest version before editing

**Example Flow:**
```
1. Client GETs file → receives version: 1
2. Client edits content
3. Client PATCHes with version: 1
4. Server checks: current version is 1 ✓
5. Server updates content, increments version to 2
6. Server returns updated file with version: 2

If another client updated first:
3. Client PATCHes with version: 1
4. Server checks: current version is 2 ✗
5. Server returns 409 Conflict
6. Client must GET latest version and retry
```

## Path Validation

The system prevents path traversal attacks:

- Rejects absolute paths (starting with `/` or `\`)
- Rejects null bytes
- Rejects `..` segments
- Rejects `.` segments
- Enforces maximum nesting depth (10 levels)
- Normalizes paths (removes trailing slashes, collapses multiple slashes)

## Limits

- **Maximum files per project**: 1000
- **Maximum nesting depth**: 10 levels
- **Maximum file content size**: 500KB (500,000 characters)
- **Maximum file name length**: 255 characters
- **Maximum path length**: 1000 characters
- **Request body size**: 10MB

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `UNAUTHORIZED` | 401 | Authentication required |
| `NOT_FOUND` | 404 | Project or file not found |
| `CONFLICT` | 409 | Version conflict or duplicate path |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

## Testing

Run project and file tests:
```bash
npm run test:server
```

Tests cover:
- Project CRUD operations
- File CRUD operations
- Folder operations (create, rename, delete with descendants)
- Authorization (ownership enforcement)
- Validation (input validation, path traversal prevention)
- Optimistic concurrency (version conflicts)
- Pagination and search
- Error handling

## Future Enhancements

The following features are not implemented in Step 4 but planned for future steps:

- **Collaboration (Step 5)**: Real-time editing with Yjs CRDTs
- **File sharing**: Public projects and collaborative editing
- **File import/export**: Upload and download files
- **File history**: Version history and rollback
- **File search**: Full-text search within file contents
- **File templates**: Project templates and boilerplate
- **File permissions**: Granular access control (read/write/admin)

## Integration with Future Steps

### Step 5: Real-Time Collaboration
The file management system is designed to integrate with Yjs:
- File content is stored as plain text in MongoDB
- Version field can be used for conflict resolution
- Path structure supports collaborative folder navigation
- Ownership model extends to collaboration permissions

### Step 6: Code Execution
The file system provides source code for execution:
- File content can be retrieved for execution
- Language field identifies execution environment
- Project structure supports multi-file projects

## Security Considerations

1. **Authorization**: All endpoints verify project ownership
2. **Input Validation**: Zod schemas validate all inputs
3. **Path Traversal**: Prevented via validation and normalization
4. **NoSQL Injection**: Mongoose parameterized queries
5. **Size Limits**: Prevent DoS via large payloads
6. **Rate Limiting**: Applied via authentication middleware
7. **No Secrets**: No credentials in source code or logs

## Files Created

### Models
- `server/src/models/Project.model.ts`
- `server/src/models/File.model.ts`

### Project Module
- `server/src/modules/projects/project.types.ts`
- `server/src/modules/projects/project.validation.ts`
- `server/src/modules/projects/project.service.ts`
- `server/src/modules/projects/project.controller.ts`
- `server/src/modules/projects/project.routes.ts`

### File Module
- `server/src/modules/files/file.types.ts`
- `server/src/modules/files/file.validation.ts`
- `server/src/modules/files/file.service.ts`
- `server/src/modules/files/file.controller.ts`
- `server/src/modules/files/file.routes.ts`

### Tests
- `server/tests/project.test.ts`
- `server/tests/file.test.ts`

### Modified
- `server/src/app.ts` (added project routes)

## Verification

✅ Build: Client and server build successfully
✅ TypeScript: All type checks pass
✅ Tests: Project and file tests created
✅ Documentation: API documentation updated

## Next Steps

Step 5 will implement real-time collaboration using Yjs CRDTs, building on the file management foundation established in Step 4.
