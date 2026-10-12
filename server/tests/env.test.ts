/**
 * Environment configuration tests.
 *
 * Tests Zod validation of environment variables.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadEnv, resetEnv, isDatabaseConfigured, isProduction, isDevelopment, isTest } from '../src/config/env.js';

describe('Environment Configuration', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetEnv();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetEnv();
  });

  describe('loadEnv()', () => {
    it('should load with defaults in development mode', () => {
      process.env['NODE_ENV'] = 'development';
      process.env['PORT'] = '5000';
      process.env['CLIENT_URL'] = 'http://localhost:5173';

      const config = loadEnv();

      expect(config.PORT).toBe(5000);
      expect(config.NODE_ENV).toBe('development');
      expect(config.CLIENT_URL).toBe('http://localhost:5173');
    });

    it('should accept a valid port number', () => {
      process.env['NODE_ENV'] = 'development';
      process.env['PORT'] = '3001';
      process.env['CLIENT_URL'] = 'http://localhost:5173';

      const config = loadEnv();
      expect(config.PORT).toBe(3001);
    });

    it('should accept a valid MongoDB URI', () => {
      process.env['NODE_ENV'] = 'development';
      process.env['PORT'] = '5000';
      process.env['CLIENT_URL'] = 'http://localhost:5173';
      process.env['MONGODB_URI'] = 'mongodb://localhost:27017/test';

      const config = loadEnv();
      expect(config.MONGODB_URI).toBe('mongodb://localhost:27017/test');
    });

    it('should accept a valid mongodb+srv URI', () => {
      process.env['NODE_ENV'] = 'development';
      process.env['PORT'] = '5000';
      process.env['CLIENT_URL'] = 'http://localhost:5173';
      process.env['MONGODB_URI'] = 'mongodb+srv://user:pass@cluster.mongodb.net/db';

      const config = loadEnv();
      expect(config.MONGODB_URI).toBe('mongodb+srv://user:pass@cluster.mongodb.net/db');
    });

    it('should allow MONGODB_URI to be empty in development', () => {
      process.env['NODE_ENV'] = 'development';
      process.env['PORT'] = '5000';
      process.env['CLIENT_URL'] = 'http://localhost:5173';
      // No MONGODB_URI set

      const config = loadEnv();
      expect(config.MONGODB_URI).toBeUndefined();
    });

    it('should allow JWT_SECRET to be optional', () => {
      process.env['NODE_ENV'] = 'development';
      process.env['PORT'] = '5000';
      process.env['CLIENT_URL'] = 'http://localhost:5173';

      const config = loadEnv();
      expect(config.JWT_SECRET).toBeUndefined();
    });

    it('should allow EXECUTION_SERVICE_URL to be optional', () => {
      process.env['NODE_ENV'] = 'development';
      process.env['PORT'] = '5000';
      process.env['CLIENT_URL'] = 'http://localhost:5173';

      const config = loadEnv();
      expect(config.EXECUTION_SERVICE_URL).toBeUndefined();
    });

    it('should accept valid NODE_ENV values', () => {
      for (const env of ['development', 'production', 'test']) {
        resetEnv();
        process.env['NODE_ENV'] = env;
        process.env['PORT'] = '5000';
        process.env['CLIENT_URL'] = 'http://localhost:5173';

        const config = loadEnv();
        expect(config.NODE_ENV).toBe(env);
      }
    });

    it('should accept multiple comma-separated CLIENT_URLs', () => {
      process.env['NODE_ENV'] = 'development';
      process.env['PORT'] = '5000';
      process.env['CLIENT_URL'] = 'http://localhost:5173,http://localhost:3000';

      const config = loadEnv();
      expect(config.CLIENT_URL).toBe('http://localhost:5173,http://localhost:3000');
    });
  });

  describe('isDatabaseConfigured()', () => {
    it('should return false when MONGODB_URI is not set', () => {
      process.env['NODE_ENV'] = 'development';
      process.env['PORT'] = '5000';
      process.env['CLIENT_URL'] = 'http://localhost:5173';
      loadEnv();

      expect(isDatabaseConfigured()).toBe(false);
    });

    it('should return true when MONGODB_URI is set', () => {
      process.env['NODE_ENV'] = 'development';
      process.env['PORT'] = '5000';
      process.env['CLIENT_URL'] = 'http://localhost:5173';
      process.env['MONGODB_URI'] = 'mongodb://localhost:27017/test';
      loadEnv();

      expect(isDatabaseConfigured()).toBe(true);
    });
  });

  describe('Environment mode helpers', () => {
    it('isProduction() should return true in production', () => {
      process.env['NODE_ENV'] = 'production';
      process.env['PORT'] = '5000';
      process.env['CLIENT_URL'] = 'http://localhost:5173';
      process.env['MONGODB_URI'] = 'mongodb://localhost:27017/test';
      loadEnv();

      expect(isProduction()).toBe(true);
      expect(isDevelopment()).toBe(false);
      expect(isTest()).toBe(false);
    });

    it('isDevelopment() should return true in development', () => {
      process.env['NODE_ENV'] = 'development';
      process.env['PORT'] = '5000';
      process.env['CLIENT_URL'] = 'http://localhost:5173';
      loadEnv();

      expect(isDevelopment()).toBe(true);
      expect(isProduction()).toBe(false);
      expect(isTest()).toBe(false);
    });

    it('isTest() should return true in test', () => {
      process.env['NODE_ENV'] = 'test';
      process.env['PORT'] = '5000';
      process.env['CLIENT_URL'] = 'http://localhost:5173';
      loadEnv();

      expect(isTest()).toBe(true);
      expect(isProduction()).toBe(false);
      expect(isDevelopment()).toBe(false);
    });
  });
});
