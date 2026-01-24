# Postgres Dump App (Express + pg_dump)

A comprehensive, production-ready Node.js/Express application for PostgreSQL backup management. Features automated scheduling, encrypted storage, beautiful UI, and enterprise-grade security.

**🚀 Key Highlights:**
- **Advanced Scheduling**: Full-featured cron job system with encrypted credentials
- **Professional UI**: Modern dark theme with responsive design and elegant modals
- **Security First**: Session-based authentication with password encryption
- **Smart Cleanup**: Automated backup retention with job-specific isolation
- **Production Ready**: Docker-optimized with health checks and monitoring
- **Developer Experience**: Comprehensive tooling, git hooks, and documentation

---

## ✨ Major Features

### 🎯 **Automated Backup Scheduling**
- **Full Cron System**: Create, edit, delete, and monitor scheduled backup jobs
- **Visual Cron Builder**: Predefined patterns with human-readable descriptions
- **Real-Time Monitoring**: Job status tracking, health checks, and performance insights
- **Concurrent Protection**: Prevents overlapping executions with smart queuing
- **Sleep/Wake Handling**: Intelligent detection of laptop sleep cycles

### 🔐 **Enterprise Security**
- **AES-256-GCM Encryption**: All database credentials encrypted at rest
- **Session Authentication**: Modern login system with secure cookie management  
- **Rate Limiting**: Protection against brute force attacks
- **CSRF Protection**: Built-in security against cross-site request forgery
- **Password Hashing**: bcrypt with industry-standard salt rounds

### 🧹 **Smart Backup Management**
- **Job-Specific Cleanup**: Each job manages only its own files
- **Flexible Retention**: Days-based, count-based, or combined policies
- **Pre/Post Execution**: Cleanup before or after backup creation
- **Manual Override**: On-demand cleanup with preview functionality
- **Safe Operations**: Comprehensive validation and error handling

### 🎨 **Professional User Experience**
- **Modern Dashboard**: Responsive design with sidebar navigation
- **Elegant Modals**: Beautiful confirmation dialogs with smooth animations
- **Real-Time Feedback**: Live status updates and progress indicators
- **Contextual Help**: Tooltips, validation messages, and user guidance
- **Mobile Optimized**: Touch-friendly interface for all devices

### 🛠️ **Developer Tools & Workflow**
- **Git Hooks System**: Custom commit dates and TODO tracking
- **Task Management**: Integrated TODO system with automated scanning
- **Comprehensive Logging**: Structured logs with performance monitoring
- **Health Monitoring**: Built-in health checks and status reporting
- **Development Environment**: Hot-reload Docker setup with debugging support

---

## 🎯 Core Backup Features

### **Dual Output Modes**

The application now offers **two output styles** to match your workflow preferences:

### Standard pg_dump Style
- Traditional PostgreSQL dump format
- Includes all pg_dump metadata and settings
- Uses COPY statements for data (faster for large datasets)
- Maintains all PostgreSQL-specific features

### Navicat-like Style  
- **Professional header** with source server information, version, and timestamp
- **Organized structure** with clear section comments for sequences, tables, and data
- **Clean formatting** with proper DROP TABLE IF EXISTS statements
- **Transaction blocks** for data inserts (BEGIN/COMMIT)
- **Choice of data format**: COPY statements or INSERT statements
- **Simplified output** without pg_dump metadata and function definitions

**Key differences from standard pg_dump:**
- Rich metadata header similar to Navicat exports
- Better organization with descriptive section comments
- Optional INSERT statements instead of COPY (useful for selective imports)
- **Smart function handling** with DROP FUNCTION IF EXISTS statements
- **Extension function filtering** to prevent conflicts with existing database functions
- Cleaner, more readable structure
- Consistent formatting and spacing

**When to use Navicat-like style:**
- When you need cleaner, more readable SQL files
- For sharing database structures with team members
- When migrating between different database management tools
- For documentation and version control purposes
- When you prefer INSERT statements for selective data imports

### **Backup Formats & Options**
- ✅ **Output formats**: Plain SQL, Custom (`.dump`), Tar, Directory  
- ✅ **Compression**: Configurable compression levels for supported formats
- ✅ **Schema control**: Schema-only, data-only, specific schema inclusion/exclusion
- ✅ **Ownership**: Include/exclude ownership and privilege statements
- ✅ **Custom arguments**: Support for additional pg_dump flags
- ✅ **Timestamped filenames**: Automatic sanitization and organization

---

## 📅 Advanced Cron Job System

### **Full-Featured Scheduling**
The application includes a comprehensive cron job system for automated backups:

