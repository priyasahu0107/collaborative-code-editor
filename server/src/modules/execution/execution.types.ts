/**
 * Execution types for the main server
 */

import { Types } from 'mongoose';

export interface ExecutionRequest {
  projectId: Types.ObjectId;
  fileId?: Types.ObjectId;
  language: string;
  code: string;
  stdin?: string;
  timeout?: number;
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
  timedOut: boolean;
  error?: string;
}

export interface ExecutionJob {
  id: string;
  userId: Types.ObjectId;
  projectId: Types.ObjectId;
  fileId?: Types.ObjectId;
  language: string;
  code: string;
  stdin?: string;
  timeout: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: ExecutionResult;
  createdAt: Date;
  completedAt?: Date;
}

export const EXECUTION_ERRORS = {
  UNSUPPORTED_LANGUAGE: 'Unsupported language',
  CODE_TOO_LARGE: 'Code size exceeds limit',
  INPUT_TOO_LARGE: 'Input size exceeds limit',
  EXECUTION_TIMEOUT: 'Execution timed out',
  EXECUTION_FAILED: 'Execution failed',
  EXECUTION_DISABLED: 'Code execution is disabled until a secure sandbox runtime is configured',
  SERVICE_UNAVAILABLE: 'Execution service unavailable',
  PERMISSION_DENIED: 'Permission denied',
  PROJECT_NOT_FOUND: 'Project not found',
  FILE_NOT_FOUND: 'File not found',
} as const;
