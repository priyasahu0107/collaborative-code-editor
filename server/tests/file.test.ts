/**
 * File API tests.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { loadEnv, resetEnv } from '../src/config/env.js';
import { Types } from 'mongoose';

// Mock User model
const mockUserId = new Types.ObjectId().toString();
const mockUser = {
  _id: mockUserId,
  email: 'test@example.com',
  name: 'Test User',
  isActive: true,
  comparePassword: async () => true,
};

// Mock Project model
const mockProjectId = new Types.ObjectId().toString();

vi.mock('../src/models/User.model.js', () => ({
  default: {
    findById: vi.fn().mockResolvedValue(mockUser),
    findOne: vi.fn().mockResolvedValue(mockUser),
  },
}));

vi.mock('../src/models/Project.model.js', () => {
  const mockProject = {
    _id: mockProjectId,
    name: 'Test Project',
    ownerId: mockUserId,
    save: vi.fn().mockResolvedValue(true),
  };

  return {
    default: {
      findOne: vi.fn().mockResolvedValue(mockProject),
    },
  };
});

// Mock File model
let mockFiles: any[] = [];

vi.mock('../src/models/File.model.js', () => {
  const MockFile = vi.fn().mockImplementation((data: any) => ({
    ...data,
    _id: new Types.ObjectId(),
    save: vi.fn().mockResolvedValue(true),
    toSafeJSON: function (includeContent = false) {
      return {
        id: this._id.toString(),
        projectId: this.projectId.toString(),
        name: this.name,
        path: this.path,
        type: this.type,
        language: this.language,
        content: includeContent ? this.content : undefined,
        version: this.version || 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    },
  }));

  (MockFile as any).find = vi.fn().mockImplementation(() => ({
    sort: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue(mockFiles),
  }));

  (MockFile as any).findOne = vi.fn().mockImplementation((filter: any) => {
    const file = mockFiles.find(
      (f) =>
        f._id.toString() === filter._id?.toString() &&
        f.projectId.toString() === filter.projectId?.toString(),
    );
    return {
      exec: vi.fn().mockResolvedValue(file || null),
    };
  });

  (MockFile as any).countDocuments = vi.fn().mockResolvedValue(mockFiles.length);

  (MockFile as any).deleteOne = vi.fn().mockImplementation((filter: any) => {
    const index = mockFiles.findIndex((f) => f._id.toString() === filter._id?.toString());
    if (index >= 0) {
      mockFiles.splice(index, 1);
      return { exec: vi.fn().mockResolvedValue({ deletedCount: 1 }) };
    }
    return { exec: vi.fn().mockResolvedValue({ deletedCount: 0 }) };
  });

  (MockFile as any).deleteMany = vi.fn().mockResolvedValue({ deletedCount: 0 });

  return { default: MockFile, File: MockFile };
});

// Helper to create auth cookie
function createAuthCookie() {
  const jwt = require('jsonwebtoken');
  const token = jwt.sign(
    { sub: mockUserId, email: 'test@example.com' },
    'test-secret-key-that-is-at-least-32-characters-long',
    { expiresIn: '15m' },
  );
  return `auth_token=${token}`;
}

describe('File API', () => {
  beforeAll(() => {
    process.env['NODE_ENV'] = 'test';
    process.env['PORT'] = '5000';
    process.env['CLIENT_URL'] = 'http://localhost:5173';
    process.env['JWT_SECRET'] = 'test-secret-key-that-is-at-least-32-characters-long';
    process.env['JWT_EXPIRES_IN'] = '15m';
    process.env['COOKIE_NAME'] = 'auth_token';
    process.env['COOKIE_SAME_SITE'] = 'lax';
    resetEnv();
    loadEnv();
  });

  afterAll(() => {
    resetEnv();
  });

  beforeEach(() => {
    mockFiles = [];
    vi.clearAllMocks();
  });

  const projectId = mockProjectId;

  describe('POST /api/v1/projects/:projectId/files', () => {
    it('should create a new file', async () => {
      const response = await request(app)
        .post(`/api/v1/projects/${projectId}/files`)
        .set('Cookie', createAuthCookie())
        .send({
          name: 'index.ts',
          type: 'file',
          language: 'typescript',
          content: 'console.log("hello");',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('index.ts');
      expect(response.body.data.type).toBe('file');
    });

    it('should create a folder', async () => {
      const response = await request(app)
        .post(`/api/v1/projects/${projectId}/files`)
        .set('Cookie', createAuthCookie())
        .send({
          name: 'src',
          type: 'folder',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.type).toBe('folder');
    });

    it('should reject path traversal', async () => {
      const response = await request(app)
        .post(`/api/v1/projects/${projectId}/files`)
        .set('Cookie', createAuthCookie())
        .send({
          name: 'test.ts',
          path: '../outside',
          type: 'file',
        });

      expect(response.status).toBe(400);
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .post(`/api/v1/projects/${projectId}/files`)
        .send({ name: 'test.ts', type: 'file' });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/projects/:projectId/files', () => {
    it('should list files', async () => {
      const response = await request(app)
        .get(`/api/v1/projects/${projectId}/files`)
        .set('Cookie', createAuthCookie());

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should support path filtering', async () => {
      const response = await request(app)
        .get(`/api/v1/projects/${projectId}/files?path=src`)
        .set('Cookie', createAuthCookie());

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/v1/projects/:projectId/files/:fileId', () => {
    it('should get a file with content', async () => {
      // Create a file first
      const createResponse = await request(app)
        .post(`/api/v1/projects/${projectId}/files`)
        .set('Cookie', createAuthCookie())
        .send({
          name: 'test.ts',
          type: 'file',
          content: 'console.log("test");',
        });

      const fileId = createResponse.body.data.id;

      const response = await request(app)
        .get(`/api/v1/projects/${projectId}/files/${fileId}`)
        .set('Cookie', createAuthCookie());

      expect(response.status).toBe(200);
      expect(response.body.data.content).toBeDefined();
    });

    it('should reject invalid file ID', async () => {
      const response = await request(app)
        .get(`/api/v1/projects/${projectId}/files/invalid-id`)
        .set('Cookie', createAuthCookie());

      expect(response.status).toBe(400);
    });
  });

  describe('PATCH /api/v1/projects/:projectId/files/:fileId', () => {
    it('should update file content', async () => {
      // Create a file first
      const createResponse = await request(app)
        .post(`/api/v1/projects/${projectId}/files`)
        .set('Cookie', createAuthCookie())
        .send({
          name: 'test.ts',
          type: 'file',
          content: 'old content',
        });

      const fileId = createResponse.body.data.id;
      const version = createResponse.body.data.version;

      const response = await request(app)
        .patch(`/api/v1/projects/${projectId}/files/${fileId}`)
        .set('Cookie', createAuthCookie())
        .send({
          content: 'new content',
          version: version,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should require version for optimistic concurrency', async () => {
      const fakeId = new Types.ObjectId().toString();
      const response = await request(app)
        .patch(`/api/v1/projects/${projectId}/files/${fakeId}`)
        .set('Cookie', createAuthCookie())
        .send({ content: 'new content' });

      expect(response.status).toBe(400);
    });
  });

  describe('PATCH /api/v1/projects/:projectId/files/:fileId/rename', () => {
    it('should rename a file', async () => {
      // Create a file first
      const createResponse = await request(app)
        .post(`/api/v1/projects/${projectId}/files`)
        .set('Cookie', createAuthCookie())
        .send({
          name: 'old-name.ts',
          type: 'file',
        });

      const fileId = createResponse.body.data.id;

      const response = await request(app)
        .patch(`/api/v1/projects/${projectId}/files/${fileId}/rename`)
        .set('Cookie', createAuthCookie())
        .send({ newName: 'new-name.ts' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject invalid new name', async () => {
      const fakeId = new Types.ObjectId().toString();
      const response = await request(app)
        .patch(`/api/v1/projects/${projectId}/files/${fakeId}/rename`)
        .set('Cookie', createAuthCookie())
        .send({ newName: '' });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/v1/projects/:projectId/files/:fileId', () => {
    it('should delete a file', async () => {
      // Create a file first
      const createResponse = await request(app)
        .post(`/api/v1/projects/${projectId}/files`)
        .set('Cookie', createAuthCookie())
        .send({
          name: 'test.ts',
          type: 'file',
        });

      const fileId = createResponse.body.data.id;

      const response = await request(app)
        .delete(`/api/v1/projects/${projectId}/files/${fileId}`)
        .set('Cookie', createAuthCookie());

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject invalid file ID', async () => {
      const response = await request(app)
        .delete(`/api/v1/projects/${projectId}/files/invalid-id`)
        .set('Cookie', createAuthCookie());

      expect(response.status).toBe(400);
    });
  });
});
