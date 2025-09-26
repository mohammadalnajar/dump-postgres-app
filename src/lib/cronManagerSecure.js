import cron from 'node-cron';
import fs from 'node:fs';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'node:crypto';
import { buildPgDumpArgs, runPgDump, extensionFor, ensureDir } from './pgdump.js';
import { sanitizeName, timestamp } from './sanitize.js';
import { cleanupBackups, formatCleanupResult } from './backupCleanup.js';

const JOBS_FILE = path.join(process.cwd(), 'data/cron-jobs.json');
const BACKUP_DIR = path.join(process.cwd(), 'backups');

// Encryption key for credentials (should be from environment)
// If no key is provided, generate one and warn user
let ENCRYPTION_KEY = process.env.CRON_ENCRYPTION_KEY;
if (!ENCRYPTION_KEY) {
    ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
    console.warn('⚠️  WARNING: No CRON_ENCRYPTION_KEY environment variable found!');
    console.warn('⚠️  Generated temporary key. Set CRON_ENCRYPTION_KEY for production:');
    console.warn(`⚠️  export CRON_ENCRYPTION_KEY="${ENCRYPTION_KEY}"`);
}

const ALGORITHM = 'aes-256-gcm';

// In-memory store for active cron tasks
const activeTasks = new Map();

// Track running backup jobs to prevent concurrent executions
const runningJobs = new Set();

// Track system sleep/wake cycles to handle missed executions gracefully
let lastWakeTime = Date.now();
let systemSleepDetected = false;

/**
 * Encrypt sensitive data
 */
function encrypt(text) {
    if (!text) return null;

    try {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);

        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const authTag = cipher.getAuthTag();

        return {
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex'),
            encrypted: encrypted
        };
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt data');
    }
}

/**
 * Decrypt sensitive data
 */
function decrypt(encryptedData) {
    if (!encryptedData || typeof encryptedData !== 'object') {
        return null;
    }

    try {
        const decipher = crypto.createDecipheriv(
            ALGORITHM,
            Buffer.from(ENCRYPTION_KEY, 'hex'),
            Buffer.from(encryptedData.iv, 'hex')
        );
        decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

        let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Failed to decrypt data - check encryption key');
    }
}

/**
 * Load jobs from file with credential decryption (async version)
 */
async function loadJobsAsync() {
    try {
        // Use async file system operations
        const { access, readFile } = await import('node:fs/promises');

        try {
            await access(JOBS_FILE);
            const data = await readFile(JOBS_FILE, 'utf8');
            const jobs = JSON.parse(data);

            // Decrypt passwords for each job
            return jobs.map((job) => ({
                ...job,
                config: {
                    ...job.config,
                    password: job.config.encryptedPassword
                        ? decrypt(job.config.encryptedPassword)
                        : job.config.password
                }
            }));
        } catch (accessError) {
            // File doesn't exist, return empty array
            return [];
        }
    } catch (error) {
        console.error('Error loading jobs:', error);
        return [];
    }
}

/**
 * Load jobs from file without credential decryption (for display/edit purposes)
 */
function loadJobsWithoutDecryption() {
    try {
        if (fs.existsSync(JOBS_FILE)) {
            const data = fs.readFileSync(JOBS_FILE, 'utf8');
            const jobs = JSON.parse(data);

            // Return jobs without decrypting passwords
            return jobs.map((job) => ({
                ...job,
                config: {
                    ...job.config,
                    password: undefined // Don't expose encrypted password
                }
            }));
        }
    } catch (error) {
        console.error('Error loading jobs:', error);
    }
    return [];
}

/**
 * Load jobs from file with credential decryption (synchronous fallback)
 */
function loadJobs() {
    try {
        if (fs.existsSync(JOBS_FILE)) {
            const data = fs.readFileSync(JOBS_FILE, 'utf8');
            const jobs = JSON.parse(data);

            // Decrypt passwords for each job
            return jobs.map((job) => ({
                ...job,
                config: {
                    ...job.config,
                    password: job.config.encryptedPassword
                        ? decrypt(job.config.encryptedPassword)
                        : job.config.password
                }
            }));
        }
    } catch (error) {
        console.error('Error loading jobs:', error);
    }
    return [];
}

/**
 * Save jobs to file with credential encryption (async version)
 */
