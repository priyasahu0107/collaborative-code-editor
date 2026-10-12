/**
 * Express type augmentations for the application.
 *
 * Extends the Express Request type with custom properties
 * that will be added by middleware in future steps.
 */

declare global {
  namespace Express {
    interface Request {
      /**
       * Unique request ID for tracing (to be set by middleware).
       */
      requestId?: string;
    }
  }
}

export {};
