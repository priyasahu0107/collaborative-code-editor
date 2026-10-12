/**
 * Execution service client for frontend
 */

import api from './api';

export interface ExecutionRequest {
  projectId: string;
  fileId?: string;
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

export interface Language {
  id: string;
  name: string;
  supported: boolean;
}

/**
 * Execute code
 */
export async function executeCode(request: ExecutionRequest): Promise<ExecutionResult> {
  const response = await api.post('/api/v1/execution/execute', request);
  return response.data.data;
}

/**
 * Get supported languages
 */
export async function getSupportedLanguages(): Promise<Language[]> {
  const response = await api.get('/api/v1/execution/languages');
  return response.data.data;
}

/**
 * Check execution service health
 */
export async function checkExecutionHealth(): Promise<{ status: string; timestamp: string }> {
  const response = await api.get('/api/v1/execution/health');
  return response.data.data;
}