async function saveJobsAsync(jobs) {
    try {
        // Encrypt passwords before saving
        const encryptedJobs = jobs.map((job) => ({
            ...job,
            config: {
                ...job.config,
                encryptedPassword: encrypt(job.config.password),
                password: undefined // Remove plain text password
            }
        }));

        const { writeFile } = await import('node:fs/promises');
        await writeFile(JOBS_FILE, JSON.stringify(encryptedJobs, null, 2));
    } catch (error) {
        console.error('Error saving jobs:', error);
        throw error;
    }
}

/**
 * Save jobs to file with credential encryption (synchronous fallback)
 */
function saveJobs(jobs) {
    try {
        // Encrypt passwords before saving
        const encryptedJobs = jobs.map((job) => ({
            ...job,
            config: {
                ...job.config,
                encryptedPassword: encrypt(job.config.password),
                password: undefined // Remove plain text password
            }
        }));

        fs.writeFileSync(JOBS_FILE, JSON.stringify(encryptedJobs, null, 2));
    } catch (error) {
        console.error('Error saving jobs:', error);
        throw error;
    }
}

/**
 * Alternative: Use credential references instead of storing passwords
 */
function createCronJobWithCredentialRef(jobData) {
    // Instead of storing actual credentials, store references to environment variables
    const job = {
        id: uuidv4(),
        name: jobData.name,
        cronPattern: jobData.cronPattern,
        config: {
            ...jobData.config,
            // Store credential reference instead of actual password
            credentialRef: `CRON_DB_PASS_${jobData.config.host}_${jobData.config.db}`,
            password: undefined // Don't store actual password
        },
        enabled: jobData.enabled !== false,
        created: new Date().toISOString(),
        lastRun: null,
        lastStatus: null,
        lastResult: null
    };

    console.log(`Store password in environment variable: ${job.config.credentialRef}`);

    return job;
}

/**
 * Get password from environment variable reference
 */
function getPasswordFromCredentialRef(credentialRef) {
    const password = process.env[credentialRef];
    if (!password) {
        throw new Error(`Credential reference ${credentialRef} not found in environment variables`);
    }
    return password;
}

/**
 * Detect system sleep/wake cycles
 * This helps us understand when missed executions are due to system sleep
 */
function detectSystemSleep() {
    const now = Date.now();
    const timeSinceLastCheck = now - lastWakeTime;

    // If more than 90 seconds have passed since last check, likely system was asleep
    // (we check every 60 seconds, so 90s gives some buffer)
    if (timeSinceLastCheck > 90000) {
        systemSleepDetected = true;
        console.log(
            `🛌 System sleep detected - ${Math.round(
                timeSinceLastCheck / 1000
            )}s gap since last check`
        );
        console.log(
            '📢 Any missed cron executions during this time are due to system sleep, not performance issues'
        );

        // Reset the flag after 5 minutes (to avoid false positives)
        setTimeout(() => {
            systemSleepDetected = false;
        }, 5 * 60 * 1000);
    }

    lastWakeTime = now;
}

/**
 * Enhanced cron job execution that handles sleep/wake gracefully
 */
async function executeBackupJobWithSleepHandling(job, isCatchupExecution = false) {
    const executionType = isCatchupExecution ? 'catch-up' : 'scheduled';
    console.log(`🔄 Executing ${executionType} backup job: ${job.name}`);

    if (systemSleepDetected && !isCatchupExecution) {
        console.log(
            `💤 System recently woke from sleep - executing catch-up backup for ${job.name}`
        );
    }

    return await executeBackupJob(job);
}

/**
 * Validate cron pattern
 */
function isValidCronPattern(pattern) {
    return cron.validate(pattern);
}

/**
 * Get human-readable description of cron pattern
 */
function describeCronPattern(pattern) {
    const parts = pattern.split(' ');
    if (parts.length !== 5) return 'Invalid pattern';

    const [minute, hour, day, month, weekday] = parts;

    // Common patterns
    if (pattern === '0 * * * *') return 'Every hour';
    if (pattern === '0 0 * * *') return 'Daily at midnight';
    if (pattern === '0 0 * * 0') return 'Weekly on Sunday at midnight';
    if (pattern === '0 0 1 * *') return 'Monthly on the 1st at midnight';
    if (pattern === '*/5 * * * *') return 'Every 5 minutes';
    if (pattern === '*/10 * * * *') return 'Every 10 minutes';
    if (pattern === '*/30 * * * *') return 'Every 30 minutes';
    if (pattern === '0 */6 * * *') return 'Every 6 hours';
    if (pattern === '0 */12 * * *') return 'Every 12 hours';

    // Build description
    let desc = 'At ';

    if (minute === '*') desc += 'every minute';
    else if (minute.startsWith('*/')) desc += `every ${minute.slice(2)} minutes`;
    else desc += `minute ${minute}`;

    if (hour !== '*') {
        if (hour.startsWith('*/')) desc += ` of every ${hour.slice(2)} hours`;
        else desc += ` of hour ${hour}`;
    }

    if (day !== '*') desc += ` on day ${day}`;
    if (month !== '*') desc += ` of month ${month}`;
    if (weekday !== '*') desc += ` on weekday ${weekday}`;

    return desc;
}

