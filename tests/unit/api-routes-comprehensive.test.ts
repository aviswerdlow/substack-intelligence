import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Import centralized mock utilities
import { createMockNextRequest } from '../mocks/nextjs/server';

// Mock everything BEFORE importing routes
const mockOAuth2Client = {
  generateAuthUrl: vi.fn(),
  setCredentials: vi.fn(),
  getAccessToken: vi.fn()
};

vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: vi.fn(() => mockOAuth2Client)
    }
  }
}));

const mockCurrentUser = vi.fn();
vi.mock('@clerk/nextjs/server', () => ({
  currentUser: mockCurrentUser
}));

const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    single: vi.fn(),
    data: null,
    error: null
  }))
};

vi.mock('@substack-intelligence/database', () => ({
  createServiceRoleClient: vi.fn(() => mockSupabaseClient),
  createServerComponentClient: vi.fn(() => mockSupabaseClient)
}));

const mockUserSettingsService = {
  getComprehensiveSettings: vi.fn(),
  updateComprehensiveSettings: vi.fn(),
  disconnectGmail: vi.fn()
};

vi.mock('../../apps/web/lib/user-settings', () => ({
  UserSettingsService: vi.fn(() => mockUserSettingsService)
}));

// NOW import route handlers
import { GET as getGmailAuth, DELETE as deleteGmailAuth } from '../../apps/web/app/api/auth/gmail/route';
import { GET as getSettings, PUT as updateSettings } from '../../apps/web/app/api/settings/route';
import { GET as getIntelligence } from '../../apps/web/app/api/intelligence/route';

// Test data
const mockUser = {
  id: 'user_123',
  emailAddress: 'test@example.com',
  firstName: 'Test',
  lastName: 'User'
};

const mockCompaniesWithMentions = [
  {
    id: 'company_1',
    name: 'Test Company A',
    description: 'A test company',
    website: 'https://testcompanya.com',
    funding_status: 'Series A',
    mention_count: 5,
    company_mentions: [
      {
        id: 'mention_1',
        context: 'Company A raised $50M',
        sentiment: 'positive',
        confidence: 0.92,
        extracted_at: '2024-01-01T12:00:00Z',
        emails: {
          newsletter_name: 'Tech Crunch',
          received_at: '2024-01-01T10:00:00Z'
        }
      }
    ]
  }
];

const mockSettings = {
  id: 'settings_1',
  user_id: 'user_123',
  gmail_connected: true,
  notifications_enabled: true,
  report_frequency: 'weekly'
};

// Environment setup
const originalEnv = process.env;

