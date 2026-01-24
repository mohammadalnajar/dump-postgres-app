#!/usr/bin/env node

/**
 * Simple test script to verify authentication functionality
 * Run with: node test-auth.js
 */

import { verifyCredentials, getAuthCredentials } from './src/lib/auth.js';

console.log('🔐 Testing Authentication System\n');

// Test 1: Get credentials
console.log('1. Testing credential retrieval...');
const { username, password: hashedPassword } = getAuthCredentials();
console.log(`   Username: ${username}`);
console.log(`   Password Hash: ${hashedPassword.substring(0, 20)}...`);
console.log('   ✅ Credentials retrieved successfully\n');

// Test 2: Valid credentials
console.log('2. Testing valid credentials...');
const validLogin = verifyCredentials('admin', 'admin123');
console.log(`   Valid login (admin/admin123): ${validLogin ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 3: Invalid username
console.log('3. Testing invalid username...');
const invalidUser = verifyCredentials('wronguser', 'admin123');
console.log(`   Invalid username: ${invalidUser ? '❌ FAIL' : '✅ PASS'}\n`);

// Test 4: Invalid password
console.log('4. Testing invalid password...');
const invalidPass = verifyCredentials('admin', 'wrongpassword');
console.log(`   Invalid password: ${invalidPass ? '❌ FAIL' : '✅ PASS'}\n`);

// Test 5: Custom environment variables
console.log('5. Testing with custom environment variables...');
process.env.AUTH_USERNAME = 'testuser';
process.env.AUTH_PASSWORD = 'testpass123';

// Clear the module cache to reload with new env vars
delete require.cache[require.resolve('./src/lib/auth.js')];
const { verifyCredentials: verifyCustom, getAuthCredentials: getCustom } = await import(
    './src/lib/auth.js'
);

const customCreds = getCustom();
console.log(`   Custom username: ${customCreds.username}`);
const customValid = verifyCustom('testuser', 'testpass123');
console.log(`   Custom login test: ${customValid ? '✅ PASS' : '❌ FAIL'}\n`);

console.log('🎉 Authentication tests completed!');
console.log('\n📝 Notes:');
console.log('   - Change default credentials in production');
console.log('   - Set AUTH_USERNAME and AUTH_PASSWORD environment variables');
console.log('   - Use a secure SESSION_SECRET for production');
