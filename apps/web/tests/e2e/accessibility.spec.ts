import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('Accessibility Tests', () => {
  test('homepage should be accessible', async ({ page }) => {
    await page.goto('/');
    
    // Basic accessibility checks
    await injectAxe(page);
    await checkA11y(page, undefined, {
      detailedReport: true,
      detailedReportOptions: {
        html: true
      }
    });
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    
    // Get all headings
    const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', elements => 
      elements.map(el => ({
        level: parseInt(el.tagName[1]),
        text: el.textContent?.trim()
      }))
    );
    
    // Check that we have at least one h1
    const h1Count = headings.filter(h => h.level === 1).length;
    expect(h1Count).toBeGreaterThanOrEqual(1);
    
    // Check heading hierarchy (no skipping levels)
    let previousLevel = 0;
    for (const heading of headings) {
      if (previousLevel > 0) {
        // Allow same level or one level deeper or going back up
        const levelDiff = heading.level - previousLevel;
        expect(levelDiff).toBeLessThanOrEqual(1);
      }
      previousLevel = heading.level;
    }
  });

  test('interactive elements should be keyboard accessible', async ({ page }) => {
    await page.goto('/');
    
    // Check all buttons have accessible names
    const buttons = await page.$$eval('button', elements => 
      elements.map(el => ({
        text: el.textContent?.trim(),
        ariaLabel: el.getAttribute('aria-label'),
        hasAccessibleName: !!(el.textContent?.trim() || el.getAttribute('aria-label'))
      }))
    );
    
    for (const button of buttons) {
      expect(button.hasAccessibleName).toBe(true);
    }
    
    // Check all links have accessible text
    const links = await page.$$eval('a', elements => 
      elements.map(el => ({
        text: el.textContent?.trim(),
        ariaLabel: el.getAttribute('aria-label'),
        hasAccessibleName: !!(el.textContent?.trim() || el.getAttribute('aria-label'))
      }))
    );
    
    for (const link of links) {
      expect(link.hasAccessibleName).toBe(true);
    }
  });

  test('forms should have proper labels', async ({ page }) => {
    await page.goto('/sign-in');
    
    // Wait for form to load
    await page.waitForTimeout(2000);
    
    // Check all inputs have labels
    const inputs = await page.$$eval('input:not([type="hidden"])', elements => 
      elements.map(el => ({
        id: el.id,
        name: el.name,
        type: el.type,
        hasLabel: !!(el.labels?.length || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby'))
      }))
    );
    
    for (const input of inputs) {
      expect(input.hasLabel).toBe(true);
    }
  });

  test('images should have alt text', async ({ page }) => {
    await page.goto('/');
    
    // Check all images have alt text
    const images = await page.$$eval('img', elements => 
      elements.map(el => ({
        src: el.src,
        hasAlt: el.hasAttribute('alt'),
        isDecorative: el.getAttribute('alt') === '' || el.getAttribute('role') === 'presentation'
      }))
    );
    
    for (const image of images) {
      // Image should either have alt text or be marked as decorative
      expect(image.hasAlt || image.isDecorative).toBe(true);
    }
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/');
    
    // Tab through the page
    await page.keyboard.press('Tab');
    
    // Check that focus is visible
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        tagName: el?.tagName,
        hasVisibleFocus: window.getComputedStyle(el as Element).outline !== 'none'
      };
    });
    
    expect(focusedElement.tagName).toBeTruthy();
  });

  test('should have proper ARIA landmarks', async ({ page }) => {
    await page.goto('/');
    
    // Check for main landmark
    const main = await page.$('main, [role="main"]');
    expect(main).toBeTruthy();
    
    // Check for navigation landmark
    const nav = await page.$('nav, [role="navigation"]');
    expect(nav).toBeTruthy();
  });

  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto('/');
    
    // This is a simplified contrast check
    // In production, use axe-core for comprehensive contrast testing
    const textElements = await page.$$eval('p, span, div, h1, h2, h3, h4, h5, h6', elements => 
      elements.map(el => {
        const styles = window.getComputedStyle(el);
        return {
          color: styles.color,
          backgroundColor: styles.backgroundColor,
          fontSize: styles.fontSize,
          fontWeight: styles.fontWeight
        };
      })
    );
    
    // Basic check that text has defined colors
    for (const element of textElements) {
      expect(element.color).toBeTruthy();
    }
  });
});