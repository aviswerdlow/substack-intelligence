#!/usr/bin/env node

/**
 * Setup script for test authentication
 * Run this to create a test user and save authentication state
 * Usage: npm run test:auth-setup
 */

import { chromium } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load test environment
dotenv.config({ path: path.resolve(__dirname, '../.env.test.local') });

async function setupTestAuth() {
  console.log('🔐 Setting up test authentication...\n');
  
  const browser = await chromium.launch({ 
    headless: false, // Show browser for manual intervention if needed
    slowMo: 500 // Slow down for visibility
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Navigate to your app
    await page.goto('http://localhost:3000');
    console.log('📍 Navigated to homepage');
    
    // Click sign in button
    await page.click('button:has-text("Sign In")');
    console.log('📍 Clicked Sign In button');
    
    // Wait for Clerk modal
    await page.waitForTimeout(2000);
    
    // Check if we need to create an account
    const signUpLink = await page.locator('text="Sign up"').first();
    if (await signUpLink.isVisible()) {
      console.log('📝 Creating new test account...');
      
      await signUpLink.click();
      
      // Fill in sign up form
      const email = process.env.TEST_USER_EMAIL || 'test@substackintel.com';
      const password = process.env.TEST_USER_PASSWORD || 'TestUser123!';
      
      // Look for email field
      const emailField = await page.locator('input[type="email"], input[name="emailAddress"]').first();
      if (await emailField.isVisible()) {
        await emailField.fill(email);
        console.log(`📧 Entered email: ${email}`);
      }
      
      // Look for password field
      const passwordField = await page.locator('input[type="password"], input[name="password"]').first();
      if (await passwordField.isVisible()) {
        await passwordField.fill(password);
        console.log('🔑 Entered password');
      }
      
      // Submit
      const submitButton = await page.locator('button[type="submit"], button:has-text("Continue"), button:has-text("Sign up")').first();
      await submitButton.click();
      console.log('📤 Submitted sign up form');
      
      // Wait for verification or redirect
      await page.waitForTimeout(5000);
      
      // Check if we need email verification
      const verificationMessage = await page.locator('text="verify"').first();
      if (await verificationMessage.isVisible()) {
        console.log('\n⚠️ Email verification required!');
        console.log('Please check your email and verify the account.');
        console.log('Then run this script again to save the authentication state.\n');
        
        // Keep browser open for manual verification
        console.log('Complete verification in the browser, then press Ctrl+C to exit...');
        await new Promise(() => {}); // Wait indefinitely
      }
    } else {
      // Sign in with existing account
      console.log('📝 Signing in with existing account...');
      
      const email = process.env.TEST_USER_EMAIL || 'test@substackintel.com';
      const password = process.env.TEST_USER_PASSWORD || 'TestUser123!';
      
      // Fill in credentials
      const emailField = await page.locator('input[name="identifier"], input[type="email"]').first();
      await emailField.fill(email);
      
      const passwordField = await page.locator('input[name="password"], input[type="password"]').first();
      await passwordField.fill(password);
      
      // Submit
      const submitButton = await page.locator('button[type="submit"]').first();
      await submitButton.click();
      
      console.log('📤 Submitted sign in form');
    }
    
    // Wait for navigation to dashboard
    try {
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      console.log('✅ Successfully authenticated!');
      
      // Save authentication state
      const authState = await context.storageState();
      fs.writeFileSync(
        path.resolve(__dirname, '../clerk-auth-state.json'),
        JSON.stringify(authState, null, 2)
      );
      
      console.log('💾 Authentication state saved to clerk-auth-state.json');
      console.log('\n✅ Setup complete! You can now run tests with authentication.');
    } catch (error) {
      console.log('\n⚠️ Did not redirect to dashboard automatically.');
      console.log('If you see the dashboard, authentication was successful.');
      console.log('Saving current state...');
      
      // Save state anyway
      const authState = await context.storageState();
      fs.writeFileSync(
        path.resolve(__dirname, '../clerk-auth-state.json'),
        JSON.stringify(authState, null, 2)
      );
      
      console.log('💾 State saved. Try running the tests to see if authentication works.');
    }
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    console.log('\nTroubleshooting tips:');
    console.log('1. Make sure the app is running (npm run dev)');
    console.log('2. Check that Clerk is properly configured');
    console.log('3. Verify the test credentials in .env.test.local');
    console.log('4. Try creating the account manually first');
  } finally {
    await browser.close();
  }
}

// Run the setup
setupTestAuth().catch(console.error);