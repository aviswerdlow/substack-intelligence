import { Page, Route } from '@playwright/test';
import { mockApiResponses, mockCompanies, mockDashboardStats } from '../fixtures/mock-data';

export class ApiMocker {
  constructor(private page: Page) {}

  /**
   * Setup all API mocks for testing
   */
  async setupAllMocks() {
    await this.mockIntelligenceAPI();
    await this.mockTriggerAPI();
    await this.mockHealthAPI();
    await this.mockCompaniesAPI();
    await this.mockDashboardAPI();
  }

  /**
   * Mock the intelligence API endpoint
   */
  async mockIntelligenceAPI() {
    await this.page.route('**/api/intelligence*', async (route: Route) => {
      const url = new URL(route.request().url());
      const days = url.searchParams.get('days') || '1';
      const limit = parseInt(url.searchParams.get('limit') || '100');
      
      // Filter companies based on days parameter
      const filteredCompanies = mockCompanies.slice(0, Math.min(limit, mockCompanies.length));
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            companies: filteredCompanies,
            summary: {
              totalCompanies: filteredCompanies.length,
              totalMentions: filteredCompanies.reduce((sum, c) => sum + c.totalMentions, 0),
              averageMentionsPerCompany: (filteredCompanies.reduce((sum, c) => sum + c.totalMentions, 0) / filteredCompanies.length).toFixed(1),
              timeRange: days === '1' ? 'Today' : `Last ${days} days`
            }
          }
        })
      });
    });
  }

  /**
   * Mock the trigger pipeline API
   */
  async mockTriggerAPI() {
    await this.page.route('**/api/trigger/intelligence', async (route: Route) => {
      // Simulate a delay for realistic behavior
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockApiResponses['/api/trigger/intelligence'])
      });
    });
  }

  /**
   * Mock the health check API
   */
  async mockHealthAPI() {
    await this.page.route('**/api/health', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockApiResponses['/api/health'])
      });
    });
  }

  /**
   * Mock the companies API
   */
  async mockCompaniesAPI() {
    await this.page.route('**/api/companies*', async (route: Route) => {
      const url = route.request().url();
      
      // Handle different company endpoints
      if (url.includes('/enrich')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              enriched: true,
              additionalData: {
                employees: 500,
                revenue: '$100M',
                industry: 'Technology'
              }
            }
          })
        });
      } else if (url.includes('/similar')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              similarCompanies: mockCompanies.slice(1, 4)
            }
          })
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockApiResponses['/api/companies'])
        });
      }
    });
  }

  /**
   * Mock dashboard-related APIs
   */
  async mockDashboardAPI() {
    // Mock recent companies endpoint
    await this.page.route('**/api/dashboard/recent-companies', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: mockCompanies.slice(0, 5)
        })
      });
    });

    // Mock dashboard stats
    await this.page.route('**/api/dashboard/stats', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: mockDashboardStats
        })
      });
    });
  }

  /**
   * Mock test extraction API
   */
  async mockTestExtractAPI() {
    await this.page.route('**/api/test/extract', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockApiResponses['/api/test/extract'])
      });
    });
  }

  /**
   * Mock error responses for testing error handling
   */
  async mockErrorResponses() {
    await this.page.route('**/api/trigger/intelligence', async (route: Route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Internal server error - test error'
        })
      });
    });
  }

  /**
   * Mock slow responses for testing timeouts
   */
  async mockSlowResponses(delayMs: number = 5000) {
    await this.page.route('**/api/**', async (route: Route) => {
      await new Promise(resolve => setTimeout(resolve, delayMs));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, delayed: true })
      });
    });
  }

  /**
   * Mock authentication responses
   */
  async mockAuthResponses() {
    await this.page.route('**/api/auth/**', async (route: Route) => {
      const url = route.request().url();
      
      if (url.includes('/session')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: {
              id: 'user_test_123',
              email: 'test@substackintel.com',
              name: 'Test User'
            },
            session: {
              id: 'sess_test_123',
              expires: new Date(Date.now() + 86400000).toISOString()
            }
          })
        });
      } else if (url.includes('/signout')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      } else {
        await route.continue();
      }
    });
  }

  /**
   * Clear all mocks
   */
  async clearMocks() {
    await this.page.unroute('**/*');
  }
}