import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test('should meet Core Web Vitals thresholds', async ({ page }) => {
    // Navigate to the page
    await page.goto('/');
    
    // Measure Core Web Vitals
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        let fcp = 0;
        let lcp = 0;
        let cls = 0;
        let fid = 0;
        let ttfb = 0;
        
        // First Contentful Paint
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          for (const entry of entries) {
            if (entry.name === 'first-contentful-paint') {
              fcp = entry.startTime;
            }
          }
        }).observe({ entryTypes: ['paint'] });
        
        // Largest Contentful Paint
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          lcp = lastEntry.renderTime || lastEntry.loadTime;
        }).observe({ entryTypes: ['largest-contentful-paint'] });
        
        // Cumulative Layout Shift
        let clsValue = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
          cls = clsValue;
        }).observe({ entryTypes: ['layout-shift'] });
        
        // Time to First Byte
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        ttfb = navigation.responseStart - navigation.requestStart;
        
        // Wait a bit for metrics to be collected
        setTimeout(() => {
          resolve({
            fcp,
            lcp,
            cls,
            ttfb,
            fid
          });
        }, 3000);
      });
    });
    
    // Assert Core Web Vitals thresholds
    expect(metrics.fcp).toBeLessThan(1800); // FCP < 1.8s is good
    expect(metrics.lcp).toBeLessThan(2500); // LCP < 2.5s is good
    expect(metrics.cls).toBeLessThan(0.1); // CLS < 0.1 is good
    expect(metrics.ttfb).toBeLessThan(800); // TTFB < 0.8s is good
  });

  test('should not have memory leaks', async ({ page }) => {
    await page.goto('/');
    
    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });
    
    // Perform some interactions
    for (let i = 0; i < 5; i++) {
      await page.reload();
      await page.waitForTimeout(500);
    }
    
    // Force garbage collection if available
    await page.evaluate(() => {
      if (global.gc) {
        global.gc();
      }
    });
    
    // Get final memory usage
    const finalMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });
    
    // Memory shouldn't grow excessively (allow 50% growth)
    if (initialMemory > 0 && finalMemory > 0) {
      const memoryGrowth = (finalMemory - initialMemory) / initialMemory;
      expect(memoryGrowth).toBeLessThan(0.5);
    }
  });

  test('should have optimized bundle size', async ({ page }) => {
    const response = await page.goto('/');
    
    // Get all JavaScript resources
    const jsResources = await page.evaluate(() => {
      return performance.getEntriesByType('resource')
        .filter(entry => entry.name.includes('.js'))
        .map(entry => ({
          name: entry.name,
          size: (entry as any).transferSize || 0,
          duration: entry.duration
        }));
    });
    
    // Calculate total JS bundle size
    const totalJsSize = jsResources.reduce((sum, resource) => sum + resource.size, 0);
    
    // Total JS should be under 500KB for initial load
    expect(totalJsSize).toBeLessThan(500 * 1024);
    
    // No single JS file should be over 200KB
    for (const resource of jsResources) {
      expect(resource.size).toBeLessThan(200 * 1024);
    }
  });

  test('should have fast API response times', async ({ request }) => {
    const endpoints = [
      '/api/health',
      '/api/monitoring/health'
    ];
    
    for (const endpoint of endpoints) {
      const startTime = Date.now();
      const response = await request.get(endpoint);
      const responseTime = Date.now() - startTime;
      
      // API should respond within 1 second
      expect(responseTime).toBeLessThan(1000);
      
      // Check response status
      expect(response.status()).toBeLessThanOrEqual(400);
    }
  });

  test('should handle concurrent requests efficiently', async ({ request }) => {
    const concurrentRequests = 10;
    const requests = [];
    
    const startTime = Date.now();
    
    // Make concurrent requests
    for (let i = 0; i < concurrentRequests; i++) {
      requests.push(request.get('/api/health'));
    }
    
    const responses = await Promise.all(requests);
    const totalTime = Date.now() - startTime;
    
    // All requests should succeed
    for (const response of responses) {
      expect(response.status()).toBe(200);
    }
    
    // Concurrent requests should complete within reasonable time
    expect(totalTime).toBeLessThan(3000);
  });

  test('should cache static assets properly', async ({ page }) => {
    await page.goto('/');
    
    // Get all static resources
    const resources = await page.evaluate(() => {
      return performance.getEntriesByType('resource')
        .filter(entry => 
          entry.name.includes('.css') || 
          entry.name.includes('.js') ||
          entry.name.includes('.png') ||
          entry.name.includes('.jpg') ||
          entry.name.includes('.svg')
        )
        .map(entry => ({
          name: entry.name,
          duration: entry.duration
        }));
    });
    
    // Second visit should use cache
    await page.reload();
    
    const cachedResources = await page.evaluate(() => {
      return performance.getEntriesByType('resource')
        .filter(entry => 
          entry.name.includes('.css') || 
          entry.name.includes('.js') ||
          entry.name.includes('.png') ||
          entry.name.includes('.jpg') ||
          entry.name.includes('.svg')
        )
        .map(entry => ({
          name: entry.name,
          duration: entry.duration,
          transferSize: (entry as any).transferSize
        }));
    });
    
    // Cached resources should load faster
    for (const cached of cachedResources) {
      const original = resources.find(r => r.name === cached.name);
      if (original && cached.transferSize === 0) {
        // Resource was cached (transferSize is 0 for cached resources)
        expect(cached.duration).toBeLessThanOrEqual(original.duration);
      }
    }
  });
});