/**
 * Execute backup job (improved with non-blocking operations and concurrency control)
 */
async function executeBackupJob(job) {
    // Prevent concurrent execution of the same job
    if (runningJobs.has(job.id)) {
        console.log(`Job ${job.name} is already running, skipping execution`);
        return;
    }

    runningJobs.add(job.id);

    try {
        console.log(`Executing scheduled backup job: ${job.name}`);

        // Run cleanup before backup if configured
        let cleanupResultBefore = null;
        if (job.config.cleanup?.enabled && job.config.cleanup?.timing === 'before') {
            try {
                // Use job-specific pattern for cleanup isolation: {db}_{job-name}_
                const jobFilePattern = `${safeDb}_${safeJobName}_`;
                cleanupResultBefore = await cleanupBackups(
                    BACKUP_DIR,
                    job.config.cleanup,
                    jobFilePattern
                );
                console.log(
                    `Pre-backup cleanup for ${job.name}: ${formatCleanupResult(
                        cleanupResultBefore
                    )}`
                );
            } catch (cleanupError) {
                console.warn(`Pre-backup cleanup failed for ${job.name}:`, cleanupError);
                // Continue with backup even if cleanup fails
            }
        }

        // Ensure backup directory exists (async)
        const { mkdir } = await import('node:fs/promises');
        await mkdir(BACKUP_DIR, { recursive: true });

        // Compute filename with job identifier for isolation
        const safeDb = sanitizeName(job.config.db);
        const safeJobName = sanitizeName(job.name);
        const stamp = timestamp();
        const ext = extensionFor(job.config.format, job.config.outputStyle);

        // Include job name in filename for better organization and cleanup isolation
        // Format: {db}_{job-name}_{timestamp}.{ext}
        const baseName = `${safeDb}_${safeJobName}_${stamp}${ext || ''}`;
        const outPath = path.join(BACKUP_DIR, baseName);

        // Build args
        const args = buildPgDumpArgs({
            host: job.config.host,
            port: job.config.port,
            user: job.config.user,
            db: job.config.db,
            includeOwner: job.config.includeOwner,
            format: job.config.format,
            compressLevel: job.config.compressLevel,
            onlySchema: job.config.onlySchema,
            onlyData: job.config.onlyData,
            excludeSchema: job.config.excludeSchema,
            extraArgs: job.config.extraArgs,
            password: job.config.password, // This is already decrypted
            outputStyle: job.config.outputStyle,
            insertFormat: job.config.insertFormat
        });

        // If directory format, outPath must be a directory (async)
        if (job.config.format === 'directory') {
            await mkdir(outPath, { recursive: true });
        }

        await runPgDump({
            args,
            envPassword: job.config.password,
            outputPath: outPath,
            format: job.config.format,
            outputStyle: job.config.outputStyle,
            connectionOptions: {
                host: job.config.host,
                port: job.config.port,
                db: job.config.db
            }
        });

        // Run cleanup after backup if configured
        let cleanupResultAfter = null;
        if (job.config.cleanup?.enabled && job.config.cleanup?.timing === 'after') {
            try {
                // Use job-specific pattern for cleanup isolation: {db}_{job-name}_
                const jobFilePattern = `${safeDb}_${safeJobName}_`;
                cleanupResultAfter = await cleanupBackups(
                    BACKUP_DIR,
                    job.config.cleanup,
                    jobFilePattern
                );
                console.log(
                    `Post-backup cleanup for ${job.name}: ${formatCleanupResult(
                        cleanupResultAfter
                    )}`
                );
            } catch (cleanupError) {
                console.warn(`Post-backup cleanup failed for ${job.name}:`, cleanupError);
                // Don't fail the backup for cleanup errors
            }
        }

        // Prepare result message
        let resultMessage = `Backup created: ${baseName}`;
        if (cleanupResultBefore && cleanupResultBefore.deleted.length > 0) {
            resultMessage += ` (Pre-cleanup: deleted ${cleanupResultBefore.deleted.length} old files)`;
        }
        if (cleanupResultAfter && cleanupResultAfter.deleted.length > 0) {
            resultMessage += ` (Post-cleanup: deleted ${cleanupResultAfter.deleted.length} old files)`;
        }

        // Update job status (async)
        try {
            const jobs = await loadJobsAsync();
            const jobIndex = jobs.findIndex((j) => j.id === job.id);
            if (jobIndex !== -1) {
                jobs[jobIndex].lastRun = new Date().toISOString();
                jobs[jobIndex].lastStatus = 'success';
                jobs[jobIndex].lastResult = resultMessage;

                // Add the created file to the createdFiles array
                if (!jobs[jobIndex].createdFiles) {
                    jobs[jobIndex].createdFiles = [];
                }
                jobs[jobIndex].createdFiles.push({
                    filename: baseName,
                    created: new Date().toISOString(),
                    size: null // Size will be determined when file is read
                });

                await saveJobsAsync(jobs);
            }
        } catch (saveError) {
            console.warn('Failed to update job status after successful backup:', saveError);
            // Don't fail the entire backup for status update issues
        }

        console.log(`Scheduled backup completed successfully: ${baseName}`);
    } catch (error) {
        console.error(`Scheduled backup failed for job ${job.name}:`, error);

        // Update job status (async)
        try {
            const jobs = await loadJobsAsync();
            const jobIndex = jobs.findIndex((j) => j.id === job.id);
            if (jobIndex !== -1) {
                jobs[jobIndex].lastRun = new Date().toISOString();
                jobs[jobIndex].lastStatus = 'error';
                jobs[jobIndex].lastResult = error.message || String(error);
                await saveJobsAsync(jobs);
            }
        } catch (saveError) {
            console.warn('Failed to update job status after backup failure:', saveError);
        }
    } finally {
        // Always remove from running jobs set
        runningJobs.delete(job.id);
    }
}

