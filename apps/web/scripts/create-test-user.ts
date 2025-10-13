#!/usr/bin/env ts-node
/**
 * Create Test User Script
 * 
 * This script creates a test user for E2E testing using Clerk's test mode.
 * In development/test mode, emails with +clerk_test suffix can be verified
 * with the code "424242" without actually sending emails.
 */

import { clerkClient } from '@clerk/nextjs/server';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const TEST_USER = {
  email: 'test+clerk_test@example.com',
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'User',
};

async function createTestUser() {
  try {
    console.log('🔍 Checking if test user already exists...');
    
    // Check if user already exists
    const client = clerkClient;
    const existingUsers = await client.users.getUserList({
      emailAddress: [TEST_USER.email],
    });

    if (existingUsers.data.length > 0) {
      console.log('✅ Test user already exists');
      console.log('User ID:', existingUsers.data[0].id);
      return existingUsers.data[0];
    }

    console.log('📝 Creating new test user...');
    
    // Create the test user
    const user = await client.users.createUser({
      emailAddress: [TEST_USER.email],
      password: TEST_USER.password,
      firstName: TEST_USER.firstName,
      lastName: TEST_USER.lastName,
      skipPasswordChecks: true,
      skipPasswordRequirement: true,
    });

    console.log('✅ Test user created successfully!');
    console.log('User ID:', user.id);
    console.log('Email:', TEST_USER.email);
    console.log('Password:', TEST_USER.password);
    console.log('\n📋 Test Credentials for E2E Tests:');
    console.log('================================');
    console.log(`Email: ${TEST_USER.email}`);
    console.log(`Password: ${TEST_USER.password}`);
    console.log('Verification Code: 424242');
    console.log('================================\n');
    
    return user;
  } catch (error) {
    console.error('❌ Error creating test user:', error);
    
    // If the error is about email/password not being enabled, provide instructions
    if (error.message?.includes('password')) {
      console.log('\n⚠️  Email/Password authentication may not be enabled in Clerk.');
      console.log('Please follow these steps:');
      console.log('1. Go to https://dashboard.clerk.com/');
      console.log('2. Select your application');
      console.log('3. Go to "User & Authentication" → "Email, Phone, Username"');
      console.log('4. Enable "Email address" sign-in');
      console.log('5. Enable "Password" authentication');
      console.log('6. Save changes and try again\n');
    }
    
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  createTestUser()
    .then(() => {
      console.log('✨ Test user setup complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { createTestUser, TEST_USER };