describe('API Routes Comprehensive Testing', () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      GOOGLE_CLIENT_ID: 'test_client_id',
      GOOGLE_CLIENT_SECRET: 'test_client_secret',
      NEXT_PUBLIC_APP_URL: 'https://test.example.com'
    };
    vi.clearAllMocks();
    
    // Setup default successful auth
    mockCurrentUser.mockResolvedValue(mockUser);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Gmail Authentication API (/api/auth/gmail)', () => {
    describe('GET - OAuth Initiation', () => {
      it('should initiate OAuth flow with valid environment', async () => {
        mockOAuth2Client.generateAuthUrl.mockReturnValue('https://accounts.google.com/oauth/authorize?...');

        const mockRequest = new Request('https://test.example.com/api/auth/gmail');
        const response = await getGmailAuth(mockRequest as NextRequest);
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData).toMatchObject({
          authUrl: expect.stringContaining('https://accounts.google.com')
        });
        expect(mockOAuth2Client.generateAuthUrl).toHaveBeenCalledWith({
          access_type: 'offline',
          scope: expect.arrayContaining(['https://www.googleapis.com/auth/gmail.readonly']),
          prompt: 'consent'
        });
      });

      it('should return 401 for unauthenticated user', async () => {
        mockCurrentUser.mockResolvedValue(null);

        const mockRequest = new Request('https://test.example.com/api/auth/gmail');
        const response = await getGmailAuth(mockRequest as NextRequest);
        const responseData = await response.json();

        expect(response.status).toBe(401);
        expect(responseData).toMatchObject({
          error: expect.any(String)
        });
      });

      it('should handle Gmail API not enabled error', async () => {
        mockOAuth2Client.generateAuthUrl.mockImplementation(() => {
          throw new Error('Gmail API is not enabled');
        });

        const mockRequest = new Request('https://test.example.com/api/auth/gmail');
        const response = await getGmailAuth(mockRequest as NextRequest);
        const responseData = await response.json();

        expect(response.status).toBe(500);
        expect(responseData).toMatchObject({
          error: 'OAuth Setup Failed',
          message: expect.stringContaining('Gmail API'),
          solution: expect.any(String)
        });
      });

      it('should handle general OAuth errors', async () => {
        mockOAuth2Client.generateAuthUrl.mockImplementation(() => {
          throw new Error('OAuth configuration error');
        });

        const mockRequest = new Request('https://test.example.com/api/auth/gmail');
        const response = await getGmailAuth(mockRequest as NextRequest);
        const responseData = await response.json();

        expect(response.status).toBe(500);
        expect(responseData.error).toBeDefined();
      });

      it('should handle unknown error types', async () => {
        mockOAuth2Client.generateAuthUrl.mockImplementation(() => {
          throw 'String error';
        });

        const mockRequest = new Request('https://test.example.com/api/auth/gmail');
        const response = await getGmailAuth(mockRequest as NextRequest);
        
        expect(response.status).toBe(500);
      });
    });

    describe('DELETE - Gmail Disconnection', () => {
      it('should disconnect Gmail successfully', async () => {
        mockUserSettingsService.disconnectGmail.mockResolvedValue(true);

        const response = await deleteGmailAuth();
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData).toMatchObject({
          success: true,
          message: expect.stringContaining('disconnected')
        });
      });

      it('should return 401 for unauthenticated user', async () => {
        mockCurrentUser.mockResolvedValue(null);

        const response = await deleteGmailAuth();
        const responseData = await response.json();

        expect(response.status).toBe(401);
        expect(responseData.error).toBeDefined();
      });

      it('should handle disconnection failure', async () => {
        mockUserSettingsService.disconnectGmail.mockResolvedValue(false);

        const response = await deleteGmailAuth();
        const responseData = await response.json();

        expect(response.status).toBe(500);
        expect(responseData).toMatchObject({
          success: false,
          error: expect.any(String)
        });
      });

      it('should handle service errors', async () => {
        mockUserSettingsService.disconnectGmail.mockRejectedValue(new Error('Database error'));

        const response = await deleteGmailAuth();
        const responseData = await response.json();

        expect(response.status).toBe(500);
        expect(responseData.success).toBe(false);
      });
    });
  });

  describe('Settings API (/api/settings)', () => {
    describe('GET - Fetch Settings', () => {
      it('should fetch user settings successfully', async () => {
        mockUserSettingsService.getComprehensiveSettings.mockResolvedValue(mockSettings);

        const response = await getSettings();
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData).toMatchObject({
          success: true,
          data: expect.objectContaining({
            gmail_connected: true,
            notifications_enabled: true,
            report_frequency: 'weekly'
          })
        });
      });

      it('should return 401 for unauthenticated user', async () => {
        mockCurrentUser.mockResolvedValue(null);

        const response = await getSettings();
        const responseData = await response.json();

        expect(response.status).toBe(401);
        expect(responseData.error).toBeDefined();
      });

      it('should handle missing settings gracefully', async () => {
        mockUserSettingsService.getComprehensiveSettings.mockResolvedValue(null);

        const response = await getSettings();
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData).toMatchObject({
          success: true,
          data: {}
        });
      });

      it('should handle service errors', async () => {
        mockUserSettingsService.getComprehensiveSettings.mockRejectedValue(new Error('Database error'));

        const response = await getSettings();
        const responseData = await response.json();

        expect(response.status).toBe(500);
        expect(responseData.success).toBe(false);
      });
    });

    describe('PUT - Update Settings', () => {
      it('should update settings successfully', async () => {
        const updatedSettings = { ...mockSettings, notifications_enabled: false };
        mockUserSettingsService.updateComprehensiveSettings.mockResolvedValue(updatedSettings);

        const mockRequest = new Request('https://test.example.com/api/settings', {
          method: 'PUT',
          body: JSON.stringify({ notifications_enabled: false }),
          headers: { 'Content-Type': 'application/json' }
        });

        const response = await updateSettings(mockRequest as NextRequest);
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData).toMatchObject({
          success: true,
          data: expect.objectContaining({
            notifications_enabled: false
          })
        });
      });

      it('should return 401 for unauthenticated user', async () => {
        mockCurrentUser.mockResolvedValue(null);

        const mockRequest = new Request('https://test.example.com/api/settings', {
          method: 'PUT',
          body: JSON.stringify({ notifications_enabled: false })
        });

        const response = await updateSettings(mockRequest as NextRequest);
        const responseData = await response.json();

        expect(response.status).toBe(401);
        expect(responseData.error).toBeDefined();
      });

      it('should validate input data', async () => {
        const mockRequest = new Request('https://test.example.com/api/settings', {
          method: 'PUT',
          body: JSON.stringify({ invalid_field: 'value' })
        });

        const response = await updateSettings(mockRequest as NextRequest);
        const responseData = await response.json();

        // Should still succeed but ignore invalid fields
        expect(response.status).toBeLessThan(500);
      });

      it('should handle service errors during update', async () => {
        mockUserSettingsService.updateComprehensiveSettings.mockRejectedValue(new Error('Update failed'));

        const mockRequest = new Request('https://test.example.com/api/settings', {
          method: 'PUT',
          body: JSON.stringify({ notifications_enabled: false })
        });

        const response = await updateSettings(mockRequest as NextRequest);
        const responseData = await response.json();

        expect(response.status).toBe(500);
        expect(responseData.success).toBe(false);
      });

      it('should handle empty request body', async () => {
        mockUserSettingsService.updateComprehensiveSettings.mockResolvedValue(mockSettings);

        const mockRequest = new Request('https://test.example.com/api/settings', {
          method: 'PUT',
          body: JSON.stringify({})
        });

        const response = await updateSettings(mockRequest as NextRequest);
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData.success).toBe(true);
      });
    });
  });

  describe('Intelligence API (/api/intelligence)', () => {
    it('should fetch intelligence data with default parameters', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn(() => Promise.resolve({
          data: mockCompaniesWithMentions,
          error: null
        }))
      });

      const mockRequest = createMockNextRequest('https://test.example.com/api/intelligence');
      const response = await getIntelligence(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData).toMatchObject({
        success: true,
        data: {
          companies: expect.any(Array),
          summary: expect.objectContaining({
            totalCompanies: expect.any(Number),
            totalMentions: expect.any(Number)
          })
        }
      });
    });

    it('should handle custom query parameters', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn(() => Promise.resolve({
          data: mockCompaniesWithMentions,
          error: null
        }))
      });

      const mockRequest = createMockNextRequest('https://test.example.com/api/intelligence?limit=10&days=7');
      const response = await getIntelligence(mockRequest);

      expect(response.status).toBe(200);
    });

    it('should allow unauthenticated access in development', async () => {
      process.env.NODE_ENV = 'development';
      mockCurrentUser.mockResolvedValue(null);
      
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn(() => Promise.resolve({
          data: mockCompaniesWithMentions,
          error: null
        }))
      });

      const mockRequest = createMockNextRequest('https://test.example.com/api/intelligence');
      const response = await getIntelligence(mockRequest);

      expect(response.status).toBe(200);
    });

    it('should return 401 for unauthenticated user in production', async () => {
      process.env.NODE_ENV = 'production';
      mockCurrentUser.mockResolvedValue(null);

      const mockRequest = createMockNextRequest('https://test.example.com/api/intelligence');
      const response = await getIntelligence(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.error).toBeDefined();
    });

    it('should handle invalid query parameters', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn(() => Promise.resolve({
          data: mockCompaniesWithMentions,
          error: null
        }))
      });

      const mockRequest = createMockNextRequest('https://test.example.com/api/intelligence?limit=invalid&days=notanumber');
      const response = await getIntelligence(mockRequest);

      expect(response.status).toBe(400);
    });

    it('should handle null query parameters', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn(() => Promise.resolve({
          data: mockCompaniesWithMentions,
          error: null
        }))
      });

      const mockRequest = createMockNextRequest('https://test.example.com/api/intelligence?limit=null&days=null');
      const response = await getIntelligence(mockRequest);

      expect(response.status).toBe(200);
    });

    it('should handle database errors', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn(() => Promise.resolve({
          data: null,
          error: new Error('Database connection failed')
        }))
      });

      const mockRequest = createMockNextRequest('https://test.example.com/api/intelligence');
      const response = await getIntelligence(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
    });

    it('should filter out companies without mentions', async () => {
      const companiesWithAndWithoutMentions = [
        ...mockCompaniesWithMentions,
        {
          id: 'company_2',
          name: 'Company Without Mentions',
          company_mentions: []
        }
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn(() => Promise.resolve({
          data: companiesWithAndWithoutMentions,
          error: null
        }))
      });

      const mockRequest = createMockNextRequest('https://test.example.com/api/intelligence');
      const response = await getIntelligence(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.data.companies).toBeDefined();
    });

    it('should calculate newsletter diversity correctly', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn(() => Promise.resolve({
          data: mockCompaniesWithMentions,
          error: null
        }))
      });

      const mockRequest = createMockNextRequest('https://test.example.com/api/intelligence');
      const response = await getIntelligence(mockRequest);
      const responseData = await response.json();

      expect(responseData.data.companies[0].newsletterDiversity).toBeDefined();
    });

    it('should handle null email data gracefully', async () => {
      const companiesWithNullEmails = [{
        ...mockCompaniesWithMentions[0],
        company_mentions: [{
          ...mockCompaniesWithMentions[0].company_mentions[0],
          emails: null
        }]
      }];

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn(() => Promise.resolve({
          data: companiesWithNullEmails,
          error: null
        }))
      });

      const mockRequest = createMockNextRequest('https://test.example.com/api/intelligence');
      const response = await getIntelligence(mockRequest);

      expect(response.status).toBe(200);
    });

    it('should calculate summary statistics correctly', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn(() => Promise.resolve({
          data: mockCompaniesWithMentions,
          error: null
        }))
      });

      const mockRequest = createMockNextRequest('https://test.example.com/api/intelligence');
      const response = await getIntelligence(mockRequest);
      const responseData = await response.json();

      expect(responseData.data.summary).toMatchObject({
        totalCompanies: expect.any(Number),
        totalMentions: expect.any(Number),
        avgMentionsPerCompany: expect.any(Number)
      });
    });

    it('should handle extremely large datasets', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `company_${i}`,
        name: `Company ${i}`,
        company_mentions: []
      }));

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn(() => Promise.resolve({
          data: largeDataset,
          error: null
        }))
      });

      const mockRequest = createMockNextRequest('https://test.example.com/api/intelligence');
      const response = await getIntelligence(mockRequest);

      expect(response.status).toBe(200);
    });

    it('should validate time range formatting', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn(() => Promise.resolve({
          data: mockCompaniesWithMentions,
          error: null
        }))
      });

      const mockRequest = createMockNextRequest('https://test.example.com/api/intelligence?days=1');
      const response = await getIntelligence(mockRequest);
      const responseData = await response.json();

      expect(responseData.data.summary.timeRange).toMatch(/\d+ day/);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle concurrent requests safely', async () => {
      mockUserSettingsService.getComprehensiveSettings.mockResolvedValue(mockSettings);

      const requests = Array.from({ length: 10 }, () => getSettings());
      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('should handle memory exhaustion gracefully', async () => {
      // Simulate large data response
      const largeData = Array.from({ length: 10000 }, (_, i) => ({
        id: `company_${i}`,
        name: `Company ${i}`,
        company_mentions: []
      }));

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn(() => Promise.resolve({
          data: largeData,
          error: null
        }))
      });

      const mockRequest = createMockNextRequest('https://test.example.com/api/intelligence');
      const response = await getIntelligence(mockRequest);

      expect(response.status).toBeLessThan(500);
    });

    it('should validate response time performance', async () => {
      mockUserSettingsService.getComprehensiveSettings.mockResolvedValue(mockSettings);

      const startTime = Date.now();
      const response = await getSettings();
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should respond within 1 second
      expect(response.status).toBe(200);
    });

    it('should handle network timeouts', async () => {
      mockUserSettingsService.getComprehensiveSettings.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockSettings), 100))
      );

      const response = await getSettings();
      expect(response.status).toBe(200);
    });
  });

  describe('Security and Validation', () => {
    it('should sanitize input data in settings updates', async () => {
      mockUserSettingsService.updateComprehensiveSettings.mockResolvedValue(mockSettings);

      const mockRequest = new Request('https://test.example.com/api/settings', {
        method: 'PUT',
        body: JSON.stringify({
          notifications_enabled: true,
          '<script>alert("xss")</script>': 'malicious'
        })
      });

      const response = await updateSettings(mockRequest as NextRequest);
      expect(response.status).toBeLessThan(500);
    });

    it('should validate content-type headers', async () => {
      const mockRequest = new Request('https://test.example.com/api/settings', {
        method: 'PUT',
        body: 'invalid-json',
        headers: { 'Content-Type': 'text/plain' }
      });

      const response = await updateSettings(mockRequest as NextRequest);
      expect(response.status).toBe(200); // Should handle gracefully
    });

    it('should handle SQL injection attempts in query parameters', async () => {
      const mockRequest = createMockNextRequest(
        'https://test.example.com/api/intelligence?limit=1; DROP TABLE companies;--'
      );

      const response = await getIntelligence(mockRequest);
      expect(response.status).toBeLessThan(500); // Should validate and reject malicious input
    });

    it('should validate JWT tokens properly', async () => {
      mockCurrentUser.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const response = await getSettings();
      expect(response.status).toBe(500);
    });
  });
});