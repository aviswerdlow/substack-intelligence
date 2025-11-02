import { vi } from 'vitest';
import type { SessionUserAccess, ServerSecuritySession } from '@substack-intelligence/lib/security/session';
import { securitySessionController } from './security-session-controller';

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

interface MockAuthState {
  currentUser: MockUser | null;
  organization: MockOrganization | null;
  session: ServerSecuritySession | null;
}

const createSessionForUser = (user: MockUser): ServerSecuritySession => {
  const sessionUser: SessionUserAccess = {
    id: user.id,
    email: user.emailAddress || user.primaryEmailAddress?.emailAddress || 'test@example.com',
    role: 'viewer',
    permissions: securitySessionController.getDefaultUser().permissions,
    isVerified: true,
    organizationId: securitySessionController.getDefaultUser().organizationId
  };

  return {
    session: {
      user: {
        id: sessionUser.id,
        email: sessionUser.email
      }
    } as any,
    user: sessionUser,
    rememberMe: false,
    sessionId: 'mock-session-id'
  };
};

class AuthMocks {
  private state: MockAuthState = {
    currentUser: null,
    organization: null,
    session: securitySessionController.getSession()
  };

  private buildDefaultUser(overrides?: Partial<MockUser>): MockUser {
    return {
      id: overrides?.id || 'user_123',
      firstName: overrides?.firstName ?? 'Test',
      lastName: overrides?.lastName ?? 'User',
      emailAddress: overrides?.emailAddress ?? 'test@example.com',
      primaryEmailAddress: {
        emailAddress: overrides?.emailAddress ?? 'test@example.com'
      },
      imageUrl: overrides?.imageUrl ?? 'https://example.com/avatar.png',
      createdAt: overrides?.createdAt ?? new Date('2024-01-01T00:00:00Z'),
      updatedAt: overrides?.updatedAt ?? new Date('2024-01-01T00:00:00Z'),
      lastSignInAt: overrides?.lastSignInAt ?? new Date('2024-01-01T00:00:00Z'),
      publicMetadata: overrides?.publicMetadata ?? {},
      privateMetadata: overrides?.privateMetadata ?? {},
      unsafeMetadata: overrides?.unsafeMetadata ?? {}
    };
  }

  private buildDefaultOrganization(overrides?: Partial<MockOrganization>): MockOrganization {
    return {
      id: overrides?.id || 'org_123',
      name: overrides?.name || 'Test Organization',
      slug: overrides?.slug || 'test-org',
      imageUrl: overrides?.imageUrl || 'https://example.com/org.png',
      createdAt: overrides?.createdAt ?? new Date('2024-01-01T00:00:00Z'),
      updatedAt: overrides?.updatedAt ?? new Date('2024-01-01T00:00:00Z'),
      publicMetadata: overrides?.publicMetadata ?? {},
      privateMetadata: overrides?.privateMetadata ?? {}
    };
  }

  createTestUser(overrides?: Partial<MockUser>): MockUser {
    return this.buildDefaultUser(overrides);
  }

  createOrganization(overrides?: Partial<MockOrganization>): MockOrganization {
    return this.buildDefaultOrganization(overrides);
  }

  private updateSession(session: ServerSecuritySession | null) {
    this.state.session = session;
    securitySessionController.setSession(session);
  }

  signIn(user: MockUser): void {
    this.state.currentUser = user;
    this.updateSession(createSessionForUser(user));
  }

  signOut(): void {
    this.state.currentUser = null;
    this.state.organization = null;
    this.updateSession(null);
  }

  setOrganization(organization: MockOrganization | null): void {
    this.state.organization = organization;
  }

  mockSignedInUser(overrides?: Partial<MockUser>): MockUser {
    const user = this.createTestUser(overrides);
    this.signIn(user);
    return user;
  }

  mockSignedOutUser(): void {
    this.signOut();
  }

  mockUserWithOrganization(
    userOverrides?: Partial<MockUser>,
    orgOverrides?: Partial<MockOrganization>
  ): { user: MockUser; organization: MockOrganization } {
    const user = this.createTestUser(userOverrides);
    const organization = this.createOrganization(orgOverrides);

    this.signIn(user);
    this.setOrganization(organization);

    return { user, organization };
  }

