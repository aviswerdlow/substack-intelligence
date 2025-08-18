#!/usr/bin/env node

const puppeteer = require('puppeteer');

// Simple Puppeteer test for Substack Intelligence app
async function simpleTest() {
  console.log('🎭 Starting Simple Puppeteer Test...\n');

  try {
    const browser = await puppeteer.launch({
      headless: false, // Show browser
      defaultViewport: { width: 1200, height: 800 }
    });

    const page = await browser.newPage();
    
    console.log('🌐 Navigating to http://localhost:3000...');
    
    // Test basic connectivity
    const response = await page.goto('http://localhost:3000', { 
      waitUntil: 'domcontentloaded',
      timeout: 15000 
    });

    console.log('✅ Response Status:', response.status());
    console.log('✅ Response URL:', response.url());
    
    // Get page title
    const title = await page.title();
    console.log('✅ Page Title:', title);
    
    // Check if page loaded content
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('📄 Page has content:', bodyText.length > 0 ? 'Yes' : 'No');
    
    if (bodyText.length > 0) {
      console.log('📄 First 200 characters:', bodyText.substring(0, 200) + '...');
    }
    
    // Take screenshot
    console.log('📸 Taking screenshot...');
    await page.screenshot({ 
      path: 'app-screenshot.png',
      fullPage: true 
    });
    console.log('✅ Screenshot saved as app-screenshot.png');
    
    // Test responsive design
    console.log('📱 Testing mobile view...');
    await page.setViewport({ width: 375, height: 667 });
    await page.screenshot({ path: 'mobile-screenshot.png' });
    console.log('✅ Mobile screenshot saved');
    
    console.log('\n✅ Test completed successfully!');
    
    await browser.close();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.message.includes('net::ERR_CONNECTION_REFUSED')) {
      console.log('\n💡 Make sure your app is running on http://localhost:3000');
      console.log('   Run: npm run dev (in the apps/web directory)');
    }
  }
}

// Run the test
simpleTest();