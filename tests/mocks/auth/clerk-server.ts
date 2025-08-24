import { vi } from 'vitest';

// Server-only Clerk mocks - no client-side dependencies
// This file is specifically aliased in vitest.config.api.ts to handle @clerk/nextjs/server imports

export const currentUser = vi.fn(() => Promise.resolve({
  id: 'test-user-id',
  firstName: 'Test',
  lastName: 'User',
  emailAddress: 'test@example.com',
  primaryEmailAddress: {
    emailAddress: 'test@example.com'
  },
  imageUrl: 'https://example.com/avatar.png',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  lastSignInAt: new Date('2024-01-01T00:00:00Z'),
  publicMetadata: {},
  privateMetadata: {},
  unsafeMetadata: {}
}));

export const auth = vi.fn(() => ({
  userId: 'test-user-id',
  sessionId: 'test-session-id',
  orgId: null,
  orgRole: null,
  orgSlug: null,
  orgPermissions: [],
  sessionClaims: {}
}));

// Webhook verification mock for server-side use
export const verifyToken = vi.fn(() => Promise.resolve({
  sub: 'test-user-id',
  email: 'test@example.com',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
  iss: 'https://clerk.test.com',
  nbf: Math.floor(Date.now() / 1000)
}));

// Helper functions for tests
export const mockSignedInUser = (overrides?: any) => {
  const user = {
    id: 'test-user-id',
    firstName: 'Test',
    lastName: 'User',
    emailAddress: 'test@example.com',
    ...overrides
  };
  
  currentUser.mockResolvedValueOnce(user);
  auth.mockReturnValueOnce({
    userId: user.id,
    sessionId: 'test-session-id',
    orgId: null,
    orgRole: null,
    orgSlug: null,
    orgPermissions: [],
    sessionClaims: {}
  });
  
  return user;
};

export const mockSignedOutUser = () => {
  currentUser.mockResolvedValueOnce(null);
  auth.mockReturnValueOnce({
    userId: null,
    sessionId: null,
    orgId: null,
    orgRole: null,
    orgSlug: null,
    orgPermissions: [],
    sessionClaims: {}
  });
};

export const resetMocks = () => {
  currentUser.mockReset();
  auth.mockReset();
  verifyToken.mockReset();
  
  // Reset to default behavior
  currentUser.mockResolvedValue({
    id: 'test-user-id',
    firstName: 'Test',
    lastName: 'User',
    emailAddress: 'test@example.com',
    primaryEmailAddress: {
      emailAddress: 'test@example.com'
    },
    imageUrl: 'https://example.com/avatar.png',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    lastSignInAt: new Date('2024-01-01T00:00:00Z'),
    publicMetadata: {},
    privateMetadata: {},
    unsafeMetadata: {}
  });
  
  auth.mockReturnValue({
    userId: 'test-user-id',
    sessionId: 'test-session-id',
    orgId: null,
    orgRole: null,
    orgSlug: null,
    orgPermissions: [],
    sessionClaims: {}
  });
};