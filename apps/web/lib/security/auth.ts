import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { z } from 'zod';

// Permission levels
export enum Permission {
  READ_EMAILS = 'emails:read',
  WRITE_EMAILS = 'emails:write',
  READ_COMPANIES = 'companies:read',
  WRITE_COMPANIES = 'companies:write',
  READ_REPORTS = 'reports:read',
  WRITE_REPORTS = 'reports:write',
  ADMIN_SYSTEM = 'system:admin',
  MANAGE_USERS = 'users:manage',
  VIEW_ANALYTICS = 'analytics:view'
}

// User roles with associated permissions
export const ROLE_PERMISSIONS = {
  admin: [
    Permission.READ_EMAILS,
    Permission.WRITE_EMAILS,
    Permission.READ_COMPANIES,
    Permission.WRITE_COMPANIES,
    Permission.READ_REPORTS,
    Permission.WRITE_REPORTS,
    Permission.ADMIN_SYSTEM,
    Permission.MANAGE_USERS,
    Permission.VIEW_ANALYTICS
  ],
  analyst: [
    Permission.READ_EMAILS,
    Permission.READ_COMPANIES,
    Permission.WRITE_COMPANIES,
    Permission.READ_REPORTS,
    Permission.WRITE_REPORTS,
    Permission.VIEW_ANALYTICS
  ],
  viewer: [
    Permission.READ_EMAILS,
    Permission.READ_COMPANIES,
    Permission.READ_REPORTS,
    Permission.VIEW_ANALYTICS
  ]
} as const;

export type UserRole = keyof typeof ROLE_PERMISSIONS;

export interface SecurityContext {
  userId: string;
  organizationId?: string;
  role: UserRole;
  permissions: Permission[];
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  isVerified: boolean;
}

// Enhanced authentication context
export async function getSecurityContext(request: NextRequest): Promise<SecurityContext | null> {
  try {
    const { userId, sessionId, orgId } = await auth();
    
    if (!userId || !sessionId) {
      return null;
    }

    // Get user details from Clerk
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    
    if (!user) {
      return null;
    }

    // Extract role from user metadata or organization membership
    const role = await getUserRole(userId, orgId);
    const permissions = [...(ROLE_PERMISSIONS[role] || [])];
    
    // Get client information
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ipAddress = forwardedFor?.split(',')[0] || realIp || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    return {
      userId,
      organizationId: orgId || undefined,
      role,
      permissions,
      sessionId,
      ipAddress,
      userAgent,
      isVerified: !!user.emailAddresses.find(email => email.verification?.status === 'verified')
    };
    
  } catch (error) {
    console.error('Failed to get security context:', error);
    return null;
  }
}

export async function getUserRole(userId: string, orgId?: string): Promise<UserRole> {
  try {
    if (orgId) {
      // Get role from organization membership
      const client = await clerkClient();
      const orgMemberships = await client.organizations.getOrganizationMembershipList({
        organizationId: orgId,
        limit: 100
      });
      
      const membership = orgMemberships.data.find(m => m.publicUserData?.userId === userId);
      
      if (membership?.role === 'org:admin') {
        return 'admin';
      } else if (membership?.role === 'org:member') {
        return 'analyst';
      }
    }

    // Get role from user metadata
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const role = user.publicMetadata?.role as UserRole;
    
    return role || 'viewer'; // Default to viewer
    
  } catch (error) {
    console.error('Failed to get user role:', error);
    return 'viewer'; // Fail safe to least privileged role
  }
}

// Permission checking utilities
export function hasPermission(context: SecurityContext, permission: Permission): boolean {
  return context.permissions.includes(permission);
}

export function hasAnyPermission(context: SecurityContext, permissions: Permission[]): boolean {
  return permissions.some(permission => context.permissions.includes(permission));
}

export function hasAllPermissions(context: SecurityContext, permissions: Permission[]): boolean {
  return permissions.every(permission => context.permissions.includes(permission));
}

