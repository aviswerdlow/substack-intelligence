import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('Starting global teardown...');
  
  // Clean up test data
  await cleanupTestData();
  
  // Clean up test files
  await cleanupTestFiles();
  
  console.log('Global teardown completed');
}

async function cleanupTestData() {
  if (process.env.NODE_ENV === 'test') {
    console.log('Cleaning up test data...');
    
    try {
      // Import database utilities
      const { createServiceRoleClient } = await import('@substack-intelligence/database');
      const supabase = createServiceRoleClient();
      
      // Clean up test data (only in test environment)
      if (process.env.SUPABASE_PROJECT_ID?.includes('test') || process.env.NODE_ENV === 'test') {
        // Clean test emails
        await supabase.from('emails').delete().like('sender_email', '%test%');
        
        // Clean test companies
        await supabase.from('companies').delete().like('name', '%Test%');
        
        // Clean test user settings
        // TODO: Add user_settings table to database
        // await supabase.from('user_settings').delete().like('user_id', '%test%');
        
        // Clean test reports - using a valid report_type
        // await supabase.from('reports').delete().eq('report_type', 'test');
        
        console.log('Test data cleanup completed');
      }
    } catch (error) {
      console.warn('Failed to cleanup test data:', error.message);
    }
  }
}

async function cleanupTestFiles() {
  // Clean up any temporary files created during tests
  const fs = await import('fs/promises');
  const path = await import('path');
  
  try {
    // Remove temporary auth state files
    const tempFiles = [
      'nextauth-auth-state-temp.json',
      'test-downloads',
      'test-uploads'
    ];
    
    for (const file of tempFiles) {
      try {
        await fs.rm(file, { recursive: true, force: true });
      } catch (error) {
        // File doesn't exist, that's fine
      }
    }
    
    console.log('Test files cleanup completed');
  } catch (error) {
    console.warn('Failed to cleanup test files:', error.message);
  }
}

export default globalTeardown;