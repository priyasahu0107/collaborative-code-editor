/**
 * Execution type definitions
 */

export interface ExecutionRequest {
  code: string;
  language: string;
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

export interface LanguageConfig {
  id: string;
  name: string;
  supported: boolean;
}

export const SUPPORTED_LANGUAGES: Record<string, LanguageConfig> = {
  javascript: {
    id: 'javascript',
    name: 'JavaScript',
    supported: false,
  },
  typescript: {
    id: 'typescript',
    name: 'TypeScript',
    supported: false,
  },
  python: {
    id: 'python',
    name: 'Python',
    supported: false,
  },
  java: {
    id: 'java',
    name: 'Java',
    supported: false, // Not yet implemented
  },
};

export const EXECUTION_LIMITS = {
  MAX_CODE_SIZE: 64 * 1024, // 64KB
  MAX_STDIN_SIZE: 10 * 1024, // 10KB
  MAX_STDOUT_SIZE: 1024 * 1024, // 1MB
  MAX_STDERR_SIZE: 1024 * 1024, // 1MB
  DEFAULT_TIMEOUT: 10000, // 10 seconds
  MAX_TIMEOUT: 30000, // 30 seconds
};