#### **Job Management**
- **Create Jobs**: Visual form with cron pattern builder and validation
- **Edit Jobs**: Modify schedules, cleanup policies, and configurations in-place
- **Monitor Status**: Real-time job status, last run information, and error tracking
- **Health Monitoring**: Automatic system health checks every hour with detailed reporting

#### **Smart Cron Features**
- **Predefined Patterns**: Common schedules (hourly, daily, weekly) with descriptions
- **Custom Patterns**: Full cron expression support with validation
- **Timezone Support**: Configurable timezone handling for consistent scheduling
- **Concurrency Control**: Prevents overlapping job executions
- **Sleep Detection**: Intelligent handling of laptop sleep/wake cycles

#### **Encrypted Credential Storage**
- **AES-256-GCM Encryption**: All database passwords encrypted at rest
- **Secure Key Management**: Environment-based encryption keys
- **Automatic Migration**: Seamless upgrade from plain text to encrypted storage
- **Production Ready**: Enterprise-grade security for sensitive credentials

### **Job-Specific Backup Cleanup**

#### **Intelligent File Management**
- **Isolation**: Each job manages only its own backup files
- **Filename Structure**: Jobs create files with unique patterns (`{db}_{job-name}_{timestamp}`)
- **Manual Protection**: Manual backups never affected by automated cleanup
- **Safe Operations**: Comprehensive validation before any deletion

#### **Flexible Retention Policies**
- **Days-based**: Keep files newer than X days (1-365 days)
- **Count-based**: Keep only the latest X files (1-1000 files)  
- **Combined Logic**: Both conditions must be met (AND logic)
- **Timing Options**: Cleanup before or after backup creation
- **Preview Mode**: See what will be deleted before confirming

#### **Configuration Examples**
```javascript
// Hourly job - keep 24 hours of backups
{
  name: "prod-hourly",
  schedule: "0 * * * *",
  cleanup: {
    enabled: true,
    method: "count", 
    retentionCount: 24,
    timing: "after"
  }
}

// Daily job - keep 90 days
{
  name: "prod-daily",
  schedule: "0 2 * * *",
  cleanup: {
    enabled: true,
    method: "days",
    retentionDays: 90,
    timing: "after"  
  }
}
```

---

## 🔐 Security & Authentication

### **Modern Authentication System**
This app offers **two authentication modes** with enterprise-grade security:

#### **� Session-based Authentication (Recommended)**
- **Modern login system** with username/password form
- **Secure session management** with encrypted cookies  
- **Password hashing** with bcrypt (10 salt rounds)
- **Automatic logout** after 24 hours of inactivity
- **CSRF protection** and secure cookie settings
- **Login rate limiting** (5 attempts per 15 minutes per IP)
- **Production-ready** with proper security headers

**Default credentials:**
- Username: `admin`
- Password: `admin123`

⚠️ **Important**: Change these credentials in production using environment variables!

#### **🔒 Basic Auth (Legacy)**
- Simple HTTP Basic Authentication
- Browser popup for credentials
- Stateless (no sessions)
- Available for backward compatibility

### **Data Security Features**
- **Encrypted Storage**: All cron job passwords encrypted with AES-256-GCM
- **Secure Key Management**: Environment-based encryption keys with auto-generation
- **File Permissions**: Restricted access to sensitive configuration files
- **Environment Protection**: Secure handling of sensitive environment variables
- **Git Safety**: Automatic .gitignore rules for sensitive files

**Configuration:**
```bash
# Session-based auth (default)
USE_SESSION_AUTH=true
AUTH_USERNAME=your-username
AUTH_PASSWORD=your-secure-password
SESSION_SECRET=your-very-long-random-secret

# Encryption for cron jobs
CRON_ENCRYPTION_KEY="your-64-character-hex-string-here"

# Legacy basic auth
USE_SESSION_AUTH=false
BASIC_AUTH_USER=admin
BASIC_AUTH_PASS=secure-password
```

---

## 🎨 User Experience & Interface

### **Modern Dashboard Design**
- **Responsive Layout**: Collapsible sidebar with mobile optimization
- **Dark Theme**: Professional dark mode with gradient accents
- **Clean Typography**: Inter font family for optimal readability
- **Contextual Navigation**: Smart sidebar with active state indicators

### **Advanced Modal System**
- **Beautiful Confirmations**: Replace browser alerts with elegant modals
- **Type-Specific Styling**: Color-coded modals (danger, warning, info)
- **Smooth Animations**: CSS3 transitions with cubic-bezier easing
- **Accessibility**: Proper focus management and keyboard navigation
- **Mobile Optimized**: Touch-friendly interactions

### **Interactive Features**
- **Real-Time Updates**: Live job status and health monitoring
- **Form Validation**: Client-side validation with helpful error messages
- **Progress Indicators**: Visual feedback for long-running operations  
- **Contextual Help**: Tooltips and guidance for complex features
- **Keyboard Shortcuts**: Power-user friendly navigation

