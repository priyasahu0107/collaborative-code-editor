/**
 * Performance monitoring middleware
 * 
 * Tracks request performance metrics including response times, slow queries,
 * and resource usage. Provides insights for optimization.
 */

import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';

// Performance metrics storage (in-memory for now, can be extended to external storage)
interface PerformanceMetrics {
  totalRequests: number;
  averageResponseTime: number;
  slowRequests: number;
  requestsByEndpoint: Map<string, { count: number; avgTime: number }>;
  slowestEndpoints: Array<{ endpoint: string; time: number; timestamp: Date }>;
}

const metrics: PerformanceMetrics = {
  totalRequests: 0,
  averageResponseTime: 0,
  slowRequests: 0,
  requestsByEndpoint: new Map(),
  slowestEndpoints: [],
};

// Configuration
const SLOW_REQUEST_THRESHOLD = 1000; // 1 second
const MAX_SLOWEST_ENDPOINTS = 10;

/**
 * Performance monitoring middleware
 */
export function performanceMonitor(req: Request, res: Response, next: NextFunction): void {
  const startTime = process.hrtime.bigint();
  const endpoint = `${req.method} ${req.route?.path || req.path}`;

  // Capture response finish
  const originalEnd = res.end;
  res.end = function (...args: any[]): any {
    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1_000_000;

    // Update metrics
    metrics.totalRequests++;
    
    // Update average response time
    const totalResponseTime = metrics.averageResponseTime * (metrics.totalRequests - 1) + durationMs;
    metrics.averageResponseTime = totalResponseTime / metrics.totalRequests;

    // Track slow requests
    if (durationMs > SLOW_REQUEST_THRESHOLD) {
      metrics.slowRequests++;
      logger.warn('Slow request detected', {
        endpoint,
        duration: `${durationMs.toFixed(2)}ms`,
        method: req.method,
        path: req.path,
        userId: req.auth?.userId,
      });

      // Track slowest endpoints
      metrics.slowestEndpoints.push({
        endpoint,
        time: durationMs,
        timestamp: new Date(),
      });

      // Keep only the top N slowest
      if (metrics.slowestEndpoints.length > MAX_SLOWEST_ENDPOINTS) {
        metrics.slowestEndpoints.sort((a, b) => b.time - a.time);
        metrics.slowestEndpoints = metrics.slowestEndpoints.slice(0, MAX_SLOWEST_ENDPOINTS);
      }
    }

    // Track per-endpoint metrics
    const endpointMetrics = metrics.requestsByEndpoint.get(endpoint) || { count: 0, avgTime: 0 };
    endpointMetrics.count++;
    endpointMetrics.avgTime = (endpointMetrics.avgTime * (endpointMetrics.count - 1) + durationMs) / endpointMetrics.count;
    metrics.requestsByEndpoint.set(endpoint, endpointMetrics);

    // Log performance for slow requests
    if (durationMs > SLOW_REQUEST_THRESHOLD) {
      logger.info('Request completed', {
        endpoint,
        duration: `${durationMs.toFixed(2)}ms`,
        status: res.statusCode,
        slow: true,
      });
    }

    // Call original end
    return originalEnd.apply(res, args);
  };

  next();
}

/**
 * Get current performance metrics
 */
export function getPerformanceMetrics(): {
  totalRequests: number;
  averageResponseTime: number;
  slowRequests: number;
  slowestEndpoints: Array<{ endpoint: string; time: number; timestamp: Date }>;
  topEndpoints: Array<{ endpoint: string; count: number; avgTime: number }>;
} {
  // Get top endpoints by request count
  const topEndpoints = Array.from(metrics.requestsByEndpoint.entries())
    .map(([endpoint, data]) => ({
      endpoint,
      count: data.count,
      avgTime: data.avgTime,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalRequests: metrics.totalRequests,
    averageResponseTime: metrics.averageResponseTime,
    slowRequests: metrics.slowRequests,
    slowestEndpoints: metrics.slowestEndpoints,
    topEndpoints,
  };
}

/**
 * Reset performance metrics (useful for testing)
 */
export function resetPerformanceMetrics(): void {
  metrics.totalRequests = 0;
  metrics.averageResponseTime = 0;
  metrics.slowRequests = 0;
  metrics.requestsByEndpoint.clear();
  metrics.slowestEndpoints = [];
}

/**
 * Performance monitoring endpoint handler
 */
export function getPerformanceMetricsHandler(req: Request, res: Response): void {
  const metrics = getPerformanceMetrics();
  
  res.json({
    success: true,
    message: 'Performance metrics retrieved',
     metrics,
  });
}

export default {
  performanceMonitor,
  getPerformanceMetrics,
  resetPerformanceMetrics,
  getPerformanceMetricsHandler,
};
