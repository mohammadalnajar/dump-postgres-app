import cron from 'node-cron';
import fs from 'node:fs';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'node:crypto';
import { buildPgDumpArgs, runPgDump, extensionFor, ensureDir } from './pgdump.js';
import { sanitizeName, timestamp } from './sanitize.js';

const JOBS_FILE = path.join(process.cwd(), 'cron-jobs.json');
const BACKUP_DIR = path.join(process.cwd(), 'backups');

// Encryption key for credentials (should be from environment)
const ENCRYPTION_KEY = process.env.CRON_ENCRYPTION_KEY || crypto.randomBytes(32);
const ALGORITHM = 'aes-256-gcm';

// In-memory store for active cron tasks
const activeTasks = new Map();

/**
 * Encrypt sensitive data
 */
function encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        encrypted: encrypted
    };
}

/**
 * Decrypt sensitive data
 */
function decrypt(encryptedData) {
    const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

/**
 * Load jobs from file with credential decryption
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
 * Save jobs to file with credential encryption
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

export {
    encrypt,
    decrypt,
    loadJobs,
    saveJobs,
    createCronJobWithCredentialRef,
    getPasswordFromCredentialRef
};
