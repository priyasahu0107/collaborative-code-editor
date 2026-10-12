/**
 * Structured logger utility for the server.
 *
 * - Avoids logging sensitive headers (authorization, cookies).
 * - Avoids logging request bodies.
 * - Avoids logging MongoDB URIs, JWT secrets, or other credentials.
 * - Supports different log levels for development and production.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getMinLevel(): LogLevel {
  const env = process.env['NODE_ENV'];
  if (env === 'production') return 'info';
  if (env === 'test') return 'error';
  return 'debug';
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[getMinLevel()];
}

function formatMessage(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
  const timestamp = new Date().toISOString();
  const base = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  if (meta && Object.keys(meta).length > 0) {
    return `${base} ${JSON.stringify(meta)}`;
  }
  return base;
}

/**
 * Redact sensitive keys from an object before logging.
 */
function redact(obj: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = [
    'authorization',
    'cookie',
    'password',
    'secret',
    'token',
    'mongodb_uri',
    'mongodbUri',
    'MONGODB_URI',
    'jwt_secret',
    'jwtSecret',
    'JWT_SECRET',
  ];

  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveKeys.includes(key.toLowerCase()) || sensitiveKeys.includes(key)) {
      redacted[key] = '[REDACTED]';
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

export const logger = {
  debug(message: string, meta?: Record<string, unknown>): void {
    if (!shouldLog('debug')) return;
    console.debug(formatMessage('debug', message, meta ? redact(meta) : undefined));
  },

  info(message: string, meta?: Record<string, unknown>): void {
    if (!shouldLog('info')) return;
    console.info(formatMessage('info', message, meta ? redact(meta) : undefined));
  },

  warn(message: string, meta?: Record<string, unknown>): void {
    if (!shouldLog('warn')) return;
    console.warn(formatMessage('warn', message, meta ? redact(meta) : undefined));
  },

  error(message: string, meta?: Record<string, unknown>): void {
    if (!shouldLog('error')) return;
    console.error(formatMessage('error', message, meta ? redact(meta) : undefined));
  },
};

export default logger;
