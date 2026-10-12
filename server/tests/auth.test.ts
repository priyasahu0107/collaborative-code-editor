/**
 * Authentication endpoint tests.
 *
 * Tests registration, login, logout, and current user endpoints.
 * Uses mocked database to avoid requiring real MongoDB.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { loadEnv, resetEnv } from '../src/config/env.js';
import User from '../src/models/User.model.js';

// Mock the User model
vi.mock('../src/models/User.model.js', () => {
  const mockUser = {
    _id: '507f1f77bcf86cd799439011',
    email: 'test@example.com',
    name: 'Test User',
    passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6Tc1ZJz6ZJz6ZJz6ZJz6ZJz6ZJz6',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    save: vi.fn().mockResolvedValue(true),
    comparePassword: vi.fn().mockResolvedValue(true),
    toSafeJSON: vi.fn().mockReturnValue({
      id: '507f1f77bcf86cd799439011',
      email: 'test@example.com',
      name: 'Test User',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  };

  return {
    default: {
      findOne: vi.fn(),
      findById: vi.fn(),
      create: vi.fn().mockResolvedValue(mockUser),
    },
    User: {
      findOne: vi.fn(),
      findById: vi.fn(),
      create: vi.fn().mockResolvedValue(mockUser),
    },
  };
});

describe('Authentication Endpoints', () => {
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
    vi.clearAllMocks();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const mockFindOne = vi.mocked(User.findOne);
      mockFindOne.mockResolvedValue(null); // No existing user

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'Password123!',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.email).toBe('test@example.com');
      expect(response.body.data.name).toBe('Test User');
      expect(response.body.data.passwordHash).toBeUndefined();
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should reject registration with invalid email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Test User',
          email: 'invalid-email',
          password: 'Password123!',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject registration with weak password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'weak',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject duplicate email registration', async () => {
      const mockFindOne = vi.mocked(User.findOne);
      mockFindOne.mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
      } as any);

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'Password123!',
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Email already registered');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockFindOne = vi.mocked(User.findOne);
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        name: 'Test User',
        isActive: true,
        comparePassword: vi.fn().mockResolvedValue(true),
      };
      mockFindOne.mockResolvedValue(mockUser as any);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.data.email).toBe('test@example.com');
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should reject login with invalid credentials', async () => {
      const mockFindOne = vi.mocked(User.findOne);
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        name: 'Test User',
        isActive: true,
        comparePassword: vi.fn().mockResolvedValue(false),
      };
      mockFindOne.mockResolvedValue(mockUser as any);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid email or password');
    });

    it('should reject login with non-existent email', async () => {
      const mockFindOne = vi.mocked(User.findOne);
      mockFindOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid email or password');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/api/v1/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Authentication required');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app).post('/api/v1/auth/logout');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