/**
 * Start a cron job (improved to prevent blocking and handle sleep/wake cycles)
 */
function startCronJob(job) {
    if (activeTasks.has(job.id)) {
        stopCronJob(job.id);
    }

    const task = cron.schedule(
        job.cronPattern,
        async () => {
            // Detect if system was sleeping
            detectSystemSleep();

            // Execute backup job asynchronously to prevent blocking
            // Use setImmediate to ensure the cron callback returns quickly
            setImmediate(async () => {
                try {
                    await executeBackupJobWithSleepHandling(job);
                } catch (error) {
                    console.error(`Unhandled error in cron job ${job.name}:`, error);
                }
            });
        },
        {
            scheduled: false,
            name: job.id,
            timezone: process.env.TZ || 'UTC' // Add timezone support
        }
    );

    activeTasks.set(job.id, task);
    task.start();

    console.log(
        `Started cron job: ${job.name} (${job.cronPattern}) in timezone ${process.env.TZ || 'UTC'}`
    );
}

/**
 * Stop a cron job
 */
function stopCronJob(jobId) {
    const task = activeTasks.get(jobId);
    if (task) {
        task.stop();
        task.destroy();
        activeTasks.delete(jobId);
        console.log(`Stopped cron job: ${jobId}`);
    }
}

/**
 * Create a new cron job with encrypted password
 */
function createCronJob(jobData) {
    const job = {
        id: uuidv4(),
        name: jobData.name,
        cronPattern: jobData.cronPattern,
        config: jobData.config,
        enabled: jobData.enabled !== false,
        created: new Date().toISOString(),
        lastRun: null,
        lastStatus: null,
        lastResult: null,
        createdFiles: [] // Track all files created by this cron job
    };

    const jobs = loadJobs();
    jobs.push(job);
    saveJobs(jobs); // This will encrypt the password before saving

    if (job.enabled) {
        // Load the job again to get the decrypted password for execution
        const decryptedJobs = loadJobs();
        const decryptedJob = decryptedJobs.find((j) => j.id === job.id);
        startCronJob(decryptedJob);
    }

    return job;
}

/**
 * Update an existing cron job
 */
