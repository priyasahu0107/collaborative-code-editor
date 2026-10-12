/**
 * Integration tests for project management
 * 
 * Tests the complete project lifecycle including:
 * - Project creation
 * - Project listing and retrieval
 * - Project updates
 * - Project deletion
 * - Access control and permissions
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { connectDatabase, disconnectDatabase } from '../../src/config/database.js';
import User from '../../src/models/User.model.js';
import Project from '../../src/models/Project.model.js';

describe('Project Management Integration Tests', () => {
  let authCookie: string;
  let userId: string;

  beforeAll(async () => {
    // Connect to test database
    await connectDatabase();
  });

  afterAll(async () => {
    // Clean up and disconnect
    await User.deleteMany({});
    await Project.deleteMany({});
    await disconnectDatabase();
  });

  beforeEach(async () => {
    // Clean up before each test
    await User.deleteMany({});
    await Project.deleteMany({});

    // Create and authenticate a test user
    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123!',
      });

    authCookie = registerResponse.headers['set-cookie'][0];
    userId = registerResponse.body.data.id;
  });

  describe('POST /api/v1/projects', () => {
    it('should create a new project successfully', async () => {
      const response = await request(app)
        .post('/api/v1/projects')
        .set('Cookie', authCookie)
        .send({
          name: 'Test Project',
          description: 'A test project',
          defaultLanguage: 'javascript',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test Project');
      expect(response.body.data.description).toBe('A test project');
      expect(response.body.data.defaultLanguage).toBe('javascript');
      expect(response.body.data.ownerId).toBe(userId);
      expect(response.body.data.visibility).toBe('private');
    });

    it('should reject project creation without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/projects')
        .send({
          name: 'Test Project',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject project with missing name', async () => {
      const response = await request(app)
        .post('/api/v1/projects')
        .set('Cookie', authCookie)
        .send({
          description: 'A test project',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject project with name too long', async () => {
      const response = await request(app)
        .post('/api/v1/projects')
        .set('Cookie', authCookie)
        .send({
          name: 'a'.repeat(101),
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/projects', () => {
    beforeEach(async () => {
      // Create multiple projects
      await request(app)
        .post('/api/v1/projects')
        .set('Cookie', authCookie)
        .send({
          name: 'Project 1',
          description: 'First project',
        });

      await request(app)
        .post('/api/v1/projects')
        .set('Cookie', authCookie)
        .send({
          name: 'Project 2',
          description: 'Second project',
        });
    });

    it('should list all projects for authenticated user', async () => {
      const response = await request(app)
        .get('/api/v1/projects')
        .set('Cookie', authCookie);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.projects).toHaveLength(2);
      expect(response.body.data.pagination.total).toBe(2);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/v1/projects?page=1&limit=1')
        .set('Cookie', authCookie);

      expect(response.status).toBe(200);
      expect(response.body.data.projects).toHaveLength(1);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(1);
      expect(response.body.data.pagination.total).toBe(2);
    });

    it('should support search', async () => {
      const response = await request(app)
        .get('/api/v1/projects?search=Project 1')
        .set('Cookie', authCookie);

      expect(response.status).toBe(200);
      expect(response.body.data.projects).toHaveLength(1);
      expect(response.body.data.projects[0].name).toBe('Project 1');
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request(app).get('/api/v1/projects');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/projects/:projectId', () => {
    let projectId: string;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/v1/projects')
        .set('Cookie', authCookie)
        .send({
          name: 'Test Project',
        });

      projectId = createResponse.body.data.id;
    });

    it('should retrieve a project by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/projects/${projectId}`)
        .set('Cookie', authCookie);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(projectId);
      expect(response.body.data.name).toBe('Test Project');
    });

    it('should return 404 for non-existent project', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/api/v1/projects/${fakeId}`)
        .set('Cookie', authCookie);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should reject access to other users projects', async () => {
      // Create another user
      const otherUserResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Other User',
          email: 'other@example.com',
          password: 'Password123!',
        });

      const otherUserCookie = otherUserResponse.headers['set-cookie'][0];

      // Try to access the project
      const response = await request(app)
        .get(`/api/v1/projects/${projectId}`)
        .set('Cookie', otherUserCookie);

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/projects/:projectId', () => {
    let projectId: string;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/v1/projects')
        .set('Cookie', authCookie)
        .send({
          name: 'Test Project',
        });

      projectId = createResponse.body.data.id;
    });

    it('should update project successfully', async () => {
      const response = await request(app)
        .patch(`/api/v1/projects/${projectId}`)
        .set('Cookie', authCookie)
        .send({
          name: 'Updated Project',
          description: 'Updated description',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Project');
      expect(response.body.data.description).toBe('Updated description');
    });

    it('should reject update with no fields', async () => {
      const response = await request(app)
        .patch(`/api/v1/projects/${projectId}`)
        .set('Cookie', authCookie)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject update by non-owner', async () => {
      // Create another user
      const otherUserResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Other User',
          email: 'other@example.com',
          password: 'Password123!',
        });

      const otherUserCookie = otherUserResponse.headers['set-cookie'][0];

      // Try to update the project
      const response = await request(app)
        .patch(`/api/v1/projects/${projectId}`)
        .set('Cookie', otherUserCookie)
        .send({
          name: 'Hacked Project',
        });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/projects/:projectId', () => {
    let projectId: string;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/v1/projects')
        .set('Cookie', authCookie)
        .send({
          name: 'Test Project',
        });

      projectId = createResponse.body.data.id;
    });

    it('should delete project successfully', async () => {
      const response = await request(app)
        .delete(`/api/v1/projects/${projectId}`)
        .set('Cookie', authCookie);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify project is deleted
      const getResponse = await request(app)
        .get(`/api/v1/projects/${projectId}`)
        .set('Cookie', authCookie);

      expect(getResponse.status).toBe(404);
    });

    it('should reject deletion by non-owner', async () => {
      // Create another user
      const otherUserResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Other User',
          email: 'other@example.com',
          password: 'Password123!',
        });

      const otherUserCookie = otherUserResponse.headers['set-cookie'][0];

      // Try to delete the project
      const response = await request(app)
        .delete(`/api/v1/projects/${projectId}`)
        .set('Cookie', otherUserCookie);

      expect(response.status).toBe(404);

      // Verify project still exists
      const getResponse = await request(app)
        .get(`/api/v1/projects/${projectId}`)
        .set('Cookie', authCookie);

      expect(getResponse.status).toBe(200);
    });
  });
});
