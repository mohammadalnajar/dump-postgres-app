# Production Dockerfile with alternative registry support
# Use this if Docker Hub authentication fails

# --- Builder Stage ---
FROM node:20-alpine AS builder

RUN apk add --no-cache bash

WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy application code
COPY src ./src
COPY scripts ./scripts

# Skip postinstall scripts during Docker builds
ENV IN_DOCKER=true

# Install dependencies
RUN npm ci --only=production && npm cache clean --force


# --- Production Stage ---
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install runtime dependencies
RUN apk add --no-cache \
    postgresql17-client \
    curl \
    bash \
    ca-certificates \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Copy from builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/src ./src
COPY --from=builder --chown=nodejs:nodejs /app/scripts ./scripts
COPY --chown=nodejs:nodejs package*.json ./

# Create required directories
RUN mkdir -p /app/backups /app/logs && \
    chown -R nodejs:nodejs /app && \
    chmod 750 /app/backups /app/logs

RUN mkdir -p /app/data && \
    chown -R nodejs:nodejs /app/data && \
    chmod 700 /app/data

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server.js"]