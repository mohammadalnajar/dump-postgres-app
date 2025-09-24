import fs from 'node:fs/promises';
import path from 'node:path';
import { stat } from 'node:fs/promises';

/**
 * Clean up old backup files based on retention policy
 * @param {string} backupDir - Directory containing backup files
 * @param {object} cleanupConfig - Cleanup configuration
 * @param {boolean} cleanupConfig.enabled - Whether cleanup is enabled
 * @param {string} cleanupConfig.method - Cleanup method: 'days', 'count', or 'both'
 * @param {number} [cleanupConfig.retentionDays] - Days to keep files
 * @param {number} [cleanupConfig.retentionCount] - Number of files to keep
 * @param {string} [filePattern] - Optional pattern to match specific backup files
 * @returns {Promise<{deleted: string[], kept: string[], errors: string[]}>}
 */
export async function cleanupBackups(backupDir, cleanupConfig, filePattern = null) {
    const result = {
        deleted: [],
        kept: [],
        errors: []
    };

    if (!cleanupConfig || !cleanupConfig.enabled) {
        return result;
    }

    try {
        // Read backup directory
        const files = await fs.readdir(backupDir);

        // Filter backup files and get their stats
        const backupFiles = [];
        for (const file of files) {
            // Skip if pattern is provided and doesn't match
            if (filePattern && !file.includes(filePattern)) {
                continue;
            }

            // Skip if it's not a backup file (basic heuristic)
            if (!isBackupFile(file)) {
                continue;
            }

            try {
                const filePath = path.join(backupDir, file);
                const stats = await stat(filePath);

                backupFiles.push({
                    name: file,
                    path: filePath,
                    mtime: stats.mtime,
                    size: stats.size
                });
            } catch (error) {
                result.errors.push(`Failed to get stats for ${file}: ${error.message}`);
            }
        }

        if (backupFiles.length === 0) {
            return result;
        }

        // Sort by modification time (newest first)
        backupFiles.sort((a, b) => b.mtime - a.mtime);

        // Determine which files to keep based on cleanup method
        const filesToKeep = new Set();
        const now = new Date();

        switch (cleanupConfig.method) {
            case 'days':
                // Keep files newer than retentionDays
                const cutoffDate = new Date(
                    now.getTime() - cleanupConfig.retentionDays * 24 * 60 * 60 * 1000
                );
                backupFiles.forEach((file) => {
                    if (file.mtime > cutoffDate) {
                        filesToKeep.add(file.name);
                    }
                });
                break;

            case 'count':
                // Keep the latest retentionCount files
                for (
                    let i = 0;
                    i < Math.min(cleanupConfig.retentionCount, backupFiles.length);
                    i++
                ) {
                    filesToKeep.add(backupFiles[i].name);
                }
                break;

            case 'both':
                // Files must meet both criteria (AND logic)
                const bothCutoffDate = new Date(
                    now.getTime() - cleanupConfig.retentionDays * 24 * 60 * 60 * 1000
                );
                const latestFiles = backupFiles.slice(0, cleanupConfig.retentionCount);

                latestFiles.forEach((file) => {
                    if (file.mtime > bothCutoffDate) {
                        filesToKeep.add(file.name);
                    }
                });
                break;

            default:
                result.errors.push(`Unknown cleanup method: ${cleanupConfig.method}`);
                return result;
        }

        // Delete files not in the keep list
        for (const file of backupFiles) {
            if (filesToKeep.has(file.name)) {
                result.kept.push(file.name);
            } else {
                try {
                    await fs.unlink(file.path);
                    result.deleted.push(file.name);
                } catch (error) {
                    result.errors.push(`Failed to delete ${file.name}: ${error.message}`);
                }
            }
        }
    } catch (error) {
        result.errors.push(`Cleanup operation failed: ${error.message}`);
    }

    return result;
}

/**
 * Check if a file appears to be a backup file
 * @param {string} filename - The filename to check
 * @returns {boolean} - True if it looks like a backup file
 */