---

## 🛠️ Development Tools & Workflow

### **🪝 Git Hooks & Custom Commit Dates**
Enhanced git workflow with custom commit date functionality:

**Features:**
- **📅 Custom Date/Time Prompt**: Set custom `GIT_AUTHOR_DATE` and `GIT_COMMITTER_DATE`
- **🔍 TODO Tracking**: Warns about TODO comments in code files before committing
- **⚡ Smart Bypassing**: Multiple environment variables for selective feature skipping
- **🎯 Automatic Setup**: Installed automatically with `npm install`

**Usage:**
```bash
# Normal commit (will prompt for custom date and check TODOs)
git commit -m "Add new feature"

# Skip all hooks
git commit --no-verify -m "Emergency fix"

# Skip only date prompt
SKIP_DATE_PROMPT=1 git commit -m "Quick fix"

# Skip only TODO check
SKIP_TODO_CHECK=1 git commit -m "Feature with TODOs"
```

**Use cases:**
- **Backdating commits** for proper chronological order
- **Batch commits** with specific timestamps
- **Time zone adjustments** for distributed teams
- **Historical reconstruction** of development timeline

### **📋 TODO & Task Management System**

**Comprehensive task tracking system:**
- **Central Management**: Organized TODO.md with priority levels (🔥 High, 🟡 Medium, 🟢 Low)
- **Development Journal**: Daily logs with session goals and blockers
- **Automated Scanning**: Finds TODO, FIXME, HACK, BUG comments in codebase
- **Color-Coded Output**: Visual distinction between different comment types

**Scripts:**
```bash
# Scan for TODOs in codebase
npm run todos

# Watch for TODOs (updates every 30 seconds)
npm run todos:watch

# Open planning documents
npm run plan
```

### **🔍 Health Monitoring & Debugging**
- **Health Endpoints**: Built-in `/health` endpoint for monitoring
- **Comprehensive Logging**: Structured logs with performance metrics
- **Sleep Detection**: Intelligent handling of development laptop sleep cycles
- **Error Tracking**: Detailed error reporting with context
- **Performance Monitoring**: Job execution timing and resource usage

---

## 📁 Project Structure

```
dump-postgres-app/
├─ docker-compose.yml          # Main production configuration
├─ docker-compose.dev.yml      # Development overrides  
├─ docker-compose.prod.yml     # Production network overrides
├─ Dockerfile                  # Multi-stage optimized build
├─ Makefile                    # Comprehensive management commands
├─ .env.example               # Environment template
├─ .env                       # Local environment (not committed)
├─ .env.production            # Production template
├─ secure-setup.sh            # Encryption key setup script
├─ package.json               # Dependencies and scripts
├─ cron-jobs.json             # Encrypted cron job storage (not committed)
├─ src/
│  ├─ server.js               # Main Express application
│  ├─ views/
│  │  ├─ index.ejs            # Main dashboard
│  │  ├─ login.ejs            # Authentication page
│  │  ├─ edit-cron-job.ejs    # Cron job editing interface
│  │  └─ partials/            # Reusable view components
│  ├─ lib/
│  │  ├─ pgdump.js            # PostgreSQL backup execution
│  │  ├─ navicat-formatter.js # Navicat-style output formatting
│  │  ├─ cronManagerSecure.js # Encrypted cron system with sleep/wake detection
│  │  ├─ backupCleanup.js     # Intelligent backup cleanup
│  │  ├─ auth.js              # Session-based authentication
│  │  ├─ sanitize.js          # Input sanitization utilities
│  │  └─ validate.js          # Input validation helpers
│  └─ public/
│     ├─ style.css            # Main stylesheet
│     ├─ confirmation-modal.css # Modal system styling
│     └─ confirmation-modal.js  # Modal system logic
├─ backups/                   # Generated dumps (Docker volume)
├─ scripts/
│  ├─ backup.sh               # CLI backup wrapper
│  ├─ check-cron-health.js    # Cron job health monitoring
│  ├─ scan-todos.sh           # TODO scanning automation
│  ├─ setup-hooks.sh          # Git hooks installation
│  └─ test-hooks.sh           # Hook testing utilities
├─ test/
│  ├─ debug-pgdump.js         # Database connection testing
│  ├─ test-auth.js            # Authentication testing
│  └─ test-json-escaping.js   # JSON sanitization tests
├─ docs/                      # Comprehensive documentation
│  ├─ README.md               # Documentation index
│  ├─ deployment/             # Production deployment guides
│  ├─ features/               # Feature documentation
│  ├─ development/            # Developer guides
│  └─ archive/                # Historical implementation notes
│  ├─ ENCRYPTION-COMPLETE.md  # Encryption implementation
│  ├─ GIT_HOOKS_GUIDE.md      # Git hooks setup guide
│  ├─ TODO_SYSTEM_GUIDE.md    # Task management docs
│  └─ PRODUCTION-SECURITY.md  # Security best practices
├─ .githooks/                 # Custom git hooks
│  └─ pre-commit              # Pre-commit validation
├─ .vscode/                   # VS Code configuration
└─ test/                      # Testing utilities
```

