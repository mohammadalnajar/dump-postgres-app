# Cron Jobs Feature Documentation

## Overview

The PostgreSQL backup application now supports scheduled backups using cron jobs. This feature allows you to automatically create database backups at specified intervals without manual intervention.

## Features

### 1. **Scheduled Backups**
- Create backups automatically based on cron patterns
- No need for external PostgreSQL database - uses file-based storage
- Persistent job storage in `cron-jobs.json`

### 2. **Flexible Scheduling**
Choose from predefined patterns or create custom ones:
- **Every minute**: `*/1 * * * *`
- **Every 5 minutes**: `*/5 * * * *`
- **Every 10 minutes**: `*/10 * * * *`
- **Every 15 minutes**: `*/15 * * * *`
- **Every 30 minutes**: `*/30 * * * *`
- **Every hour**: `0 * * * *`
- **Every 2 hours**: `0 */2 * * *`
- **Every 6 hours**: `0 */6 * * *`
- **Every 12 hours**: `0 */12 * * *`
- **Daily at midnight**: `0 0 * * *`
- **Daily at 9 AM**: `0 9 * * *`
- **Weekly (Sunday)**: `0 0 * * 0`
- **Monthly**: `0 0 1 * *`
- **Custom pattern**: Create your own using cron syntax

### 3. **Job Management**
- **Enable/Disable**: Toggle jobs without deleting them
- **Delete**: Remove jobs permanently
- **Status Tracking**: See last run time and status
- **Real-time Validation**: Custom cron patterns are validated instantly

## How to Use

### Creating a Scheduled Backup Job

1. **Fill in database connection details** (host, port, database, user, password)
2. **Configure backup options** (format, compression, etc.)
3. **Check "Schedule as cron job"** checkbox
4. **Enter job name** (e.g., "Daily Production Backup")
5. **Select schedule**:
   - Choose from predefined patterns, or
   - Select "Custom pattern" and enter your own cron expression
6. **Click "Create Scheduled Backup Job"**

### Managing Existing Jobs

- **View all jobs** in the "Scheduled Backup Jobs" section
- **Enable/Disable** jobs using the toggle button
- **Delete** jobs using the delete button
- **Monitor status** - see when jobs last ran and if they succeeded

## Cron Pattern Format

Cron patterns use 5 fields: `minute hour day month weekday`

- **minute**: 0-59
- **hour**: 0-23  
- **day**: 1-31
- **month**: 1-12
- **weekday**: 0-7 (0 and 7 = Sunday)

### Special Characters
- `*`: Any value
- `*/n`: Every n units
- `n,m`: Specific values n and m
- `n-m`: Range from n to m

### Examples
- `0 9 * * 1-5`: 9 AM, Monday through Friday
- `30 2 1 * *`: 2:30 AM on the 1st of every month
- `0 */4 * * *`: Every 4 hours
- `15 14 1 * *`: 2:15 PM on the 1st of every month

## File Storage

### Job Configuration File
Jobs are stored in `cron-jobs.json` in the project root:

```json
[
  {
    "id": "uuid-here",
    "name": "Daily Production Backup",
    "cronPattern": "0 2 * * *",
    "config": {
      "host": "db.example.com",
      "port": 5432,
      "db": "production",
      "user": "backup_user",
      "password": "encrypted_password",
      "format": "custom",
      "compressLevel": 6
    },
    "enabled": true,
    "created": "2025-09-24T10:30:00.000Z",
    "lastRun": "2025-09-24T02:00:00.000Z",
    "lastStatus": "success",
    "lastResult": "Backup created: production_20250924_020000.dump"
  }
]
```

### Backup Files
Scheduled backups are saved in the same `backups/` directory as manual backups, with timestamp-based filenames.

## Security Considerations

1. **Password Storage**: Database passwords are stored in the job configuration file
2. **File Permissions**: Ensure `cron-jobs.json` has appropriate read/write permissions
3. **Backup Directory**: Secure the backups directory appropriately
4. **Authentication**: Cron job management requires the same authentication as manual backups

## Technical Implementation

- **Cron Library**: Uses `node-cron` for scheduling
- **Job Storage**: File-based JSON storage (no external database required)
- **Job Execution**: Runs in the same process as the web server
- **Error Handling**: Failed jobs are logged and status is tracked
- **Memory Management**: Active cron tasks are managed in memory

## Benefits of This Approach

✅ **Self-contained**: No external dependencies or databases required  
✅ **Simple deployment**: Everything runs in one process  
✅ **Easy backup**: Job configurations are in a single JSON file  
✅ **Low resource usage**: Minimal overhead  
✅ **Reliable**: Uses proven node-cron library  
✅ **Flexible**: Supports all cron pattern syntax  
✅ **User-friendly**: Intuitive web interface  

## Advanced Features

### Sleep/Wake Detection (Laptop Users)
The cron system includes intelligent sleep/wake cycle detection for development on laptops:

**What it does:**
- Monitors for time gaps > 90 seconds between checks
- Detects when your system was likely asleep
- Provides clear context in logs (🛌💤 icons)
- Distinguishes between performance issues and normal sleep behavior

**Expected Behavior:**
- **Before Sleep**: Normal cron execution
- **After Wake**: System detects the sleep period and logs it
- **Missed Jobs**: Any missed executions are logged with sleep context
- **Automatic Recovery**: Jobs continue normal scheduling after wake

**Log Examples:**
```
🛌 System sleep detected - 3600s gap since last check
📢 Any missed cron executions during this time are due to system sleep, not performance issues
🔄 Executing scheduled backup job: production-db
```

This is **normal behavior** for laptop-based development and requires no action.

### Concurrency Protection
- Running jobs are tracked to prevent duplicate executions
- If a job is still running when the next execution time arrives, it will be skipped
- Jobs maintain their own execution state

### Performance Monitoring
- Automatic health status logging every hour
- Job execution times are tracked
- Status tracking includes: last run time, last result, enabled/disabled state

## Monitoring and Troubleshooting

### Health Check Script
Use the provided health check script to monitor your cron jobs:

```bash
node scripts/check-cron-health.js
```

This will show:
- Total jobs count
- Enabled vs active jobs
- Currently running jobs
- Individual job status and last execution
- Health warnings for potential issues

### Checking Job Status
- View the "Scheduled Backup Jobs" table for job status
- Check server logs for execution details
- Monitor the `backups/` directory for created files

### Common Issues
1. **Invalid cron pattern**: Use the pattern validator in the UI
2. **Database connection issues**: Same as manual backup troubleshooting
3. **Permission issues**: Ensure write access to backups directory
4. **Job not running**: Check if job is enabled and pattern is correct

### Logs
Server logs will show:
- Job initialization on startup
- Job execution start/completion
- Any errors during backup creation