import type { Permission, ServerSecuritySession, SessionUserAccess } from '@substack-intelligence/lib/security/session';

const VIEWER_PERMISSIONS: Permission[] = [
  'emails:read',
  'companies:read',
  'reports:read',
  'analytics:view'
];

type SessionState = {
  session: ServerSecuritySession | null;
};

const defaultUser: SessionUserAccess = {
  id: 'test-user-id',
  email: 'test@example.com',
  role: 'viewer',
  permissions: VIEWER_PERMISSIONS,
  isVerified: true,
  organizationId: 'test-org'
};

const state: SessionState = {
  session: null
};

export const securitySessionController = {
  getSession(): ServerSecuritySession | null {
    return state.session;
  },
  setSession(session: ServerSecuritySession | null) {
    state.session = session;
  },
  resetSession() {
    state.session = null;
  },
  getDefaultUser(): SessionUserAccess {
    return { ...defaultUser, permissions: [...defaultUser.permissions] };
  }
};
