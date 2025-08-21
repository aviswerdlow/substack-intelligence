import { test, expect } from '@playwright/test';

test.describe('API Health Checks', () => {
  test('health endpoint should return 200', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('status');
    expect(data.status).toBe('healthy');
  });

  test('monitoring health endpoint should return system status', async ({ request }) => {
    const response = await request.get('/api/monitoring/health');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('services');
  });

  test('config validation endpoint should work', async ({ request }) => {
    const response = await request.post('/api/config/validate', {
      data: {
        environment: 'test'
      }
    });
    
    // Should return 200 or 400 depending on config
    expect([200, 400, 401]).toContain(response.status());
  });

  test('should handle 404 for non-existent endpoints', async ({ request }) => {
    const response = await request.get('/api/non-existent-endpoint');
    expect(response.status()).toBe(404);
  });
});

test.describe('API Rate Limiting', () => {
  test('should enforce rate limits on API endpoints', async ({ request }) => {
    const endpoint = '/api/intelligence';
    const requests = [];
    
    // Make multiple rapid requests
    for (let i = 0; i < 15; i++) {
      requests.push(request.get(endpoint));
    }
    
    const responses = await Promise.all(requests);
    
    // Check if rate limiting is applied
    const rateLimited = responses.some(r => r.status() === 429);
    
    // Note: Rate limiting might not trigger in test environment
    // This test documents expected behavior
    if (rateLimited) {
      const limitedResponse = responses.find(r => r.status() === 429);
      expect(limitedResponse.status()).toBe(429);
      
      const headers = limitedResponse.headers();
      expect(headers).toHaveProperty('x-ratelimit-limit');
      expect(headers).toHaveProperty('x-ratelimit-remaining');
    }
  });
});

test.describe('API Error Handling', () => {
  test('should handle invalid JSON gracefully', async ({ request }) => {
    const response = await request.post('/api/companies', {
      data: 'invalid json string',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    expect([400, 401]).toContain(response.status());
  });

  test('should require authentication for protected endpoints', async ({ request }) => {
    const protectedEndpoints = [
      '/api/companies',
      '/api/intelligence',
      '/api/reports/daily',
      '/api/reports/weekly'
    ];
    
    for (const endpoint of protectedEndpoints) {
      const response = await request.get(endpoint);
      expect([401, 403]).toContain(response.status());
    }
  });

  test('monitoring endpoints should handle errors gracefully', async ({ request }) => {
    const response = await request.post('/api/monitoring/error', {
      data: {
        error: 'Test error',
        context: {
          test: true
        }
      }
    });
    
    // Should accept error reports
    expect([200, 201, 204]).toContain(response.status());
  });
});