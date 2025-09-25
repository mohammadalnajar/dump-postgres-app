# Dockerfile for dump-postgres-app

# --- Builder Stage ---
FROM node:20-alpine AS builder

WORKDIR /app

# 1. Copy package files
COPY package*.json ./

# 2. Install ALL dependencies (including devDependencies needed for build if any)
RUN npm ci

# 3. Copy the rest of the application code
COPY . .

# --- Production Stage ---
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# 1) Install PostgreSQL client, curl (for healthchecks), and bash
RUN apk add --no-cache postgresql16-client bash curl ca-certificates

# 2) Create a non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy necessary artifacts from the builder stage
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY --from=builder /app/src ./src
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/.env.example ./.env.example

# Create backups directory and set proper permissions
RUN mkdir -p /app/backups && \
    chown -R nodejs:nodejs /app

# 3) Switch to non-root user
USER nodejs

# Expose the port the app runs on
EXPOSE 8080

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Start the app
CMD ["node", "src/server.js"]
