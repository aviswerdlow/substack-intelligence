import { chromium, FullConfig } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, '.env.test.local') });

async function globalSetup(config: FullConfig) {
  console.log('\n🔐 Setting up authentication for tests...\n');
  
  const project = config.projects[0];
  const baseURL = (project.use as any)?.baseURL || 'http://localhost:3000';
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const authFile = 'nextauth-auth-state.json';
  
  try {
    // Check if we already have valid auth state
    if (fs.existsSync(authFile)) {
      console.log('ℹ️ Found existing auth state file');
      
      // Try to use existing auth
      await context.addCookies(JSON.parse(fs.readFileSync(authFile, 'utf-8')).cookies || []);
      await page.goto(baseURL || 'http://localhost:3000');
      await page.goto('/dashboard');
      
      // Check if we're authenticated
      const isAuthenticated = await page.url().includes('/dashboard') && 
                             !await page.url().includes('/sign-in');
      
      if (isAuthenticated) {
        console.log('✅ Using existing valid authentication');
        await browser.close();
        return;
      }
      
      console.log('⚠️ Existing auth state invalid, re-authenticating...');
    }
    
    // Navigate to sign-in page
    console.log('📍 Navigating to sign-in page...');
    await page.goto(`${baseURL || 'http://localhost:3000'}/sign-in`);
    
    // Wait for NextAuth UI to load
    await page.waitForTimeout(3000);
    
    // Try to authenticate with test credentials
    const email = process.env.TEST_USER_EMAIL || 'test@substackintel.com';
    const password = process.env.TEST_USER_PASSWORD || 'TestUser123!';
    
    console.log(`📧 Attempting to sign in with: ${email}`);
    
    // Look for NextAuth sign-in form
    const emailInput = await page.locator('input[name="identifier"], input[type="email"], input[placeholder*="email" i]').first();
    const passwordInput = await page.locator('input[name="password"], input[type="password"]').first();
    
    if (await emailInput.isVisible() && await passwordInput.isVisible()) {
      // Fill in credentials
      await emailInput.fill(email);
      await passwordInput.fill(password);
      
      // Submit form
      const submitButton = await page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Continue")').first();
      await submitButton.click();
      
      // Wait for navigation
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      
      console.log('✅ Successfully authenticated');
      
      // Save authentication state
      await context.storageState({ path: authFile });
      console.log('💾 Authentication state saved');
    } else {
      console.log('⚠️ Could not find sign-in form - manual NextAuth setup required');
      throw new Error('NextAuth sign-in form not available for automated authentication');
    }
    
  } catch (error) {
    console.error('❌ Authentication setup failed:', error);
    console.log('⚠️ Tests will run without authentication');
    
    // Create a minimal auth state file to prevent errors
    const minimalAuthState = {
      cookies: [],
      origins: [{
        origin: 'http://localhost:3000',
        localStorage: [{
          name: '__test_mode',
          value: 'true'
        }]
      }]
    };
    
    fs.writeFileSync(authFile, JSON.stringify(minimalAuthState, null, 2));
  } finally {
    await browser.close();
  }
  
  console.log('\n✅ Authentication setup complete\n');
}

export default globalSetup;