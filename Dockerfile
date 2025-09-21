# Use Node base, add pg_dump client from Postgres repo
FROM node:20-alpine

# Install Postgres client (pg_dump)
RUN apk add --no-cache postgresql16-client bash

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production

COPY src ./src
COPY scripts ./scripts

# create backups dir
RUN mkdir -p /app/backups && chown -R node:node /app/backups
COPY .env.example ./.env.example

USER node

EXPOSE 8080
CMD ["node", "src/server.js"]
