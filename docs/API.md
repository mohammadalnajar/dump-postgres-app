# API Documentation

## Overview

The PostgreSQL Dump App provides both web UI and API endpoints for managing database backups and scheduled cron jobs. All endpoints require authentication when session-based auth is enabled.

## Base URL

```
http://localhost:8080
```

or your configured domain in production.

## Authentication

### Session-Based Authentication (Default)

The application uses cookie-based session authentication by default.

**Login Required:** Most endpoints require authentication. Unauthenticated requests will be redirected to `/login`.

**Session Cookie:** `connect.sid` - HTTP-only, secure in production

### Environment Variables

```bash
USE_SESSION_AUTH=true  # Enable session auth (default: true)
AUTH_USERNAME=admin    # Login username
AUTH_PASSWORD=admin    # Login password (hashed with bcrypt)
SESSION_SECRET=your-secret-key
```

---

## Endpoints

### Authentication

#### `GET /login`
Display the login page.

**Response:** HTML login form

**Query Parameters:**
- `error` (optional): Error message to display
- `username` (optional): Pre-fill username field

---

#### `POST /login`
Authenticate user and create session.

**Request Body (form-urlencoded):**
```
username=admin
password=admin123
```

**Success Response:**
- Redirect to `/` with session cookie

**Error Response:**
- Redirect to `/login?error=Invalid+username+or+password`

**Rate Limiting:** 5 requests per 15 minutes

---

#### `POST /logout`
Destroy current session and logout.

**Response:**
- Redirect to `/login`

---

### Dashboard

#### `GET /`
Display main dashboard with backup list and cron jobs.

**Authentication:** Required

**Response:** HTML page with:
- List of existing backups
- Scheduled cron jobs
- Backup creation form

**Query Parameters:**
- `message` (optional): Success message to display
- `error` (optional): Error message to display

---

### Health Check

#### `GET /health`
Check application health status.

**Authentication:** Not required

**Response:**
```json
{
  "status": "healthy",
  "uptime": 12345,
  "timestamp": "2026-01-24T12:00:00.000Z"
}
```

**Status Codes:**
- `200 OK` - Application is healthy

---

### Manual Backups

#### `POST /backup`
Create a manual database backup.

**Authentication:** Required

**Request Body (form-urlencoded):**

**Required Fields:**
```
host=localhost
db=mydb
user=postgres
password=secret
```

**Optional Fields:**
```
port=5432                           # Default: 5432
format=plain                        # Options: plain, custom, tar, directory
outputStyle=standard                # Options: standard, navicat
insertFormat=copy                   # Options: copy, inserts (for navicat style)
includeOwner=true                   # Include ownership statements
onlySchema=public                   # Backup only specific schema
onlyData=false                      # Data only (no schema)
excludeSchema=temp                  # Exclude specific schema
compressLevel=0                     # 0-9 for custom/tar formats
extraArgs=--verbose                 # Additional pg_dump arguments
```

**Success Response:**
- File download (immediate backup) OR
- Redirect to `/?message=Backup+created+successfully`

**Error Response:**
- Redirect to `/?error=<error_message>`

**Backup Filename Format:**
```
<database>_<timestamp>.<extension>
Example: mydb_20260124_120000.sql
```

---

### Backup Files

#### `GET /list-backups`
List all backup files.

**Authentication:** Required

**Response:**
```json
[
  {
    "name": "mydb_20260124_120000.sql",
    "path": "/app/backups/mydb_20260124_120000.sql",
    "size": 1048576,
    "sizeStr": "1.00 MB",
    "mtime": "2026-01-24T12:00:00.000Z",
    "source": {
      "type": "manual",
      "jobId": null,
      "jobName": null
    }
  }
]
```

---

#### `GET /download/:filename`
Download a backup file.

**Authentication:** Required

**Parameters:**
- `filename` - Name of the backup file

**Response:**
- File download with appropriate content-type

**Status Codes:**
- `200 OK` - File download
- `404 Not Found` - File doesn't exist

---

#### `POST /delete/:filename`
Delete a backup file.

**Authentication:** Required

**Parameters:**
- `filename` - Name of the backup file to delete

**Success Response:**
- Redirect to `/?message=File+deleted+successfully`

**Error Response:**
- Redirect to `/?error=<error_message>`

**Note:** Files created by cron jobs include job metadata and can only be deleted via cleanup or manual deletion.

---

### Cron Jobs

#### `GET /api/cron-jobs`
Get all cron jobs (JSON API).

**Authentication:** Required

