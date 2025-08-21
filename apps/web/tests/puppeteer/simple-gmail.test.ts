import puppeteer, { Browser, Page } from 'puppeteer';
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

describe('Simple Gmail API Test', () => {
  const BASE_URL = 'http://localhost:3000';
  
  test('should verify environment variables are set', () => {
    console.log('\n📋 Checking environment variables...');
    
    const hasClientId = !!process.env.GOOGLE_CLIENT_ID;
    const hasClientSecret = !!process.env.GOOGLE_CLIENT_SECRET;
    const hasRefreshToken = !!process.env.GOOGLE_REFRESH_TOKEN;
    
    console.log(`  ✅ GOOGLE_CLIENT_ID: ${hasClientId ? 'Found' : 'Missing'}`);
    console.log(`  ✅ GOOGLE_CLIENT_SECRET: ${hasClientSecret ? 'Found' : 'Missing'}`);
    console.log(`  ✅ GOOGLE_REFRESH_TOKEN: ${hasRefreshToken ? 'Found' : 'Missing'}`);
    
    expect(hasClientId).toBe(true);
    expect(hasClientSecret).toBe(true);
    expect(hasRefreshToken).toBe(true);
  });

  test('should test Gmail API endpoint with fetch', async () => {
    console.log('\n🔍 Testing Gmail API endpoint...');
    
    try {
      const response = await fetch(`${BASE_URL}/api/test/gmail`);
      const data = await response.json();
      
      console.log('  Response status:', response.status);
      console.log('  Response data:', JSON.stringify(data, null, 2));
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.connected).toBe(true);
    } catch (error) {
      console.error('  ❌ Error:', error);
      throw error;
    }
  });

  test('should fetch emails via POST request', async () => {
    console.log('\n📧 Fetching emails from Gmail...');
    
    try {
      const response = await fetch(`${BASE_URL}/api/test/gmail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      
      console.log('  Response status:', response.status);
      console.log(`  Emails processed: ${data.data?.emailsProcessed || 0}`);
      
      if (data.data?.emails && data.data.emails.length > 0) {
        console.log('  Sample emails:');
        data.data.emails.slice(0, 3).forEach((email: any) => {
          console.log(`    - ${email.newsletterName}: "${email.subject}"`);
        });
      }
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    } catch (error) {
      console.error('  ❌ Error:', error);
      throw error;
    }
  });

  test('should test extraction endpoint', async () => {
    console.log('\n🏢 Testing company extraction...');
    
    try {
      const response = await fetch(`${BASE_URL}/api/test/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'Stripe just raised $500M in funding. Meanwhile, OpenAI announced GPT-5.',
          newsletterName: 'Test Newsletter'
        })
      });
      const data = await response.json();
      
      console.log('  Response status:', response.status);
      console.log('  Extraction result:', JSON.stringify(data, null, 2));
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    } catch (error) {
      console.error('  ❌ Error:', error);
      throw error;
    }
  }, 60000); // 60 second timeout for AI extraction
});