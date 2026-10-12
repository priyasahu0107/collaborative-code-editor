# Deployment Guide

Deploy the client, API server, and execution API as ordinary Node.js services or managed application services. Code execution remains disabled in production until an OS-enforced sandbox has been designed and security-tested.

## Requirements

- Node.js 20 LTS and npm 10
- MongoDB Atlas or another protected MongoDB deployment
- A reverse proxy or managed HTTPS ingress
- A high-entropy JWT secret (at least 32 characters)
- Private network access from the API to MongoDB and, optionally, the execution API

## Build and Start

From the repository root:

```bash
npm ci
npm run typecheck
npm run test
npm run build:all
```

Run the client static build with a static file server or CDN. Run the API and execution API as separate Node.js services using `npm run start --workspace=server` and `npm run start --workspace=execution-service`. Use a process manager or the hosting platform's service supervisor to restart processes and capture logs.

Set server environment variables through the deployment platform's secret/configuration manager:

- `NODE_ENV=production`
- `PORT=5000`
- `MONGODB_URI`
- `CLIENT_URL`
- `JWT_SECRET`
- `EXECUTION_SERVICE_URL` only when the separate execution API is deployed

The execution API accepts `PORT` (default `4000`). No environment variable enables code execution. Its `/execute` endpoint always refuses valid requests with `503 EXECUTION_DISABLED`.

## Network Boundaries

- Expose the client and API through HTTPS.
- Keep MongoDB and the execution API private; do not route public traffic to the execution API.
- Allow the API server to reach MongoDB and the execution API only where configured.
- Do not grant either application service host process-control privileges for code execution.

A reachable execution API is not an execution sandbox. Do not enable source execution through a direct process, shell, or in-process evaluator.

## Health Checks

```bash
curl https://your-domain.example/api/v1/health
curl https://your-domain.example/api/v1/health/ready
curl http://127.0.0.1:4000/health
```

The API readiness response reports the execution API as `disabled` when reachable. This status is expected until a separately managed, OS-enforced sandbox is available.

## Reverse Proxy

Route `/` to the static client, `/api` to the API server on port `5000`, and `/socket.io` to the same API server with WebSocket upgrade enabled. Do not publish the execution API route through the public proxy.

## Operational Notes

- Keep environment secrets outside the repository and rotate them through the platform's secret manager.
- Configure TLS, CORS, log retention, alerts, and database backups for the chosen host.
- Scale the client statically and the API horizontally according to measured load; configure sticky sessions or a Socket.IO adapter when needed.
- Do not claim code execution support until isolation and hostile-code tests pass on the target host.
