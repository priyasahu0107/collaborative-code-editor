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
  dockerImage: string;
  fileExtension: string;
  compileCommand?: string;
  runCommand: string;
  supported: boolean;
}

export const SUPPORTED_LANGUAGES: Record<string, LanguageConfig> = {
  javascript: {
    id: 'javascript',
    name: 'JavaScript',
    dockerImage: 'node:20-alpine',
    fileExtension: '.js',
    runCommand: 'node solution.js',
    supported: true,
  },
  typescript: {
    id: 'typescript',
    name: 'TypeScript',
    dockerImage: 'node:20-alpine',
    fileExtension: '.ts',
    compileCommand: 'npx -y typescript tsc solution.ts --outDir /tmp --target ES2020 --module commonjs',
    runCommand: 'node /tmp/solution.js',
    supported: true,
  },
  python: {
    id: 'python',
    name: 'Python',
    dockerImage: 'python:3.11-alpine',
    fileExtension: '.py',
    runCommand: 'python3 solution.py',
    supported: true,
  },
  java: {
    id: 'java',
    name: 'Java',
    dockerImage: 'openjdk:17-alpine',
    fileExtension: '.java',
    compileCommand: 'javac Solution.java',
    runCommand: 'java Solution',
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
  MAX_CONCURRENT_EXECUTIONS: 10,
};
