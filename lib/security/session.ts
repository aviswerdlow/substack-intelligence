import { createHash } from 'node:crypto';

import { createServiceRoleClientSafe } from '@substack-intelligence/database';
import { getServerSession } from 'next-auth';
import type { Session } from 'next-auth';

import { authOptions } from '@/lib/auth';

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

export interface SessionUserAccess {
  id: string;
  email?: string;
  role: UserRole;
  permissions: Permission[];
  isVerified: boolean;
  organizationId?: string;
}

export interface ServerSecuritySession {
  session: Session;
  user: SessionUserAccess;
  rememberMe: boolean;
  sessionId: string;
}

interface SupabaseUserSettingsRow {
  account_settings?: {
    role?: string;
    permissions?: string[];
    organizationId?: string;
  } | null;
  permissions?: string[] | null;
  organization_id?: string | null;
}

interface SupabaseUserMetadata {
  role?: string;
  permissions?: string[];
  organizationId?: string;
}

interface SupabaseUserProfileResult {
  role?: UserRole;
  permissions?: Permission[];
  isVerified?: boolean;
  organizationId?: string;
}

export async function getServerSecuritySession(): Promise<ServerSecuritySession | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  const baseRole = normalizeRole((session.user as { role?: string | null }).role);
  const rememberMe = Boolean((session as { rememberMe?: boolean }).rememberMe);
  const sessionEmailVerified = extractSessionVerification(session);

  const accessProfile = await loadUserAccessFromSupabase(
    session.user.id,
    baseRole,
    sessionEmailVerified
  );
  const resolvedRole = accessProfile.role ?? baseRole;
  const resolvedPermissions = accessProfile.permissions ?? ROLE_PERMISSIONS[resolvedRole];
  const resolvedIsVerified =
    typeof accessProfile.isVerified === 'boolean' ? accessProfile.isVerified : sessionEmailVerified;

  const sessionId = createHash('sha256')
    .update(`${session.user.id}:${session.expires ?? ''}`)
    .digest('hex');

  return {
    session,
    rememberMe,
    sessionId,
    user: {
      id: session.user.id,
      email: session.user.email ?? undefined,
      role: resolvedRole,
      permissions: resolvedPermissions,
      isVerified: resolvedIsVerified,
      organizationId: accessProfile.organizationId
    }
  };
}

export async function fetchUserAccessProfile(userId: string, fallbackRole: UserRole = 'viewer'): Promise<SessionUserAccess> {
  const accessProfile = await loadUserAccessFromSupabase(userId, fallbackRole, false);
  const resolvedRole = accessProfile.role ?? fallbackRole;
  const resolvedPermissions = accessProfile.permissions ?? ROLE_PERMISSIONS[resolvedRole];
  const resolvedIsVerified = typeof accessProfile.isVerified === 'boolean' ? accessProfile.isVerified : false;

  return {
    id: userId,
    role: resolvedRole,
    permissions: resolvedPermissions,
    isVerified: resolvedIsVerified,
    organizationId: accessProfile.organizationId
  };
}

export function normalizeRole(role?: string | null): UserRole {
  if (!role) {
    return 'viewer';
  }

  const normalized = role.toLowerCase();

  if (normalized in ROLE_PERMISSIONS) {
    return normalized as UserRole;
  }

  switch (normalized) {
    case 'user':
    case 'reader':
      return 'viewer';
    case 'editor':
    case 'manager':
      return 'analyst';
    case 'owner':
    case 'superadmin':
      return 'admin';
    default:
      return 'viewer';
  }
}

function isValidPermission(value: unknown): value is Permission {
  return typeof value === 'string' && Object.values(Permission).includes(value as Permission);
}

async function loadUserAccessFromSupabase(
  userId: string,
  fallbackRole: UserRole,
  fallbackVerified: boolean
): Promise<SupabaseUserProfileResult> {
  const supabase = createServiceRoleClientSafe();

  if (!supabase) {
    return {
      role: fallbackRole,
      permissions: ROLE_PERMISSIONS[fallbackRole],
      isVerified: fallbackVerified
    };
  }

  const [settingsResult, userResult] = await Promise.allSettled([
    supabase
      .from('user_settings')
      .select('account_settings, permissions, organization_id')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase.auth.admin.getUserById(userId)
  ]);

  let role: UserRole | undefined;
  let permissions: Permission[] | undefined;
  let organizationId: string | undefined;
  let isVerified: boolean | undefined;

  if (settingsResult.status === 'fulfilled' && settingsResult.value.data) {
    const settings = settingsResult.value.data as SupabaseUserSettingsRow;

    const accountSettings = settings.account_settings ?? undefined;
    if (accountSettings?.role) {
      role = normalizeRole(accountSettings.role);
    }
    if (accountSettings?.permissions && Array.isArray(accountSettings.permissions)) {
      permissions = accountSettings.permissions.filter(isValidPermission);
    }
    if (accountSettings?.organizationId && typeof accountSettings.organizationId === 'string') {
      organizationId = accountSettings.organizationId;
    }

    if (settings.permissions && Array.isArray(settings.permissions)) {
      const explicitPermissions = settings.permissions.filter(isValidPermission);
      permissions = mergePermissions(permissions, explicitPermissions);
    }

    if (settings.organization_id) {
      organizationId = settings.organization_id;
    }
  }

  if (userResult.status === 'fulfilled' && userResult.value.data?.user) {
    const { user } = userResult.value.data;
    const metadata = (user.user_metadata ?? {}) as SupabaseUserMetadata;

    if (!role && metadata.role) {
      role = normalizeRole(metadata.role);
    }

    const metadataPermissions = Array.isArray(metadata.permissions)
      ? metadata.permissions.filter(isValidPermission)
      : undefined;
    if (metadataPermissions?.length) {
      permissions = mergePermissions(permissions, metadataPermissions);
    }

    if (!organizationId && typeof metadata.organizationId === 'string') {
      organizationId = metadata.organizationId;
    }

    if (user.email_confirmed_at || user.last_sign_in_at) {
      isVerified = true;
    }
  }

  if (!role) {
    role = fallbackRole;
  }

  return {
    role,
    permissions: permissions && permissions.length > 0 ? Array.from(new Set(permissions)) : ROLE_PERMISSIONS[role],
    isVerified: typeof isVerified === 'boolean' ? isVerified : fallbackVerified,
    organizationId
  };
}

function extractSessionVerification(session: Session): boolean {
  const user = session.user as {
    emailVerified?: boolean | string | Date | null;
    email_verified?: boolean | string | Date | null;
    emailConfirmedAt?: string | null;
  };

  const rawValue = user?.emailVerified ?? user?.email_verified ?? user?.emailConfirmedAt ?? null;

  if (typeof rawValue === 'boolean') {
    return rawValue;
  }

  if (rawValue instanceof Date) {
    return true;
  }

  if (typeof rawValue === 'string') {
    return rawValue.length > 0;
  }

  return false;
}

function mergePermissions(
  current: Permission[] | undefined,
  additional: Permission[] | undefined
): Permission[] | undefined {
  if ((!current || current.length === 0) && (!additional || additional.length === 0)) {
    return undefined;
  }

  const set = new Set<Permission>();
  if (current) {
    current.forEach(permission => set.add(permission));
  }
  if (additional) {
    additional.forEach(permission => set.add(permission));
  }

  return Array.from(set);
}
