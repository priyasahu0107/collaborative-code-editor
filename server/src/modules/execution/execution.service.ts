/**
 * Execution service client
 * 
 * Communicates with the isolated execution service via HTTP.
 */

import axios, { AxiosError } from 'axios';
import { getEnv } from '../../config/env.js';
import logger from '../../utils/logger.js';
import { ExecutionResult, EXECUTION_ERRORS } from './execution.types.js';

interface ExecutionServiceResponse {
  success: boolean;
  data?: ExecutionResult;
  error?: string;
  message?: string;
}

export type ExecutionServiceHealth = 'healthy' | 'disabled' | 'unhealthy';

/**
 * Execute code via the execution service
 */
export async function executeCode(
  code: string,
  language: string,
  stdin?: string,
  timeout?: number
): Promise<ExecutionResult> {
  const env = getEnv();
  
  if (!env.EXECUTION_SERVICE_URL) {
    throw new Error(EXECUTION_ERRORS.SERVICE_UNAVAILABLE);
  }

  try {
    const response = await axios.post<ExecutionServiceResponse>(
      `${env.EXECUTION_SERVICE_URL}/execute`,
      {
        code,
        language,
        stdin: stdin || '',
        timeout: timeout || 10000,
      },
      {
        timeout: 35000, // Slightly longer than max execution timeout
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.error || EXECUTION_ERRORS.EXECUTION_FAILED);
    }

    return response.data.data!;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ExecutionServiceResponse>;
      
      if (axiosError.code === 'ECONNREFUSED' || axiosError.code === 'ENOTFOUND') {
        logger.error('Execution service connection failed', { 
          url: env.EXECUTION_SERVICE_URL 
        });
        throw new Error(EXECUTION_ERRORS.SERVICE_UNAVAILABLE);
      }

      if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
        throw new Error(EXECUTION_ERRORS.EXECUTION_TIMEOUT);
      }

      if (axiosError.response?.data?.error) {
        if (axiosError.response.data.error === 'EXECUTION_DISABLED') {
          throw new Error(EXECUTION_ERRORS.EXECUTION_DISABLED);
        }
        throw new Error(axiosError.response.data.error);
      }
    }

    logger.error('Execution service error', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    throw new Error(EXECUTION_ERRORS.EXECUTION_FAILED);
  }
}

/**
 * Get supported languages from execution service
 */
export async function getSupportedLanguages(): Promise<Array<{ id: string; name: string; supported: boolean }>> {
  const env = getEnv();
  
  if (!env.EXECUTION_SERVICE_URL) {
    return [];
  }

  try {
    const response = await axios.get<{ success: boolean; data: Array<{ id: string; name: string; supported: boolean }> }>(
      `${env.EXECUTION_SERVICE_URL}/languages`,
      {
        timeout: 5000,
      }
    );

    if (!response.data.success) {
      return [];
    }

    return response.data.data;
  } catch (error) {
    logger.error('Failed to fetch supported languages', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return [];
  }
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

    return response.data.executionEnabled === false ? 'disabled' : 'healthy';
  } catch (error) {
    return 'unhealthy';
  }
}
