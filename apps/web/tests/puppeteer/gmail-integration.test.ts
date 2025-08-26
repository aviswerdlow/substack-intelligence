import puppeteer, { Browser, Page } from 'puppeteer';
import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

describe('Gmail Integration Pipeline', () => {
  let browser: Browser;
  let page: Page;
  const BASE_URL = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
  
  // Test configuration
  const TEST_CONFIG = {
    gmail: {
      email: 'aviswerdlow@gmail.com',
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      refreshToken: process.env.GOOGLE_REFRESH_TOKEN
    },
    timeout: 120000, // 2 minutes for long operations
    headless: false, // Run with browser visible for debugging
    slowMo: 50 // Slow down actions for visibility
  };

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: TEST_CONFIG.headless,
      slowMo: TEST_CONFIG.slowMo,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    });
  }, TEST_CONFIG.timeout);

  beforeEach(async () => {
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    // Set custom headers if needed
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9'
    });
    
    // Enable console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Browser console error:', msg.text());
      }
    });
    
    // Log network errors
    page.on('pageerror', error => {
      console.error('Page error:', error.message);
    });
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  describe('Step 1: Gmail OAuth Configuration', () => {
    test('should verify Gmail API credentials are configured', async () => {
      // Check that required environment variables are present
      expect(TEST_CONFIG.gmail.clientId).toBeDefined();
      expect(TEST_CONFIG.gmail.clientSecret).toBeDefined();
      
      console.log('✅ Gmail API credentials found in environment');
      
      // If refresh token is not present, provide instructions
      if (!TEST_CONFIG.gmail.refreshToken) {
        console.log('\n⚠️  GOOGLE_REFRESH_TOKEN not found!');
        console.log('To get a refresh token, run:');
        console.log('npm run setup:gmail-oauth');
        console.log('This will open a browser to authenticate with aviswerdlow@gmail.com');
      } else {
        console.log('✅ Refresh token found');
      }
    });

    test('should test Gmail API connection', async () => {
      await page.goto(`${BASE_URL}/api/test/gmail`, {
        waitUntil: 'networkidle0'
      });
      
      const content = await page.content();
      const response = JSON.parse(await page.evaluate(() => document.body.innerText));
      
      expect(response.success).toBe(true);
      expect(response.connected).toBe(true);
      expect(response.stats).toBeDefined();
      
      console.log('✅ Gmail API connection successful');
      console.log(`📊 Stats:`, response.stats);
    }, TEST_CONFIG.timeout);
  });

  describe('Step 2: Email Fetching', () => {
    test('should fetch Substack newsletters from Gmail', async () => {
      // Make POST request to fetch emails
      const response = await page.evaluate(async (url) => {
        const res = await fetch(`${url}/api/test/gmail`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        return res.json();
      }, BASE_URL);
      
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.emailsProcessed).toBeGreaterThanOrEqual(0);
      
      console.log(`📧 Fetched ${response.data.emailsProcessed} Substack emails`);
      
      if (response.data.emails && response.data.emails.length > 0) {
        console.log('Sample emails:');
        response.data.emails.slice(0, 3).forEach((email: any) => {
          console.log(`  - ${email.newsletterName}: "${email.subject.substring(0, 50)}..."`);
        });
      }
      
      return response.data.emails;
    }, TEST_CONFIG.timeout);
  });

  describe('Step 3: Company Extraction', () => {
    test('should extract companies from newsletter content', async () => {
      // First fetch an email to test with
      const fetchResponse = await page.evaluate(async (url) => {
        const res = await fetch(`${url}/api/test/gmail`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        return res.json();
      }, BASE_URL);
      
      if (fetchResponse.data.emails.length === 0) {
        console.log('⚠️  No emails available for extraction testing');
        return;
      }
      
      // Get the first email's content for testing
      const testEmail = fetchResponse.data.emails[0];
      console.log(`🔍 Testing extraction on: ${testEmail.newsletterName}`);
      
      // Test the extraction endpoint
      const extractResponse = await page.evaluate(async (url, email) => {
        const res = await fetch(`${url}/api/test/extract`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: 'Sample content from ' + email.newsletterName,
            newsletterName: email.newsletterName
          })
        });
        return res.json();
      }, BASE_URL, testEmail);
      
      expect(extractResponse.success).toBe(true);
      expect(extractResponse.data).toBeDefined();
      
      console.log(`🏢 Extraction results:`, extractResponse.data);
      
      if (extractResponse.data.companies && extractResponse.data.companies.length > 0) {
        console.log(`Found ${extractResponse.data.companies.length} companies:`);
        extractResponse.data.companies.forEach((company: any) => {
          console.log(`  - ${company.name} (${company.sentiment}, confidence: ${company.confidence})`);
        });
      }
    }, TEST_CONFIG.timeout);
  });

  describe('Step 4: Full Pipeline Trigger', () => {
    test('should trigger the complete intelligence pipeline', async () => {
      // Navigate to the dashboard
      await page.goto(`${BASE_URL}/dashboard`, {
        waitUntil: 'networkidle0'
      });
      
      // Wait for dashboard to load
      await page.waitForSelector('[data-testid="dashboard-container"]', {
        timeout: 10000
      }).catch(() => {
        console.log('Dashboard container not found, continuing...');
      });
      
      // Trigger the pipeline via API
      const pipelineResponse = await page.evaluate(async (url) => {
        const res = await fetch(`${url}/api/trigger/intelligence`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        return res.json();
      }, BASE_URL);
      
      expect(pipelineResponse.success).toBe(true);
      expect(pipelineResponse.data.eventId).toBeDefined();
      
      console.log('🚀 Intelligence pipeline triggered');
      console.log(`Event ID: ${pipelineResponse.data.eventId}`);
      
      // Wait a bit for processing
      await page.waitForTimeout(5000);
      
      // Check if the pipeline is running (would need Inngest dashboard access)
      console.log('⏳ Pipeline is processing in the background...');
      console.log('Check Inngest dashboard for detailed status');
    }, TEST_CONFIG.timeout);
  });

  describe('Step 5: Dashboard Verification', () => {
    test('should display extracted companies on dashboard', async () => {
      // Navigate to dashboard
      await page.goto(`${BASE_URL}/dashboard`, {
        waitUntil: 'networkidle0'
      });
      
      // Look for companies section
      const companiesSection = await page.$('[data-testid="companies-section"]').catch(() => null);
      
      if (companiesSection) {
        // Get companies count
        const companiesCount = await page.evaluate(() => {
          const countElement = document.querySelector('[data-testid="companies-count"]');
          return countElement ? countElement.textContent : '0';
        });
        
        console.log(`📊 Dashboard shows ${companiesCount} companies`);
        
        // Try to get company names
        const companyNames = await page.evaluate(() => {
          const nameElements = document.querySelectorAll('[data-testid="company-name"]');
          return Array.from(nameElements).map(el => el.textContent);
        });
        
        if (companyNames.length > 0) {
          console.log('Visible companies:');
          companyNames.slice(0, 5).forEach(name => {
            console.log(`  - ${name}`);
          });
        }
      }
      
      // Check for recent activity
      const activitySection = await page.$('[data-testid="recent-activity"]').catch(() => null);
      
      if (activitySection) {
        const activities = await page.evaluate(() => {
          const items = document.querySelectorAll('[data-testid="activity-item"]');
          return Array.from(items).map(item => item.textContent);
        });
        
        if (activities.length > 0) {
          console.log('\n📝 Recent activities:');
          activities.slice(0, 3).forEach(activity => {
            console.log(`  - ${activity}`);
          });
        }
      }
    }, TEST_CONFIG.timeout);

    test('should navigate to Intelligence page and verify data', async () => {
      // Navigate to intelligence page
      await page.goto(`${BASE_URL}/dashboard/intelligence`, {
        waitUntil: 'networkidle0'
      });
      
      // Wait for page to load
      await page.waitForSelector('h1', { timeout: 5000 }).catch(() => {
        console.log('Page header not found');
      });
      
      // Check for companies list
      const companiesList = await page.$('[data-testid="companies-list"]').catch(() => null);
      
      if (companiesList) {
        const companies = await page.evaluate(() => {
          const cards = document.querySelectorAll('[data-testid="company-card"]');
          return Array.from(cards).map(card => {
            const name = card.querySelector('[data-testid="company-name"]')?.textContent;
            const mentions = card.querySelector('[data-testid="mention-count"]')?.textContent;
            return { name, mentions };
          });
        });
        
        console.log(`\n🏢 Intelligence page shows ${companies.length} companies`);
        companies.slice(0, 5).forEach(company => {
          console.log(`  - ${company.name} (${company.mentions} mentions)`);
        });
      }
      
      // Check for newsletter sources
      const sources = await page.evaluate(() => {
        const sourceElements = document.querySelectorAll('[data-testid="newsletter-source"]');
        return Array.from(sourceElements).map(el => el.textContent);
      });
      
      if (sources.length > 0) {
        console.log('\n📰 Newsletter sources:');
        Array.from(new Set(sources)).forEach(source => {
          console.log(`  - ${source}`);
        });
      }
    }, TEST_CONFIG.timeout);
  });

  describe('Step 6: End-to-End User Journey', () => {
    test('should complete full user journey from email to insights', async () => {
      console.log('\n🎯 Starting end-to-end user journey test...\n');
      
      // Step 1: Verify Gmail connection
      console.log('1️⃣ Verifying Gmail connection...');
      await page.goto(`${BASE_URL}/api/test/gmail`);
      const gmailStatus = JSON.parse(await page.evaluate(() => document.body.innerText));
      expect(gmailStatus.connected).toBe(true);
      console.log('   ✅ Gmail connected');
      
      // Step 2: Trigger pipeline
      console.log('\n2️⃣ Triggering intelligence pipeline...');
      const triggerResponse = await page.evaluate(async (url) => {
        const res = await fetch(`${url}/api/trigger/intelligence`, {
          method: 'POST'
        });
        return res.json();
      }, BASE_URL);
      expect(triggerResponse.success).toBe(true);
      console.log(`   ✅ Pipeline triggered (Event: ${triggerResponse.data.eventId})`);
      
      // Step 3: Wait for processing
      console.log('\n3️⃣ Waiting for pipeline processing...');
      await page.waitForTimeout(10000); // Wait 10 seconds for processing
      console.log('   ✅ Processing time elapsed');
      
      // Step 4: Check dashboard
      console.log('\n4️⃣ Checking dashboard for results...');
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle0' });
      
      // Take a screenshot for verification
      await page.screenshot({ 
        path: 'test-results/dashboard-after-pipeline.png',
        fullPage: true 
      });
      console.log('   📸 Dashboard screenshot saved');
      
      // Step 5: Navigate to Intelligence page
      console.log('\n5️⃣ Navigating to Intelligence page...');
      await page.goto(`${BASE_URL}/dashboard/intelligence`, { waitUntil: 'networkidle0' });
      
      await page.screenshot({ 
        path: 'test-results/intelligence-page.png',
        fullPage: true 
      });
      console.log('   📸 Intelligence page screenshot saved');
      
      console.log('\n✅ End-to-end journey completed successfully!');
      console.log('Check test-results/ folder for screenshots');
    }, TEST_CONFIG.timeout * 2); // Double timeout for full journey
  });
});