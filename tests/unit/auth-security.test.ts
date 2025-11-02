import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  getSecurityContext,
  getUserRole,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  isResourceOwner,
  validateSessionSecurity,
  validateAPIKey,
  generateCSRFToken,
  validateCSRFToken,
  getSecurityHeaders,
  Permission,
  ROLE_PERMISSIONS,
  SecurityContext
} from '../../apps/web/lib/security/auth';
import {
  getServerSecuritySession,
  fetchUserAccessProfile
} from '@substack-intelligence/lib/security/session';

vi.mocked(getServerSecuritySession);
vi.mocked(fetchUserAccessProfile);

const mockSecuritySession = {
  session: {
    user: {
      id: 'user_123',
      email: 'test@example.com'
    }
  } as any,
  user: {
    id: 'user_123',
    email: 'test@example.com',
    role: 'analyst' as const,
    permissions: ROLE_PERMISSIONS.analyst,
    isVerified: true,
    organizationId: 'org_123'
  },
  rememberMe: false,
  sessionId: 'session_123'
};

const mockSecurityContext: SecurityContext = {
  userId: 'user_123',
  organizationId: 'org_123',
  role: 'analyst',
  permissions: ROLE_PERMISSIONS.analyst,
  sessionId: 'session_123',
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0 Test Browser',
  isVerified: true
};

describe('Authentication and Authorization Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSecuritySession).mockResolvedValue(mockSecuritySession as any);
    vi.mocked(fetchUserAccessProfile).mockResolvedValue(mockSecuritySession.user as any);
  });

  describe('getSecurityContext', () => {
    it('should create security context for authenticated user', async () => {
      const mockRequest = {
        headers: {
          get: vi.fn((key: string) => {
            const headers: Record<string, string> = {
              'x-forwarded-for': '192.168.1.1, 10.0.0.1',
              'user-agent': 'Mozilla/5.0 Test Browser'
            };
            return headers[key] || null;
          })
        }
      } as any as NextRequest;

      const context = await getSecurityContext(mockRequest);

      expect(context).toEqual({
        userId: 'user_123',
        organizationId: 'org_123',
        role: 'analyst',
        permissions: ROLE_PERMISSIONS.analyst,
        sessionId: 'session_123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test Browser',
        isVerified: true
      });
    });

    it('should return null for unauthenticated user', async () => {
      vi.mocked(getServerSecuritySession).mockResolvedValueOnce(null);

      const mockRequest = { headers: { get: vi.fn() } } as any as NextRequest;
      const context = await getSecurityContext(mockRequest);

      expect(context).toBeNull();
    });

    it('should default to unknown for missing IP and user agent', async () => {
      const mockRequest = {
        headers: {
          get: vi.fn(() => null)
        }
      } as any as NextRequest;

      const context = await getSecurityContext(mockRequest);

      expect(context?.ipAddress).toBe('unknown');
      expect(context?.userAgent).toBe('unknown');
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(getServerSecuritySession).mockRejectedValueOnce(new Error('Session failure'));

      const mockRequest = { headers: { get: vi.fn() } } as any as NextRequest;
      const context = await getSecurityContext(mockRequest);

      expect(context).toBeNull();
    });
  });

  describe('getUserRole', () => {
    it('should return role from access profile', async () => {
      vi.mocked(fetchUserAccessProfile).mockResolvedValueOnce({
        id: 'user_123',
        role: 'admin',
        permissions: ROLE_PERMISSIONS.admin,
        isVerified: true,
        organizationId: 'org_123'
      } as any);

      const role = await getUserRole('user_123', 'org_123');

      expect(role).toBe('admin');
    });

    it('should default to viewer when profile fetch fails', async () => {
      vi.mocked(fetchUserAccessProfile).mockRejectedValueOnce(new Error('API Error'));

      const role = await getUserRole('user_123', 'org_123');

      expect(role).toBe('viewer');
    });
  });

  describe('Permission checking utilities', () => {
    it('should check single permission correctly', () => {
      expect(hasPermission(mockSecurityContext, Permission.READ_COMPANIES)).toBe(true);
      expect(hasPermission(mockSecurityContext, Permission.ADMIN_SYSTEM)).toBe(false);
    });

    it('should check any permission correctly', () => {
      expect(
        hasAnyPermission(mockSecurityContext, [
          Permission.READ_COMPANIES,
          Permission.ADMIN_SYSTEM
        ])
      ).toBe(true);

      expect(
        hasAnyPermission(mockSecurityContext, [
          Permission.ADMIN_SYSTEM,
          Permission.MANAGE_USERS
        ])
      ).toBe(false);
    });

    it('should check all permissions correctly', () => {
      expect(
        hasAllPermissions(mockSecurityContext, [
          Permission.READ_COMPANIES,
          Permission.WRITE_COMPANIES
        ])
      ).toBe(true);

      expect(
        hasAllPermissions(mockSecurityContext, [
          Permission.READ_COMPANIES,
          Permission.ADMIN_SYSTEM
        ])
      ).toBe(false);
    });
  });

  describe('isResourceOwner', () => {
    it('should allow admin to access any resource', async () => {
      const adminContext = { ...mockSecurityContext, role: 'admin' as const };

      const result = await isResourceOwner(adminContext, 'company', 'company_123');

      expect(result).toBe(true);
    });

    it('should allow organization members to access organization resources', async () => {
      const result = await isResourceOwner(mockSecurityContext, 'email', 'email_123');

      expect(result).toBe(true);
    });
  });

  describe('validateSessionSecurity', () => {
    it('should validate session with matching metadata', async () => {
      const mockRequest = {} as NextRequest;

      const result = await validateSessionSecurity(mockSecurityContext, mockRequest);

      expect(result).toEqual({
        isValid: true,
        action: 'allow'
      });
    });
  });

  describe('API key helpers', () => {
    it('should validate API keys and CSRF tokens', () => {
      const apiKey = 'api-key-1234567890';
      expect(validateAPIKey(apiKey)).toBe(true);

      const csrfToken = generateCSRFToken();
      expect(validateCSRFToken(csrfToken, csrfToken)).toBe(true);
    });
  });

  describe('Security headers', () => {
    it('should include strict security headers', () => {
      const headers = getSecurityHeaders();

      expect(headers['Content-Security-Policy']).toBeDefined();
      expect(headers['Strict-Transport-Security']).toBeDefined();
    });
  });
});
