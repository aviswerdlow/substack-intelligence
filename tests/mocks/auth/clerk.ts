import { vi } from 'vitest';

// Type definitions for Clerk entities
export interface MockUser {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  emailAddress?: string;
  primaryEmailAddress?: {
    emailAddress: string;
  };
  imageUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
  lastSignInAt?: Date;
  publicMetadata?: Record<string, any>;
  privateMetadata?: Record<string, any>;
  unsafeMetadata?: Record<string, any>;
}

export interface MockSession {
  id: string;
  userId: string;
  status: 'active' | 'ended' | 'abandoned' | 'revoked';
  expireAt: Date;
  abandonAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockOrganization {
  id: string;
  name: string;
  slug?: string;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  publicMetadata?: Record<string, any>;
  privateMetadata?: Record<string, any>;
}

export interface MockAuth {
  userId: string | null;
  sessionId: string | null;
  orgId?: string | null;
  orgRole?: string | null;
  orgSlug?: string | null;
  orgPermissions?: string[];
  sessionClaims?: Record<string, any>;
}

// Configuration interface for mock behavior
interface ClerkMockConfig {
  currentUser?: MockUser | null;
  auth?: MockAuth;
  isSignedIn?: boolean;
  organization?: MockOrganization | null;
  session?: MockSession | null;
}

class ClerkMocks {
  private _config: ClerkMockConfig = {
    currentUser: null,
    auth: { userId: null, sessionId: null },
    isSignedIn: false,
    organization: null,
    session: null
  };

  // Configuration methods
  setCurrentUser(user: MockUser | null): void {
    this._config.currentUser = user;
    this._config.isSignedIn = !!user;
    if (user) {
      this._config.auth = {
        userId: user.id,
        sessionId: 'mock-session-id',
        sessionClaims: {}
      };
    } else {
      this._config.auth = { userId: null, sessionId: null };
    }
  }

  setAuth(auth: Partial<MockAuth>): void {
    this._config.auth = { ...this._config.auth, ...auth };
  }

  setOrganization(organization: MockOrganization | null): void {
    this._config.organization = organization;
    if (organization && this._config.auth) {
      this._config.auth.orgId = organization.id;
      this._config.auth.orgSlug = organization.slug;
    }
  }

  setSession(session: MockSession | null): void {
    this._config.session = session;
    if (session && this._config.auth) {
      this._config.auth.sessionId = session.id;
    }
  }

