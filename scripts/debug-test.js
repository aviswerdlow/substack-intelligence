#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function debugTest() {
  console.log('🔍 Debug Test - Checking app errors...\n');

  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    // Capture console logs and errors
    page.on('console', msg => {
      console.log('🌐 BROWSER:', msg.text());
    });
    
    page.on('pageerror', error => {
      console.log('❌ PAGE ERROR:', error.message);
    });

    console.log('🌐 Loading http://localhost:3000...');
    
    const response = await page.goto('http://localhost:3000', { 
      waitUntil: 'domcontentloaded',
      timeout: 10000 
    });

    console.log('📊 Status:', response.status());
    
    if (response.status() === 500) {
      // Get the error page content
      const content = await page.content();
      console.log('📄 Error page content (first 500 chars):');
      console.log(content.substring(0, 500) + '...');
      
      // Look for specific error messages
      const errorText = await page.evaluate(() => {
        const errorElement = document.querySelector('h1, h2, .error, pre');
        return errorElement ? errorElement.innerText : 'No error element found';
      });
      
      console.log('🚨 Error message:', errorText);
    }

    await browser.close();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

debugTest();