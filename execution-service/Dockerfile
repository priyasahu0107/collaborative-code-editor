# Execution Service Dockerfile
# This service runs in an isolated container for safe code execution

FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --only=production

# Copy source
COPY tsconfig.json ./
COPY src/ ./src/

# Build
RUN npm run build

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

# Run
CMD ["node", "dist/server.js"]