**Response:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Daily Production Backup",
    "cronPattern": "0 0 * * *",
    "description": "Daily at midnight",
    "enabled": true,
    "isActive": true,
    "lastRun": "2026-01-24T00:00:00.000Z",
    "lastStatus": "success",
    "config": {
      "host": "localhost",
      "db": "production",
      "user": "backup_user",
      "format": "custom",
      "cleanup": {
        "enabled": true,
        "method": "days",
        "retentionDays": 30
      }
    }
  }
]
```

**Note:** Password fields are never included in responses.

---

#### `POST /cron-jobs`
Create a new scheduled cron job.

**Authentication:** Required

**Request Body (form-urlencoded):**

**Required Fields:**
```
jobName=Daily Backup
cronPattern=0 0 * * *               # OR use cronPreset
host=localhost
db=mydb
user=postgres
password=secret
```

**Cron Pattern Options:**
```
cronPreset=daily_midnight           # Use predefined pattern
cronPattern=0 0 * * *               # Custom cron expression (if preset=custom)
```

**Optional Backup Config:**
```
port=5432
format=custom
outputStyle=standard
insertFormat=copy
includeOwner=true
onlySchema=public
onlyData=false
excludeSchema=temp
compressLevel=6
extraArgs=--verbose
```

**Cleanup Configuration:**
```
enableCleanup=true                  # Enable automatic cleanup
cleanupMethod=days                  # Options: days, count, both
cleanupTiming=after                 # Options: before, after
retentionDays=30                    # Keep backups for N days
retentionCount=10                   # Keep last N backups
```

**Success Response:**
- Redirect to `/?message=Cron+job+created+successfully`

**Error Response:**
- Redirect to `/?error=<error_message>`

**Predefined Cron Patterns:**
- `every_minute` - `*/1 * * * *`
- `every_5_minutes` - `*/5 * * * *`
- `every_hour` - `0 * * * *`
- `every_2_hours` - `0 */2 * * *`
- `daily_midnight` - `0 0 * * *`
- `daily_9am` - `0 9 * * *`
- `weekly_sunday` - `0 0 * * 0`
- `monthly` - `0 0 1 * *`
- `custom` - Use custom pattern

---

#### `GET /cron-jobs/:id/edit`
Display cron job edit form.

**Authentication:** Required

**Parameters:**
- `id` - Cron job UUID

**Response:** HTML edit form with decrypted job details

**Status Codes:**
- `200 OK` - Edit form displayed
- `404` - Redirect to `/?error=Cron+job+not+found`

---

#### `POST /cron-jobs/:id/edit`
Update an existing cron job.

**Authentication:** Required

**Parameters:**
- `id` - Cron job UUID

**Request Body:** Same as create cron job

**Success Response:**
- Redirect to `/?message=Cron+job+updated+successfully`

**Error Response:**
- Redirect to `/cron-jobs/:id/edit?error=<error_message>`

---

#### `POST /cron-jobs/:id/toggle`
Enable or disable a cron job.

**Authentication:** Required

**Parameters:**
- `id` - Cron job UUID

**Success Response:**
- Redirect to `/?message=Cron+job+<enabled|disabled>+successfully`

**Error Response:**
- Redirect to `/?error=<error_message>`

---

#### `POST /cron-jobs/:id/delete`
Delete a cron job and optionally its backup files.

**Authentication:** Required

**Parameters:**
- `id` - Cron job UUID

**Request Body (optional):**
```
deleteFiles=true                    # Also delete associated backup files
```

**Success Response:**
- Redirect to `/?message=Cron+job+deleted+successfully`

**Error Response:**
- Redirect to `/?error=<error_message>`

---

#### `POST /cron-jobs/:id/run`
Manually trigger a cron job execution.

**Authentication:** Required

**Parameters:**
- `id` - Cron job UUID

**Success Response:**
- Redirect to `/?message=Backup+job+triggered+successfully`

**Error Response:**
- Redirect to `/?error=<error_message>`

---

### Backup Cleanup

#### `POST /cleanup/preview`
Preview files that would be deleted by cleanup.

**Authentication:** Required

**Request Body (form-urlencoded):**
```
jobId=550e8400-e29b-41d4-a716-446655440000
method=days                         # Options: days, count, both
retentionDays=30
retentionCount=10
```

**Response:**
```json
{
  "totalFiles": 50,
  "filesToKeep": 30,
  "filesToDelete": 20,
  "spaceToFree": "2048576",
  "spaceToFreeStr": "2.00 MB",
  "files": [
    {
      "name": "mydb_20251201_000000.sql",
      "size": 102400,
      "mtime": "2025-12-01T00:00:00.000Z",
      "action": "delete"
    }
  ]
}
```

---

#### `POST /cleanup/execute`
Execute cleanup to delete old backup files.

**Authentication:** Required

**Request Body:** Same as preview

**Success Response:**
- Redirect to `/?message=Cleanup+completed:+X+files+deleted`

**Error Response:**
- Redirect to `/?error=<error_message>`

---

## Error Handling

### Error Response Format

Most errors result in redirects with error messages:
```
/?error=<url_encoded_error_message>
```

### Common HTTP Status Codes

- `200 OK` - Success
- `302 Found` - Redirect (common for POST requests)
- `401 Unauthorized` - Authentication required
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

---

## Rate Limiting

| Endpoint   | Limit                     |
| ---------- | ------------------------- |
| `/login`   | 5 requests per 15 minutes |
| All others | 20 requests per minute    |

**Rate Limit Headers:**
```
RateLimit-Limit: 20
RateLimit-Remaining: 15
RateLimit-Reset: 1706097600
```

---

## Security Headers

The application includes security headers via Helmet:

```
Content-Security-Policy: (custom configuration)
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
```

---

## Data Formats

### Cron Pattern Syntax
Standard cron syntax (5 fields):
```
* * * * *
│ │ │ │ │
│ │ │ │ └─ Day of week (0-7, 0 and 7 are Sunday)
│ │ │ └─── Month (1-12)
│ │ └───── Day of month (1-31)
│ └─────── Hour (0-23)
└───────── Minute (0-59)
```

**Examples:**
- `0 0 * * *` - Daily at midnight
- `*/5 * * * *` - Every 5 minutes
- `0 */2 * * *` - Every 2 hours
- `0 9 * * 1-5` - 9 AM on weekdays

### Backup Formats

| Format      | Extension | Compression | Use Case                                |
| ----------- | --------- | ----------- | --------------------------------------- |
| `plain`     | `.sql`    | No          | Simple SQL dumps, readable              |
| `custom`    | `.dump`   | Yes (0-9)   | Compressed, restore with pg_restore     |
| `tar`       | `.tar`    | Yes (0-9)   | Archive format, restore with pg_restore |
| `directory` | `/`       | No          | Directory with separate files           |

### Output Styles

| Style      | Description                                                |
| ---------- | ---------------------------------------------------------- |
| `standard` | Native pg_dump output                                      |
| `navicat`  | Navicat-style formatting with headers, organized structure |

---

## Examples

### Create Manual Backup (curl)

```bash
# Login first
curl -c cookies.txt -X POST http://localhost:8080/login \
  -d "username=admin&password=admin123"

