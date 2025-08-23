import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Import the actual route handlers
import { GET as getGmailAuthHandler, DELETE as deleteGmailAuthHandler } from '../../apps/web/app/api/auth/gmail/route';

// Mock NextResponse.json to capture response data and status
const mockJsonResponse = vi.fn((data, options) => ({
  json: () => Promise.resolve(data),
  status: options?.status || 200,
  data,
  options
}));

vi.mock('next/server', async () => {
  const actual = await vi.importActual('next/server');
  return {
    ...actual,
    NextResponse: {
      ...actual.NextResponse,
      json: mockJsonResponse
    }
  };
});

// Mock Google APIs
const mockGenerateAuthUrl = vi.fn(() => 'https://accounts.google.com/oauth/authorize?test=true');
const mockOAuth2 = vi.fn(() => ({
  generateAuthUrl: mockGenerateAuthUrl
}));

vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: mockOAuth2
    }
  }
}));

// Mock Clerk authentication
const mockCurrentUser = vi.fn(() => Promise.resolve({ 
  id: 'test-user-id', 
  emailAddress: 'test@example.com' 
}));

vi.mock('@clerk/nextjs/server', () => ({
  currentUser: mockCurrentUser
}));

// Mock database
vi.mock('@substack-intelligence/database', () => ({
  createServiceRoleClient: vi.fn(() => ({}))
}));

// Mock UserSettingsService
const mockDisconnectGmail = vi.fn(() => Promise.resolve(true));
vi.mock('@/lib/user-settings', () => ({
  UserSettingsService: vi.fn(() => ({
    disconnectGmail: mockDisconnectGmail
  }))
}));

// Mock environment variables
const originalEnv = process.env;