  signIn(user: MockUser): void {
    this.setCurrentUser(user);
    this.setSession({
      id: 'mock-session-id',
      userId: user.id,
      status: 'active',
      expireAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  signOut(): void {
    this.setCurrentUser(null);
    this.setSession(null);
    this.setOrganization(null);
  }

  reset(): void {
    this._config = {
      currentUser: null,
      auth: { userId: null, sessionId: null },
      isSignedIn: false,
      organization: null,
      session: null
    };
  }

  // Mock implementations
  currentUser = vi.fn(() => {
    return Promise.resolve(this._config.currentUser);
  });

  auth = vi.fn(() => {
    return this._config.auth;
  });

  useUser = vi.fn(() => ({
    user: this._config.currentUser,
    isSignedIn: this._config.isSignedIn,
    isLoaded: true
  }));

  useAuth = vi.fn(() => ({
    ...this._config.auth,
    isSignedIn: this._config.isSignedIn,
    isLoaded: true,
    signOut: vi.fn(() => {
      this.signOut();
      return Promise.resolve();
    })
  }));

  useSession = vi.fn(() => ({
    session: this._config.session,
    isLoaded: true
  }));

  useOrganization = vi.fn(() => ({
    organization: this._config.organization,
    isLoaded: true
  }));

  useOrganizationList = vi.fn(() => ({
    organizationList: this._config.organization ? [this._config.organization] : [],
    isLoaded: true,
    setActive: vi.fn()
  }));

  // Component mocks
  SignedIn = vi.fn(({ children }: { children: any }) => {
    return this._config.isSignedIn ? children : null;
  });

  SignedOut = vi.fn(({ children }: { children: any }) => {
    return !this._config.isSignedIn ? children : null;
  });

  ClerkProvider = vi.fn(({ children }: { children: any }) => children);

  SignInButton = vi.fn(({ children }: { children?: any }) => 
    children || vi.fn(() => 'Sign In')
  );

  SignOutButton = vi.fn(({ children }: { children?: any }) => 
    children || vi.fn(() => 'Sign Out')
  );

  SignUpButton = vi.fn(({ children }: { children?: any }) => 
    children || vi.fn(() => 'Sign Up')
  );

  UserButton = vi.fn(() => 'UserButton');

  OrganizationSwitcher = vi.fn(() => 'OrganizationSwitcher');

  // Webhook verification mock
  verifyToken = vi.fn(() => {
    return Promise.resolve({
      sub: this._config.currentUser?.id || 'test-user-id',
      email: this._config.currentUser?.emailAddress || 'test@example.com',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      iss: 'https://clerk.test.com',
      nbf: Math.floor(Date.now() / 1000)
    });
  });

  // Organization management mocks
  createOrganization = vi.fn(async (params: { name: string; slug?: string }) => {
    const org: MockOrganization = {
      id: `org_${Math.random().toString(36).substring(7)}`,
      name: params.name,
      slug: params.slug || params.name.toLowerCase().replace(/\s+/g, '-'),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.setOrganization(org);
    return org;
  });

  // Test utilities
  createTestUser(overrides?: Partial<MockUser>): MockUser {
    return {
      id: 'test-user-id',
      firstName: 'Test',
      lastName: 'User',
      emailAddress: 'test@example.com',
      primaryEmailAddress: {
        emailAddress: 'test@example.com'
      },
      imageUrl: 'https://example.com/avatar.png',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignInAt: new Date(),
      publicMetadata: {},
      privateMetadata: {},
      unsafeMetadata: {},
      ...overrides
    };
  }

  createTestOrganization(overrides?: Partial<MockOrganization>): MockOrganization {
    return {
      id: 'test-org-id',
      name: 'Test Organization',
      slug: 'test-org',
      imageUrl: 'https://example.com/org-logo.png',
      createdAt: new Date(),
      updatedAt: new Date(),
      publicMetadata: {},
      privateMetadata: {},
      ...overrides
    };
  }

  // Helper methods for test scenarios
  mockSignedInUser(user?: Partial<MockUser>): MockUser {
    const testUser = this.createTestUser(user);
    this.signIn(testUser);
    return testUser;
  }

  mockSignedOutUser(): void {
    this.signOut();
  }

  mockUserWithOrganization(
    userOverrides?: Partial<MockUser>, 
    orgOverrides?: Partial<MockOrganization>
  ): { user: MockUser; organization: MockOrganization } {
    const user = this.createTestUser(userOverrides);
    const organization = this.createTestOrganization(orgOverrides);
    
    this.signIn(user);
    this.setOrganization(organization);
    
    return { user, organization };
  }

  // Reset all mocks
  resetAllMocks(): void {
    Object.getOwnPropertyNames(this)
      .filter(name => typeof (this as any)[name]?.mockReset === 'function')
      .forEach(name => (this as any)[name].mockReset());
    
    this.reset();
  }
}

// Export singleton instance
export const clerkMocks = new ClerkMocks();

// Export individual mocks for direct use
export const {
  currentUser,
  auth,
  useUser,
  useAuth,
  useSession,
  useOrganization,
  useOrganizationList,
  SignedIn,
  SignedOut,
  ClerkProvider,
  SignInButton,
  SignOutButton,
  SignUpButton,
  UserButton,
  OrganizationSwitcher,
  verifyToken,
  createOrganization
} = clerkMocks;

// Mock implementations for vi.mock()
export const clerkNextjsMocks = {
  currentUser,
  auth,
  SignedIn,
  SignedOut,
  ClerkProvider,
  SignInButton,
  SignOutButton,
  SignUpButton,
  UserButton,
  OrganizationSwitcher
};

export const clerkReactMocks = {
  useUser,
  useAuth,
  useSession,
  useOrganization,
  useOrganizationList,
  SignedIn,
  SignedOut,
  ClerkProvider,
  SignInButton,
  SignOutButton,
  SignUpButton,
  UserButton,
  OrganizationSwitcher
};

export const clerkServerMocks = {
  currentUser,
  auth,
  verifyToken
};

// Pre-configured test scenarios
export const testScenarios = {
  signedOutUser: () => {
    clerkMocks.mockSignedOutUser();
  },
  
  signedInUser: (overrides?: Partial<MockUser>) => {
    return clerkMocks.mockSignedInUser(overrides);
  },
  
  userWithOrganization: (
    userOverrides?: Partial<MockUser>, 
    orgOverrides?: Partial<MockOrganization>
  ) => {
    return clerkMocks.mockUserWithOrganization(userOverrides, orgOverrides);
  }
};