function updateCronJob(jobId, updates) {
    const jobs = loadJobs();
    const jobIndex = jobs.findIndex((j) => j.id === jobId);

    if (jobIndex === -1) {
        throw new Error('Job not found');
    }

    const oldJob = jobs[jobIndex];
    const updatedJob = { ...oldJob, ...updates };
    jobs[jobIndex] = updatedJob;

    saveJobs(jobs);

    // Restart the job if it was running
    if (activeTasks.has(jobId)) {
        stopCronJob(jobId);
        if (updatedJob.enabled) {
            // Load the job again to get the decrypted password
            const decryptedJobs = loadJobs();
            const decryptedJob = decryptedJobs.find((j) => j.id === jobId);
            startCronJob(decryptedJob);
        }
    } else if (updatedJob.enabled) {
        // Load the job again to get the decrypted password
        const decryptedJobs = loadJobs();
        const decryptedJob = decryptedJobs.find((j) => j.id === jobId);
        startCronJob(decryptedJob);
    }

    return updatedJob;
}

/**
 * Delete a cron job
 */
function deleteCronJob(jobId) {
    stopCronJob(jobId);

    const jobs = loadJobs();
    const filteredJobs = jobs.filter((j) => j.id !== jobId);
    saveJobs(filteredJobs);
}

/**
 * Get all cron jobs (returns decrypted jobs)
 */
function getAllCronJobs() {
    return loadJobs();
}

/**
 * Get a specific cron job without decryption (for editing purposes)
 */
function getCronJobForEdit(jobId) {
    const jobs = loadJobsWithoutDecryption();
    return jobs.find((j) => j.id === jobId);
}

/**
 * Get a specific cron job (returns decrypted job)
 */
function getCronJob(jobId) {
    const jobs = loadJobs();
    return jobs.find((j) => j.id === jobId);
}

/**
 * Initialize cron manager - start all enabled jobs
 */
function initializeCronManager() {
    const jobs = loadJobs();

    // Migration: Add createdFiles array to existing jobs that don't have it
    let needsSave = false;
    for (const job of jobs) {
        if (!job.createdFiles) {
            job.createdFiles = [];
            needsSave = true;
        }
    }

    // Save if we added createdFiles to any jobs
    if (needsSave) {
        console.log('🔄 Migrating existing cron jobs to include createdFiles tracking...');
        saveJobs(jobs);
    }

    const enabledJobs = jobs.filter((job) => job.enabled);

    console.log(`Initializing ${enabledJobs.length} enabled cron jobs with encrypted storage...`);

    for (const job of enabledJobs) {
        try {
            startCronJob(job);
        } catch (error) {
            console.error(`Failed to start cron job ${job.name}:`, error);
        }
    }

    // Log initial health status
    setTimeout(() => logCronHealth(), 1000);

    // Set up periodic health logging (every hour)
    setInterval(logCronHealth, 60 * 60 * 1000);

    // Set up sleep detection monitoring (every 60 seconds)
    setInterval(detectSystemSleep, 60 * 1000);

    console.log('🛌 Sleep/wake cycle monitoring enabled');
}

/**
 * Get predefined cron patterns for UI
 */
function getPredefinedPatterns() {
    return [
        { value: '*/1 * * * *', label: 'Every minute', description: 'Every minute' },
        { value: '*/5 * * * *', label: 'Every 5 minutes', description: 'Every 5 minutes' },
        { value: '*/10 * * * *', label: 'Every 10 minutes', description: 'Every 10 minutes' },
        { value: '*/15 * * * *', label: 'Every 15 minutes', description: 'Every 15 minutes' },
        { value: '*/30 * * * *', label: 'Every 30 minutes', description: 'Every 30 minutes' },
        { value: '0 * * * *', label: 'Every hour', description: 'Every hour' },
        { value: '0 */2 * * *', label: 'Every 2 hours', description: 'Every 2 hours' },
        { value: '0 */6 * * *', label: 'Every 6 hours', description: 'Every 6 hours' },
        { value: '0 */12 * * *', label: 'Every 12 hours', description: 'Every 12 hours' },
        { value: '0 0 * * *', label: 'Daily at midnight', description: 'Daily at midnight' },
        { value: '0 9 * * *', label: 'Daily at 9 AM', description: 'Daily at 9 AM' },
        {
            value: '0 0 * * 0',
            label: 'Weekly (Sunday)',
            description: 'Weekly on Sunday at midnight'
        },
        { value: '0 0 1 * *', label: 'Monthly', description: 'Monthly on the 1st at midnight' },
        { value: 'custom', label: 'Custom pattern', description: 'Enter custom cron pattern' }
    ];
}