---

## Requirements

- Docker + Docker Compose
- (Optional for local dev) Node.js ≥ 18

> The Docker image installs `postgresql16-client` to provide `pg_dump`.

---

## Quick Start (Docker)

### For Development

1) **Clone & configure**

```bash
cp .env.example .env
# edit .env — set BASIC_AUTH_USER/BASIC_AUTH_PASS (recommended),
# APP_PORT, and any DEFAULT_* options you prefer.
```

2) **Build & run development environment**

```bash
# Using Makefile (recommended)
make dev

# Or using docker compose directly
docker compose -f docker-compose.dev.yml up -d --build
```

3) **Open the app**

```
http://localhost:8080
```

### For Production (standalone)

1) **Build & run production environment**

```bash
# Using Makefile (recommended)
make prod

# Or using docker compose directly
docker compose up -d --build
```

### For Production (with external networks/reverse proxy)

1) **Ensure external networks exist**

```bash
docker network create proxy
docker network create db_net
```

2) **Build & run with external networks**

```bash
# Using Makefile (recommended)
make prod-net

# Or using docker compose directly
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

> When using external networks, the app won't expose ports directly and expects to be accessed via a reverse proxy (like Nginx) on the `proxy` network.

### Makefile Commands

The project includes a comprehensive Makefile for easy management:

```bash
# Development
make dev                 # Build and start development environment
make build-dev          # Build development image only
make up-dev             # Start development containers
make down-dev           # Stop development containers
make logs-dev           # View development logs

# Production (standalone)
make prod               # Build and start production environment
make build-prod         # Build production image only
make up-prod            # Start production containers
make down-prod          # Stop production containers
make logs               # View production logs

# Production (with external networks)
make prod-net           # Build and start production with external networks
make build-prod-net     # Build production image with networks
make up-prod-net        # Start production containers with networks
make down-prod-net      # Stop production containers with networks

