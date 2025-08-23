#!/usr/bin/env node

/**
 * Navigation Test Suite
 * Tests all navigation links and routes in the application
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { getLogger, logStep } = require('./libs/test-utils/logger');

const logger = getLogger();

async function testNavigation() {
  logger.group('Navigation Test Suite');
  
  const browser = await puppeteer.launch({
    headless: process.env.HEADLESS !== 'false',
    slowMo: process.env.SLOW_MO ? parseInt(process.env.SLOW_MO) : 0,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  // Enable console logging only in verbose mode
  if (logger.isVerbose) {
    page.on('console', msg => logger.verbose('PAGE LOG:', { text: msg.text() }));
    page.on('pageerror', error => logger.error('PAGE ERROR:', { message: error.message }));
  }
  
  const results = {
    passed: [],
    failed: [],
    skipped: []
  };
  
  try {
    // 1. Go to homepage
    logStep('Navigating to homepage');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await page.screenshot({ path: 'test-results/homepage.png' });
    logger.success('Homepage loaded');
    
    // 2. Get all navigation links
    logStep('Finding navigation links');
    const navLinks = await page.evaluate(() => {
      const links = [];
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
    
    logger.info(`Found ${navLinks.length} navigation links`);
    if (logger.isVerbose) {
      navLinks.forEach(link => {
        logger.verbose(`Link: ${link.text}`, { href: link.href });
      });
    }
    
    // 3. Test each navigation link
    logStep('Testing each navigation link');
    
    for (const link of navLinks) {
      if (link.text && link.href.includes('localhost')) {
        logger.debug(`Testing: ${link.text} (${link.href})`);
        
        try {
          const response = await page.goto(link.href, { 
            waitUntil: 'networkidle0',
            timeout: 10000 
          });
          
          const status = response.status();
          const url = page.url();
          
          if (status === 404) {
            logger.failure(`404 Not Found: ${link.text}`);
            
            // Check what's actually on the page in verbose mode
            if (logger.isVerbose) {
              const pageContent = await page.evaluate(() => {
                return {
                  title: document.title,
                  h1: document.querySelector('h1')?.textContent,
                  bodyText: document.body.innerText.substring(0, 200)
                };
              });
              logger.verbose('Page content', pageContent);
            }
            
            results.failed.push({
              name: `${link.text} (${link.href})`,
              error: `404 Not Found`
            });
          } else if (status === 200) {
            logger.success(`${link.text} - Status ${status}`);
            results.passed.push(`${link.text} (${link.href})`);
          } else {
            logger.warn(`${link.text} - Status ${status}`);
            results.failed.push({
              name: `${link.text} (${link.href})`,
              error: `Status ${status}`
            });
          }
          
          // Go back to homepage for next test
          await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
          
        } catch (error) {
          logger.failure(`Error testing ${link.text}`, { error: error.message });
          results.failed.push({
            name: `${link.text} (${link.href})`,
            error: error.message
          });
        }
      }
    }
    
    // 4. Check file structure
    logStep('Checking app directory structure');
    
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
    
    logger.debug('Looking for page.tsx files');
    checkPaths.forEach(p => {
      const fullPath = path.join(appDir, p, 'page.tsx');
      const exists = fs.existsSync(fullPath);
      if (exists) {
        logger.success(`Found: ${p}/page.tsx`);
        results.passed.push(`File exists: ${p}/page.tsx`);
      } else {
        logger.failure(`Missing: ${p}/page.tsx`);
        results.failed.push({
          name: `File check: ${p}/page.tsx`,
          error: 'File not found'
        });
      }
    });
    
  } catch (error) {
    logger.error('Test failed', { error: error.message });
    results.failed.push({
      name: 'Navigation test',
      error: error.message
    });
  } finally {
    logger.summary(results);
    
    if (process.env.KEEP_BROWSER_OPEN === 'true') {
      logger.info('Browser will stay open for inspection');
    } else {
      await browser.close();
      logger.info('Browser closed');
    }
  }
  
  // Exit with appropriate code
  process.exit(results.failed.length > 0 ? 1 : 0);
}

testNavigation().catch(error => {
  logger.error('Test execution failed', error);
  process.exit(1);
});