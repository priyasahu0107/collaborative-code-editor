/**
 * Input validation for execution requests
 */

import { z } from 'zod';
import { EXECUTION_LIMITS, SUPPORTED_LANGUAGES } from '../types/execution.js';

/**
 * Execution request validation schema
 */
export const executionRequestSchema = z.object({
  code: z
    .string()
    .min(1, 'Code cannot be empty')
    .max(EXECUTION_LIMITS.MAX_CODE_SIZE, `Code size exceeds limit of ${EXECUTION_LIMITS.MAX_CODE_SIZE} bytes`),
  
  language: z
    .string()
    .refine(
      (lang) => lang in SUPPORTED_LANGUAGES,
      { message: 'Unsupported language' }
    ),
  
  stdin: z
    .string()
    .max(EXECUTION_LIMITS.MAX_STDIN_SIZE, `Input size exceeds limit of ${EXECUTION_LIMITS.MAX_STDIN_SIZE} bytes`)
    .optional()
    .default(''),
  
  timeout: z
    .number()
    .min(1000, 'Timeout must be at least 1000ms')
    .max(EXECUTION_LIMITS.MAX_TIMEOUT, `Timeout cannot exceed ${EXECUTION_LIMITS.MAX_TIMEOUT}ms`)
    .optional()
    .default(EXECUTION_LIMITS.DEFAULT_TIMEOUT),
});

export type ExecutionRequestInput = z.infer<typeof executionRequestSchema>;

/**
 * Validate execution request
 */
export function validateExecutionRequest(data: unknown): ExecutionRequestInput {
  return executionRequestSchema.parse(data);
}
