#!/usr/bin/env node

/**
 * Debug script to test pg_dump connection and identify issues
 * Usage: node debug-pgdump.js
 */

import { spawn } from 'node:child_process';

// Test connection parameters - UPDATE THESE WITH YOUR ACTUAL VALUES
const testParams = {
    host: 'ep-divine-unit-a2o0qf29-pooler.eu-central-1.aws.neon.tech', // Your Neon host
    port: '5432', // Your database port
    user: 'neondb_owner', // Your username
    db: 'neondb', // Your database name
    password: 'YOUR_PASSWORD_HERE' // Replace with your actual password
};

console.log('🔍 Testing pg_dump connection...');
console.log('Connection parameters:');
console.log(`  Host: ${testParams.host}`);
console.log(`  Port: ${testParams.port}`);
console.log(`  User: ${testParams.user}`);
console.log(`  Database: ${testParams.db}`);
console.log(`  Password: ${testParams.password ? '[PROVIDED]' : '[EMPTY]'}`);
console.log('');

// Test 1: Basic connection test (schema only, no data)
console.log('📋 Test 1: Basic schema dump...');

const args = [
    '-h',
    testParams.host,
    '-p',
    testParams.port,
    '-U',
    testParams.user,
    '--schema-only',
    '--no-owner',
    '--no-privileges',
    testParams.db
];

console.log(`Command: pg_dump ${args.join(' ')}`);
console.log('');

const child = spawn('pg_dump', args, {
    env: {
        ...process.env,
        PGPASSWORD: testParams.password
    }
});

let stdout = '';
let stderr = '';

child.stdout.on('data', (data) => {
    stdout += data.toString();
});

child.stderr.on('data', (data) => {
    stderr += data.toString();
    console.error('❌ Error output:', data.toString().trim());
});

child.on('close', (code) => {
    console.log('');
    console.log(`📊 pg_dump exited with code: ${code}`);

    if (code === 0) {
        console.log('✅ SUCCESS! pg_dump worked correctly.');
        console.log(`📄 Output length: ${stdout.length} characters`);
        if (stdout.length > 0) {
            console.log('First few lines of output:');
            console.log(stdout.split('\n').slice(0, 5).join('\n'));
        }
    } else {
        console.log('❌ FAILED! pg_dump encountered an error.');

        if (stderr.trim()) {
            console.log('');
            console.log('🔍 Error details:');
            console.log(stderr.trim());
            console.log('');

            // Common error diagnosis
            if (stderr.includes('authentication failed')) {
                console.log('💡 Diagnosis: Authentication failed');
                console.log('   • Check username and password');
                console.log('   • Verify user exists in database');
                console.log('   • Check pg_hba.conf authentication method');
            } else if (
                stderr.includes('could not connect') ||
                stderr.includes('Connection refused')
            ) {
                console.log('💡 Diagnosis: Connection failed');
                console.log('   • Check if PostgreSQL server is running');
                console.log('   • Verify host and port are correct');
                console.log('   • Check firewall settings');
            } else if (stderr.includes('database') && stderr.includes('does not exist')) {
                console.log('💡 Diagnosis: Database does not exist');
                console.log('   • Check database name spelling');
                console.log('   • List available databases with: psql -l');
            } else if (stderr.includes('permission denied')) {
                console.log('💡 Diagnosis: Permission denied');
                console.log('   • User may lack necessary privileges');
                console.log('   • Check database permissions');
            }
        } else {
            console.log('🤔 No error details provided by pg_dump');
            console.log('   This might indicate a configuration or environment issue');
        }
    }

    console.log('');
    console.log('🛠️  Next steps:');
    console.log('1. Update the connection parameters in this script');
    console.log('2. Run: node debug-pgdump.js');
    console.log('3. Test manually: psql -h HOST -p PORT -U USER DATABASE');
    console.log('4. Check your web app form inputs match working parameters');
});

child.on('error', (err) => {
    console.error('❌ Failed to start pg_dump process:', err.message);
    console.error('   • Make sure pg_dump is installed and in PATH');
    console.error(
        '   • Current pg_dump location:',
        process.env.PATH.split(':').find((p) =>
            require('fs').existsSync(require('path').join(p, 'pg_dump'))
        )
    );
});
