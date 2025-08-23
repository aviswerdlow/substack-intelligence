import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  // Set up test database
  await setupTestDatabase();
  
  // Set up authentication
  await setupTestAuth(config);
  
  console.log('Global setup completed');
}

async function setupTestDatabase() {
  // Clean up test data from previous runs
  if (process.env.NODE_ENV === 'test') {
    console.log('Cleaning up test database...');
    
    // Import database utilities
    const { createServiceRoleClient } = await import('@substack-intelligence/database');
    const supabase = createServiceRoleClient();
    
    // Clean test data (be careful with this in production!)
    if (process.env.SUPABASE_PROJECT_ID?.includes('test') || process.env.NODE_ENV === 'test') {
      await supabase.from('emails').delete().like('sender_email', '%test%');
      await supabase.from('companies').delete().like('name', '%test%');
      await supabase.from('user_settings').delete().like('user_id', '%test%');
      console.log('Test database cleaned');
    }
  }
}

async function setupTestAuth(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  
  // Start browser and create page
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    console.log('Setting up test authentication...');
    
    // Create test authentication state
    await page.goto(baseURL + '/sign-in');
    
    // Wait for Clerk to load
    await page.waitForSelector('[data-clerk-sign-in-form]', { timeout: 15000 });
    
    // Use test credentials if provided
    if (process.env.TEST_USER_EMAIL && process.env.TEST_USER_PASSWORD) {
      await page.fill('input[name="identifier"]', process.env.TEST_USER_EMAIL);
      await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD);
      await page.click('button[type="submit"]');
      
      // Wait for authentication to complete
      await page.waitForURL('**/dashboard', { timeout: 30000 });
      
      // Save authentication state
      await page.context().storageState({ path: 'clerk-auth-state.json' });
      console.log('Test authentication state saved');
    } else {
      console.log('No test credentials provided - tests will run in unauthenticated mode');
    }
  } catch (error) {
    console.log('Authentication setup failed, continuing without auth state:', error.message);
  } finally {
    await browser.close();
  }
}

export default globalSetup;