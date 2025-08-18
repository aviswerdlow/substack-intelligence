#!/usr/bin/env node

const puppeteer = require('puppeteer');
const { execSync } = require('child_process');
const fs = require('fs');

async function quickDeployTest() {
  console.log('🚀 Quick Deployment Test with Puppeteer');
  console.log('═'.repeat(50));
  
  // Test local app first
  console.log('🧪 Testing local app...');
  
  const browser = await puppeteer.launch({
    headless: "new",
    defaultViewport: { width: 1200, height: 800 }
  });

  const page = await browser.newPage();
  
  try {
    console.log('📍 Loading http://localhost:3000...');
    
    const response = await page.goto('http://localhost:3000', { 
      waitUntil: 'domcontentloaded',
      timeout: 15000 
    });

    console.log(`✅ Status: ${response.status()}`);
    
    // Take screenshot
    await page.screenshot({ 
      path: 'pre-deploy-screenshot.png',
      fullPage: true 
    });
    
    console.log('✅ Screenshot saved: pre-deploy-screenshot.png');
    
    // Get basic info
    const title = await page.title();
    const bodyText = await page.evaluate(() => document.body.innerText);
    
    console.log(`✅ Title: "${title}"`);
    console.log(`✅ Content: ${bodyText.length} characters`);
    
    if (response.status() >= 200 && response.status() < 400) {
      console.log('✅ App is ready for deployment!');
    } else {
      console.log(`⚠️  App has issues (${response.status()}) but can still deploy`);
    }

  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    
    if (error.message.includes('ERR_CONNECTION_REFUSED')) {
      console.log('💡 Make sure your app is running: npm run dev');
      return;
    }
  } finally {
    await browser.close();
  }

  // Now deploy
  console.log('\n🚀 Starting Vercel deployment...');
  
  try {
    console.log('Running: vercel --prod');
    const deployOutput = execSync('vercel --prod', { 
      encoding: 'utf8',
      stdio: 'inherit'
    });
    
    console.log('✅ Deployment complete!');
    
  } catch (deployError) {
    console.log('📝 Alternative deployment methods:');
    console.log('1. Manual: Run `vercel --prod` and follow prompts');
    console.log('2. GitHub: Push to main branch (if connected)');
    console.log('3. Vercel dashboard: Import from GitHub');
  }
}

quickDeployTest().catch(console.error);