# Utilities
make ps                 # Show running containers
make status             # Show container status
make health-dev         # Check development container health
make health-prod        # Check production container health
make backup-list        # List current backup files
make backup-clean       # Clean old backup files (>7 days)
make clean              # Remove containers and clean system
make clean-volumes      # Remove volumes (with confirmation)
```

If you configured Basic Auth, your browser will prompt for credentials.

---

## Docker Configuration

The project now includes multiple Docker Compose configurations for different environments:

### Files Overview

- **`Dockerfile`**: Multi-stage build with optimized production image
- **`docker-compose.yml`**: Main production configuration
- **`docker-compose.dev.yml`**: Development-specific overrides
- **`docker-compose.prod.yml`**: Production overrides for external networks
- **`.dockerignore`**: Optimized build context
- **`Makefile`**: Management commands for all environments

### Key Features

- **Multi-stage Docker build** for optimized images
- **Health checks** for container monitoring
- **Security improvements** with non-root user
- **External network support** for reverse proxy setups
- **Development and production configurations**
- **Automatic backup directory creation**
- **Resource optimization** with proper caching

### Health Endpoint

The application now includes a health check endpoint at `/health`:

```bash
curl http://localhost:8080/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-09-23T10:30:00.000Z",
  "service": "dump-postgres-app"
}
```

---

## Environment Variables

| Variable                 |             Default | Description                                                                                    |
| ------------------------ | ------------------: | ---------------------------------------------------------------------------------------------- |
| `APP_PORT`               |              `8080` | Internal Express port (exposed via Compose).                                                   |
| `APP_BASE_PATH`          |                 `/` | Set if you’ll run under a sub-path behind a reverse proxy.                                     |
| `APP_TITLE`              | `Postgres Dump App` | Page title.                                                                                    |
| **Authentication**       |                     | **Session-based authentication (recommended)**                                                 |
| `USE_SESSION_AUTH`       |              `true` | Use session auth (`true`) or legacy basic auth (`false`).                                      |
| `AUTH_USERNAME`          |             `admin` | Username for session-based login.                                                              |
| `AUTH_PASSWORD`          |          `admin123` | Password for session-based login (change in production!).                                      |
| `SESSION_SECRET`         |           *(empty)* | Secret key for session encryption (required in production).                                    |
| **Legacy Basic Auth**    |                     | **Only used when USE_SESSION_AUTH=false**                                                      |
| `BASIC_AUTH_USER`        |           *(empty)* | If set along with `BASIC_AUTH_PASS`, enables Basic Auth.                                       |
| `BASIC_AUTH_PASS`        |           *(empty)* | Basic Auth password.                                                                           |
| `RATE_LIMIT_WINDOW_MS`   |             `60000` | Rate limit window in ms.                                                                       |
| `RATE_LIMIT_MAX`         |                `20` | Max requests per window per IP.                                                                |
| `DEFAULT_FORMAT`         |             `plain` | `plain` \| `custom` \| `directory` \| `tar`.                                                   |
| `DEFAULT_OUTPUT_STYLE`   |          `standard` | `standard` \| `navicat` - Output formatting style.                                             |
| `DEFAULT_INSERT_FORMAT`  |              `copy` | `copy` \| `inserts` - Data format for Navicat style.                                           |
| `DEFAULT_INCLUDE_OWNER`  |              `true` | `true`/`false` to include owner statements (`--no-owner` when false).                          |
| `DEFAULT_COMPRESS_LEVEL` |                 `0` | `0..9` (for `custom`/`tar`).                                                                   |
| `DEFAULT_EXCLUDE_SCHEMA` |           *(empty)* | Schema name to exclude (e.g., `information_schema`).                                           |
| `DEFAULT_ONLY_SCHEMA`    |           *(empty)* | Schema name to dump only (e.g., `public`).                                                     |
| `DEFAULT_ONLY_DATA`      |             `false` | If true, `--data-only`.                                                                        |
| `DEFAULT_EXTRA_ARGS`     |           *(empty)* | Additional pg_dump flags (e.g., `--no-privileges`).                                            |
| `AUTO_CLEAN_DAYS`        |           *(empty)* | If set (e.g., `14`), delete backups older than N days (**deprecated - use cron job cleanup**). |
| **Cron Job Security**    |                     | **Encryption for scheduled backups**                                                           |
| `CRON_ENCRYPTION_KEY`    |           *(empty)* | 64-character hex key for encrypting cron job passwords (**required for cron jobs**).           |
| **System Configuration** |                     | **Optional system settings**                                                                   |
| `TZ`                     |               `UTC` | Timezone for cron job scheduling.                                                              |
| `NODE_OPTIONS`           |           *(empty)* | Node.js runtime options (e.g., `--max-old-space-size=2048`).                                   |

### **🔑 Encryption Key Generation**

Generate a secure encryption key for cron jobs:

```bash
# Generate new key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or use the setup script
bash secure-setup.sh
```

**Example .env file:**
```bash
# Application
APP_PORT=8080
APP_TITLE=My Backup Manager
NODE_ENV=production

# Authentication
AUTH_USERNAME=admin
AUTH_PASSWORD=my-secure-password-2024
SESSION_SECRET=super-long-random-secret-key-for-production-use

# Cron Job Encryption (REQUIRED for scheduled backups)
CRON_ENCRYPTION_KEY="a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456"

# Timezone
TZ=America/New_York

# Performance
NODE_OPTIONS="--max-old-space-size=2048"
```

---

## 🎯 Usage Guide

### **Manual Backups**

1. **Login**: Access the application and authenticate with your credentials
2. **Connection Setup**: Fill in PostgreSQL connection details:
   - **Host**: Database server address
   - **Port**: Database port (usually 5432)
   - **Database**: Target database name
   - **User**: Database username
   - **Password**: Database password (encrypted for cron jobs)

3. **Format Selection**:
   - **Standard pg_dump**: Traditional PostgreSQL dump format
   - **Navicat-like**: Professional formatting with Navicat-style headers and organization

4. **Data Format** (for Navicat-like style):
   - **COPY statements**: Traditional COPY FROM stdin format (faster)
   - **INSERT statements**: Individual INSERT statements with column names (more compatible)

5. **Additional Options**:
   - Include/exclude ownership statements
   - Schema-only or data-only dumps
   - Specific schema inclusion/exclusion
   - Compression levels and extra arguments

6. **Execute**: Click **Create Backup** and download when complete
7. **Management**: View, download, or delete backup files from the dashboard

### **Automated Scheduling**

#### **Create Cron Jobs**
1. Navigate to the **"Scheduled Backups"** section
2. Click **"Create New Cron Job"**
3. Configure:
   - **Job Name**: Unique identifier (used in filenames)
   - **Schedule**: Choose from presets or enter custom cron pattern
   - **Database Connection**: Same as manual backups
   - **Backup Options**: Format, style, and pg_dump settings
   - **Cleanup Policy**: Automatic retention management

#### **Manage Scheduled Jobs**
- **View Status**: Real-time monitoring of job health and execution
- **Edit Jobs**: Modify schedules, cleanup policies, and configurations
- **Enable/Disable**: Toggle jobs on/off without deletion
- **Delete Jobs**: Remove jobs and stop scheduling

#### **Monitor Performance**
- **Health Dashboard**: System-wide cron job status overview
- **Execution Logs**: Detailed logs for each backup execution
- **Error Tracking**: Automatic error detection and reporting
- **Sleep Detection**: Laptop sleep/wake cycle awareness

> **Security Note**: All database passwords are encrypted using AES-256-GCM before storage. Passwords are only decrypted in memory during backup execution.

---

## Output Formats Comparison

### Standard pg_dump Format
```sql
--
-- PostgreSQL database dump
--

