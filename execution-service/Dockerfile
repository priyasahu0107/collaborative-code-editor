# Execution Service Dockerfile
# Multi-stage build for secure, isolated code execution

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including dev)
RUN npm ci

# Copy source
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

# Security: Run as non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy only production files
COPY package.json package-lock.json* ./
RUN npm ci --only=production && npm cache clean --force

# Copy built files from builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Security: Read-only root filesystem (with exceptions)
# Note: This is enforced at runtime via docker run flags

# Create temp directory for execution
RUN mkdir -p /tmp/exec && chown nodejs:nodejs /tmp/exec

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

# Run the service
CMD ["node", "dist/server.js"]
