# Code Execution

## Current Status

Code execution is disabled. The execution API is a separate Node.js service, but it does not evaluate user source or create child processes. It validates execution requests and responds with `503 EXECUTION_DISABLED`. All advertised languages return `supported: false`.

The API server remains a proxy and never executes untrusted code. A plain process boundary is not a sandbox, and source must not be passed to `eval`, `Function`, a shell, or an unrestricted child process.

## API

The authenticated API routes remain available:

- `POST /api/v1/execution/execute`: validates the project, permissions, and request, then returns `503` while execution is disabled.
- `GET /api/v1/execution/languages`: returns the language registry with every language marked unsupported.
- `GET /api/v1/execution/health`: reports `disabled` when the execution API is reachable.

The execution service exposes `/health`, `/languages`, and `/execute` on its configured `PORT` (default `4000`). The direct `/execute` endpoint also validates the request before returning `503 EXECUTION_DISABLED`.

## Re-enablement Requirements

Execution may only be enabled after a separately managed runtime can enforce isolation outside the API and execution-service processes. The design must provide OS-enforced process and filesystem isolation, bounded CPU/memory/process counts, time and output limits, restricted networking, and cleanup even on timeout or service failure. Security tests must prove hostile code cannot access the host, secrets, or other runs.

Until those guarantees exist and have been verified, keep the service disabled. Request validation and language allow-lists alone do not make execution safe.

## Configuration

The API service reads optional `EXECUTION_SERVICE_URL` to report execution API health. The execution API reads `PORT`. There is no runtime image, shell command, or sandbox executable configuration.
