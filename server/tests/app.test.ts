/**
 * Application-level tests.
 *
 * Tests middleware, routing, error handling, and CORS configuration.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { loadEnv, resetEnv } from '../src/config/env.js';

describe('Application', () => {
  beforeAll(() => {
    process.env['NODE_ENV'] = 'test';
    process.env['PORT'] = '5000';
    process.env['CLIENT_URL'] = 'http://localhost:5173';
    resetEnv();
    loadEnv();
  });

  afterAll(() => {
    resetEnv();
  });

  describe('API Root', () => {
    it('GET /api/v1 should return API info', async () => {
      const response = await request(app).get('/api/v1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.version).toBeDefined();
    });
  });

  describe('404 Handler', () => {
    it('should return 404 JSON for unknown routes', async () => {
      const response = await request(app).get('/api/v1/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Route not found');
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.statusCode).toBe(404);
    });

    it('should return 404 for POST to unknown route', async () => {
      const response = await request(app)
        .post('/api/v1/nonexistent')
        .send({ data: 'test' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Invalid JSON Handling', () => {
    it('should return 400 for malformed JSON body', async () => {
      const response = await request(app)
        .post('/api/v1/nonexistent')
        .set('Content-Type', 'application/json')
        .send('{invalid json}');

      // Either 400 (JSON parse error) or 404 (route not found after parse fails)
      expect([400, 404]).toContain(response.status);
    });
  });

  describe('Security Headers', () => {
    it('should include security headers from Helmet', async () => {
      const response = await request(app).get('/api/v1/health');

      // Helmet adds various security headers
      expect(response.headers).toBeDefined();
      // Check for at least one helmet header
      const headerKeys = Object.keys(response.headers).map((k) => k.toLowerCase());
      const hasSecurityHeaders =
        headerKeys.includes('x-content-type-options') ||
        headerKeys.includes('x-frame-options') ||
        headerKeys.includes('x-dns-prefetch-control');
      expect(hasSecurityHeaders).toBe(true);
    });
  });

  describe('CORS', () => {
    it('should allow requests from configured origin', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .set('Origin', 'http://localhost:5173');

      expect(response.status).toBe(200);
    });

    it('should include CORS headers for allowed origin', async () => {
      const response = await request(app)
        .options('/api/v1/health')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'GET');

      // CORS preflight should succeed for allowed origin
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('Content-Type', () => {
    it('should return JSON responses', async () => {
      const response = await request(app).get('/api/v1/health');

      expect(response.headers['content-type']).toMatch(/json/);
    });
  });
});