/**
 * Get cron job status and health information
 */
function getCronJobStatus() {
    const jobs = loadJobs();
    const activeJobsCount = activeTasks.size;
    const runningJobsCount = runningJobs.size;
    const enabledJobs = jobs.filter((job) => job.enabled);

    return {
        totalJobs: jobs.length,
        enabledJobs: enabledJobs.length,
        activeJobs: activeJobsCount,
        runningJobs: runningJobsCount,
        jobs: jobs.map((job) => ({
            id: job.id,
            name: job.name,
            enabled: job.enabled,
            cronPattern: job.cronPattern,
            description: describeCronPattern(job.cronPattern),
            lastRun: job.lastRun,
            lastStatus: job.lastStatus,
            isActive: activeTasks.has(job.id),
            isRunning: runningJobs.has(job.id),
            nextRun: activeTasks.has(job.id) ? 'Scheduled' : 'Not scheduled'
        }))
    };
}

/**
 * Log cron job health information
 */
function logCronHealth() {
    const status = getCronJobStatus();
    console.log('\n=== Cron Job Health Status ===');
    console.log(`Total jobs: ${status.totalJobs}`);
    console.log(`Enabled jobs: ${status.enabledJobs}`);
    console.log(`Active scheduled jobs: ${status.activeJobs}`);
    console.log(`Currently running jobs: ${status.runningJobs}`);

    if (systemSleepDetected) {
        console.log(
            '💤 System sleep recently detected - missed executions may be due to sleep/wake cycles'
        );
    }

    if (status.runningJobs > 0) {
        console.log('⚠️  Some jobs are currently running - this is normal during backup execution');
    }

    if (status.enabledJobs !== status.activeJobs) {
        console.log('⚠️  Mismatch between enabled and active jobs - some may have failed to start');
    }

    console.log('===============================\n');
}

/**
 * Get file source information for a given filename
 * Returns the cron job that created the file, or null if it's a manual backup
 */
function getFileSource(filename) {
    const jobs = loadJobsWithoutDecryption(); // Use without decryption for faster lookup

    for (const job of jobs) {
        if (job.createdFiles && job.createdFiles.length > 0) {
            const fileMatch = job.createdFiles.find((file) => file.filename === filename);
            if (fileMatch) {
                return {
                    jobId: job.id,
                    jobName: job.name,
                    source: 'cron',
                    sourceIcon: '⏰',
                    sourceCssClass: 'source-cron',
                    createdAt: fileMatch.created
                };
            }
        }
    }

    // If no match found, it's a manual backup
    return {
        jobId: null,
        jobName: 'Manual',
        source: 'manual',
        sourceIcon: '👤',
        sourceCssClass: 'source-manual',
        createdAt: null
    };
}

/**
 * Remove a file from all cron job createdFiles arrays (called when file is deleted)
 */
function removeFileFromAllJobs(filename) {
    try {
        const jobs = loadJobs();
        let needsSave = false;

        for (const job of jobs) {
            if (job.createdFiles && job.createdFiles.length > 0) {
                const initialLength = job.createdFiles.length;
                job.createdFiles = job.createdFiles.filter((file) => file.filename !== filename);
                if (job.createdFiles.length !== initialLength) {
                    needsSave = true;
                }
            }
        }

        if (needsSave) {
            saveJobs(jobs);
            console.log(`🗑️  Removed file reference "${filename}" from cron job tracking`);
        }
    } catch (error) {
        console.warn('Failed to clean up file reference from cron jobs:', error);
        // Don't fail the deletion for this
    }
}

export {
    encrypt,
    decrypt,
    loadJobs,
    loadJobsWithoutDecryption,
    loadJobsAsync,
    saveJobs,
    saveJobsAsync,
    isValidCronPattern,
    describeCronPattern,
    createCronJob,
    updateCronJob,
    deleteCronJob,
    getAllCronJobs,
    getCronJob,
    getCronJobForEdit,
    initializeCronManager,
    getPredefinedPatterns,
    createCronJobWithCredentialRef,
    getPasswordFromCredentialRef,
    getCronJobStatus,
    logCronHealth,
    getFileSource,
    removeFileFromAllJobs
};
