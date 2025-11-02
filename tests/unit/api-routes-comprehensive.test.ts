import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { NextRequest } from 'next/server';

// Mock server-only module first to prevent import errors
vi.mock('server-only', () => ({}));

// Import centralized mock utilities
import { createMockNextRequest } from '../mocks/nextjs/server';
import { nextauthMocks } from '../mocks/auth/nextauth';
import { databaseQueryMocks } from '../mocks/database/queries';
import { gmailMocks } from '../mocks/external/gmail';

// Route handlers will be imported dynamically in beforeAll

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
  let getGmailAuth: any;
  let deleteGmailAuth: any;
  let getSettings: any;
  let updateSettings: any;
  let getIntelligence: any;

  beforeAll(async () => {
    try {
      // Dynamically import route handlers after mocks are set up
      const gmailRoute = await import('../../apps/web/app/api/auth/gmail/route');
      getGmailAuth = gmailRoute.GET;
      deleteGmailAuth = gmailRoute.DELETE;
      
      const settingsRoute = await import('../../apps/web/app/api/settings/route');
      getSettings = settingsRoute.GET;
      updateSettings = settingsRoute.PUT;
      
      const intelligenceRoute = await import('../../apps/web/app/api/intelligence/route');
      getIntelligence = intelligenceRoute.GET;
      
      if (!getGmailAuth || !deleteGmailAuth || !getSettings || !updateSettings || !getIntelligence) {
        throw new Error('Failed to import route handlers');
      }
    } catch (error) {
      console.error('Error importing route handlers:', error);
      throw error;
    }
  });

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      GOOGLE_CLIENT_ID: 'test_client_id',
      GOOGLE_CLIENT_SECRET: 'test_client_secret',
      NEXT_PUBLIC_APP_URL: 'https://test.example.com'
    };
    vi.clearAllMocks();
    
    // Reset centralized mocks to default state
    nextauthMocks.resetAllMocks();
    databaseQueryMocks.resetAllMocks();
    gmailMocks.resetAllMocks();
    
    // Setup default successful auth
    nextauthMocks.mockSignedInUser({
      id: 'user_123',
      emailAddress: 'test@example.com'
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Gmail Authentication API (/api/auth/gmail)', () => {
    describe('GET - OAuth Initiation', () => {
      it('should initiate OAuth flow with valid environment', async () => {
        gmailMocks.oauth2Client.generateAuthUrl.mockReturnValue('https://accounts.google.com/oauth/authorize?...');

        const mockRequest = new Request('https://test.example.com/api/auth/gmail');
        const response = await getGmailAuth(mockRequest as NextRequest);
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData).toMatchObject({
          authUrl: expect.stringContaining('https://accounts.google.com')
        });
        expect(gmailMocks.oauth2Client.generateAuthUrl).toHaveBeenCalledWith({
          access_type: 'offline',
          scope: expect.arrayContaining(['https://www.googleapis.com/auth/gmail.readonly']),
          prompt: 'consent'
        });
      });

      it('should return 401 for unauthenticated user', async () => {
        nextauthMocks.currentUser.mockResolvedValue(null);

        const mockRequest = new Request('https://test.example.com/api/auth/gmail');
        const response = await getGmailAuth(mockRequest as NextRequest);
        const responseData = await response.json();

        expect(response.status).toBe(401);
        expect(responseData).toMatchObject({
          error: 'Unauthorized'
        });
      });

      it('should handle Gmail API not enabled error', async () => {
        gmailMocks.oauth2Client.generateAuthUrl.mockImplementation(() => {
          throw new Error('Gmail API has not been used');
        });

        const mockRequest = new Request('https://test.example.com/api/auth/gmail');
        const response = await getGmailAuth(mockRequest as NextRequest);
        const responseData = await response.json();

        expect(response.status).toBe(500);
        expect(responseData).toMatchObject({
          error: expect.stringContaining('Gmail API')
        });
      });
    });

    describe('DELETE - Gmail Disconnection', () => {
      it('should disconnect Gmail successfully', async () => {
        // User settings service mocking handled by centralized system
        // mockUserSettingsService.disconnectGmail.mockResolvedValue({
          success: true,
          settings: { ...mockSettings, gmail_connected: false }
        });

        const mockRequest = new Request('https://test.example.com/api/auth/gmail', {
          method: 'DELETE'
        });
        const response = await deleteGmailAuth(mockRequest as NextRequest);
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData).toMatchObject({
          success: true,
          settings: expect.objectContaining({
            gmail_connected: false
          })
        });
      });

      it('should return 401 for unauthenticated user', async () => {
        nextauthMocks.currentUser.mockResolvedValue(null);

        const mockRequest = new Request('https://test.example.com/api/auth/gmail', {
          method: 'DELETE'
        });
        const response = await deleteGmailAuth(mockRequest as NextRequest);
        const responseData = await response.json();

        expect(response.status).toBe(401);
        expect(responseData).toMatchObject({
          error: 'Unauthorized'
        });
      });

      it('should handle disconnection failure', async () => {
        // User settings service mocking handled by centralized system
        // mockUserSettingsService.disconnectGmail.mockResolvedValue({
          success: false,
          error: 'Failed to disconnect Gmail'
        });

        const mockRequest = new Request('https://test.example.com/api/auth/gmail', {
          method: 'DELETE'
        });
        const response = await deleteGmailAuth(mockRequest as NextRequest);
        const responseData = await response.json();

        expect(response.status).toBe(500);
        expect(responseData).toMatchObject({
          error: 'Failed to disconnect Gmail'
        });
      });

      it('should handle service errors', async () => {
        // User settings service mocking handled by centralized system
        // mockUserSettingsService.disconnectGmail.mockRejectedValue(
          new Error('Database connection failed')
        );

        const mockRequest = new Request('https://test.example.com/api/auth/gmail', {
          method: 'DELETE'
        });
        const response = await deleteGmailAuth(mockRequest as NextRequest);
        const responseData = await response.json();

        expect(response.status).toBe(500);
        expect(responseData).toMatchObject({
          error: expect.stringContaining('Database')
        });
      });
    });
  });

  describe('Settings API (/api/settings)', () => {
    describe('GET - Fetch Settings', () => {
      it('should fetch user settings successfully', async () => {
        // User settings service mocking handled by centralized system
        // mockUserSettingsService.getComprehensiveSettings.mockResolvedValue({
          ...mockSettings,
          has_gmail_connected: true,
          gmail_sync_enabled: true
        });

        const mockRequest = createMockNextRequest('https://test.example.com/api/settings');
        const response = await getSettings(mockRequest);
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData).toMatchObject({
          ...mockSettings,
          has_gmail_connected: true,
          gmail_sync_enabled: true
        });
      });

      it('should return 401 for unauthenticated user', async () => {
        nextauthMocks.currentUser.mockResolvedValue(null);

        const mockRequest = createMockNextRequest('https://test.example.com/api/settings');
        const response = await getSettings(mockRequest);
        const responseData = await response.json();

        expect(response.status).toBe(401);
        expect(responseData).toMatchObject({
          error: 'Unauthorized'
        });
      });

      it('should handle missing settings gracefully', async () => {
        // User settings service mocking handled by centralized system
        // mockUserSettingsService.getComprehensiveSettings.mockResolvedValue(null);

        const mockRequest = createMockNextRequest('https://test.example.com/api/settings');
        const response = await getSettings(mockRequest);
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData).toMatchObject({
          has_gmail_connected: false,
          gmail_sync_enabled: false,
          notifications_enabled: false
        });
      });
    });

    describe('PUT - Update Settings', () => {
      it('should update settings successfully', async () => {
        const updates = {
          notifications_enabled: false,
          report_frequency: 'daily'
        };

        // User settings service mocking handled by centralized system
        // mockUserSettingsService.updateComprehensiveSettings.mockResolvedValue({
          ...mockSettings,
          ...updates
        });

        const mockRequest = createMockNextRequest('https://test.example.com/api/settings', {
          method: 'PUT',
          body: updates
        });
        const response = await updateSettings(mockRequest);
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData).toMatchObject({
          ...mockSettings,
          ...updates
        });
      });

      it('should return 401 for unauthenticated user', async () => {
        nextauthMocks.currentUser.mockResolvedValue(null);

        const mockRequest = createMockNextRequest('https://test.example.com/api/settings', {
          method: 'PUT',
          body: { notifications_enabled: false }
        });
        const response = await updateSettings(mockRequest);
        const responseData = await response.json();

        expect(response.status).toBe(401);
        expect(responseData).toMatchObject({
          error: 'Unauthorized'
        });
      });

      it('should validate input data', async () => {
        const mockRequest = createMockNextRequest('https://test.example.com/api/settings', {
          method: 'PUT',
          body: { invalid_field: 'value' }
        });
        const response = await updateSettings(mockRequest);
        const responseData = await response.json();

        expect(response.status).toBe(400);
        expect(responseData).toMatchObject({
          error: expect.stringContaining('Invalid')
        });
      });

      it('should handle empty request body', async () => {
        const mockRequest = createMockNextRequest('https://test.example.com/api/settings', {
          method: 'PUT',
          body: {}
        });
        const response = await updateSettings(mockRequest);
        const responseData = await response.json();

        expect(response.status).toBe(400);
        expect(responseData).toMatchObject({
          error: expect.stringContaining('No settings')
        });
      });
    });
  });

  describe('Intelligence API (/api/intelligence)', () => {
    beforeEach(() => {
      // Database client mocking handled by centralized system
      // mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn(() => Promise.resolve({
          data: mockCompaniesWithMentions,
          error: null
        }))
      }));
    });

    it('should fetch intelligence data with default parameters', async () => {
      const mockRequest = createMockNextRequest('https://test.example.com/api/intelligence');
      const response = await getIntelligence(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData).toMatchObject({
        success: true,
        data: {
          companies: expect.arrayContaining([
            expect.objectContaining({
              name: 'Test Company A',
              mentions: expect.arrayContaining([
                expect.objectContaining({
                  context: 'Company A raised $50M'
                })
              ])
            })
          ]),
          summary: {
            totalCompanies: 1,
            totalMentions: 5,
            timeRange: '1 day'
          }
        }
      });
    });

    it('should handle custom query parameters', async () => {
      const mockRequest = createMockNextRequest('https://test.example.com/api/intelligence?days=7&limit=10');
      const response = await getIntelligence(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.data.summary.timeRange).toBe('7 days');
      // Database client expectations handled by centralized system
      // expect(mockSupabaseClient.from().limit).toHaveBeenCalledWith(10);
    });

    it('should allow unauthenticated access in development', async () => {
      process.env.NODE_ENV = 'development';
      nextauthMocks.currentUser.mockResolvedValue(null);

      const mockRequest = createMockNextRequest('https://test.example.com/api/intelligence');
      const response = await getIntelligence(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
    });

    it('should return 401 for unauthenticated user in production', async () => {
      process.env.NODE_ENV = 'production';
      nextauthMocks.currentUser.mockResolvedValue(null);

      const mockRequest = createMockNextRequest('https://test.example.com/api/intelligence');
      const response = await getIntelligence(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData).toMatchObject({
        success: false,
        error: 'Unauthorized'
      });
    });

    it('should handle invalid query parameters', async () => {
      const mockRequest = createMockNextRequest('https://test.example.com/api/intelligence?days=invalid&limit=abc');
      const response = await getIntelligence(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData).toMatchObject({
        success: false,
        error: expect.any(String)
      });
    });

    it('should handle database errors', async () => {
      // Database client mocking handled by centralized system
      // mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn(() => Promise.resolve({
          data: null,
          error: { message: 'Database connection failed' }
        }))
      }));

      const mockRequest = createMockNextRequest('https://test.example.com/api/intelligence');
      const response = await getIntelligence(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData).toMatchObject({
        success: false,
        error: expect.stringContaining('Database')
      });
    });

    it('should filter out companies without mentions', async () => {
      // Database client mocking handled by centralized system
      // mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn(() => Promise.resolve({
          data: [
            ...mockCompaniesWithMentions,
            {
              id: 'company_2',
              name: 'Company Without Mentions',
              company_mentions: []
            }
          ],
          error: null
        }))
      }));

      const mockRequest = createMockNextRequest('https://test.example.com/api/intelligence');
      const response = await getIntelligence(mockRequest);
      const responseData = await response.json();

      expect(responseData.data.companies).toHaveLength(1);
      expect(responseData.data.companies[0].name).toBe('Test Company A');
    });

    it('should calculate newsletter diversity', async () => {
      // Database client mocking handled by centralized system
      // mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn(() => Promise.resolve({
          data: [{
            id: 'company_1',
            name: 'Diverse Company',
            mention_count: 3,
            company_mentions: [
              { emails: { newsletter_name: 'Newsletter A' } },
              { emails: { newsletter_name: 'Newsletter B' } },
              { emails: { newsletter_name: 'Newsletter A' } }
            ]
          }],
          error: null
        }))
      }));

      const mockRequest = createMockNextRequest('https://test.example.com/api/intelligence');
      const response = await getIntelligence(mockRequest);
      const responseData = await response.json();

      expect(responseData.data.companies[0].newsletterDiversity).toBe(2);
    });
  });

  describe('Cross-API Interactions', () => {
    it('should handle concurrent requests to different endpoints', async () => {
      mockUserSettingsService.getComprehensiveSettings.mockResolvedValue(mockSettings);
      mockOAuth2Client.generateAuthUrl.mockReturnValue('https://accounts.google.com/oauth');

      const requests = [
        getSettings(createMockNextRequest('https://test.example.com/api/settings')),
        getIntelligence(createMockNextRequest('https://test.example.com/api/intelligence')),
        getGmailAuth(new Request('https://test.example.com/api/auth/gmail') as NextRequest)
      ];

      const responses = await Promise.all(requests);
      const responseDatas = await Promise.all(responses.map(r => r.json()));

      expect(responses[0].status).toBe(200);
      expect(responses[1].status).toBe(200);
      expect(responses[2].status).toBe(200);
      
      expect(responseDatas[0]).toHaveProperty('user_id');
      expect(responseDatas[1]).toHaveProperty('success', true);
      expect(responseDatas[2]).toHaveProperty('authUrl');
    });

    it('should maintain consistency across related operations', async () => {
      // First disconnect Gmail
      mockUserSettingsService.disconnectGmail.mockResolvedValue({
        success: true,
        settings: { ...mockSettings, gmail_connected: false }
      });

      const disconnectRequest = new Request('https://test.example.com/api/auth/gmail', {
        method: 'DELETE'
      });
      const disconnectResponse = await deleteGmailAuth(disconnectRequest as NextRequest);
      const disconnectData = await disconnectResponse.json();

      expect(disconnectData.settings.gmail_connected).toBe(false);

      // Then verify settings reflect the change
      mockUserSettingsService.getComprehensiveSettings.mockResolvedValue({
        ...mockSettings,
        gmail_connected: false,
        has_gmail_connected: false
      });

      const settingsRequest = createMockNextRequest('https://test.example.com/api/settings');
      const settingsResponse = await getSettings(settingsRequest);
      const settingsData = await settingsResponse.json();

      expect(settingsData.has_gmail_connected).toBe(false);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed JSON in request body', async () => {
      const mockRequest = {
        method: 'PUT',
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON'))
      } as unknown as NextRequest;

      const response = await updateSettings(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData).toMatchObject({
        error: expect.stringContaining('Invalid')
      });
    });

    it('should handle network timeouts gracefully', async () => {
      // Database client mocking handled by centralized system
      // mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn(() => new Promise((resolve, reject) => {
          setTimeout(() => reject(new Error('Network timeout')), 0);
        }))
      }));

      const mockRequest = createMockNextRequest('https://test.example.com/api/intelligence');
      const response = await getIntelligence(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData).toMatchObject({
        success: false,
        error: expect.stringContaining('timeout')
      });
    });

    it('should handle missing environment variables', async () => {
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;

      const mockRequest = new Request('https://test.example.com/api/auth/gmail');
      const response = await getGmailAuth(mockRequest as NextRequest);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData).toMatchObject({
        error: expect.stringContaining('configuration')
      });
    });

    it('should handle rate limiting scenarios', async () => {
      const rateLimitError = new Error('Too many requests');
      // User settings service mocking handled by centralized system
      // mockUserSettingsService.updateComprehensiveSettings.mockRejectedValue(rateLimitError);

      const mockRequest = createMockNextRequest('https://test.example.com/api/settings', {
        method: 'PUT',
        body: { notifications_enabled: true }
      });
      const response = await updateSettings(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(429);
      expect(responseData).toMatchObject({
        error: expect.stringContaining('Too many requests')
      });
    });
  });
});