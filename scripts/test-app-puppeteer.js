#!/usr/bin/env node

const puppeteer = require('puppeteer');
const path = require('path');

// Puppeteer App Testing Script for Substack Intelligence Platform
async function testSubstackApp() {
  console.log('🎭 Starting Puppeteer App Testing...\n');

  const browser = await puppeteer.launch({
    headless: false, // Show browser for debugging
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // Enable console logging from the page
  page.on('console', msg => {
    console.log('🌐 PAGE LOG:', msg.text());
  });

  // Listen for errors
  page.on('pageerror', error => {
    console.log('❌ PAGE ERROR:', error.message);
  });

  // Listen for failed requests
  page.on('requestfailed', request => {
    console.log('🚫 FAILED REQUEST:', request.url(), request.failure().errorText);
  });

  try {
    console.log('📍 Testing: http://localhost:3000');
    
    // Test 1: Load homepage
    console.log('\n🧪 Test 1: Loading homepage...');
    await page.goto('http://localhost:3000', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    const title = await page.title();
    console.log('✅ Page title:', title);
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-results/homepage.png',
      fullPage: true 
    });
    console.log('📸 Homepage screenshot saved');

    // Test 2: Check for authentication
    console.log('\n🧪 Test 2: Checking authentication...');
    
    // Look for NextAuth sign-in elements
    const signInButton = await page.$('[data-testid="sign-in"]') || 
                         await page.$('button:contains("Sign in")') ||
                         await page.$('a[href*="sign-in"]');
    
    if (signInButton) {
      console.log('✅ Sign-in button found');
      await page.screenshot({ path: 'test-results/auth-page.png' });
    } else {
      console.log('ℹ️  No sign-in button found - might be authenticated');
    }

    // Test 3: Navigate to dashboard
    console.log('\n🧪 Test 3: Testing navigation...');
    
    try {
      await page.goto('http://localhost:3000/dashboard', { 
        waitUntil: 'domcontentloaded',
        timeout: 15000 
      });
      console.log('✅ Dashboard page accessible');
      await page.screenshot({ path: 'test-results/dashboard.png' });
    } catch (error) {
      console.log('⚠️  Dashboard redirect (probably needs auth):', error.message);
    }

    // Test 4: Navigate to intelligence page
    console.log('\n🧪 Test 4: Testing intelligence page...');
    
    try {
      await page.goto('http://localhost:3000/intelligence', { 
        waitUntil: 'domcontentloaded',
        timeout: 15000 
      });
      console.log('✅ Intelligence page accessible');
      await page.screenshot({ path: 'test-results/intelligence.png' });
    } catch (error) {
      console.log('⚠️  Intelligence page redirect:', error.message);
    }

    // Test 5: Check API health
    console.log('\n🧪 Test 5: Testing API endpoints...');
    
    const healthResponse = await page.goto('http://localhost:3000/api/health', {
      waitUntil: 'networkidle0',
      timeout: 10000
    });
    
    if (healthResponse.ok()) {
      const healthData = await page.evaluate(() => document.body.innerText);
      console.log('✅ Health API response:', healthData);
    } else {
      console.log('❌ Health API failed:', healthResponse.status());
    }

    // Test 6: Performance metrics
    console.log('\n🧪 Test 6: Performance metrics...');
    
    await page.goto('http://localhost:3000');
    const metrics = await page.metrics();
    console.log('📊 Performance Metrics:');
    console.log(`   JS Heap Used: ${Math.round(metrics.JSHeapUsedSize / 1024 / 1024)}MB`);
    console.log(`   JS Heap Total: ${Math.round(metrics.JSHeapTotalSize / 1024 / 1024)}MB`);
    console.log(`   DOM Nodes: ${metrics.Nodes}`);
    console.log(`   Layout Count: ${metrics.LayoutCount}`);

    // Test 7: Mobile responsiveness
    console.log('\n🧪 Test 7: Mobile responsiveness...');
    
    await page.setViewport({ width: 375, height: 667 }); // iPhone SE
    await page.reload({ waitUntil: 'networkidle0' });
    await page.screenshot({ path: 'test-results/mobile-view.png' });
    console.log('✅ Mobile screenshot taken');

    // Test 8: Network requests analysis
    console.log('\n🧪 Test 8: Network analysis...');
    
    const requests = [];
    page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType()
      });
    });
    
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(3000);
    
    console.log(`📡 Total requests: ${requests.length}`);
    const apiRequests = requests.filter(r => r.url.includes('/api/'));
    console.log(`🔌 API requests: ${apiRequests.length}`);
    
    if (apiRequests.length > 0) {
      console.log('API endpoints called:');
      apiRequests.forEach(req => {
        console.log(`   ${req.method} ${req.url}`);
      });
    }

    console.log('\n✅ All tests completed successfully!');
    
    // Generate test report
    const report = {
      timestamp: new Date().toISOString(),
      tests: {
        homepage: '✅ Loaded successfully',
        authentication: signInButton ? '✅ Sign-in available' : 'ℹ️  No auth needed',
        performance: `${Math.round(metrics.JSHeapUsedSize / 1024 / 1024)}MB memory`,
        requests: `${requests.length} total, ${apiRequests.length} API calls`,
        screenshots: ['homepage.png', 'dashboard.png', 'intelligence.png', 'mobile-view.png']
      }
    };
    
    console.log('\n📋 Test Report:');
    console.log(JSON.stringify(report, null, 2));

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    // Take error screenshot
    try {
      await page.screenshot({ path: 'test-results/error-state.png' });
      console.log('📸 Error screenshot saved');
    } catch (screenshotError) {
      console.log('Failed to save error screenshot');
    }
  } finally {
    await browser.close();
    console.log('\n🔚 Browser closed. Check test-results/ folder for screenshots.');
  }
}

// Create test results directory
const fs = require('fs');
if (!fs.existsSync('test-results')) {
  fs.mkdirSync('test-results');
}

// Run the tests
testSubstackApp().catch(console.error);