// Resource ownership validation
export async function isResourceOwner(
  context: SecurityContext,
  resourceType: 'email' | 'company' | 'report',
  resourceId: string
): Promise<boolean> {
  try {
    // Admin can access everything
    if (context.role === 'admin') {
      return true;
    }

    // For organization resources, check organization membership
    if (context.organizationId) {
      // Implement organization-based resource ownership check
      // This would query your database to verify ownership
      return true; // Placeholder - implement actual logic
    }

    // For personal resources, check user ownership
    // Implement user-based resource ownership check
    return true; // Placeholder - implement actual logic
    
  } catch (error) {
    console.error('Failed to check resource ownership:', error);
    return false; // Fail safe
  }
}

// Session security validation
export interface SessionSecurityCheck {
  isValid: boolean;
  reason?: string;
  action: 'allow' | 'challenge' | 'deny';
}

export async function validateSessionSecurity(
  context: SecurityContext,
  request: NextRequest
): Promise<SessionSecurityCheck> {
  try {
    // Check if IP address has changed significantly
    const currentIp = context.ipAddress;
    const sessionData = await getStoredSessionData(context.sessionId);
    
    if (sessionData?.ipAddress && sessionData.ipAddress !== currentIp) {
      // Allow different IPs within reasonable geographic proximity
      if (!await isIPLocationSimilar(sessionData.ipAddress, currentIp)) {
        return {
          isValid: false,
          reason: 'IP address changed to different location',
          action: 'challenge'
        };
      }
    }

    // Check for suspicious user agent changes
    if (sessionData?.userAgent && sessionData.userAgent !== context.userAgent) {
      return {
        isValid: false,
        reason: 'User agent changed',
        action: 'challenge'
      };
    }

    // Check session age
    const sessionAge = Date.now() - (sessionData?.createdAt || Date.now());
    const maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours
    
    if (sessionAge > maxSessionAge) {
      return {
        isValid: false,
        reason: 'Session expired',
        action: 'deny'
      };
    }

    return {
      isValid: true,
      action: 'allow'
    };
    
  } catch (error) {
    console.error('Session security validation failed:', error);
    return {
      isValid: false,
      reason: 'Security check failed',
      action: 'challenge'
    };
  }
}

// Session data management (implement with your preferred storage)
interface StoredSessionData {
  sessionId: string;
  userId: string;
  ipAddress: string;
  userAgent: string;
  createdAt: number;
  lastActivity: number;
}

async function getStoredSessionData(sessionId: string): Promise<StoredSessionData | null> {
  // Implement session data retrieval from Redis or database
  return null; // Placeholder
}

async function storeSessionData(sessionData: StoredSessionData): Promise<void> {
  // Implement session data storage
  // Store in Redis with TTL or database
}

async function isIPLocationSimilar(ip1: string, ip2: string): Promise<boolean> {
  // Implement geolocation comparison
  // Return true if IPs are from similar locations (same city/region)
  return true; // Placeholder
}

// Input sanitization for auth-related data
export const AuthInputSchema = z.object({
  email: z.string().email().max(254),
  organizationSlug: z.string().regex(/^[a-z0-9-]+$/).max(50).optional(),
  inviteCode: z.string().regex(/^[A-Z0-9]{8}$/).optional()
});

// Security headers for API responses
export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
  };
}

// CSRF protection helpers
export function generateCSRFToken(sessionId: string): string {
  // Generate cryptographically secure CSRF token
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const token = btoa(String.fromCharCode.apply(null, Array.from(array)));
  
  // Store token associated with session (implement with your storage)
  // storeCSRFToken(sessionId, token);
  
  return token;
}

export async function validateCSRFToken(sessionId: string, token: string): Promise<boolean> {
  // Validate CSRF token against stored value
  // const storedToken = await getStoredCSRFToken(sessionId);
  // return storedToken === token;
  return true; // Placeholder
}

// API key management for service-to-service authentication
export interface APIKeyContext {
  keyId: string;
  serviceName: string;
  permissions: Permission[];
  rateLimit: number;
  expiresAt?: Date;
}

export async function validateAPIKey(apiKey: string): Promise<APIKeyContext | null> {
  try {
    // Validate API key format
    if (!apiKey.startsWith('sk_') || apiKey.length < 32) {
      return null;
    }

    // Lookup API key in secure storage
    // This would typically be hashed and stored in database
    // const keyData = await getAPIKeyData(apiKey);
    
    return null; // Placeholder - implement actual API key validation
    
  } catch (error) {
    console.error('API key validation failed:', error);
    return null;
  }
}