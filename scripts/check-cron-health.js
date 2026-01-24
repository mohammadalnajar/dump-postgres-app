#!/usr/bin/env node

import { getCronJobStatus, logCronHealth } from './src/lib/cronManagerSecure.js';

console.log('=== Cron Job Health Check ===\n');

try {
    const status = getCronJobStatus();

    console.log('Current Status Summary:');
    console.log(`📊 Total jobs: ${status.totalJobs}`);
    console.log(`✅ Enabled jobs: ${status.enabledJobs}`);
    console.log(`🔄 Active scheduled jobs: ${status.activeJobs}`);
    console.log(`⚡ Currently running jobs: ${status.runningJobs}`);

    console.log('\n=== Individual Job Status ===');
    status.jobs.forEach((job) => {
        const statusIcon =
            job.lastStatus === 'success' ? '✅' : job.lastStatus === 'error' ? '❌' : '⏸️';
        const runningIcon = job.isRunning ? '🔄' : '';

        console.log(`${statusIcon}${runningIcon} ${job.name}`);
        console.log(`   Pattern: ${job.cronPattern} (${job.description})`);
        console.log(
            `   Status: ${job.enabled ? 'enabled' : 'disabled'}, ${
                job.isActive ? 'active' : 'inactive'
            }`
        );
        console.log(`   Last run: ${job.lastRun || 'never'}`);
        console.log(`   Last result: ${job.lastStatus || 'none'}`);
        console.log('');
    });

    // Check for potential issues
    console.log('=== Health Analysis ===');

    if (status.enabledJobs !== status.activeJobs) {
        console.log('⚠️  WARNING: Mismatch between enabled and active jobs');
        console.log('   Some enabled jobs may have failed to start properly');
    }

    if (status.runningJobs > 0) {
        console.log('ℹ️  INFO: Jobs are currently running (normal during backup execution)');
    }

    // Check for jobs with recent errors
    const errorJobs = status.jobs.filter((job) => job.lastStatus === 'error');
    if (errorJobs.length > 0) {
        console.log('❌ ERRORS: Some jobs have recent failures:');
        errorJobs.forEach((job) => {
            console.log(`   - ${job.name}: Last error occurred at ${job.lastRun}`);
        });
    }

    console.log('');
    logCronHealth();
} catch (error) {
    console.error('Error checking cron health:', error);
    process.exit(1);
}
