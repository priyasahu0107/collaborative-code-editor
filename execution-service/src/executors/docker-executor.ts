/**
 * Docker-based code executor
 * 
 * Executes code in isolated Docker containers with strict resource limits.
 * Security features:
 * - Non-root user execution
 * - Read-only root filesystem
 * - No network access
 * - CPU and memory limits
 * - Execution timeout
 * - Output size limits
 */

import { spawn } from 'child_process';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { 
  ExecutionRequest, 
  ExecutionResult, 
  LanguageConfig, 
  SUPPORTED_LANGUAGES,
  EXECUTION_LIMITS 
} from '../types/execution.js';

// Track concurrent executions
let activeExecutions = 0;

/**
 * Execute code in an isolated Docker container
 */
export async function executeCode(request: ExecutionRequest): Promise<ExecutionResult> {
  const startTime = Date.now();
  
  // Check concurrency limit
  if (activeExecutions >= EXECUTION_LIMITS.MAX_CONCURRENT_EXECUTIONS) {
    return {
      stdout: '',
      stderr: 'Too many concurrent executions. Please try again later.',
      exitCode: 1,
      executionTime: Date.now() - startTime,
      timedOut: false,
      error: 'CONCURRENCY_LIMIT',
    };
  }

  // Validate language
  const language = SUPPORTED_LANGUAGES[request.language];
  if (!language) {
    return {
      stdout: '',
      stderr: `Unsupported language: ${request.language}`,
      exitCode: 1,
      executionTime: Date.now() - startTime,
      timedOut: false,
      error: 'UNSUPPORTED_LANGUAGE',
    };
  }

  if (!language.supported) {
    return {
      stdout: '',
      stderr: `Language ${language.name} is not yet supported`,
      exitCode: 1,
      executionTime: Date.now() - startTime,
      timedOut: false,
      error: 'LANGUAGE_NOT_AVAILABLE',
    };
  }

  // Validate code size
  if (request.code.length > EXECUTION_LIMITS.MAX_CODE_SIZE) {
    return {
      stdout: '',
      stderr: `Code size exceeds limit of ${EXECUTION_LIMITS.MAX_CODE_SIZE} bytes`,
      exitCode: 1,
      executionTime: Date.now() - startTime,
      timedOut: false,
      error: 'CODE_TOO_LARGE',
    };
  }

  // Validate stdin size
  if (request.stdin && request.stdin.length > EXECUTION_LIMITS.MAX_STDIN_SIZE) {
    return {
      stdout: '',
      stderr: `Input size exceeds limit of ${EXECUTION_LIMITS.MAX_STDIN_SIZE} bytes`,
      exitCode: 1,
      executionTime: Date.now() - startTime,
      timedOut: false,
      error: 'INPUT_TOO_LARGE',
    };
  }

  // Validate and clamp timeout
  const timeout = Math.min(
    request.timeout || EXECUTION_LIMITS.DEFAULT_TIMEOUT,
    EXECUTION_LIMITS.MAX_TIMEOUT
  );

  activeExecutions++;

  try {
    const result = await executeInDocker(request.code, language, request.stdin || '', timeout);
    result.executionTime = Date.now() - startTime;
    return result;
  } catch (error) {
    return {
      stdout: '',
      stderr: error instanceof Error ? error.message : 'Execution failed',
      exitCode: 1,
      executionTime: Date.now() - startTime,
      timedOut: false,
      error: 'EXECUTION_ERROR',
    };
  } finally {
    activeExecutions--;
  }
}

/**
 * Execute code in Docker container
 */
async function executeInDocker(
  code: string,
  language: LanguageConfig,
  stdin: string,
  timeout: number
): Promise<ExecutionResult> {
  // Create temporary directory for execution
  const execId = `exec-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const workDir = join(tmpdir(), 'code-exec', execId);
  
  try {
    // Create work directory
    mkdirSync(workDir, { recursive: true });

    // Write code to file
    const codeFile = join(workDir, `solution${language.fileExtension}`);
    writeFileSync(codeFile, code);

    // Build Docker command with security options
    const dockerArgs = [
      'run',
      '--rm', // Remove container after execution
      '--network=none', // No network access
      '--memory=256m', // Memory limit
      '--cpus=1', // CPU limit
      '--pids-limit=64', // Process limit
      '--read-only', // Read-only root filesystem
      '--tmpfs', '/tmp:noexec,size=64m', // Writable tmpfs for temp files
      '--security-opt=no-new-privileges', // Prevent privilege escalation
      '-v', `${workDir}:/workspace:ro`, // Mount code as read-only
      '-w', '/workspace', // Working directory
      '--user', '1000:1000', // Non-root user
      language.dockerImage,
      '/bin/sh', '-c',
      buildExecutionCommand(language),
    ];

    // Execute in Docker
    const result = await runDockerCommand(dockerArgs, stdin, timeout);
    
    // Truncate output if necessary
    return {
      stdout: truncateOutput(result.stdout, EXECUTION_LIMITS.MAX_STDOUT_SIZE),
      stderr: truncateOutput(result.stderr, EXECUTION_LIMITS.MAX_STDERR_SIZE),
      exitCode: result.exitCode,
      executionTime: 0, // Will be set by caller
      timedOut: result.timedOut,
    };
  } finally {
    // Cleanup work directory
    try {
      if (existsSync(workDir)) {
        rmSync(workDir, { recursive: true, force: true });
      }
    } catch (error) {
      console.error('Failed to cleanup work directory:', error);
    }
  }
}

/**
 * Build the execution command for the language
 */
function buildExecutionCommand(language: LanguageConfig): string {
  if (language.compileCommand) {
    // Compile and run
    return `${language.compileCommand} && ${language.runCommand}`;
  }
  return language.runCommand;
}

/**
 * Run Docker command and capture output
 */
function runDockerCommand(
  args: string[],
  stdin: string,
  timeout: number
): Promise<{ stdout: string; stderr: string; exitCode: number; timedOut: boolean }> {
  return new Promise((resolve) => {
    const docker = spawn('docker', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let timeoutHandle: NodeJS.Timeout;

    // Set timeout
    timeoutHandle = setTimeout(() => {
      timedOut = true;
      docker.kill('SIGKILL');
    }, timeout);

    // Write stdin if provided
    if (stdin) {
      docker.stdin.write(stdin);
      docker.stdin.end();
    } else {
      docker.stdin.end();
    }

    // Capture stdout
    docker.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    // Capture stderr
    docker.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    // Handle completion
    docker.on('close', (code) => {
      clearTimeout(timeoutHandle);
      resolve({
        stdout,
        stderr,
        exitCode: code ?? 1,
        timedOut,
      });
    });

    // Handle errors
    docker.on('error', (error) => {
      clearTimeout(timeoutHandle);
      resolve({
        stdout: '',
        stderr: `Docker execution failed: ${error.message}`,
        exitCode: 1,
        timedOut: false,
      });
    });
  });
}

/**
 * Truncate output to size limit
 */
function truncateOutput(output: string, maxSize: number): string {
  if (output.length <= maxSize) {
    return output;
  }
  return output.substring(0, maxSize) + '\n[Output truncated]';
}

/**
 * Get current execution count
 */
export function getActiveExecutionCount(): number {
  return activeExecutions;
}
