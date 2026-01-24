# Backup Cleanup Feature

## Overview

The backup cleanup feature automatically manages old backup files based on configurable retention policies with **job-specific isolation**. This prevents conflicts between different backup sources and ensures each cron job only affects its own backup files.

## Key Improvement: Job-Specific File Isolation

### **Problem Solved**
Previously, all backup files from the same database would be affected by any cleanup policy, regardless of which job created them. This meant:
- Multiple cron jobs for the same database would interfere with each other
- Manual backups could be deleted by automated cleanup
- No way to have different retention policies for different backup schedules

### **Solution: Job-Scoped Backup Management**

#### **1. Enhanced Filename Structure**
- **Manual Backups**: `{database}_{timestamp}.{ext}` (unchanged for compatibility)  
- **Cron Job Backups**: `{database}_{job-name}_{timestamp}.{ext}` (NEW)

**Example:**
```
Manual backup:     verceldb_20250924_180800.sql
Cron job "daily":  verceldb_daily_20250924_180800.sql  
Cron job "hourly": verceldb_hourly_20250924_180800.sql
```

#### **2. Job-Specific Cleanup**
Each cron job's cleanup policy **only affects its own backup files**:
- Uses pattern matching: `{database}_{job-name}_*`
- Manual backups are never affected by automated cleanup
- Different jobs can have completely different retention policies

## Features

### 1. **Retention Methods**
- **Days**: Keep files newer than X days
- **Count**: Keep only the latest X files  
- **Both (AND logic)**: Files must meet BOTH criteria to be kept

### 2. **Cleanup Timing**
- **After backup** (recommended): Run cleanup after creating a new backup
- **Before backup**: Run cleanup before creating a new backup

### 3. **Configuration Options**
- **Enable/Disable**: Toggle cleanup on/off per cron job
- **Retention Days**: 1-365 days (default: 30)
- **Retention Count**: 1-1000 files (default: 10)

### 4. **Safety Features**
- **Job isolation**: Each job only cleans its own files
- **Manual backup protection**: Manual backups are never touched by automated cleanup
- **File type validation**: Only deletes actual backup files
- **Error handling and reporting**: Comprehensive error tracking
- **Confirmation dialogs**: Required for manual cleanup operations

## User Interface

### Enhanced File Management
The backup files table now shows:
- **Source column**: Distinguishes between manual backups and specific cron jobs
- **Visual indicators**: Icons and colors to identify file sources
- **Job attribution**: Clear indication of which job created each file

### Automatic Cleanup (Cron Jobs)
When creating or editing a cron job:

1. **Enable cleanup** by checking the "Enable automatic cleanup" checkbox
2. **Choose cleanup method**:
   - Keep files for X days
   - Keep latest X files
   - Use both methods (AND logic)
3. **Set retention values** with validation and preview
4. **Choose timing** (before or after backup creation)
5. **Preview cleanup effects** with job-specific scope

### Manual Cleanup
In the "Backup Files" section:
- Manual cleanup affects ALL backup files (regardless of source)
- Preview shows what will be deleted before confirming
- Use different retention policies than scheduled jobs

## Usage Examples

### Example 1: Multiple Jobs, Different Policies

**Hourly Production Backup:**
```
Job Name: prod-hourly
Schedule: Every hour (0 * * * *)
Cleanup: Keep latest 24 files (1 day of hourly backups)
Files: verceldb_prod-hourly_20250924_120000.sql, etc.
```

**Daily Archive Backup:**
```
Job Name: prod-daily-archive
Schedule: Daily at 2 AM (0 2 * * *)
Cleanup: Keep for 90 days
Files: verceldb_prod-daily-archive_20250924_020000.sql, etc.
```

**Result:** Each job manages only its own files independently.

### Example 2: Safe Coexistence
```
Manual backup:           verceldb_20250924_100000.sql  ← Never deleted by cleanup
Hourly job backup:       verceldb_hourly_20250924_100000.sql  ← Managed by hourly job
Daily job backup:        verceldb_daily_20250924_100000.sql   ← Managed by daily job
```

## Technical Implementation

### Enhanced Filename Generation
```javascript
// Manual backup (unchanged)
const baseName = `${safeDb}_${stamp}${ext}`;

// Cron job backup (NEW)
const baseName = `${safeDb}_${safeJobName}_${stamp}${ext}`;
```

### Job-Specific Cleanup Pattern
```javascript
// Cleanup pattern for job isolation
const jobFilePattern = `${safeDb}_${safeJobName}_`;
await cleanupBackups(BACKUP_DIR, job.config.cleanup, jobFilePattern);
```

### File Source Detection
The UI automatically detects file sources by analyzing filename patterns:
- Manual: `{db}_{timestamp}.{ext}`
- Cron job: `{db}_{job}_{timestamp}.{ext}`

## Migration & Compatibility

### **Backward Compatibility**
- **Existing manual backups**: Continue to work exactly as before
- **Existing cron job files**: Old files remain untouched and are detected as "legacy"
- **New cron jobs**: Automatically use the improved naming convention

### **Seamless Transition**
- No data migration required
- Existing workflows continue unchanged
- New benefits apply immediately to new backups

## Benefits

1. **Conflict Resolution**: No more cross-job file deletion
2. **Flexible Policies**: Each job can have its own retention strategy
3. **Manual Protection**: Manual backups are protected from automated cleanup
4. **Clear Attribution**: Easy to see which job created each file
5. **Backward Compatible**: Existing setups continue to work
6. **Better Organization**: Files are logically grouped by purpose
7. **Safer Operations**: Reduced risk of accidental data loss

## Best Practices

### Job Naming
- Use descriptive names: `daily-full`, `hourly-incremental`, `weekly-archive`
- Avoid special characters (automatically sanitized)
- Keep names concise but meaningful

### Cleanup Policies
- **Frequent jobs** (hourly): Use count-based retention (e.g., 48 files = 2 days)
- **Daily jobs**: Use time-based retention (e.g., 30-90 days)
- **Archive jobs**: Use longer retention or disable cleanup

### Monitoring
- Check job logs for cleanup results
- Monitor disk space usage
- Review retention policies periodically

This improved system provides enterprise-grade backup management with complete isolation between different backup strategies while maintaining simplicity for basic use cases.