describe('API Gmail Auth Route', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Set up healthy environment by default
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      GOOGLE_CLIENT_ID: 'test-google-client-id',
      GOOGLE_CLIENT_SECRET: 'test-google-client-secret',
      NEXT_PUBLIC_APP_URL: 'https://example.com'
    };

    // Reset current user to authenticated by default
    mockCurrentUser.mockResolvedValue({ 
      id: 'test-user-id', 
      emailAddress: 'test@example.com' 
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('GET /api/auth/gmail - OAuth Initiation', () => {
    it('should initiate OAuth flow successfully with valid environment', async () => {
      const request = new NextRequest('https://example.com/api/auth/gmail');
      const response = await getGmailAuthHandler(request);

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        authUrl: expect.stringContaining('https://accounts.google.com/oauth/authorize'),
        redirectUri: 'https://example.com/api/auth/gmail/callback'
      });

      // Verify OAuth2 client was created with correct parameters
      expect(mockOAuth2).toHaveBeenCalledWith(
        'test-google-client-id',
        'test-google-client-secret',
        'https://example.com/api/auth/gmail/callback'
      );

      // Verify auth URL generation with correct parameters
      expect(mockGenerateAuthUrl).toHaveBeenCalledWith({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/gmail.modify'
        ],
        state: 'test-user-id',
        prompt: 'consent',
        include_granted_scopes: true
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      mockCurrentUser.mockResolvedValue(null);

      const request = new NextRequest('https://example.com/api/auth/gmail');
      const response = await getGmailAuthHandler(request);

      expect(response.status).toBe(401);
      expect(response.data).toMatchObject({
        error: 'Authentication required',
        message: 'Please sign in to connect your Gmail account'
      });
    });

    it('should return 500 when GOOGLE_CLIENT_ID is missing', async () => {
      delete process.env.GOOGLE_CLIENT_ID;

      const request = new NextRequest('https://example.com/api/auth/gmail');
      const response = await getGmailAuthHandler(request);

      expect(response.status).toBe(500);
      expect(response.data).toMatchObject({
        error: 'Configuration Error',
        details: expect.arrayContaining(['GOOGLE_CLIENT_ID environment variable is not set']),
        instructions: expect.any(Array)
      });
    });

    it('should return 500 when GOOGLE_CLIENT_SECRET is missing', async () => {
      delete process.env.GOOGLE_CLIENT_SECRET;

      const request = new NextRequest('https://example.com/api/auth/gmail');
      const response = await getGmailAuthHandler(request);

      expect(response.status).toBe(500);
      expect(response.data).toMatchObject({
        error: 'Configuration Error',
        details: expect.arrayContaining(['GOOGLE_CLIENT_SECRET environment variable is not set'])
      });
    });

    it('should return 500 when NEXT_PUBLIC_APP_URL is missing', async () => {
      delete process.env.NEXT_PUBLIC_APP_URL;

      const request = new NextRequest('https://example.com/api/auth/gmail');
      const response = await getGmailAuthHandler(request);

      expect(response.status).toBe(500);
      expect(response.data).toMatchObject({
        error: 'Configuration Error',
        details: expect.arrayContaining(['NEXT_PUBLIC_APP_URL environment variable is not set'])
      });
    });

    it('should return all missing environment variables in error', async () => {
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;
      delete process.env.NEXT_PUBLIC_APP_URL;

      const request = new NextRequest('https://example.com/api/auth/gmail');
      const response = await getGmailAuthHandler(request);

      expect(response.status).toBe(500);
      expect(response.data.details).toHaveLength(3);
      expect(response.data.details).toEqual(expect.arrayContaining([
        'GOOGLE_CLIENT_ID environment variable is not set',
        'GOOGLE_CLIENT_SECRET environment variable is not set',
        'NEXT_PUBLIC_APP_URL environment variable is not set'
      ]));
    });

    it('should handle Gmail API specific errors', async () => {
      mockOAuth2.mockImplementation(() => {
        throw new Error('Gmail API is not enabled');
      });

      const request = new NextRequest('https://example.com/api/auth/gmail');
      const response = await getGmailAuthHandler(request);

      expect(response.status).toBe(500);
      expect(response.data).toMatchObject({
        error: 'Gmail API Not Enabled',
        message: 'The Gmail API is not enabled in your Google Cloud project',
        instructions: expect.arrayContaining([
          'Go to Google Cloud Console',
          'Enable the Gmail API for your project'
        ])
      });
    });

    it('should handle general OAuth setup errors', async () => {
      mockOAuth2.mockImplementation(() => {
        throw new Error('OAuth configuration invalid');
      });

      const request = new NextRequest('https://example.com/api/auth/gmail');
      const response = await getGmailAuthHandler(request);

      expect(response.status).toBe(500);
      expect(response.data).toMatchObject({
        error: 'OAuth Setup Failed',
        message: 'Unable to initiate Gmail authentication. Please check your OAuth configuration.',
        details: 'OAuth configuration invalid'
      });
    });

    it('should handle unknown error types gracefully', async () => {
      mockOAuth2.mockImplementation(() => {
        throw 'Unknown error type';
      });

      const request = new NextRequest('https://example.com/api/auth/gmail');
      const response = await getGmailAuthHandler(request);

      expect(response.status).toBe(500);
      expect(response.data).toMatchObject({
        error: 'OAuth Setup Failed',
        details: 'Unknown error'
      });
    });

    it('should log errors to console', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      mockOAuth2.mockImplementation(() => {
        throw new Error('Test error');
      });

      const request = new NextRequest('https://example.com/api/auth/gmail');
      await getGmailAuthHandler(request);

      expect(consoleSpy).toHaveBeenCalledWith('Gmail OAuth initiation failed:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('DELETE /api/auth/gmail - Gmail Disconnection', () => {
    it('should disconnect Gmail successfully', async () => {
      const response = await deleteGmailAuthHandler();

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        success: true,
        message: 'Gmail account disconnected successfully',
        userId: 'test-user-id'
      });

      expect(mockDisconnectGmail).toHaveBeenCalledWith('test-user-id');
    });

    it('should return 401 when user is not authenticated', async () => {
      mockCurrentUser.mockResolvedValue(null);

      const response = await deleteGmailAuthHandler();

      expect(response.status).toBe(401);
      expect(response.data).toMatchObject({
        error: 'Authentication required',
        message: 'Please sign in to disconnect your Gmail account'
      });
    });

    it('should handle disconnection failure', async () => {
      mockDisconnectGmail.mockResolvedValue(false);

      const response = await deleteGmailAuthHandler();

      expect(response.status).toBe(500);
      expect(response.data).toMatchObject({
        error: 'Disconnection Failed',
        message: 'Unable to disconnect Gmail account. Please try again.',
        userId: 'test-user-id'
      });
    });

    it('should handle errors during disconnection', async () => {
      mockDisconnectGmail.mockRejectedValue(new Error('Database error'));

      const response = await deleteGmailAuthHandler();

      expect(response.status).toBe(500);
      expect(response.data).toMatchObject({
        error: 'Disconnection Error',
        message: 'An unexpected error occurred while disconnecting Gmail',
        details: 'Database error'
      });
    });

    it('should handle unknown error types during disconnection', async () => {
      mockDisconnectGmail.mockRejectedValue('Unknown error');

      const response = await deleteGmailAuthHandler();

      expect(response.status).toBe(500);
      expect(response.data).toMatchObject({
        error: 'Disconnection Error',
        details: 'Unknown error'
      });
    });

    it('should log disconnection errors to console', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      mockDisconnectGmail.mockRejectedValue(new Error('Test error'));

      await deleteGmailAuthHandler();

      expect(consoleSpy).toHaveBeenCalledWith('Gmail disconnection failed:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('OAuth URL Generation', () => {
    it('should generate OAuth URL with correct scopes', async () => {
      const request = new NextRequest('https://example.com/api/auth/gmail');
      await getGmailAuthHandler(request);

      expect(mockGenerateAuthUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: [
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.modify'
          ]
        })
      );
    });

    it('should use user ID in state parameter for security', async () => {
      const request = new NextRequest('https://example.com/api/auth/gmail');
      await getGmailAuthHandler(request);

      expect(mockGenerateAuthUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          state: 'test-user-id'
        })
      );
    });

    it('should force consent to get refresh token', async () => {
      const request = new NextRequest('https://example.com/api/auth/gmail');
      await getGmailAuthHandler(request);

      expect(mockGenerateAuthUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: 'consent',
          access_type: 'offline'
        })
      );
    });

    it('should include granted scopes for incremental authorization', async () => {
      const request = new NextRequest('https://example.com/api/auth/gmail');
      await getGmailAuthHandler(request);

      expect(mockGenerateAuthUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          include_granted_scopes: true
        })
      );
    });
  });

  describe('Redirect URI Generation', () => {
    it('should generate correct redirect URI based on app URL', async () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://custom-domain.com';
      
      const request = new NextRequest('https://example.com/api/auth/gmail');
      await getGmailAuthHandler(request);

      expect(mockOAuth2).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'https://custom-domain.com/api/auth/gmail/callback'
      );
    });

    it('should return redirect URI in response', async () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://test-app.com';
      
      const request = new NextRequest('https://example.com/api/auth/gmail');
      const response = await getGmailAuthHandler(request);

      expect(response.data.redirectUri).toBe('https://test-app.com/api/auth/gmail/callback');
    });
  });
});