SET statement_timeout = 0;
SET lock_timeout = 0;
...

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(255)
);

COPY public.users (id, name) FROM stdin;
1	John Doe
2	Jane Smith
\.
```

### Navicat-like Format
```sql
/*
 Navicat Premium Data Transfer

 Source Server         : PostgreSQL Server
 Source Server Type    : PostgreSQL
 Source Host           : localhost:5432
 Source Catalog        : mydb
 Source Schema         : public

 Date: 22/09/2025 08:17:22
*/

-- ----------------------------
-- Table structure for users
-- ----------------------------
DROP TABLE IF EXISTS "users";
CREATE TABLE "users" (
  "id" int4 NOT NULL,
  "name" varchar(255) COLLATE "pg_catalog"."default"
)
;

-- ----------------------------
-- Records of users
-- ----------------------------
BEGIN;
INSERT INTO "users" ("id", "name") VALUES (1, 'John Doe');
INSERT INTO "users" ("id", "name") VALUES (2, 'Jane Smith');
COMMIT;
```

---

## Output & Restore

**Formats**
- **Plain** (`.sql`): human-readable
- **Custom** (`.dump`): recommended for `pg_restore`, supports selective restore & compression
- **Tar** (`.tar`): for `pg_restore`
- **Directory**: folder output (good for very large dumps)

**Restore examples**

```bash
# Plain SQL
psql -h HOST -U USER -d TARGETDB -f mydb_20250101_120000.sql

# Custom/Tar/Directory (pg_restore)
pg_restore -h HOST -U USER -d TARGETDB mydb_20250101_120000.dump
# common flags:
#   --clean --if-exists --create --schema=public --table=...
```

---

## CLI (inside the container)

You can also trigger a backup via the optional shell script:

```bash
docker exec -it dump-postgres-app   /app/scripts/backup.sh   --host db.example.com --port 5432 --db mydb --user dbuser --password 'secret'   --format custom --include-owner true --compress-level 5   --extra-args "--no-privileges"
```

The file will appear in `/app/backups` (mounted to `./backups` on the host).

---

## Scheduling (optional)

Use host cron to run periodic backups via `docker exec`:

```bash
# Edit root crontab
sudo crontab -e

# Every night at 02:15 (UTC): custom format, compress level 5
15 2 * * * docker exec dump-postgres-app /app/scripts/backup.sh   --host db.example.com --port 5432 --db mydb --user dbuser --password 'secret'   --format custom --include-owner true --compress-level 5 >> /var/log/pgbackup.log 2>&1
```

Or run a small scheduler container that POSTs to `http://app:8080/backup` with Basic Auth.

---

## Reverse Proxy (Nginx example)

```nginx
server {
  listen 80;
  server_name backup.example.com;

  location / {
    proxy_pass         http://127.0.0.1:8080/;
    proxy_http_version 1.1;
    proxy_set_header   Host $host;
    proxy_set_header   X-Real-IP $remote_addr;
    proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
  }
}
```

> Use HTTPS (e.g., with Caddy or Nginx + Let’s Encrypt). Consider IP allowlists or VPN access.

---

## Security Notes

- Protect the app with **Basic Auth** (set both `BASIC_AUTH_USER` and `BASIC_AUTH_PASS`).
- Run behind HTTPS and, ideally, behind a reverse proxy with IP allowlists or VPN.
- Keep Docker image updated (rebuild periodically to get latest Postgres client).
- Avoid logging sensitive envs. This app doesn’t log passwords; don’t add verbose child logs.
- Store backups on an encrypted volume or sync off-site (S3/MinIO/rclone) if needed.

---

## Troubleshooting

- **`pg_dump: command not found`**  
  You’re likely running outside the container. Use Docker or install PostgreSQL client tools locally.

- **Authentication failed**  
  Verify credentials and that `pg_hba.conf` allows connections from your VPS IP.

