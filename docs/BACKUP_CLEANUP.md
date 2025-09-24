# Backup Cleanup Feature

## Overview

The backup cleanup feature automatically manages old backup files based on configurable retention policies. This helps prevent disk space issues and keeps the backup directory organized.

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
- Non-destructive preview mode
- File type validation (only deletes backup files)
- Error handling and reporting
- Confirmation dialogs for manual cleanup

## User Interface

### Automatic Cleanup (Cron Jobs)
When creating or editing a cron job, users can:

1. **Enable cleanup** by checking the "Enable automatic cleanup" checkbox
2. **Choose cleanup method**:
   - Keep files for X days
   - Keep latest X files
   - Use both methods (AND logic)
3. **Set retention values** with helpful validation and preview
4. **Choose timing** (before or after backup creation)
5. **Preview cleanup effects** with real-time updates

### Manual Cleanup
In the "Backup Files" section, users can:
- Manually run cleanup with custom settings
- Preview what will be deleted before confirming
- Use different retention policies than scheduled jobs

### Cron Jobs Table
The scheduled jobs table now shows:
- **Cleanup Policy** column with visual indicators
- Cleanup method and retention values
- When cleanup runs (before/after backup)

## Technical Implementation

### Core Components

1. **`backupCleanup.js`**: Main cleanup logic
   - `cleanupBackups()`: Execute cleanup with given policy
   - `previewCleanup()`: Preview what would be cleaned up
   - `formatCleanupResult()`: Format results for logging

2. **Enhanced cron manager**: Integrates cleanup into backup process
3. **Server endpoints**: Manual cleanup and preview APIs
4. **UI enhancements**: Forms, validation, and preview functionality

### File Detection Logic
The system identifies backup files by:
- Common backup extensions (.sql, .dump, .tar, .gz, .bak)
- Timestamp patterns (YYYYMMDD_HHMMSS)
- Database name patterns

### Cleanup Process
1. **Scan**: Find all backup files in directory
2. **Filter**: Apply file pattern matching if specified
3. **Sort**: Order by modification time (newest first)
4. **Apply Policy**: Determine which files to keep based on method
5. **Execute**: Delete files not in the keep list
6. **Report**: Log results and any errors

## Usage Examples

### Example 1: Daily Backup with 30-Day Retention
```
Cleanup Method: Keep files for X days
Retention Days: 30
Timing: After creating backup
Result: Keeps all backups newer than 30 days
```

### Example 2: Hourly Backup with File Count Limit
```
Cleanup Method: Keep latest X files
Retention Count: 24
Timing: After creating backup
Result: Keeps only the 24 most recent backups (1 day of hourly backups)
```

### Example 3: Conservative Policy (Both Methods)
```
Cleanup Method: Use both methods (AND logic)
Retention Days: 14
Retention Count: 50
Timing: After creating backup
Result: Keeps files that are BOTH less than 14 days old AND among the 50 most recent
```

## Configuration in Cron Jobs

When a cron job runs, the cleanup configuration is stored as part of the job config:

```json
{
  "config": {
    "cleanup": {
      "enabled": true,
      "method": "both",
      "retentionDays": 30,
      "retentionCount": 10,
      "timing": "after"
    }
  }
}
```

## Error Handling

The system handles various error scenarios:
- **Permission errors**: Reports files that couldn't be deleted
- **Missing files**: Handles concurrent access gracefully
- **Invalid configuration**: Uses safe defaults
- **Cleanup failures**: Don't fail the backup process

## Benefits

1. **Automated Disk Management**: Prevents unlimited backup accumulation
2. **Flexible Policies**: Different retention needs for different backup schedules
3. **User-Friendly**: Clear UI with previews and confirmations
4. **Safe**: Multiple safeguards against accidental deletion
5. **Integrated**: Seamlessly works with existing backup workflows
6. **Monitoring**: Clear reporting of cleanup actions in job logs

## Future Enhancements

Potential improvements for future versions:
- Size-based retention policies
- Compression of old backups before deletion
- Backup to cloud storage before deletion
- Advanced scheduling (different policies for different times)
- Cleanup statistics and reporting dashboard