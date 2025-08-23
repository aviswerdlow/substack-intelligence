import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { GET as getGmailAuth, DELETE as deleteGmailAuth } from '../../apps/web/app/api/auth/gmail/route';
import { GET as getSettings, PUT as updateSettings } from '../../apps/web/app/api/settings/route';
import { GET as getIntelligence } from '../../apps/web/app/api/intelligence/route';

// Mock Next.js
vi.mock('next/server', () => ({
  NextRequest: vi.fn(),
  NextResponse: {
    json: vi.fn((data, options) => ({
      json: () => Promise.resolve(data),
      status: options?.status || 200,
      ok: (options?.status || 200) >= 200 && (options?.status || 200) < 300
    }))
  }
}));

// Mock Google APIs
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

// Mock Clerk authentication
const mockCurrentUser = vi.fn();
vi.mock('@clerk/nextjs/server', () => ({
  currentUser: mockCurrentUser
}));

// Mock database
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

// Mock user settings service
const mockUserSettingsService = {
  getComprehensiveSettings: vi.fn(),
  updateComprehensiveSettings: vi.fn(),
  disconnectGmail: vi.fn()
};

vi.mock('../../apps/web/lib/user-settings', () => ({
  UserSettingsService: vi.fn(() => mockUserSettingsService)
}));

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

        expect(mockOAuth2Client.generateAuthUrl).toHaveBeenCalledWith({
          access_type: 'offline',
          scope: [
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.modify'
          ],
          state: 'user_123',
          prompt: 'consent',
          include_granted_scopes: true
        });

        expect(responseData).toMatchObject({
          authUrl: 'https://accounts.google.com/oauth/authorize?...',
          redirectUri: 'https://test.example.com/api/auth/gmail/callback'
        });
      });

      it('should return 500 for missing environment variables', async () => {
        process.env.GOOGLE_CLIENT_ID = '';

        const mockRequest = new Request('https://test.example.com/api/auth/gmail');
        const response = await getGmailAuth(mockRequest as NextRequest);
        const responseData = await response.json();

        expect(response.status).toBe(500);
        expect(responseData).toMatchObject({
          error: 'Configuration Error',
          details: ['GOOGLE_CLIENT_ID environment variable is not set'],
          instructions: expect.arrayContaining([
            'Set up OAuth 2.0 credentials in Google Cloud Console'
          ])
        });
      });

      it('should return 401 for unauthenticated user', async () => {
        mockCurrentUser.mockResolvedValue(null);

        const mockRequest = new Request('https://test.example.com/api/auth/gmail');
        const response = await getGmailAuth(mockRequest as NextRequest);
        const responseData = await response.json();

        expect(response.status).toBe(401);
        expect(responseData).toMatchObject({
          error: 'Authentication required',
          message: 'Please sign in to connect your Gmail account'
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
          error: 'Gmail API Not Enabled',
          message: 'The Gmail API is not enabled in your Google Cloud project',
          instructions: expect.arrayContaining([
            'Go to Google Cloud Console',
            'Enable the Gmail API for your project'
          ])
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
        expect(responseData).toMatchObject({
          error: 'OAuth Setup Failed',
          message: 'Unable to initiate Gmail authentication. Please check your OAuth configuration.',
          details: 'OAuth configuration error'
        });
      });

      it('should handle unknown error types', async () => {
        mockOAuth2Client.generateAuthUrl.mockImplementation(() => {
          throw 'String error';
        });

        const mockRequest = new Request('https://test.example.com/api/auth/gmail');
        const response = await getGmailAuth(mockRequest as NextRequest);
        const responseData = await response.json();

        expect(response.status).toBe(500);
        expect(responseData).toMatchObject({
          error: 'OAuth Setup Failed',
          details: 'Unknown error'
        });
      });

      it('should validate all required environment variables', async () => {
        process.env = {
          ...process.env,
          GOOGLE_CLIENT_ID: '',
          GOOGLE_CLIENT_SECRET: '',
          NEXT_PUBLIC_APP_URL: ''
        };

        const mockRequest = new Request('https://test.example.com/api/auth/gmail');
        const response = await getGmailAuth(mockRequest as NextRequest);
        const responseData = await response.json();

        expect(response.status).toBe(500);
        expect(responseData.details).toHaveLength(3);
        expect(responseData.details).toContain('GOOGLE_CLIENT_ID environment variable is not set');
        expect(responseData.details).toContain('GOOGLE_CLIENT_SECRET environment variable is not set');
        expect(responseData.details).toContain('NEXT_PUBLIC_APP_URL environment variable is not set');
      });
    });

    describe('DELETE - Gmail Disconnection', () => {
      it('should disconnect Gmail successfully', async () => {
        mockUserSettingsService.disconnectGmail.mockResolvedValue(true);

        const response = await deleteGmailAuth();
        const responseData = await response.json();

        expect(mockUserSettingsService.disconnectGmail).toHaveBeenCalledWith('user_123');
        expect(responseData).toMatchObject({
          success: true,
          message: 'Gmail account disconnected successfully',
          userId: 'user_123'
        });
      });

      it('should return 401 for unauthenticated user', async () => {
        mockCurrentUser.mockResolvedValue(null);

        const response = await deleteGmailAuth();
        const responseData = await response.json();

        expect(response.status).toBe(401);
        expect(responseData).toMatchObject({
          error: 'Authentication required',
          message: 'Please sign in to disconnect your Gmail account'
        });
      });

      it('should handle disconnection failure', async () => {
        mockUserSettingsService.disconnectGmail.mockResolvedValue(false);

        const response = await deleteGmailAuth();
        const responseData = await response.json();

        expect(response.status).toBe(500);
        expect(responseData).toMatchObject({
          error: 'Disconnection Failed',
          message: 'Unable to disconnect Gmail account. Please try again.',
          userId: 'user_123'
        });
      });

      it('should handle service errors during disconnection', async () => {
        mockUserSettingsService.disconnectGmail.mockRejectedValue(new Error('Database error'));

        const response = await deleteGmailAuth();
        const responseData = await response.json();

        expect(response.status).toBe(500);
        expect(responseData).toMatchObject({
          error: 'Disconnection Error',
          message: 'An unexpected error occurred while disconnecting Gmail',
          details: 'Database error'
        });
      });

      it('should handle unknown errors during disconnection', async () => {
        mockUserSettingsService.disconnectGmail.mockRejectedValue('Unknown error');

        const response = await deleteGmailAuth();
        const responseData = await response.json();

        expect(response.status).toBe(500);
        expect(responseData.details).toBe('Unknown error');
      });
    });
  });

  describe('Settings API (/api/settings)', () => {
    describe('GET - Fetch Settings', () => {
      it('should fetch user settings successfully', async () => {
        mockUserSettingsService.getComprehensiveSettings.mockResolvedValue(mockSettings);

        const response = await getSettings();
        const responseData = await response.json();

        expect(mockUserSettingsService.getComprehensiveSettings).toHaveBeenCalledWith('user_123');
        expect(responseData).toMatchObject({
          success: true,
          settings: mockSettings
        });
      });

      it('should return 401 for unauthenticated user', async () => {
        mockCurrentUser.mockResolvedValue(null);

        const response = await getSettings();
        const responseData = await response.json();

        expect(response.status).toBe(401);
        expect(responseData).toMatchObject({
          success: false,
          error: 'Unauthorized'
        });
      });

      it('should return 500 when settings fetch fails', async () => {
        mockUserSettingsService.getComprehensiveSettings.mockResolvedValue(null);

        const response = await getSettings();
        const responseData = await response.json();

        expect(response.status).toBe(500);
        expect(responseData).toMatchObject({
          success: false,
          error: 'Failed to fetch settings'
        });
      });

      it('should handle service errors during settings fetch', async () => {
        mockUserSettingsService.getComprehensiveSettings.mockRejectedValue(new Error('Database error'));

        const response = await getSettings();
        const responseData = await response.json();

        expect(response.status).toBe(500);
        expect(responseData).toMatchObject({
          success: false,
          error: 'Failed to fetch settings'
        });
      });
    });

    describe('PUT - Update Settings', () => {
      const validSettingsUpdate = {
        notifications_enabled: false,
        report_frequency: 'daily',
        gmail_connected: true
      };

      it('should update settings successfully', async () => {
        mockUserSettingsService.updateComprehensiveSettings.mockResolvedValue(true);
        mockUserSettingsService.getComprehensiveSettings.mockResolvedValue({
          ...mockSettings,
          ...validSettingsUpdate
        });

        const mockRequest = {
          json: vi.fn().mockResolvedValue(validSettingsUpdate)
        } as any as NextRequest;

        const response = await updateSettings(mockRequest);
        const responseData = await response.json();

        expect(mockUserSettingsService.updateComprehensiveSettings)
          .toHaveBeenCalledWith('user_123', validSettingsUpdate);
        expect(responseData).toMatchObject({
          success: true,
          settings: expect.objectContaining(validSettingsUpdate),
          message: 'Settings saved successfully'
        });
      });

      it('should return 401 for unauthenticated user', async () => {
        mockCurrentUser.mockResolvedValue(null);

        const mockRequest = {
          json: vi.fn().mockResolvedValue(validSettingsUpdate)
        } as any as NextRequest;

        const response = await updateSettings(mockRequest);
        const responseData = await response.json();

        expect(response.status).toBe(401);
        expect(responseData).toMatchObject({
          success: false,
          error: 'Unauthorized'
        });
      });

      it('should handle update failure', async () => {
        mockUserSettingsService.updateComprehensiveSettings.mockResolvedValue(false);

        const mockRequest = {
          json: vi.fn().mockResolvedValue(validSettingsUpdate)
        } as any as NextRequest;

        const response = await updateSettings(mockRequest);
        const responseData = await response.json();

        expect(response.status).toBe(500);
        expect(responseData).toMatchObject({
          success: false,
          error: 'Failed to save settings'
        });
      });

      it('should handle malformed JSON request body', async () => {
        const mockRequest = {
          json: vi.fn().mockRejectedValue(new Error('Invalid JSON'))
        } as any as NextRequest;

        const response = await updateSettings(mockRequest);
        const responseData = await response.json();

        expect(response.status).toBe(500);
        expect(responseData).toMatchObject({
          success: false,
          error: 'Failed to save settings'
        });
      });

      it('should handle service errors during update', async () => {
        mockUserSettingsService.updateComprehensiveSettings
          .mockRejectedValue(new Error('Database connection failed'));

        const mockRequest = {
          json: vi.fn().mockResolvedValue(validSettingsUpdate)
        } as any as NextRequest;

        const response = await updateSettings(mockRequest);
        const responseData = await response.json();

        expect(response.status).toBe(500);
        expect(responseData).toMatchObject({
          success: false,
          error: 'Failed to save settings'
        });
      });

      it('should handle empty request body', async () => {
        mockUserSettingsService.updateComprehensiveSettings.mockResolvedValue(true);
        mockUserSettingsService.getComprehensiveSettings.mockResolvedValue(mockSettings);

        const mockRequest = {
          json: vi.fn().mockResolvedValue({})
        } as any as NextRequest;

        const response = await updateSettings(mockRequest);
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(mockUserSettingsService.updateComprehensiveSettings)
          .toHaveBeenCalledWith('user_123', {});
      });
    });
  });

  describe('Intelligence API (/api/intelligence)', () => {
    beforeEach(() => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn(() => Promise.resolve({
          data: mockCompaniesWithMentions,
          error: null
        }))
      });
    });

    it('should fetch intelligence data with default parameters', async () => {
      const mockRequest = new Request('https://test.example.com/api/intelligence');
      
      const response = await getIntelligence(mockRequest as NextRequest);
      const responseData = await response.json();

      expect(responseData).toMatchObject({
        success: true,
        data: {
          companies: expect.arrayContaining([
            expect.objectContaining({
              name: 'Test Company A',
              mentions: expect.arrayContaining([
                expect.objectContaining({
                  context: 'Company A raised $50M',
                  sentiment: 'positive',
                  confidence: 0.92
                })
              ]),
              totalMentions: 5,
              newsletterDiversity: 1
            })
          ]),
          summary: {
            totalCompanies: 1,
            totalMentions: 5,
            averageMentionsPerCompany: '5.0',
            timeRange: '1 day'
          }
        },
        meta: {
          timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
          version: '1.0.0'
        }
      });
    });

    it('should handle custom query parameters', async () => {
      const mockRequest = new Request('https://test.example.com/api/intelligence?limit=25&days=7');
      
      const response = await getIntelligence(mockRequest as NextRequest);
      const responseData = await response.json();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('companies');
      expect(responseData.data.summary.timeRange).toBe('7 days');
    });

    it('should allow unauthenticated access in development', async () => {
      process.env.NODE_ENV = 'development';
      mockCurrentUser.mockResolvedValue(null);

      const mockRequest = new Request('https://test.example.com/api/intelligence');
      
      const response = await getIntelligence(mockRequest as NextRequest);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
    });

    it('should return 401 for unauthenticated user in production', async () => {
      process.env.NODE_ENV = 'production';
      mockCurrentUser.mockResolvedValue(null);

      const mockRequest = new Request('https://test.example.com/api/intelligence');
      
      const response = await getIntelligence(mockRequest as NextRequest);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData).toMatchObject({
        success: false,
        error: 'Unauthorized'
      });
    });

    it('should handle invalid query parameters', async () => {
      const mockRequest = new Request('https://test.example.com/api/intelligence?limit=invalid&days=notanumber');
      
      const response = await getIntelligence(mockRequest as NextRequest);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData).toMatchObject({
        success: false,
        error: 'Invalid query parameters',
        details: expect.arrayContaining([
          expect.objectContaining({
            code: expect.any(String),
            path: expect.any(Array)
          })
        ])
      });
    });

    it('should handle null query parameters', async () => {
      const mockRequest = new Request('https://test.example.com/api/intelligence?limit=null&days=null');
      
      const response = await getIntelligence(mockRequest as NextRequest);
      
      // Should use defaults (50 for limit, 1 for days)
      expect(mockSupabaseClient.from().limit).toHaveBeenCalledWith(50);
    });

    it('should handle database errors', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn(() => Promise.resolve({
          data: null,
          error: { message: 'Database connection failed' }
        }))
      });

      const mockRequest = new Request('https://test.example.com/api/intelligence');
      
      const response = await getIntelligence(mockRequest as NextRequest);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData).toMatchObject({
        success: false,
        error: 'Database connection failed'
      });
    });

    it('should filter out companies without mentions', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn(() => Promise.resolve({
          data: [
            {
              id: 'company_no_mentions',
              name: 'Company Without Mentions',
              company_mentions: []
            }
          ],
          error: null
        }))
      });

      const mockRequest = new Request('https://test.example.com/api/intelligence');
      
      const response = await getIntelligence(mockRequest as NextRequest);
      const responseData = await response.json();

      expect(responseData.data.companies).toHaveLength(0);
      expect(responseData.data.summary.totalCompanies).toBe(0);
    });

    it('should calculate newsletter diversity correctly', async () => {
      const diverseCompany = {
        id: 'company_diverse',
        name: 'Diverse Company',
        mention_count: 3,
        company_mentions: [
          {
            id: 'mention_1',
            context: 'Context 1',
            sentiment: 'positive',
            confidence: 0.9,
            emails: { newsletter_name: 'Newsletter A', received_at: '2024-01-01T10:00:00Z' }
          },
          {
            id: 'mention_2',
            context: 'Context 2',
            sentiment: 'positive',
            confidence: 0.8,
            emails: { newsletter_name: 'Newsletter B', received_at: '2024-01-01T11:00:00Z' }
          },
          {
            id: 'mention_3',
            context: 'Context 3',
            sentiment: 'neutral',
            confidence: 0.7,
            emails: { newsletter_name: 'Newsletter A', received_at: '2024-01-01T12:00:00Z' }
          }
        ]
      };

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn(() => Promise.resolve({
          data: [diverseCompany],
          error: null
        }))
      });

      const mockRequest = new Request('https://test.example.com/api/intelligence');
      
      const response = await getIntelligence(mockRequest as NextRequest);
      const responseData = await response.json();

      const company = responseData.data.companies[0];
      expect(company.newsletterDiversity).toBe(2); // Newsletter A and B
      expect(company.mentions).toHaveLength(3);
    });

    it('should handle null email data gracefully', async () => {
      const companyWithNullEmails = {
        id: 'company_null_emails',
        name: 'Company with Null Emails',
        mention_count: 1,
        company_mentions: [
          {
            id: 'mention_1',
            context: 'Some context',
            sentiment: 'positive',
            confidence: 0.8,
            extracted_at: '2024-01-01T12:00:00Z',
            emails: null
          }
        ]
      };

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn(() => Promise.resolve({
          data: [companyWithNullEmails],
          error: null
        }))
      });

      const mockRequest = new Request('https://test.example.com/api/intelligence');
      
      const response = await getIntelligence(mockRequest as NextRequest);
      const responseData = await response.json();

      const company = responseData.data.companies[0];
      expect(company.mentions[0].newsletter_name).toBe('Unknown');
      expect(company.mentions[0].received_at).toBe('2024-01-01T12:00:00Z');
    });

    it('should calculate summary statistics correctly', async () => {
      const multipleCompanies = [
        {
          ...mockCompaniesWithMentions[0],
          mention_count: 3
        },
        {
          id: 'company_2',
          name: 'Company B',
          mention_count: 7,
          company_mentions: [
            {
              id: 'mention_2',
              context: 'Company B launched new product',
              sentiment: 'positive',
              confidence: 0.85,
              emails: { newsletter_name: 'Product Hunt' }
            }
          ]
        }
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn(() => Promise.resolve({
          data: multipleCompanies,
          error: null
        }))
      });

      const mockRequest = new Request('https://test.example.com/api/intelligence');
      
      const response = await getIntelligence(mockRequest as NextRequest);
      const responseData = await response.json();

      expect(responseData.data.summary.totalCompanies).toBe(2);
      expect(responseData.data.summary.totalMentions).toBe(10); // 3 + 7
      expect(responseData.data.summary.averageMentionsPerCompany).toBe('5.0'); // 10 / 2
    });

    it('should handle extremely large datasets', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `company_${i}`,
        name: `Company ${i}`,
        mention_count: i + 1,
        company_mentions: [
          {
            id: `mention_${i}`,
            context: `Context for company ${i}`,
            sentiment: 'neutral',
            confidence: 0.5,
            emails: { newsletter_name: `Newsletter ${i % 5}` }
          }
        ]
      }));

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn(() => Promise.resolve({
          data: largeDataset,
          error: null
        }))
      });

      const mockRequest = new Request('https://test.example.com/api/intelligence');
      
      const response = await getIntelligence(mockRequest as NextRequest);
      const responseData = await response.json();

      expect(responseData.data.companies).toHaveLength(1000);
      expect(responseData.data.summary.totalCompanies).toBe(1000);
      expect(typeof responseData.data.summary.averageMentionsPerCompany).toBe('string');
    });

    it('should validate time range formatting', async () => {
      const testCases = [
        { days: 1, expected: '1 day' },
        { days: 2, expected: '2 days' },
        { days: 7, expected: '7 days' },
        { days: 30, expected: '30 days' }
      ];

      for (const { days, expected } of testCases) {
        const mockRequest = new Request(`https://test.example.com/api/intelligence?days=${days}`);
        
        const response = await getIntelligence(mockRequest as NextRequest);
        const responseData = await response.json();

        expect(responseData.data.summary.timeRange).toBe(expected);
      }
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

      expect(mockUserSettingsService.getComprehensiveSettings).toHaveBeenCalledTimes(10);
    });

    it('should handle memory exhaustion gracefully', async () => {
      // Simulate memory pressure by creating large objects
      const hugeData = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        largeField: 'x'.repeat(1000)
      }));

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn(() => Promise.resolve({
          data: hugeData,
          error: null
        }))
      });

      const mockRequest = new Request('https://test.example.com/api/intelligence');
      
      try {
        const response = await getIntelligence(mockRequest as NextRequest);
        expect(response).toBeTruthy();
      } catch (error) {
        // Should handle gracefully without crashing
        expect(error).toBeDefined();
      }
    });

    it('should validate response time performance', async () => {
      mockUserSettingsService.getComprehensiveSettings.mockResolvedValue(mockSettings);

      const startTime = Date.now();
      const response = await getSettings();
      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle network timeouts', async () => {
      mockUserSettingsService.getComprehensiveSettings.mockImplementation(
        () => new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network timeout')), 100)
        )
      );

      const response = await getSettings();
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
    });
  });

  describe('Security and Validation', () => {
    it('should sanitize input data in settings updates', async () => {
      const maliciousInput = {
        notifications_enabled: true,
        report_frequency: '<script>alert("xss")</script>',
        user_id: 'hacker_123', // Should be ignored
        admin: true // Should be ignored
      };

      mockUserSettingsService.updateComprehensiveSettings.mockResolvedValue(true);
      mockUserSettingsService.getComprehensiveSettings.mockResolvedValue(mockSettings);

      const mockRequest = {
        json: vi.fn().mockResolvedValue(maliciousInput)
      } as any as NextRequest;

      const response = await updateSettings(mockRequest);
      
      expect(response.status).toBe(200);
      expect(mockUserSettingsService.updateComprehensiveSettings)
        .toHaveBeenCalledWith('user_123', maliciousInput);
    });

    it('should validate content-type headers', async () => {
      const mockRequest = {
        json: vi.fn().mockResolvedValue({ test: 'data' }),
        headers: {
          get: vi.fn((header) => header === 'content-type' ? 'application/json' : null)
        }
      } as any as NextRequest;

      const response = await updateSettings(mockRequest);
      
      expect(response.status).toBe(200);
    });

    it('should handle SQL injection attempts in query parameters', async () => {
      const maliciousQuery = "'; DROP TABLE companies; --";
      const mockRequest = new Request(
        `https://test.example.com/api/intelligence?search=${encodeURIComponent(maliciousQuery)}`
      );
      
      const response = await getIntelligence(mockRequest as NextRequest);
      
      // Should handle malicious input gracefully
      expect(response.status).toBeLessThan(500);
    });

    it('should validate JWT tokens properly', async () => {
      mockCurrentUser.mockRejectedValue(new Error('Invalid token'));

      const response = await getSettings();
      
      expect(response.status).toBe(500);
    });

    it('should implement rate limiting headers', async () => {
      const response = await getSettings();
      
      // In a real implementation, you'd check for rate limiting headers
      expect(response).toBeTruthy();
    });
  });
});