- **Timeouts / cannot connect**  
  Check firewall/security groups; ensure DB port (default 5432) is reachable. Use a VPN or SSH tunnel if necessary.

- **Permission denied writing backups**  
  Ensure `./backups` exists on the host and is writable by Docker (Compose mounts it to `/app/backups`).

---

## “Navicat-like” behavior

- Navicat’s “Include Owner” toggles ownership/ACL statements.  
  `pg_dump` includes owner by default; choosing **No** adds `--no-owner`.  
- File naming is timestamped: `db_YYYYMMDD_HHMMSS.ext`.
- Use **custom** format (`.dump`) to get Navicat-like flexible restores via `pg_restore`.

---

## Development

### Option 1: Docker Development (Recommended)

Use the development Docker environment for a consistent setup:

```bash
# Start development environment
make dev

# View logs
make logs-dev

# Stop when done
make down-dev
```

The development configuration includes:
- Hot reload capabilities (if you mount source volumes)
- Development-optimized settings
- Direct port access
- Simplified networking

### Option 2: Local Development

Run locally (requires Node 18+ and Postgres client installed):

```bash
npm ci
npm run dev
# open http://localhost:8080
```

> **Note**: For local development, you'll need to install PostgreSQL client tools to have `pg_dump` available.

---

## 🪝 Git Hooks & Custom Commit Dates

This project includes enhanced git hooks with custom commit date functionality. The pre-commit hook provides:

### **Features**
- **📅 Custom Date/Time Prompt**: Optionally set custom `GIT_AUTHOR_DATE` and `GIT_COMMITTER_DATE` for commits
- **🔍 TODO Tracking**: Warns about TODO comments in code files before committing
- **⚡ Smart Bypassing**: Multiple environment variables for selective feature skipping

### **Quick Start**
```bash
# Setup hooks (automatic with npm install)
npm run setup:hooks

# Normal commit (will prompt for custom date and check TODOs)
git commit -m "Add new feature"

# Use custom date when prompted:
# Examples: 2025-09-24 08:51:20
#          2025-09-24T08:51:20+02:00
```

### **Bypass Options**
```bash
# Skip all hooks
git commit --no-verify -m "Emergency fix"

# Skip only date prompt (still checks TODOs)  
SKIP_DATE_PROMPT=1 git commit -m "Quick fix"

# Skip only TODO check (still prompts for date)
SKIP_TODO_CHECK=1 git commit -m "Feature with TODOs"

# Skip both
SKIP_DATE_PROMPT=1 SKIP_TODO_CHECK=1 git commit -m "Fast commit"
```

### **Use Cases for Custom Dates**
- **Backdating commits** for proper chronological order
- **Batch commits** with specific timestamps  
- **Time zone adjustments** for distributed teams
- **Historical reconstruction** of development timeline

> **📚 Documentation**: See [`docs/GIT_HOOKS_GUIDE.md`](docs/GIT_HOOKS_GUIDE.md) for complete setup and usage guide.

---

## 📊 Monitoring & Health Checks

### **Built-in Health Monitoring**

The application includes comprehensive monitoring capabilities:

#### **Health Endpoint**
```bash
# Check application health
curl http://localhost:8080/health

# Response
{
  "status": "healthy",
  "timestamp": "2025-09-25T10:30:00.000Z",
  "service": "dump-postgres-app"
}
```

#### **Cron Job Health Monitoring**
- **Automatic Status Logging**: Health checks every hour with detailed reporting
- **Job Status Tracking**: Real-time monitoring of job execution state
- **Sleep Detection**: Intelligent laptop sleep/wake cycle awareness
- **Error Detection**: Automatic identification of failed jobs and missed executions

#### **Manual Health Check**
Use the included health check script for detailed cron job status:

```bash
# Run comprehensive health check
CRON_ENCRYPTION_KEY="your-key" node check-cron-health.js

# Expected output:
# 📊 Total jobs: 2
# ✅ Enabled jobs: 2  
# 🔄 Active scheduled jobs: 2
# ⚡ Currently running jobs: 0
```

### **Logging & Performance**

- **Structured Logging**: Detailed logs with timestamps and context
- **Performance Metrics**: Job execution timing and resource usage
- **Error Tracking**: Comprehensive error reporting with stack traces
- **Audit Trail**: Complete history of backup operations and user actions

---

## 🔧 Advanced Troubleshooting

### **Common Issues & Solutions**

#### **Cron Jobs Not Running**
```bash
# Check job health
CRON_ENCRYPTION_KEY="your-key" node check-cron-health.js

# Look for:
# - Enabled vs Active job mismatch
# - Recent errors in job execution
# - System sleep detection warnings
```

**Solutions:**
- Verify `CRON_ENCRYPTION_KEY` is set correctly
- Restart the server to reinitialize jobs
- Check database connectivity from the server

