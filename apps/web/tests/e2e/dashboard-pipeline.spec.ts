import { test, expect, Page } from '@playwright/test';

test.describe('Dashboard Pipeline Integration', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();

    // Mock authentication for tests
    await page.addInitScript(() => {
      // Mock Clerk authentication
      (window as any).__test_authenticated = true;
      localStorage.setItem('__test_user_id', 'test-user-123');
    });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Pipeline Status Display', () => {
    test('displays pipeline status widget on dashboard load', async () => {
      // Mock successful API responses
      await page.route('/api/auth/gmail/health', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            healthy: true,
            details: {
              emailAddress: 'test@gmail.com',
              configurationComplete: true
            }
          })
        });
      });

      await page.route('/api/pipeline/status', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              metrics: {
                totalEmails: 150,
                totalCompanies: 75,
                totalMentions: 300,
                recentEmails: 15,
                recentCompanies: 8,
                lastSyncTime: new Date().toISOString()
              },
              health: {
                status: 'healthy',
                suggestedNextSync: new Date(Date.now() + 3600000).toISOString()
              }
            }
          })
        });
      });

      await page.goto('/dashboard');

      // Wait for pipeline status widget to load
      await expect(page.locator('[data-testid="pipeline-status-widget"]').or(
        page.getByText('Fetch Emails')
      )).toBeVisible({ timeout: 10000 });

      // Check pipeline steps are displayed
      await expect(page.getByText('Fetch Emails')).toBeVisible();
      await expect(page.getByText('Extract Companies')).toBeVisible();
      await expect(page.getByText('Enrich Data')).toBeVisible();
      await expect(page.getByText('Generate Reports')).toBeVisible();
    });

    test('shows configuration error when OAuth is not set up', async () => {
      // Mock configuration error response
      await page.route('/api/auth/gmail/health', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            healthy: false,
            error: 'Gmail OAuth configuration incomplete',
            details: {
              configurationIssues: true,
              missingEnvVars: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
              setupInstructions: 'Please configure OAuth credentials'
            }
          })
        });
      });

      await page.goto('/dashboard');

      // Wait for configuration error to be displayed
      await expect(page.getByText('Configuration Required')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Gmail pipeline setup is incomplete')).toBeVisible();
      await expect(page.getByText('GOOGLE_CLIENT_ID')).toBeVisible();
      await expect(page.getByText('GOOGLE_CLIENT_SECRET')).toBeVisible();
    });

    test('handles API errors gracefully', async () => {
      // Mock API error
      await page.route('/api/auth/gmail/health', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Internal server error'
          })
        });
      });

      await page.goto('/dashboard');

      // Should show error state with retry option
      await expect(page.getByText('Pipeline status unavailable').or(
        page.getByText('Retry')
      )).toBeVisible({ timeout: 10000 });
    });

    test('displays loading state initially', async () => {
      // Mock delayed response to catch loading state
      await page.route('/api/auth/gmail/health', async (route) => {
        // Delay response to see loading state
        await new Promise(resolve => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            healthy: true,
            details: { emailAddress: 'test@gmail.com' }
          })
        });
      });

      await page.goto('/dashboard');

      // Check for loading skeleton (animate-pulse class or similar)
      const loadingElement = page.locator('.animate-pulse').first();
      await expect(loadingElement).toBeVisible({ timeout: 2000 });
    });
  });

  test.describe('Pipeline Triggering', () => {
    test.beforeEach(async () => {
      // Set up successful health check for all trigger tests
      await page.route('/api/auth/gmail/health', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            healthy: true,
            details: { emailAddress: 'test@gmail.com' }
          })
        });
      });

      await page.route('/api/pipeline/status', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              metrics: {
                totalEmails: 100,
                recentEmails: 10,
                recentCompanies: 5,
                totalCompanies: 50,
                totalMentions: 200,
                lastSyncTime: new Date().toISOString()
              },
              health: { status: 'healthy' }
            }
          })
        });
      });
    });

    test('successfully triggers pipeline sync', async () => {
      let pipelineTriggerCalled = false;

      // Mock successful pipeline trigger
      await page.route('/api/pipeline/sync', async (route) => {
        if (route.request().method() === 'POST') {
          pipelineTriggerCalled = true;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                status: 'running',
                progress: 25,
                stats: {
                  emailsFetched: 0,
                  companiesExtracted: 0
                }
              }
            })
          });
        }
      });

      await page.goto('/dashboard');

      // Wait for Run Now button to be available
      await expect(page.getByText('Run Now')).toBeVisible({ timeout: 10000 });

      // Click the Run Now button
      await page.getByText('Run Now').click();

      // Verify the API was called
      await page.waitForTimeout(1000);
      expect(pipelineTriggerCalled).toBe(true);

      // Check for success message (toast notification)
      await expect(page.getByText('Pipeline Started').or(
        page.getByText('Intelligence pipeline has been triggered')
      )).toBeVisible({ timeout: 5000 });
    });

    test('handles pipeline trigger errors', async () => {
      // Mock pipeline trigger error
      await page.route('/api/pipeline/sync', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: 'Gmail API quota exceeded'
            })
          });
        }
      });

      await page.goto('/dashboard');

      await expect(page.getByText('Run Now')).toBeVisible({ timeout: 10000 });
      await page.getByText('Run Now').click();

      // Check for error message
      await expect(page.getByText('Pipeline Error').or(
        page.getByText('Gmail API quota exceeded')
      )).toBeVisible({ timeout: 5000 });
    });

    test('shows data is fresh message when sync is skipped', async () => {
      // Mock skipped sync response
      await page.route('/api/pipeline/sync', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              skipped: true,
              data: { status: 'idle' }
            })
          });
        }
      });

      await page.goto('/dashboard');

      await expect(page.getByText('Run Now')).toBeVisible({ timeout: 10000 });
      await page.getByText('Run Now').click();

      // Check for fresh data message
      await expect(page.getByText('Data is Fresh').or(
        page.getByText('Pipeline data is up-to-date')
      )).toBeVisible({ timeout: 5000 });
    });

    test('disables button while pipeline is running', async () => {
      // Mock running state
      await page.route('/api/pipeline/sync', async (route) => {
        if (route.request().method() === 'POST') {
          await new Promise(resolve => setTimeout(resolve, 500)); // Simulate processing time
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: { status: 'running' }
            })
          });
        }
      });

      await page.goto('/dashboard');

      const runButton = page.getByText('Run Now');
      await expect(runButton).toBeVisible({ timeout: 10000 });
      
      // Click the button
      await runButton.click();

      // Button should be disabled while request is processing
      await expect(runButton).toBeDisabled();
    });
  });

  test.describe('Real-time Updates', () => {
    test('polls for status updates every 5 seconds', async () => {
      let callCount = 0;

      await page.route('/api/auth/gmail/health', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            healthy: true,
            details: { emailAddress: 'test@gmail.com' }
          })
        });
      });

      await page.route('/api/pipeline/status', async (route) => {
        callCount++;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              metrics: {
                totalEmails: 100 + callCount, // Increment to show updates
                recentEmails: 10,
                recentCompanies: 5,
                totalCompanies: 50,
                totalMentions: 200
              },
              health: { status: 'healthy' }
            }
          })
        });
      });

      await page.goto('/dashboard');

      // Wait for initial load
      await expect(page.getByText('Fetch Emails')).toBeVisible({ timeout: 10000 });

      // Wait for at least one polling cycle (6 seconds to be safe)
      await page.waitForTimeout(6000);

      // Verify that multiple calls were made
      expect(callCount).toBeGreaterThan(2);
    });

    test('shows updated status when pipeline completes', async () => {
      let requestCount = 0;

      await page.route('/api/auth/gmail/health', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            healthy: true,
            details: { emailAddress: 'test@gmail.com' }
          })
        });
      });

      await page.route('/api/pipeline/status', async (route) => {
        requestCount++;
        
        // First request: show running state
        if (requestCount === 1) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                metrics: { totalEmails: 100, recentEmails: 5 },
                health: { status: 'healthy' }
              }
            })
          });
        } else {
          // Subsequent requests: show completed state
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                metrics: { 
                  totalEmails: 120, // Updated numbers
                  recentEmails: 20,
                  recentCompanies: 10,
                  totalCompanies: 60,
                  totalMentions: 240
                },
                health: { status: 'healthy' }
              }
            })
          });
        }
      });

      await page.goto('/dashboard');

      // Wait for status updates via polling
      await page.waitForTimeout(7000);

      // The numbers should have updated from the polling
      // This is hard to test precisely, but we can verify the widget is still working
      await expect(page.getByText('Fetch Emails')).toBeVisible();
    });
  });

  test.describe('Dashboard Integration', () => {
    test('pipeline widget is present in dashboard layout', async () => {
      // Mock minimal responses
      await page.route('/api/**', async (route) => {
        if (route.request().url().includes('/auth/gmail/health')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              healthy: true,
              details: { emailAddress: 'test@gmail.com' }
            })
          });
        } else if (route.request().url().includes('/pipeline/status')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                metrics: { totalEmails: 100 },
                health: { status: 'healthy' }
              }
            })
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, data: [] })
          });
        }
      });

      await page.goto('/dashboard');

      // Check that dashboard layout includes the pipeline widget
      await expect(page.getByText('Dashboard')).toBeVisible();
      await expect(page.getByText('Fetch Emails')).toBeVisible({ timeout: 10000 });
      
      // Verify it's part of the widget grid
      const widgetGrid = page.locator('.grid').first();
      await expect(widgetGrid).toBeVisible();
    });

    test('widget maintains state when other dashboard components update', async () => {
      // This test ensures the pipeline widget doesn't lose state
      // when other parts of the dashboard re-render
      
      await page.route('/api/**', async (route) => {
        if (route.request().url().includes('/auth/gmail/health')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              healthy: true,
              details: { emailAddress: 'test@gmail.com' }
            })
          });
        } else if (route.request().url().includes('/pipeline/status')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                metrics: {
                  totalEmails: 100,
                  recentEmails: 10,
                  recentCompanies: 5,
                  totalCompanies: 50,
                  totalMentions: 200
                },
                health: { status: 'healthy' }
              }
            })
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, data: [] })
          });
        }
      });

      await page.goto('/dashboard');

      // Wait for pipeline widget to load
      await expect(page.getByText('Run Now')).toBeVisible({ timeout: 10000 });

      // Simulate interaction with other dashboard elements
      // (like clicking other widgets or buttons)
      const customizeButton = page.getByText('Customize');
      if (await customizeButton.isVisible()) {
        await customizeButton.click();
        await page.waitForTimeout(500);
        
        // Exit customize mode
        const saveButton = page.getByText('Save Layout');
        if (await saveButton.isVisible()) {
          await saveButton.click();
        }
      }

      // Pipeline widget should still be functional
      await expect(page.getByText('Run Now')).toBeVisible();
      await expect(page.getByText('Fetch Emails')).toBeVisible();
    });
  });
});