function isBackupFile(filename) {
    const backupExtensions = ['.sql', '.dump', '.tar', '.gz', '.bak'];
    const lowerFilename = filename.toLowerCase();

    // Check common backup file extensions
    const hasBackupExtension = backupExtensions.some((ext) => lowerFilename.endsWith(ext));

    // Check for timestamp patterns (YYYYMMDD_HHMMSS)
    const hasTimestampPattern = /\d{8}_\d{6}/.test(filename);

    return hasBackupExtension || hasTimestampPattern;
}

/**
 * Preview what would be cleaned up without actually deleting files
 * @param {string} backupDir - Directory containing backup files
 * @param {object} cleanupConfig - Cleanup configuration
 * @param {string} [filePattern] - Optional pattern to match specific backup files
 * @returns {Promise<{toDelete: string[], toKeep: string[], summary: string}>}
 */
export async function previewCleanup(backupDir, cleanupConfig, filePattern = null) {
    if (!cleanupConfig || !cleanupConfig.enabled) {
        return {
            toDelete: [],
            toKeep: [],
            summary: 'Cleanup is disabled'
        };
    }

    try {
        const files = await fs.readdir(backupDir);
        const backupFiles = [];

        for (const file of files) {
            if (filePattern && !file.includes(filePattern)) {
                continue;
            }

            if (!isBackupFile(file)) {
                continue;
            }

            try {
                const filePath = path.join(backupDir, file);
                const stats = await stat(filePath);

                backupFiles.push({
                    name: file,
                    mtime: stats.mtime,
                    size: stats.size
                });
            } catch (error) {
                // Skip files we can't read
                continue;
            }
        }

        if (backupFiles.length === 0) {
            return {
                toDelete: [],
                toKeep: [],
                summary: 'No backup files found'
            };
        }

        backupFiles.sort((a, b) => b.mtime - a.mtime);

        const filesToKeep = new Set();
        const now = new Date();

        switch (cleanupConfig.method) {
            case 'days':
                const cutoffDate = new Date(
                    now.getTime() - cleanupConfig.retentionDays * 24 * 60 * 60 * 1000
                );
                backupFiles.forEach((file) => {
                    if (file.mtime > cutoffDate) {
                        filesToKeep.add(file.name);
                    }
                });
                break;

            case 'count':
                for (
                    let i = 0;
                    i < Math.min(cleanupConfig.retentionCount, backupFiles.length);
                    i++
                ) {
                    filesToKeep.add(backupFiles[i].name);
                }
                break;

            case 'both':
                const bothCutoffDate = new Date(
                    now.getTime() - cleanupConfig.retentionDays * 24 * 60 * 60 * 1000
                );
                const latestFiles = backupFiles.slice(0, cleanupConfig.retentionCount);

                latestFiles.forEach((file) => {
                    if (file.mtime > bothCutoffDate) {
                        filesToKeep.add(file.name);
                    }
                });
                break;
        }

        const toKeep = backupFiles
            .filter((file) => filesToKeep.has(file.name))
            .map((file) => file.name);
        const toDelete = backupFiles
            .filter((file) => !filesToKeep.has(file.name))
            .map((file) => file.name);

        const summary = `Found ${backupFiles.length} backup files. Will keep ${toKeep.length}, delete ${toDelete.length}.`;

        return {
            toDelete,
            toKeep,
            summary
        };
    } catch (error) {
        return {
            toDelete: [],
            toKeep: [],
            summary: `Error: ${error.message}`
        };
    }
}

/**
 * Format cleanup result for logging
 * @param {object} result - Result from cleanupBackups
 * @returns {string} - Formatted log message
 */
export function formatCleanupResult(result) {
    const messages = [];

    if (result.kept.length > 0) {
        messages.push(`Kept ${result.kept.length} backup file(s)`);
    }

    if (result.deleted.length > 0) {
        messages.push(
            `Deleted ${result.deleted.length} old backup file(s): ${result.deleted.join(', ')}`
        );
    }

    if (result.errors.length > 0) {
        messages.push(`Errors: ${result.errors.join('; ')}`);
    }

    return messages.join('. ') || 'No cleanup actions taken';
}
