const puppeteer = require('puppeteer');

async function testNavigation() {
  console.log('🚀 Starting navigation test...\n');
  
  const browser = await puppeteer.launch({
    headless: false, // Show browser
    slowMo: 500, // Slow down actions for visibility
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  // Enable console logging
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  try {
    // 1. Go to homepage
    console.log('📍 Navigating to homepage...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await page.screenshot({ path: 'test-results/homepage.png' });
    console.log('✅ Homepage loaded');
    
    // 2. Get all navigation links
    console.log('\n🔍 Finding navigation links...');
    const navLinks = await page.evaluate(() => {
      const links = [];
      // Try different selectors for nav links
      const selectors = [
        'nav a',
        'header a',
        '[role="navigation"] a',
        'a[href^="/"]'
      ];
      
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          if (el.href && !links.find(l => l.href === el.href)) {
            links.push({
              text: el.textContent.trim(),
              href: el.href,
              selector: selector
            });
          }
        });
      }
      return links;
    });
    
    console.log(`Found ${navLinks.length} navigation links:`);
    navLinks.forEach(link => {
      console.log(`  - ${link.text}: ${link.href}`);
    });
    
    // 3. Test each navigation link
    console.log('\n🧪 Testing each navigation link...\n');
    const results = [];
    
    for (const link of navLinks) {
      if (link.text && link.href.includes('localhost')) {
        console.log(`Testing: ${link.text} (${link.href})`);
        
        try {
          const response = await page.goto(link.href, { 
            waitUntil: 'networkidle0',
            timeout: 10000 
          });
          
          const status = response.status();
          const url = page.url();
          
          results.push({
            text: link.text,
            href: link.href,
            status: status,
            finalUrl: url,
            success: status === 200
          });
          
          if (status === 404) {
            console.log(`  ❌ 404 Not Found`);
            
            // Check what's actually on the page
            const pageContent = await page.evaluate(() => {
              return {
                title: document.title,
                h1: document.querySelector('h1')?.textContent,
                bodyText: document.body.innerText.substring(0, 200)
              };
            });
            console.log(`     Page shows: ${pageContent.h1 || pageContent.title}`);
          } else if (status === 200) {
            console.log(`  ✅ Success (${status})`);
          } else {
            console.log(`  ⚠️ Status: ${status}`);
          }
          
          // Go back to homepage for next test
          await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
          
        } catch (error) {
          console.log(`  ❌ Error: ${error.message}`);
          results.push({
            text: link.text,
            href: link.href,
            error: error.message
          });
        }
      }
    }
    
    // 4. Summary
    console.log('\n📊 SUMMARY:');
    console.log('=' .repeat(50));
    
    const working = results.filter(r => r.success);
    const broken = results.filter(r => !r.success);
    
    console.log(`\n✅ Working pages (${working.length}):`);
    working.forEach(r => console.log(`  - ${r.text}: ${r.href}`));
    
    console.log(`\n❌ Broken pages (${broken.length}):`);
    broken.forEach(r => console.log(`  - ${r.text}: ${r.href} (${r.status || r.error})`));
    
    // 5. Check file structure
    console.log('\n📁 Checking app directory structure...');
    const fs = require('fs');
    const path = require('path');
    
    const appDir = path.join(__dirname, 'apps/web/app');
    const checkPaths = [
      'intelligence',
      'emails', 
      'reports',
      'analytics',
      'settings',
      '(dashboard)/intelligence',
      '(dashboard)/emails',
      '(dashboard)/reports', 
      '(dashboard)/analytics',
      '(dashboard)/settings'
    ];
    
    console.log('\nLooking for page.tsx files:');
    checkPaths.forEach(p => {
      const fullPath = path.join(appDir, p, 'page.tsx');
      const exists = fs.existsSync(fullPath);
      console.log(`  ${exists ? '✅' : '❌'} ${p}/page.tsx`);
    });
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    console.log('\n🏁 Test complete. Browser will stay open for inspection.');
    // Keep browser open for manual inspection
    // await browser.close();
  }
}

testNavigation().catch(console.error);