#### **Missed Execution Warnings**
If you see node-cron warnings like:
```
[NODE-CRON] [WARN] missed execution at Thu Sep 25 2025 00:00:00
```

**Laptop/Development Environment:**
- This is **normal** when your laptop goes to sleep
- The application now detects sleep cycles and explains these warnings
- No action needed - jobs will run when the system is awake

**Production Environment:**
- Check system resources (CPU, memory)
- Look for blocking I/O operations
- Consider increasing Node.js memory limits

#### **Authentication Issues**
- **Session Auth**: Verify `SESSION_SECRET` is set and persistent
- **Password Issues**: Check `AUTH_USERNAME` and `AUTH_PASSWORD` environment variables
- **Rate Limiting**: Wait if you've exceeded login attempts (5 per 15 minutes)

#### **Database Connection Failures**
- **Network**: Verify database host is reachable from container/server
- **Credentials**: Test credentials manually with `psql`
- **Firewall**: Ensure port 5432 (or custom port) is accessible
- **SSL**: Add SSL-related parameters to "Extra Args" if required

#### **Permission Issues**
```bash
# Fix backup directory permissions
chmod 755 ./backups
chown -R $(whoami) ./backups

# Set secure file permissions
chmod 600 cron-jobs.json .env
```

### **Production Optimization**

#### **Performance Tuning**
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=2048"

# Set timezone for consistent scheduling
export TZ="America/New_York"

# Enable production mode
export NODE_ENV=production
```

#### **Security Hardening**
- Use strong `SESSION_SECRET` (32+ characters)
- Set secure `CRON_ENCRYPTION_KEY` (64-character hex)
- Run behind HTTPS reverse proxy
- Implement IP allowlists or VPN access
- Regular backup rotation and off-site storage
- Keep Docker images updated

#### **Process Management**
Consider using PM2 for production deployments:

```bash
# Install PM2
npm install -g pm2

# Create ecosystem file (see README for full example)
pm2 start ecosystem.config.js

# Monitor processes
pm2 list
pm2 logs
pm2 restart all
```

---

## 📚 Documentation & Resources

### **Complete Documentation**
- **[Authentication Guide](docs/AUTHENTICATION.md)**: Detailed auth setup and security
- **[Backup Cleanup System](docs/BACKUP_CLEANUP.md)**: Advanced cleanup configuration
- **[Cron Jobs](docs/CRON_JOBS.md)**: Comprehensive scheduling guide
- **[Encryption Implementation](docs/ENCRYPTION-COMPLETE.md)**: Security architecture
- **[Git Hooks Guide](docs/GIT_HOOKS_GUIDE.md)**: Development workflow setup
- **[Production Security](docs/PRODUCTION-SECURITY.md)**: Security best practices

### **Development Resources**
- **[TODO System Guide](docs/TODO_SYSTEM_GUIDE.md)**: Task management setup
- **[Modal System](docs/CONFIRMATION_MODAL_SYSTEM.md)**: UI component documentation
- **[Performance Improvements](docs/CRON_PERFORMANCE_IMPROVEMENTS.md)**: Optimization details

### **Health & Monitoring**
- Built-in `/health` endpoint for monitoring systems
- Comprehensive logging with structured output
- Real-time job status and performance metrics
- Sleep detection and laptop-friendly warnings

---

## 🚀 Roadmap & Future Enhancements

### **Near-term Improvements**
- **Connection Profiles**: Save and reuse database configurations (encrypted)
- **Backup Verification**: Automatic backup validation and integrity checks
- **Notification System**: Email/Slack alerts for backup failures
- **Backup Preview**: Quick schema and data preview before restore

### **Advanced Features**
- **Cloud Storage Integration**: Direct upload to S3/MinIO/Azure Blob/GCS
- **JSON API Endpoints**: Full REST API for automation and integration
- **Prometheus Metrics**: Advanced monitoring and alerting
- **Multi-tenant Support**: Isolated environments for different teams
- **Backup Encryption**: Client-side backup file encryption
- **Incremental Backups**: Smart differential backup strategies

### **Enterprise Features**
- **RBAC**: Role-based access control with user management
- **Audit Logging**: Comprehensive audit trail for compliance
- **High Availability**: Multi-instance deployment with shared state
- **Backup Catalogs**: Searchable backup metadata and restoration points
- **Performance Analytics**: Deep insights into backup performance and trends

---

## Roadmap (optional ideas)

- Saved “connection profiles” with encrypted secrets  
- S3/MinIO storage target (upload after dump)  
- JSON API endpoints for automation  
- Healthcheck & Prometheus metrics

---

## License

MIT — do what you want, but no warranty.