  reset(): void {
    this.state = {
      currentUser: null,
      organization: null,
      session: securitySessionController.getSession()
    };
  }

  resetAllMocks(): void {
    this.reset();
    this.mockSignedOutUser();
  }

  // Mocked SDK methods
  currentUser = vi.fn(async () => this.state.currentUser);

  auth = vi.fn(() => ({
    userId: this.state.currentUser?.id ?? null,
    sessionId: this.state.session?.sessionId ?? null,
    orgId: this.state.organization?.id ?? null,
    orgRole: null,
    orgSlug: this.state.organization?.slug ?? null,
    orgPermissions: [],
    sessionClaims: {}
  }));

  useUser = vi.fn(() => ({
    user: this.state.currentUser,
    isSignedIn: !!this.state.currentUser,
    isLoaded: true
  }));

  useAuth = vi.fn(() => ({
    userId: this.state.currentUser?.id ?? null,
    sessionId: this.state.session?.sessionId ?? null,
    isSignedIn: !!this.state.currentUser,
    isLoaded: true,
    signOut: vi.fn(async () => {
      this.signOut();
    })
  }));

  useSession = vi.fn(() => ({
    session: this.state.session,
    isLoaded: true
  }));

  useOrganization = vi.fn(() => ({
    organization: this.state.organization,
    isLoaded: true
  }));

  useOrganizationList = vi.fn(() => ({
    organizationList: this.state.organization ? [this.state.organization] : [],
    isLoaded: true,
    setActive: vi.fn()
  }));

  SignedIn = vi.fn(({ children }: { children: any }) => (this.state.currentUser ? children : null));
  SignedOut = vi.fn(({ children }: { children: any }) => (!this.state.currentUser ? children : null));
  ClerkProvider = vi.fn(({ children }: { children: any }) => children);
  SignInButton = vi.fn(({ children }: { children?: any }) => (children ? children : 'Sign In'));
  SignOutButton = vi.fn(({ children }: { children?: any }) => (children ? children : 'Sign Out'));
  SignUpButton = vi.fn(({ children }: { children?: any }) => (children ? children : 'Sign Up'));
  UserButton = vi.fn(() => 'UserButton');
  OrganizationSwitcher = vi.fn(() => 'OrganizationSwitcher');
  verifyToken = vi.fn(() => ({
    sub: this.state.currentUser?.id ?? 'test-user-id',
    email: this.state.currentUser?.emailAddress ?? 'test@example.com',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    iss: 'https://auth.test.local',
    nbf: Math.floor(Date.now() / 1000)
  }));
}

export const clerkMocks = new AuthMocks();

export const currentUser = clerkMocks.currentUser.bind(clerkMocks);
export const auth = clerkMocks.auth.bind(clerkMocks);
export const useUser = clerkMocks.useUser.bind(clerkMocks);
export const useAuth = clerkMocks.useAuth.bind(clerkMocks);
export const useSession = clerkMocks.useSession.bind(clerkMocks);
export const useOrganization = clerkMocks.useOrganization.bind(clerkMocks);
export const useOrganizationList = clerkMocks.useOrganizationList.bind(clerkMocks);
export const SignedIn = clerkMocks.SignedIn.bind(clerkMocks);
export const SignedOut = clerkMocks.SignedOut.bind(clerkMocks);
export const ClerkProvider = clerkMocks.ClerkProvider.bind(clerkMocks);
export const SignInButton = clerkMocks.SignInButton.bind(clerkMocks);
export const SignOutButton = clerkMocks.SignOutButton.bind(clerkMocks);
export const SignUpButton = clerkMocks.SignUpButton.bind(clerkMocks);
export const UserButton = clerkMocks.UserButton.bind(clerkMocks);
export const OrganizationSwitcher = clerkMocks.OrganizationSwitcher.bind(clerkMocks);
export const verifyToken = clerkMocks.verifyToken.bind(clerkMocks);
export const createOrganization = clerkMocks.createOrganization.bind(clerkMocks);

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
