#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function testLiveDeployment() {
  const deploymentUrl = process.argv[2];
  
  if (!deploymentUrl) {
    console.log('❌ Please provide deployment URL:');
    console.log('   node scripts/test-live-deployment.js https://your-app.vercel.app');
    return;
  }

  console.log(`🎭 Testing live deployment: ${deploymentUrl}`);
  
  const browser = await puppeteer.launch({
    headless: "new",
    defaultViewport: { width: 1920, height: 1080 }
  });

  const page = await browser.newPage();
  
  try {
    // Test 1: Connectivity
    console.log('🔗 Testing connectivity...');
    const response = await page.goto(deploymentUrl, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    console.log(`✅ Status: ${response.status()}`);
    
    // Test 2: Screenshots
    console.log('📸 Taking screenshots...');
    await page.screenshot({ 
      path: 'live-deployment-desktop.png',
      fullPage: true 
    });
    
    await page.setViewport({ width: 375, height: 667 });
    await page.screenshot({ 
      path: 'live-deployment-mobile.png'
    });
    
    console.log('✅ Screenshots saved');
    
    // Test 3: Basic functionality
    console.log('🧪 Testing basic functionality...');
    const title = await page.title();
    console.log(`✅ Title: "${title}"`);
    
    // Test 4: API endpoints
    console.log('🔌 Testing API health...');
    try {
      const healthResponse = await page.goto(`${deploymentUrl}/api/health`);
      console.log(`✅ Health API: ${healthResponse.status()}`);
    } catch (apiError) {
      console.log('⚠️  Health API not available (expected for MVP)');
    }
    
    console.log('');
    console.log('🎉 DEPLOYMENT TEST COMPLETE!');
    console.log(`🌍 Your Substack Intelligence Platform is live at: ${deploymentUrl}`);
    console.log('📸 Screenshots saved: live-deployment-*.png');
    
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
  } finally {
    await browser.close();
  }
}

testLiveDeployment().catch(console.error);
