/**
 * Execution validation schemas
 */

import { z } from 'zod';
import { Types } from 'mongoose';

// Execution limits (must match execution-service)
const EXECUTION_LIMITS = {
  MAX_CODE_SIZE: 64 * 1024, // 64KB
  MAX_STDIN_SIZE: 10 * 1024, // 10KB
  MAX_STDOUT_SIZE: 1024 * 1024, // 1MB
  MAX_STDERR_SIZE: 1024 * 1024, // 1MB
  DEFAULT_TIMEOUT: 10000, // 10 seconds
  MAX_TIMEOUT: 30000, // 30 seconds
  MAX_CONCURRENT_EXECUTIONS: 10,
};

// Supported languages (must match execution-service)
const SUPPORTED_LANGUAGES = {
  javascript: { id: 'javascript', name: 'JavaScript', supported: true },
  typescript: { id: 'typescript', name: 'TypeScript', supported: true },
  python: { id: 'python', name: 'Python', supported: true },
  java: { id: 'java', name: 'Java', supported: false },
};

/**
 * Validate MongoDB ObjectId
 */
const objectIdSchema = z.string().refine(
  (val) => Types.ObjectId.isValid(val),
  { message: 'Invalid ID format' }
);

/**
 * Execution request validation schema
 */
export const executeCodeSchema = z.object({
  projectId: objectIdSchema,
  fileId: objectIdSchema.optional(),
  language: z
    .string()
    .refine(
      (lang) => lang in SUPPORTED_LANGUAGES,
      { message: 'Unsupported language' }
    ),
  code: z
    .string()
    .min(1, 'Code cannot be empty')
    .max(EXECUTION_LIMITS.MAX_CODE_SIZE, `Code size exceeds limit of ${EXECUTION_LIMITS.MAX_CODE_SIZE} bytes`),
  stdin: z
    .string()
    .max(EXECUTION_LIMITS.MAX_STDIN_SIZE, `Input size exceeds limit of ${EXECUTION_LIMITS.MAX_STDIN_SIZE} bytes`)
    .optional(),
  timeout: z
    .number()
    .min(1000, 'Timeout must be at least 1000ms')
    .max(EXECUTION_LIMITS.MAX_TIMEOUT, `Timeout cannot exceed ${EXECUTION_LIMITS.MAX_TIMEOUT}ms`)
    .optional(),
});

export type ExecuteCodeInput = z.infer<typeof executeCodeSchema>;

/**
 * Validate execution request
 */
export function validateExecuteCodeRequest(data: unknown): ExecuteCodeInput {
  return executeCodeSchema.parse(data);
}
