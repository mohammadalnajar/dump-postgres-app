import cron from 'node-cron';
import fs from 'node:fs';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { buildPgDumpArgs, runPgDump, extensionFor, ensureDir } from './pgdump.js';
import { sanitizeName, timestamp } from './sanitize.js';

const JOBS_FILE = path.join(process.cwd(), 'data/cron-jobs.json');
const BACKUP_DIR = path.join(process.cwd(), 'backups');

// In-memory store for active cron tasks
const activeTasks = new Map();

/**
 * Load jobs from file
 */
function loadJobs() {
    try {
        if (fs.existsSync(JOBS_FILE)) {
            const data = fs.readFileSync(JOBS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading jobs:', error);
    }
    return [];
}

/**
 * Save jobs to file
 */
function saveJobs(jobs) {
    try {
        fs.writeFileSync(JOBS_FILE, JSON.stringify(jobs, null, 2));
    } catch (error) {
        console.error('Error saving jobs:', error);
        throw error;
    }
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
 * Execute backup job
 */
async function executeBackupJob(job) {
    try {
        console.log(`Executing scheduled backup job: ${job.name}`);

        // Ensure backup directory exists
        ensureDir(BACKUP_DIR);

        // Compute filename
        const safeDb = sanitizeName(job.config.db);
        const stamp = timestamp();
        const ext = extensionFor(job.config.format, job.config.outputStyle);
        const baseName = `${safeDb}_${stamp}${ext || ''}`;
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
            password: job.config.password,
            outputStyle: job.config.outputStyle,
            insertFormat: job.config.insertFormat
        });

        // If directory format, outPath must be a directory
        if (job.config.format === 'directory') {
            fs.mkdirSync(outPath, { recursive: true });
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

        // Update job status
        const jobs = loadJobs();
        const jobIndex = jobs.findIndex((j) => j.id === job.id);
        if (jobIndex !== -1) {
            jobs[jobIndex].lastRun = new Date().toISOString();
            jobs[jobIndex].lastStatus = 'success';
            jobs[jobIndex].lastResult = `Backup created: ${baseName}`;
            saveJobs(jobs);
        }

        console.log(`Scheduled backup completed successfully: ${baseName}`);
    } catch (error) {
        console.error(`Scheduled backup failed for job ${job.name}:`, error);

        // Update job status
        const jobs = loadJobs();
        const jobIndex = jobs.findIndex((j) => j.id === job.id);
        if (jobIndex !== -1) {
            jobs[jobIndex].lastRun = new Date().toISOString();
            jobs[jobIndex].lastStatus = 'error';
            jobs[jobIndex].lastResult = error.message || String(error);
            saveJobs(jobs);
        }
    }
}

/**
 * Start a cron job
 */
function startCronJob(job) {
    if (activeTasks.has(job.id)) {
        stopCronJob(job.id);
    }

    const task = cron.schedule(job.cronPattern, () => executeBackupJob(job), {
        scheduled: false,
        name: job.id
    });

    activeTasks.set(job.id, task);
    task.start();

    console.log(`Started cron job: ${job.name} (${job.cronPattern})`);
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
 * Create a new cron job
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
        lastResult: null
    };

    const jobs = loadJobs();
    jobs.push(job);
    saveJobs(jobs);

    if (job.enabled) {
        startCronJob(job);
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
            startCronJob(updatedJob);
        }
    } else if (updatedJob.enabled) {
        startCronJob(updatedJob);
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
 * Get all cron jobs
 */
function getAllCronJobs() {
    return loadJobs();
}

/**
 * Get a specific cron job
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
    const enabledJobs = jobs.filter((job) => job.enabled);

    console.log(`Initializing ${enabledJobs.length} enabled cron jobs...`);

    for (const job of enabledJobs) {
        try {
            startCronJob(job);
        } catch (error) {
            console.error(`Failed to start cron job ${job.name}:`, error);
        }
    }
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

export {
    loadJobs,
    saveJobs,
    isValidCronPattern,
    describeCronPattern,
    createCronJob,
    updateCronJob,
    deleteCronJob,
    getAllCronJobs,
    getCronJob,
    initializeCronManager,
    getPredefinedPatterns
};