# Create backup
curl -b cookies.txt -X POST http://localhost:8080/backup \
  -d "host=localhost" \
  -d "db=mydb" \
  -d "user=postgres" \
  -d "password=secret" \
  -d "format=custom" \
  -d "compressLevel=6"
```

### Create Scheduled Backup (curl)

```bash
curl -b cookies.txt -X POST http://localhost:8080/cron-jobs \
  -d "jobName=Daily Production Backup" \
  -d "cronPreset=daily_midnight" \
  -d "host=localhost" \
  -d "db=production" \
  -d "user=backup_user" \
  -d "password=secret" \
  -d "format=custom" \
  -d "enableCleanup=true" \
  -d "cleanupMethod=days" \
  -d "retentionDays=30"
```

### List All Backups (JavaScript)

```javascript
fetch('/list-backups', {
  credentials: 'include'
})
.then(res => res.json())
.then(backups => {
  backups.forEach(backup => {
    console.log(`${backup.name} - ${backup.sizeStr}`);
  });
});
```

---

## Webhook Integration (Future)

Future versions may include webhook support for:
- Backup completion notifications
- Backup failure alerts
- Cleanup events

---

## Client Libraries

Currently, there are no official client libraries. The API can be accessed via standard HTTP clients:
- **curl** - Command line
- **fetch/axios** - JavaScript
- **requests** - Python
- **HttpClient** - C#
- **http** - Go

---

## Changelog

### v1.0.0 (Current)
- Session-based authentication
- Manual backup creation
- Scheduled cron jobs with encryption
- Backup cleanup system
- Health check endpoint
- File management (list, download, delete)

---

## Support

For issues and questions:
- Check documentation in `docs/` directory
- Review [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
- See [features/](./features/) for feature-specific docs
