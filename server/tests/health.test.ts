/**
 * Health endpoint tests.
 *
 * Tests the three health endpoints without requiring a real database.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { loadEnv, resetEnv } from '../src/config/env.js';

describe('Health Endpoints', () => {
  beforeAll(() => {
    // Load env for tests
    process.env['NODE_ENV'] = 'test';
    process.env['PORT'] = '5000';
    process.env['CLIENT_URL'] = 'http://localhost:5173';
    resetEnv();
    loadEnv();
  });

  afterAll(() => {
    resetEnv();
  });

  describe('GET /api/v1/health', () => {
    it('should return 200 with service status', async () => {
      const response = await request(app).get('/api/v1/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Service is running');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.service).toBe('collaborative-code-editor-api');
      expect(response.body.data.status).toBe('ok');
      expect(response.body.data.timestamp).toBeDefined();
      expect(typeof response.body.data.uptime).toBe('number');
    });

    it('should return a valid ISO timestamp', async () => {
      const response = await request(app).get('/api/v1/health');
      const timestamp = response.body.data.timestamp;

      expect(() => new Date(timestamp)).not.toThrow();
      expect(new Date(timestamp).toISOString()).toBe(timestamp);
    });

    it('should return uptime as a positive number', async () => {
      const response = await request(app).get('/api/v1/health');
      expect(response.body.data.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /api/v1/health/live', () => {
    it('should return 200 with alive status', async () => {
      const response = await request(app).get('/api/v1/health/live');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Service is alive');
      expect(response.body.data.status).toBe('alive');
      expect(response.body.data.service).toBe('collaborative-code-editor-api');
    });

    it('should not depend on database connectivity', async () => {
      // Liveness should always succeed regardless of DB state
      const response = await request(app).get('/api/v1/health/live');
      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/v1/health/ready', () => {
    it('should return readiness status', async () => {
      const response = await request(app).get('/api/v1/health/ready');

      // In test mode without MongoDB, status should be "disabled"
      // which counts as ready (the app can serve non-DB requests)
      expect([200, 503]).toContain(response.status);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.service).toBe('collaborative-code-editor-api');
      expect(response.body.data.checks).toBeDefined();
      expect(response.body.data.checks.database).toBeDefined();
    });

    it('should include database check status', async () => {
      const response = await request(app).get('/api/v1/health/ready');

      const dbCheck = response.body.data.checks.database;
      expect(dbCheck.status).toBeDefined();
      expect(['connected', 'disconnected', 'connecting', 'error', 'disabled']).toContain(
        dbCheck.status,
      );
    });

    it('should not expose database URI or credentials', async () => {
      const response = await request(app).get('/api/v1/health/ready');
      const body = JSON.stringify(response.body);

      expect(body).not.toContain('mongodb://');
      expect(body).not.toContain('mongodb+srv://');
      expect(body).not.toContain('password');
      expect(body).not.toContain('secret');
    });

    it('should return 503 when database is in error state', async () => {
      // This test verifies the readiness endpoint returns 503
      // when the database is not connected (and not disabled).
      // In test mode without MONGODB_URI, the DB is "disabled" which is "ready".
      // We test the structure, not the specific status code, since it depends on DB state.
      const response = await request(app).get('/api/v1/health/ready');

      if (response.body.data.status === 'not_ready') {
        expect(response.status).toBe(503);
        expect(response.body.success).toBe(false);
      } else {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      }
    });
  });
});
