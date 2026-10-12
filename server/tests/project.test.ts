/**
 * Project API tests.
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
let mockProjects: any[] = [];

vi.mock('../src/models/User.model.js', () => ({
  default: {
    findById: vi.fn().mockResolvedValue(mockUser),
    findOne: vi.fn().mockResolvedValue(mockUser),
  },
}));

vi.mock('../src/models/Project.model.js', () => {
  const MockProject = vi.fn().mockImplementation((data: any) => ({
    ...data,
    _id: new Types.ObjectId(),
    ownerId: data.ownerId,
    save: vi.fn().mockResolvedValue(true),
    toSafeJSON: function () {
      return {
        id: this._id.toString(),
        name: this.name,
        description: this.description,
        ownerId: this.ownerId.toString(),
        visibility: this.visibility || 'private',
        defaultLanguage: this.defaultLanguage || 'javascript',
        fileCount: this.fileCount || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    },
  }));

  (MockProject as any).find = vi.fn().mockImplementation(() => ({
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue(mockProjects),
  }));

  (MockProject as any).findOne = vi.fn().mockImplementation((filter: any) => {
    const project = mockProjects.find(
      (p) => p._id.toString() === filter._id?.toString() && p.ownerId.toString() === filter.ownerId?.toString(),
    );
    return {
      exec: vi.fn().mockResolvedValue(project || null),
    };
  });

  (MockProject as any).countDocuments = vi.fn().mockResolvedValue(mockProjects.length);

  (MockProject as any).findOneAndUpdate = vi.fn().mockImplementation((filter: any, update: any) => {
    const index = mockProjects.findIndex(
      (p) => p._id.toString() === filter._id?.toString() && p.ownerId.toString() === filter.ownerId?.toString(),
    );
    if (index >= 0) {
      mockProjects[index] = { ...mockProjects[index], ...update.$set };
      return { exec: vi.fn().mockResolvedValue(mockProjects[index]) };
    }
    return { exec: vi.fn().mockResolvedValue(null) };
  });

  (MockProject as any).deleteOne = vi.fn().mockImplementation((filter: any) => {
    const index = mockProjects.findIndex(
      (p) => p._id.toString() === filter._id?.toString() && p.ownerId.toString() === filter.ownerId?.toString(),
    );
    if (index >= 0) {
      mockProjects.splice(index, 1);
      return { exec: vi.fn().mockResolvedValue({ deletedCount: 1 }) };
    }
    return { exec: vi.fn().mockResolvedValue({ deletedCount: 0 }) };
  });

  return { default: MockProject, Project: MockProject };
});

// Mock File model
vi.mock('../src/models/File.model.js', () => ({
  default: {
    deleteMany: vi.fn().mockResolvedValue({ deletedCount: 0 }),
    countDocuments: vi.fn().mockResolvedValue(0),
  },
}));

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

describe('Project API', () => {
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
    mockProjects = [];
    vi.clearAllMocks();
  });

  describe('POST /api/v1/projects', () => {
    it('should create a new project', async () => {
      const response = await request(app)
        .post('/api/v1/projects')
        .set('Cookie', createAuthCookie())
        .send({
          name: 'Test Project',
          description: 'A test project',
          defaultLanguage: 'typescript',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test Project');
      expect(response.body.data.description).toBe('A test project');
      expect(response.body.data.defaultLanguage).toBe('typescript');
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .post('/api/v1/projects')
        .send({ name: 'Test Project' });

      expect(response.status).toBe(401);
    });

    it('should reject invalid project data', async () => {
      const response = await request(app)
        .post('/api/v1/projects')
        .set('Cookie', createAuthCookie())
        .send({ name: '' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/projects', () => {
    it('should list user projects', async () => {
      const response = await request(app)
        .get('/api/v1/projects')
        .set('Cookie', createAuthCookie());

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.projects).toBeDefined();
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/v1/projects?page=1&limit=10')
        .set('Cookie', createAuthCookie());

      expect(response.status).toBe(200);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(10);
    });
  });

  describe('GET /api/v1/projects/:projectId', () => {
    it('should get a project by ID', async () => {
      // Create a project first
      const createResponse = await request(app)
        .post('/api/v1/projects')
        .set('Cookie', createAuthCookie())
        .send({ name: 'Test Project' });

      const projectId = createResponse.body.data.id;

      const response = await request(app)
        .get(`/api/v1/projects/${projectId}`)
        .set('Cookie', createAuthCookie());

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(projectId);
    });

    it('should reject invalid project ID', async () => {
      const response = await request(app)
        .get('/api/v1/projects/invalid-id')
        .set('Cookie', createAuthCookie());

      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent project', async () => {
      const fakeId = new Types.ObjectId().toString();
      const response = await request(app)
        .get(`/api/v1/projects/${fakeId}`)
        .set('Cookie', createAuthCookie());

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/projects/:projectId', () => {
    it('should update a project', async () => {
      // Create a project first
      const createResponse = await request(app)
        .post('/api/v1/projects')
        .set('Cookie', createAuthCookie())
        .send({ name: 'Test Project' });

      const projectId = createResponse.body.data.id;

      const response = await request(app)
        .patch(`/api/v1/projects/${projectId}`)
        .set('Cookie', createAuthCookie())
        .send({ name: 'Updated Project' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject empty update', async () => {
      const fakeId = new Types.ObjectId().toString();
      const response = await request(app)
        .patch(`/api/v1/projects/${fakeId}`)
        .set('Cookie', createAuthCookie())
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/v1/projects/:projectId', () => {
    it('should delete a project', async () => {
      // Create a project first
      const createResponse = await request(app)
        .post('/api/v1/projects')
        .set('Cookie', createAuthCookie())
        .send({ name: 'Test Project' });

      const projectId = createResponse.body.data.id;

      const response = await request(app)
        .delete(`/api/v1/projects/${projectId}`)
        .set('Cookie', createAuthCookie());

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 404 for non-existent project', async () => {
      const fakeId = new Types.ObjectId().toString();
      const response = await request(app)
        .delete(`/api/v1/projects/${fakeId}`)
        .set('Cookie', createAuthCookie());

      expect(response.status).toBe(404);
    });
  });
});
