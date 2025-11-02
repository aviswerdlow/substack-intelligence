import { test, expect } from '@playwright/test';
import { TestUtils, ButtonTestResult } from './helpers/test-utils';

// Use saved authentication state
test.use({ storageState: 'nextauth-auth-state.json' });

test.describe('Intelligence Page - Complete Feature Testing', () => {
  let testUtils: TestUtils;
  let allTestResults: ButtonTestResult[] = [];

  test.beforeEach(async ({ page }) => {
    testUtils = new TestUtils(page);
    await page.goto('http://localhost:3000/intelligence');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Allow data to load
  });

  test.afterAll(async () => {
    // Generate comprehensive report
    if (allTestResults.length > 0) {
      const report = await testUtils.generateReport(allTestResults);
      console.log('\n=== INTELLIGENCE PAGE TEST REPORT ===\n');
      console.log(report);
    }
  });

  test('should test time range dropdown selection', async ({ page }) => {
    console.log('\n🔍 Testing time range dropdown...\n');
    
    const timeRanges = ['Today', '3 Days', '7 Days', '30 Days'];
    
    for (const range of timeRanges) {
      console.log(`\nSelecting time range: ${range}`);
      
      // Click dropdown
      const dropdown = await page.locator('[role="combobox"]').first();
      await dropdown.click();
      
      // Select option
      await page.locator(`text="${range}"`).click();
      
      // Wait for data to reload
      await page.waitForTimeout(2000);
      
      // Verify selection
      const selectedValue = await dropdown.textContent();
      if (selectedValue?.includes(range)) {
        console.log(`✅ Successfully selected: ${range}`);
        
        // Check if data updated
        const timeRangeDisplay = await page.locator('text="Time Range"').locator('..').locator('[class*="text-2xl"]').first();
        const displayText = await timeRangeDisplay.textContent().catch(() => '');
        console.log(`  Time range display: ${displayText}`);
      } else {
        console.log(`❌ Failed to select: ${range}`);
      }
      
      await page.waitForTimeout(1000);
    }
  });

  test('should test Refresh button', async ({ page }) => {
    console.log('\n🔍 Testing Refresh button...\n');
    
    const refreshResult = await testUtils.clickAndVerify(
      'button:has-text("Refresh")',
      {
        waitForResponse: '/api/intelligence',
        screenshot: true,
        timeout: 10000
      }
    );
    
    allTestResults.push(refreshResult);
    
    if (refreshResult.success) {
      console.log('✅ Data refreshed successfully');
      
      // Check if summary stats updated
      const statsCards = await page.locator('[class*="text-2xl"]').all();
      for (let i = 0; i < Math.min(4, statsCards.length); i++) {
        const value = await statsCards[i].textContent();
        console.log(`  Stat ${i + 1}: ${value}`);
      }
    }
  });

  test('should test search functionality', async ({ page }) => {
    console.log('\n🔍 Testing search input...\n');
    
    const searchInput = await page.locator('input[placeholder*="Search"]').first();
    const searchTerms = ['tech', 'startup', 'AI', 'invalid-search-xyz'];
    
    for (const term of searchTerms) {
      console.log(`\nSearching for: "${term}"`);
      
      // Clear and type search term
      await searchInput.clear();
      await searchInput.fill(term);
      
      // Wait for results to filter
      await page.waitForTimeout(1500);
      
      // Count results
      const companyCards = await page.locator('[class*="card"]').filter({ hasText: /^(?!.*Summary).*Company/i }).count();
      console.log(`  Results found: ${companyCards}`);
      
      if (companyCards === 0) {
        // Check for empty state
        const emptyState = await page.locator('text="No Companies Found"').isVisible().catch(() => false);
        console.log(`  ${emptyState ? '✅' : '⚠️'} Empty state displayed`);
      } else {
        console.log(`  ✅ Found ${companyCards} companies matching "${term}"`);
      }
    }
    
    // Clear search
    await searchInput.clear();
    console.log('\n✅ Search cleared');
  });

  test('should test funding filter dropdown', async ({ page }) => {
    console.log('\n🔍 Testing funding filter...\n');
    
    const fundingOptions = [
      'All Funding',
      'Unknown',
      'Bootstrapped',
      'Seed',
      'Series A',
      'Series B',
      'Later Stage'
    ];
    
    // Find funding filter dropdown
    const filterDropdown = await page.locator('[role="combobox"]').nth(1);
    
    for (const option of fundingOptions) {
      console.log(`\nSelecting funding filter: ${option}`);
      
      // Click dropdown
      await filterDropdown.click();
      await page.waitForTimeout(500);
      
      // Select option
      await page.locator(`text="${option}"`).last().click();
      await page.waitForTimeout(1500);
      
      // Count filtered results
      const companyCards = await page.locator('[class*="card"]').filter({ hasText: /^(?!.*Summary).*Company/i }).count();
      console.log(`  Companies with ${option}: ${companyCards}`);
      
      // Verify filter is applied
      const dropdownText = await filterDropdown.textContent();
      if (dropdownText?.includes(option)) {
        console.log(`  ✅ Filter applied: ${option}`);
      } else {
        console.log(`  ❌ Filter not applied properly`);
      }
    }
  });

  test('should test company card interactions', async ({ page }) => {
    console.log('\n🔍 Testing company card interactions...\n');
    
    // Wait for companies to load
    await page.waitForTimeout(2000);
    
    // Get all company cards
    const companyCards = await page.locator('[class*="card"]').filter({ hasText: /^(?!.*Summary)(?!.*System)(?!.*Time Range).*/ }).all();
    
    console.log(`Found ${companyCards.length} company cards`);
    
    if (companyCards.length === 0) {
      console.log('ℹ️ No companies to test - checking empty state');
      const emptyState = await page.locator('text="No Companies Found"').isVisible();
      console.log(`Empty state visible: ${emptyState}`);
      return;
    }
    
    // Test first 3 company cards
    for (let i = 0; i < Math.min(3, companyCards.length); i++) {
      const card = companyCards[i];
      console.log(`\n📍 Testing company card ${i + 1}`);
      
      // Get company name
      const companyName = await card.locator('[class*="text-xl"]').first().textContent().catch(() => 'Unknown');
      console.log(`  Company: ${companyName}`);
      
      // Check for external link
      const externalLink = await card.locator('a[href^="http"]').first();
      const hasLink = await externalLink.isVisible().catch(() => false);
      
      if (hasLink) {
        const href = await externalLink.getAttribute('href');
        console.log(`  ✅ External link found: ${href}`);
        
        // Test clicking the link (but don't navigate)
        const linkIcon = await card.locator('[class*="ExternalLink"]').first();
        const iconVisible = await linkIcon.isVisible().catch(() => false);
        console.log(`  ${iconVisible ? '✅' : '⚠️'} External link icon visible`);
      }
      
      // Check for badges
      const badges = await card.locator('[class*="badge"]').all();
      console.log(`  Badges found: ${badges.length}`);
      
      for (let j = 0; j < badges.length; j++) {
        const badgeText = await badges[j].textContent();
        console.log(`    Badge ${j + 1}: ${badgeText}`);
      }
      
      // Check for "View more mentions" button
      const viewMoreButton = await card.locator('button:has-text("View")').first();
      const hasViewMore = await viewMoreButton.isVisible().catch(() => false);
      
      if (hasViewMore) {
        console.log('  📍 Testing "View more mentions" button');
        
        const viewMoreText = await viewMoreButton.textContent();
        console.log(`    Button text: ${viewMoreText}`);
        
        // Click to expand
        await viewMoreButton.click();
        await page.waitForTimeout(1000);
        
        console.log('    ✅ Clicked view more button');
        
        // Check if more content appeared
        const mentionBlocks = await card.locator('[class*="border-l"]').count();
        console.log(`    Mention blocks visible: ${mentionBlocks}`);
      }
      
      // Check sentiment and confidence displays
      const sentimentBadges = await card.locator('text=/positive|negative|neutral/i').all();
      console.log(`  Sentiment badges: ${sentimentBadges.length}`);
      
      const confidenceTexts = await card.locator('text=/\\d+% confidence/').all();
      console.log(`  Confidence indicators: ${confidenceTexts.length}`);
    }
  });

  test('should test combined search and filter', async ({ page }) => {
    console.log('\n🔍 Testing combined search and filter...\n');
    
    // Set search term
    const searchInput = await page.locator('input[placeholder*="Search"]').first();
    await searchInput.fill('tech');
    
    // Set funding filter
    const filterDropdown = await page.locator('[role="combobox"]').nth(1);
    await filterDropdown.click();
    await page.locator('text="Seed"').last().click();
    
    await page.waitForTimeout(2000);
    
    // Count results with both filters
    const filteredResults = await page.locator('[class*="card"]').filter({ hasText: /^(?!.*Summary).*Company/i }).count();
    console.log(`Results with search="tech" AND funding="Seed": ${filteredResults}`);
    
    // Clear filters
    await searchInput.clear();
    await filterDropdown.click();
    await page.locator('text="All Funding"').last().click();
    
    console.log('✅ Filters cleared');
  });

  test('should test all summary stat cards', async ({ page }) => {
    console.log('\n🔍 Testing summary statistics cards...\n');
    
    const statLabels = [
      'Companies Found',
      'Total Mentions',
      'Avg per Company',
      'Time Range'
    ];
    
    for (const label of statLabels) {
      const labelElement = await page.locator(`text="${label}"`).first();
      const isVisible = await labelElement.isVisible().catch(() => false);
      
      if (isVisible) {
        // Get the value
        const valueElement = await labelElement.locator('..').locator('[class*="text-2xl"]').first();
        const value = await valueElement.textContent().catch(() => 'N/A');
        
        console.log(`✅ ${label}: ${value}`);
      } else {
        console.log(`⚠️ ${label}: Not found`);
      }
    }
  });

  test('should capture intelligence page visual state', async ({ page }) => {
    console.log('\n📸 Capturing intelligence page visual state...\n');
    
    // Full page screenshot
    await page.screenshot({
      path: 'test-results/screenshots/intelligence-full.png',
      fullPage: true
    });
    console.log('✅ Full page screenshot captured');
    
    // Screenshot with search active
    const searchInput = await page.locator('input[placeholder*="Search"]').first();
    await searchInput.fill('example search');
    await page.screenshot({
      path: 'test-results/screenshots/intelligence-search-active.png',
      fullPage: true
    });
    console.log('✅ Search active screenshot captured');
    
    // Screenshot with filter dropdown open
    await searchInput.clear();
    const filterDropdown = await page.locator('[role="combobox"]').nth(1);
    await filterDropdown.click();
    await page.screenshot({
      path: 'test-results/screenshots/intelligence-filter-open.png',
      fullPage: true
    });
    console.log('✅ Filter dropdown screenshot captured');
  });

  test('should test all interactive elements systematically', async ({ page }) => {
    console.log('\n🔍 Testing ALL interactive elements on intelligence page...\n');
    
    // Find all buttons
    const allButtons = await page.locator('button').all();
    console.log(`Total buttons found: ${allButtons.length}`);
    
    const processedButtons = new Set<string>();
    
    for (let i = 0; i < allButtons.length; i++) {
      const button = allButtons[i];
      const isVisible = await button.isVisible().catch(() => false);
      
      if (!isVisible) continue;
      
      const text = await button.textContent() || '';
      const trimmedText = text.trim();
      
      // Skip if already processed
      if (processedButtons.has(trimmedText)) continue;
      processedButtons.add(trimmedText);
      
      console.log(`\n📍 Button ${i + 1}: "${trimmedText}"`);
      
      // Determine action type
      if (trimmedText.includes('Refresh')) {
        console.log('  Type: Data refresh');
      } else if (trimmedText.includes('View')) {
        console.log('  Type: Expand/collapse');
      } else if (trimmedText === '' || trimmedText.length < 3) {
        console.log('  Type: Icon button or dropdown');
      } else {
        console.log('  Type: Other action');
      }
    }
    
    // Find all dropdowns
    const dropdowns = await page.locator('[role="combobox"]').all();
    console.log(`\nTotal dropdowns found: ${dropdowns.length}`);
    
    // Find all input fields
    const inputs = await page.locator('input').all();
    console.log(`Total input fields found: ${inputs.length}`);
    
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const placeholder = await input.getAttribute('placeholder') || '';
      const type = await input.getAttribute('type') || 'text';
      console.log(`  Input ${i + 1}: type="${type}", placeholder="${placeholder}"`);
    }
  });

  test('should generate comprehensive intelligence page summary', async ({ page }) => {
    console.log('\n📊 Generating intelligence page test summary...\n');
    
    const summary = {
      totalButtons: await page.locator('button').count(),
      totalDropdowns: await page.locator('[role="combobox"]').count(),
      totalInputs: await page.locator('input').count(),
      totalCompanyCards: await page.locator('[class*="card"]').filter({ hasText: /^(?!.*Summary).*Company/i }).count(),
      totalBadges: await page.locator('[class*="badge"]').count(),
      totalExternalLinks: await page.locator('a[href^="http"]').count(),
      testResults: allTestResults.length,
      successfulTests: allTestResults.filter(r => r.success).length,
      failedTests: allTestResults.filter(r => !r.success).length,
      timestamp: new Date().toISOString()
    };
    
    console.log('Intelligence Page Test Summary:');
    console.log('==============================');
    console.log(`Total Buttons: ${summary.totalButtons}`);
    console.log(`Total Dropdowns: ${summary.totalDropdowns}`);
    console.log(`Total Inputs: ${summary.totalInputs}`);
    console.log(`Company Cards: ${summary.totalCompanyCards}`);
    console.log(`Badges: ${summary.totalBadges}`);
    console.log(`External Links: ${summary.totalExternalLinks}`);
    console.log(`Tests Run: ${summary.testResults}`);
    console.log(`Successful: ${summary.successfulTests} ✅`);
    console.log(`Failed: ${summary.failedTests} ❌`);
    if (summary.testResults > 0) {
      console.log(`Success Rate: ${((summary.successfulTests / summary.testResults) * 100).toFixed(1)}%`);
    }
    console.log(`Timestamp: ${summary.timestamp}`);
    
    // Save summary
    const fs = require('fs');
    fs.writeFileSync(
      'test-results/intelligence-summary.json',
      JSON.stringify(summary, null, 2)
    );
    
    console.log('\n✅ Summary saved to test-results/intelligence-summary.json');
  });
});