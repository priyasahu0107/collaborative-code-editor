/**
 * Execution service client
 * 
 * Communicates with the separate execution API via HTTP. Source execution is disabled.
 */

import axios from 'axios';
import { getEnv } from '../../config/env.js';
import { ExecutionResult, EXECUTION_ERRORS } from './execution.types.js';

export type ExecutionServiceHealth = 'disabled' | 'unhealthy';

/**
 * Execute code via the execution service
 */
export async function executeCode(
  _code: string,
  _language: string,
  _stdin?: string,
  _timeout?: number,
): Promise<ExecutionResult> {
  throw new Error(EXECUTION_ERRORS.EXECUTION_DISABLED);
}

/**
 * Get supported languages from execution service
 */
export async function getSupportedLanguages(): Promise<Array<{ id: string; name: string; supported: boolean }>> {
  return [
    { id: 'javascript', name: 'JavaScript', supported: false },
    { id: 'typescript', name: 'TypeScript', supported: false },
    { id: 'python', name: 'Python', supported: false },
  ];
}

/**
 * Check execution service health
 */
export async function checkExecutionServiceHealth(): Promise<ExecutionServiceHealth> {
  const env = getEnv();
  
  if (!env.EXECUTION_SERVICE_URL) {
    return 'unhealthy';
  }

  try {
    const response = await axios.get(
      `${env.EXECUTION_SERVICE_URL}/health`,
      {
        timeout: 5000,
      }
    );

    if (response.data?.status !== 'ok') {
      return 'unhealthy';
    }

    return response.data.executionEnabled === false ? 'disabled' : 'unhealthy';
  } catch (error) {
    return 'unhealthy';
  }
}
