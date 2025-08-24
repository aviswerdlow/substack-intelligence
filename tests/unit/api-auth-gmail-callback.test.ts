import { GET } from '@/app/api/auth/gmail/callback/route';
import { NextRequest } from 'next/server';
import { google } from 'googleapis';
import { UserSettingsService } from '@/lib/user-settings';

// Mock dependencies
jest.mock('googleapis');
jest.mock('@/lib/user-settings');

const mockGoogle = google as jest.Mocked<typeof google>;
const MockUserSettingsService = UserSettingsService as jest.MockedClass<typeof UserSettingsService>;

// Mock OAuth2 client
const mockOAuth2Client = {
  getToken: jest.fn(),
  setCredentials: jest.fn(),
};

// Mock Gmail API
const mockGmail = {
  users: {
    getProfile: jest.fn(),
  },
};

describe('/api/auth/gmail/callback', () => {
  let mockUserSettingsService: jest.Mocked<UserSettingsService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup OAuth2 mock
    mockGoogle.auth.OAuth2 = jest.fn().mockImplementation(() => mockOAuth2Client);
    
    // Setup Gmail API mock
    mockGoogle.gmail = jest.fn().mockReturnValue(mockGmail);
    
    // Setup UserSettingsService mock
    mockUserSettingsService = {
      connectGmail: jest.fn(),
      getGmailTokens: jest.fn(),
    } as any;
    MockUserSettingsService.mockImplementation(() => mockUserSettingsService);
  });

  describe('Error Handling', () => {
    it('should handle access_denied error', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/gmail/callback?error=access_denied');
      
      const response = await GET(request);
      const html = await response.text();
      
      expect(response.status).toBe(200);
      expect(html).toContain('Gmail Connection Failed');
      expect(html).toContain('You denied access to your Gmail account');
      expect(html).toContain('Click the "Connect Gmail" button again');
    });

    it('should handle invalid_client error', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/gmail/callback?error=invalid_client');
      
      const response = await GET(request);
      const html = await response.text();
      
      expect(response.status).toBe(200);
      expect(html).toContain('Gmail Connection Failed');
      expect(html).toContain('Invalid OAuth client configuration');
    });

    it('should handle missing authorization code', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/gmail/callback?state=user123');
      
      const response = await GET(request);
      const html = await response.text();
      
      expect(response.status).toBe(200);
      expect(html).toContain('Gmail Connection Failed');
      expect(html).toContain('No authorization code received from Google');
    });

    it('should handle missing state parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/gmail/callback?code=auth_code_123');
      
      const response = await GET(request);
      const html = await response.text();
      
      expect(response.status).toBe(200);
      expect(html).toContain('Gmail Connection Failed');
      expect(html).toContain('Invalid callback - missing user identification');
    });
  });

  describe('Token Exchange', () => {
    it('should handle token exchange failure', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/gmail/callback?code=auth_code_123&state=user123');
      
      mockOAuth2Client.getToken.mockRejectedValue(new Error('Invalid authorization code'));
      
      const response = await GET(request);
      const html = await response.text();
      
      expect(response.status).toBe(200);
      expect(html).toContain('Gmail Connection Failed');
      expect(html).toContain('Failed to exchange authorization code');
      expect(mockOAuth2Client.getToken).toHaveBeenCalledWith('auth_code_123');
    });

    it('should handle missing access token', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/gmail/callback?code=auth_code_123&state=user123');
      
      mockOAuth2Client.getToken.mockResolvedValue({
        tokens: {
          // No access_token provided
          refresh_token: 'refresh_123'
        }
      });
      
      const response = await GET(request);
      const html = await response.text();
      
      expect(response.status).toBe(200);
      expect(html).toContain('Gmail Connection Failed');
      expect(html).toContain('Did not receive an access token from Google');
    });

    it('should handle missing refresh token with no existing token', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/gmail/callback?code=auth_code_123&state=user123');
      
      mockOAuth2Client.getToken.mockResolvedValue({
        tokens: {
          access_token: 'access_123',
          // No refresh_token provided
        }
      });
      
      // No existing tokens in database
      mockUserSettingsService.getGmailTokens.mockResolvedValue(null);
      
      const response = await GET(request);
      const html = await response.text();
      
      expect(response.status).toBe(200);
      expect(html).toContain('Gmail Connection Failed');
      expect(html).toContain('Google did not provide a refresh token');
      expect(html).toContain('https://myaccount.google.com/permissions');
      expect(mockUserSettingsService.getGmailTokens).toHaveBeenCalledWith('user123');
    });

    it('should use existing refresh token when none provided by Google', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/gmail/callback?code=auth_code_123&state=user123');
      
      mockOAuth2Client.getToken.mockResolvedValue({
        tokens: {
          access_token: 'access_123',
          expiry_date: 1234567890,
          // No refresh_token provided
        }
      });
      
      // Existing tokens in database
      mockUserSettingsService.getGmailTokens.mockResolvedValue({
        refreshToken: 'existing_refresh_123',
        accessToken: 'old_access_token',
        email: 'test@example.com'
      });
      
      // Mock Gmail profile fetch
      mockGmail.users.getProfile.mockResolvedValue({
        data: {
          emailAddress: 'test@example.com'
        }
      });
      
      // Mock successful database save
      mockUserSettingsService.connectGmail.mockResolvedValue(true);
      
      const response = await GET(request);
      const html = await response.text();
      
      expect(response.status).toBe(200);
      expect(html).toContain('Gmail Connected Successfully');
      expect(html).toContain('test@example.com');
      expect(mockUserSettingsService.connectGmail).toHaveBeenCalledWith(
        'user123',
        'existing_refresh_123',
        'access_123',
        'test@example.com',
        expect.any(Date)
      );
    });
  });

  describe('Profile Fetching', () => {
    beforeEach(() => {
      mockOAuth2Client.getToken.mockResolvedValue({
        tokens: {
          access_token: 'access_123',
          refresh_token: 'refresh_123',
          expiry_date: 1234567890,
        }
      });
    });

    it('should handle profile fetch failure', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/gmail/callback?code=auth_code_123&state=user123');
      
      mockGmail.users.getProfile.mockRejectedValue(new Error('Gmail API error'));
      
      const response = await GET(request);
      const html = await response.text();
      
      expect(response.status).toBe(200);
      expect(html).toContain('Gmail Connection Failed');
      expect(html).toContain('Successfully authenticated but failed to retrieve');
      expect(mockOAuth2Client.setCredentials).toHaveBeenCalledWith({
        access_token: 'access_123',
        refresh_token: 'refresh_123',
        expiry_date: 1234567890,
      });
    });

    it('should handle missing email address in profile', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/gmail/callback?code=auth_code_123&state=user123');
      
      mockGmail.users.getProfile.mockResolvedValue({
        data: {
          // No emailAddress provided
        }
      });
      
      const response = await GET(request);
      const html = await response.text();
      
      expect(response.status).toBe(200);
      expect(html).toContain('Gmail Connection Failed');
      expect(html).toContain('Successfully authenticated but failed to retrieve');
    });
  });

  describe('Database Storage', () => {
    beforeEach(() => {
      mockOAuth2Client.getToken.mockResolvedValue({
        tokens: {
          access_token: 'access_123',
          refresh_token: 'refresh_123',
          expiry_date: 1234567890,
        }
      });
      
      mockGmail.users.getProfile.mockResolvedValue({
        data: {
          emailAddress: 'test@example.com'
        }
      });
    });

    it('should handle database storage failure', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/gmail/callback?code=auth_code_123&state=user123');
      
      mockUserSettingsService.connectGmail.mockResolvedValue(false);
      
      const response = await GET(request);
      const html = await response.text();
      
      expect(response.status).toBe(200);
      expect(html).toContain('Gmail Connection Failed');
      expect(html).toContain('Successfully authenticated with Gmail but failed to save');
      expect(mockUserSettingsService.connectGmail).toHaveBeenCalledWith(
        'user123',
        'refresh_123',
        'access_123',
        'test@example.com',
        expect.any(Date)
      );
    });

    it('should handle database connection error', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/gmail/callback?code=auth_code_123&state=user123');
      
      mockUserSettingsService.connectGmail.mockRejectedValue(new Error('Database connection failed'));
      
      const response = await GET(request);
      const html = await response.text();
      
      expect(response.status).toBe(200);
      expect(html).toContain('Gmail Connection Failed');
      expect(html).toContain('Database error occurred while saving');
      expect(html).toContain('DB_CONN_ERROR');
    });

    it('should successfully connect Gmail with all valid data', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/gmail/callback?code=auth_code_123&state=user123');
      
      mockUserSettingsService.connectGmail.mockResolvedValue(true);
      
      const response = await GET(request);
      const html = await response.text();
      
      expect(response.status).toBe(200);
      expect(html).toContain('Gmail Connected Successfully');
      expect(html).toContain('Connected: test@example.com');
      expect(html).toContain('localStorage.setItem');
      expect(html).toContain('gmail_connected_email');
      expect(mockUserSettingsService.connectGmail).toHaveBeenCalledWith(
        'user123',
        'refresh_123',
        'access_123',
        'test@example.com',
        expect.any(Date)
      );
    });
  });

  describe('Gmail API Specific Errors', () => {
    beforeEach(() => {
      mockOAuth2Client.getToken.mockResolvedValue({
        tokens: {
          access_token: 'access_123',
          refresh_token: 'refresh_123',
        }
      });
    });

    it('should handle Gmail API not enabled error', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/gmail/callback?code=auth_code_123&state=user123');
      
      const error = new Error('Gmail API has not been used in project');
      mockGmail.users.getProfile.mockRejectedValue(error);
      
      const response = await GET(request);
      const html = await response.text();
      
      expect(response.status).toBe(200);
      expect(html).toContain('Gmail Connection Failed');
      expect(html).toContain('The Gmail API is not enabled for this project');
      expect(html).toContain('Google Cloud Console');
    });

    it('should handle invalid_grant error', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/gmail/callback?code=auth_code_123&state=user123');
      
      const error = new Error('invalid_grant: The provided authorization grant is invalid');
      mockOAuth2Client.getToken.mockRejectedValue(error);
      
      const response = await GET(request);
      const html = await response.text();
      
      expect(response.status).toBe(200);
      expect(html).toContain('Gmail Connection Failed');
      expect(html).toContain('authorization grant is invalid');
      expect(html).toContain('system clock is accurate');
    });
  });

  describe('Environment Variables', () => {
    it('should use environment variables correctly', async () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        GOOGLE_CLIENT_ID: 'test_client_id',
        GOOGLE_CLIENT_SECRET: 'test_client_secret',
        NEXT_PUBLIC_APP_URL: 'http://localhost:3000'
      };

      const request = new NextRequest('http://localhost:3000/api/auth/gmail/callback?code=auth_code_123&state=user123');
      
      // This will trigger the OAuth2 client creation
      mockOAuth2Client.getToken.mockRejectedValue(new Error('Test error'));
      
      await GET(request);
      
      expect(mockGoogle.auth.OAuth2).toHaveBeenCalledWith(
        'test_client_id',
        'test_client_secret',
        'http://localhost:3000/api/auth/gmail/callback'
      );

      process.env = originalEnv;
    });
  });
});