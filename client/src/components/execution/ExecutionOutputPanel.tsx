/**
 * Execution output panel component
 */

import { useEffect } from 'react';
import { useExecutionStore } from '../../stores/executionStore';
import { X, Play, Loader2, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '../ui/Button';

interface ExecutionOutputPanelProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  fileId?: string;
  language: string;
  code: string;
}

export default function ExecutionOutputPanel({
  isOpen,
  onClose,
  projectId,
  fileId,
  language,
  code,
}: ExecutionOutputPanelProps) {
  const {
    isExecuting,
    result,
    error,
    execute,
    clearResult,
    clearError,
  } = useExecutionStore();

  // Load languages on mount
  useEffect(() => {
    if (isOpen) {
      useExecutionStore.getState().loadLanguages();
    }
  }, [isOpen]);

  const handleExecute = async () => {
    await execute(projectId, fileId, language, code);
  };

  const handleClose = () => {
    clearResult();
    clearError();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="flex h-full flex-col border-t border-gray-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2">
        <div className="flex items-center gap-2">
          <Play className="h-4 w-4 text-gray-600" />
          <h3 className="text-sm font-semibold text-gray-900">Execution Output</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleExecute}
            disabled={isExecuting || !code.trim()}
            isLoading={isExecuting}
          >
            {isExecuting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Run
              </>
            )}
          </Button>
          <button
            onClick={handleClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Output area */}
      <div className="flex-1 overflow-auto p-4 font-mono text-sm">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-red-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <div>
                <p className="font-semibold">Execution Error</p>
                <p className="mt-1 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {/* Status */}
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                {result.exitCode === 0 ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <span className={result.exitCode === 0 ? 'text-green-600' : 'text-red-600'}>
                  Exit Code: {result.exitCode}
                </span>
              </div>
              <div className="flex items-center gap-1 text-gray-600">
                <Clock className="h-4 w-4" />
                <span>{(result.executionTime / 1000).toFixed(2)}s</span>
              </div>
              {result.timedOut && (
                <span className="rounded bg-yellow-100 px-2 py-0.5 text-yellow-800">
                  Timed Out
                </span>
              )}
            </div>

            {/* Standard Output */}
            {result.stdout && (
              <div>
                <h4 className="mb-2 text-xs font-semibold text-gray-700">Output</h4>
                <pre className="rounded-lg bg-gray-50 p-3 text-gray-900 overflow-x-auto">
                  {result.stdout}
                </pre>
              </div>
            )}

            {/* Standard Error */}
            {result.stderr && (
              <div>
                <h4 className="mb-2 text-xs font-semibold text-gray-700">Errors</h4>
                <pre className="rounded-lg bg-red-50 p-3 text-red-900 overflow-x-auto">
                  {result.stderr}
                </pre>
              </div>
            )}

            {/* No output */}
            {!result.stdout && !result.stderr && result.exitCode === 0 && (
              <div className="text-center text-gray-500">
                <p>Program executed successfully with no output</p>
              </div>
            )}
          </div>
        )}

        {!result && !error && !isExecuting && (
          <div className="flex h-full items-center justify-center text-gray-500">
            <div className="text-center">
              <Play className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-2">Click "Run" to execute your code</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
