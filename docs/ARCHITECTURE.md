# System Architecture

## Overview

The PostgreSQL Dump App is a Node.js/Express application designed for creating and managing PostgreSQL database backups with automated scheduling, encryption, and a modern web interface.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Browser                        │
│                  (HTML/CSS/JavaScript)                       │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Nginx Reverse Proxy                       │
│              (SSL termination, rate limiting)                │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Express Application                       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Middleware Stack                                      │  │
│  │  • Helmet (Security headers)                          │  │
│  │  • Compression (gzip)                                 │  │
│  │  • Rate Limiting (DDoS protection)                    │  │
│  │  • Session Management (cookie-based auth)             │  │
│  │  • Morgan (Logging)                                   │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Route Handlers                                        │  │
│  │  • Authentication (/login, /logout)                   │  │
│  │  • Dashboard (/)                                      │  │
│  │  • Backup Operations (/backup, /list-backups)         │  │
│  │  • Cron Management (/cron/*)                          │  │
│  │  • Health Check (/health)                             │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Business Logic Layer                                  │  │
│  │                                                        │  │
│  │  ┌─────────────────┐  ┌──────────────────┐           │  │
│  │  │ pgdump.js       │  │ cronManagerSecure │           │  │
│  │  │ • Backup exec   │  │ • Job scheduling  │           │  │
│  │  │ • File mgmt     │  │ • Encryption      │           │  │
│  │  │ • Formatting    │  │ • Sleep detection │           │  │
│  │  └─────────────────┘  └──────────────────┘           │  │
│  │                                                        │  │
│  │  ┌─────────────────┐  ┌──────────────────┐           │  │
│  │  │ backupCleanup   │  │ auth.js          │           │  │
│  │  │ • Retention     │  │ • Session auth   │           │  │
│  │  │ • Job isolation │  │ • Password hash  │           │  │
│  │  └─────────────────┘  └──────────────────┘           │  │
│  │                                                        │  │
│  │  ┌─────────────────┐  ┌──────────────────┐           │  │
│  │  │ navicat-format  │  │ validate.js      │           │  │
│  │  │ • SQL transform │  │ • Input checks   │           │  │
│  │  │ • Header gen    │  │ • Sanitization   │           │  │
│  │  └─────────────────┘  └──────────────────┘           │  │
│  └───────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
           ┌─────────────┼─────────────┐
           ▼             ▼             ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │PostgreSQL│  │PostgreSQL│  │PostgreSQL│
    │Database 1│  │Database 2│  │Database N│
    └──────────┘  └──────────┘  └──────────┘
```

## Core Components

### 1. Express Server (`src/server.js`)
**Responsibilities:**
- HTTP request handling
- Middleware orchestration
- Route management
- Session management
- Error handling

**Key Features:**
- Production-ready security (Helmet, CSRF, rate limiting)
- Session-based authentication
- Health check endpoint
- Graceful shutdown handling

### 2. Backup Engine (`src/lib/pgdump.js`)
**Responsibilities:**
- Execute `pg_dump` commands
- Manage backup files
- Handle multiple output formats
- Support Navicat-style formatting

**Output Formats:**
- Plain SQL
- Custom (`.dump`)
- Tar archive
- Directory format

**Key Features:**
- Flexible format selection
- Compression support
- Schema/data isolation
- Custom pg_dump arguments

### 3. Cron Manager (`src/lib/cronManagerSecure.js`)
**Responsibilities:**
- Schedule automated backups
- Encrypt/decrypt credentials
- Manage job lifecycle
- Sleep/wake detection
- Health monitoring

**Security:**
- AES-256-GCM encryption
- Secure key management
- No plain-text credentials

**Features:**
- Predefined cron patterns
- Custom cron expressions
- Enable/disable jobs
- Job status tracking
- Concurrent execution prevention

### 4. Backup Cleanup (`src/lib/backupCleanup.js`)
**Responsibilities:**
- Automatic backup retention
- Job-specific file isolation
- Safe file deletion
- Preview before cleanup

**Strategies:**
- Days-based retention
- Count-based retention
- Combined policies
- Pre/post execution cleanup

### 5. Authentication (`src/lib/auth.js`)
**Responsibilities:**
- Session-based authentication
- Password hashing (bcrypt)
- Credential verification
- Route protection

**Features:**
- Secure session cookies
- Environment-based credentials
- Login rate limiting
- Auto-logout on browser close

### 6. Navicat Formatter (`src/lib/navicat-formatter.js`)
**Responsibilities:**
- Transform pg_dump output
- Generate professional headers
- Organize SQL structure
- Filter extension functions

**Output:**
- Rich metadata headers
- Organized sections
- Clean formatting
- INSERT or COPY statements

## Data Flow

### Manual Backup Flow
```
User Request → Express Route → Validation → pgdump.js
                                                  ↓
                                            pg_dump CLI
                                                  ↓
                                            PostgreSQL DB
                                                  ↓
                                            Raw SQL File
                                                  ↓
                                     (Optional) Navicat Formatter
                                                  ↓
                                            Final Backup File
                                                  ↓
                                            backups/ directory
```

### Scheduled Backup Flow
```
Cron Schedule → cronManagerSecure.js → Decrypt Credentials
                                              ↓
                                         Execute Job
                                              ↓
                                         pgdump.js
                                              ↓
                                      Create Backup File
                                              ↓
                                      (Optional) Cleanup
                                              ↓
                                      Update Job Status
```

### Cleanup Flow
```
Cleanup Trigger → backupCleanup.js → Identify Job Files
                                            ↓
                                     Apply Retention Policy
                                            ↓
                                     Calculate Files to Delete
                                            ↓
                                     (Optional) Preview
                                            ↓
                                     Delete Old Backups
```

## Storage

### File System
```
backups/                    # Backup storage
├── db1_20260124_120000.sql
├── db2_20260124_130000.sql
└── ...

data/
├── cron-jobs.json         # Encrypted job definitions

src/
├── public/                # Static assets
└── views/                 # EJS templates
```

### Session Storage
- In-memory session store (default)
- Cookie-based session management
- Secure, HttpOnly cookies
- Production: Consider Redis/database-backed sessions

### Encrypted Storage
- `cron-jobs.json`: AES-256-GCM encrypted credentials
- Environment variables for encryption keys
- No plain-text passwords in storage

## Security Architecture

### Layers of Security

1. **Network Layer**
   - Nginx reverse proxy
   - SSL/TLS encryption
   - Rate limiting
   - IP whitelisting (optional)

2. **Application Layer**
   - Helmet security headers
   - CSRF protection
   - XSS prevention
   - SQL injection prevention (parameterized)

3. **Authentication Layer**
   - Session-based auth
   - Bcrypt password hashing
   - Secure cookie configuration
   - Login rate limiting

4. **Data Layer**
   - AES-256-GCM encryption
   - Secure key management
   - File permission restrictions (600)
   - No sensitive data in logs

### Threat Mitigation

| Threat        | Mitigation                        |
| ------------- | --------------------------------- |
| Brute Force   | Rate limiting, account lockout    |
| CSRF          | Session tokens, same-site cookies |
| XSS           | Content sanitization, CSP headers |
| SQL Injection | Parameterized queries, validation |
| Data Exposure | Encryption, secure storage        |
| DoS           | Rate limiting, timeouts           |
| Man-in-Middle | SSL/TLS, secure cookies           |

## Scalability Considerations

### Current Architecture
- Single-instance deployment
- File-based storage
- In-memory sessions

### Production Scaling Options

1. **Horizontal Scaling**
   - Load balancer (Nginx/HAProxy)
   - Shared session store (Redis)
   - Centralized backup storage (NFS/S3)

2. **Database Connection Pooling**
   - Reuse connections across requests
   - Connection limits per database
   - Health checks for stale connections

3. **Background Job Processing**
   - Separate cron manager service
   - Job queue (Bull/RabbitMQ)
   - Worker pool for parallel backups

4. **Storage Optimization**
   - Compression for backups
   - Tiered storage (hot/cold)
   - Cloud storage integration (S3/Azure Blob)

## Monitoring & Observability

### Health Checks
- `/health` endpoint for uptime monitoring
- Cron job health script
- File system monitoring
- Process monitoring

### Logging
- Morgan HTTP request logging
- Custom application logging
- Cron job execution logs
- Error tracking with context

### Metrics (Future)
- Backup success/failure rates
- Execution times
- Storage usage
- Active sessions

## Technology Stack

| Layer            | Technology         | Purpose                   |
| ---------------- | ------------------ | ------------------------- |
| Runtime          | Node.js 20         | JavaScript execution      |
| Framework        | Express.js         | Web application framework |
| Database Client  | pg_dump            | PostgreSQL backup tool    |
| Templating       | EJS                | Server-side rendering     |
| Encryption       | Node crypto        | AES-256-GCM encryption    |
| Password Hashing | bcryptjs           | Secure password storage   |
| Scheduling       | node-cron          | Job scheduling            |
| Security         | Helmet             | HTTP security headers     |
| Compression      | compression        | Response compression      |
| Rate Limiting    | express-rate-limit | DDoS protection           |
| Sessions         | express-session    | Session management        |
| Container        | Docker             | Containerization          |
| Reverse Proxy    | Nginx              | SSL/load balancing        |

## Deployment Architecture

### Docker Container
```
┌─────────────────────────────────────┐
│  Node.js Alpine Container           │
│                                      │
│  ├─ Node.js 20 Runtime              │
│  ├─ PostgreSQL Client (pg_dump)     │
│  ├─ Application Code                │
│  ├─ npm Dependencies                │
│  └─ Health Check Script             │
│                                      │
│  Volumes:                            │
│  ├─ ./backups:/app/backups          │
│  └─ ./data:/app/data                │
└─────────────────────────────────────┘
```

### Production Setup
```
Internet → Nginx (SSL) → Docker Container → PostgreSQL Databases
              ↓
         Rate Limiting
         IP Filtering
         SSL Termination
```

## Future Enhancements

1. **Multi-tenancy**: Support multiple users with role-based access
2. **Cloud Integration**: Direct uploads to S3/Azure/GCS
3. **Restore Functionality**: In-app database restore
4. **Backup Verification**: Test backups automatically
5. **WebSocket Updates**: Real-time progress indicators
6. **API Layer**: RESTful API for programmatic access
7. **Multi-database Support**: MySQL, MongoDB, etc.
8. **Backup Comparison**: Diff between backups
9. **Alerting**: Email/Slack notifications
10. **Metrics Dashboard**: Prometheus/Grafana integration
