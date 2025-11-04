import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { SupabaseAdapter } from '@auth/supabase-adapter';
import type { Adapter } from 'next-auth/adapters';
import type { Account, NextAuthOptions, User as NextAuthUser } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import type { Provider } from 'next-auth/providers';
import { NextRequest } from 'next/server';
import { persistGmailTokens } from '@substack-intelligence/lib/gmail-tokens';
import { checkRateLimit } from '@/lib/security/rate-limiting';
import { z } from 'zod';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const AUTH_DEBUG_ENABLED = process.env.AUTH_DEBUG === 'true';
const authDebugLog = (...messages: unknown[]) => {
  if (AUTH_DEBUG_ENABLED) {
    console.log('[auth][debug]', ...messages);
  }
};

const isPlaceholderValue = (value?: string | null) => {
  if (!value) {
    return true;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return true;
  }

  return /placeholder/i.test(trimmed);
};

const vercelEnv = process.env.VERCEL_ENV;
const isNonProductionRuntime =
  process.env.NODE_ENV !== 'production' || (vercelEnv && vercelEnv !== 'production');

const DEVELOPMENT_AUTH_ENABLED =
  isNonProductionRuntime &&
  (isPlaceholderValue(SUPABASE_URL) ||
    isPlaceholderValue(SUPABASE_ANON_KEY) ||
    isPlaceholderValue(SUPABASE_SERVICE_ROLE_KEY));

let hasLoggedDevelopmentAuthFallback = false;

authDebugLog('Auth configuration detected', {
  nodeEnv: process.env.NODE_ENV,
  vercelEnv: vercelEnv || 'local',
  hasSupabaseUrl: Boolean(SUPABASE_URL) && !isPlaceholderValue(SUPABASE_URL),
  hasSupabaseAnonKey: Boolean(SUPABASE_ANON_KEY) && !isPlaceholderValue(SUPABASE_ANON_KEY),
  hasSupabaseServiceKey:
    Boolean(SUPABASE_SERVICE_ROLE_KEY) && !isPlaceholderValue(SUPABASE_SERVICE_ROLE_KEY),
  developmentAuthEnabled: DEVELOPMENT_AUTH_ENABLED
});

const DEFAULT_SESSION_MAX_AGE = 60 * 60 * 24; // 24 hours
const REMEMBER_ME_SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export const supportedRoles = ['reader', 'writer', 'admin'] as const;

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  remember: z.union([z.string(), z.boolean()]).optional(),
});

const registrationSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(120),
  role: z.enum(supportedRoles).default('reader'),
});

const passwordResetRequestSchema = z.object({
  email: z.string().email(),
});

const passwordResetSchema = z.object({
  email: z.string().email(),
  token: z.string().min(4),
  password: z.string().min(8),
});

const createSupabaseClient = (key?: string, options?: Parameters<typeof createClient>[2]) => {
  if (!SUPABASE_URL || !key) {
    return null;
  }

  if (isPlaceholderValue(SUPABASE_URL) || isPlaceholderValue(key)) {
    return null;
  }

  return createClient(SUPABASE_URL, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: 'public',
    },
    ...options,
  });
};

const supabaseAdminClient = createSupabaseClient(SUPABASE_SERVICE_ROLE_KEY);
const supabaseClient = createSupabaseClient(SUPABASE_ANON_KEY);

export const getSupabaseAdminClient = (): SupabaseClient | null => supabaseAdminClient;
export const getSupabaseClient = (): SupabaseClient | null => supabaseClient;

export class AuthConfigurationError extends Error {}
export class AuthRateLimitError extends Error {
  constructor(message: string, public readonly retryAfter: number) {
    super(message);
    this.name = 'AuthRateLimitError';
  }
}

interface AuthenticatedUser extends NextAuthUser {
  role?: string;
  rememberMe?: boolean;
}

function parseRememberValue(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value === 'true' || value === '1' || value.toLowerCase() === 'on';
  }
  return false;
}

function resolveDevelopmentUser(email: string, password: string, remember: boolean): AuthenticatedUser | null {
  if (!DEVELOPMENT_AUTH_ENABLED) {
    return null;
  }

  const devEmail = (process.env.TEST_USER_EMAIL || 'test@example.com').toLowerCase();
  const devPassword = process.env.TEST_USER_PASSWORD || 'TestPassword123!';

  if (email.toLowerCase() !== devEmail || password !== devPassword) {
    authDebugLog('Development auth attempt rejected', {
      email: email.toLowerCase()
    });
    return null;
  }

  if (!hasLoggedDevelopmentAuthFallback) {
    console.warn(
      '[auth] Using development fallback authentication. Configure Supabase credentials to disable this pathway.'
    );
    authDebugLog('Development fallback authentication activated', {
      email: devEmail
    });
    hasLoggedDevelopmentAuthFallback = true;
  }

  const availableRoles = supportedRoles as readonly string[];
  const requestedRole = (process.env.TEST_USER_ROLE || 'admin').toLowerCase();
  const role = availableRoles.includes(requestedRole)
    ? (requestedRole as (typeof supportedRoles)[number])
    : 'admin';

  return {
    id: process.env.TEST_USER_ID || 'dev-user-0001',
    email: devEmail,
    name: process.env.TEST_USER_NAME || 'Local Development User',
    role,
    rememberMe: remember,
  };
}

async function persistGmailTokensFromAccount(user: NextAuthUser, account?: Account | null): Promise<void> {
  if (!account || account.provider !== 'google') {
    return;
  }

  const userId = user.id;
  if (!userId) {
    return;
  }

  const refreshToken = account.refresh_token ?? null;
  const accessToken = account.access_token ?? null;
  const expiresAt = account.expires_at ?? null;

  if (!refreshToken && !accessToken) {
    return;
  }

  try {
    await persistGmailTokens(userId, {
      refreshToken,
      accessToken,
      expiresAt,
      email: user.email ?? null,
      connected: true,
    });
  } catch (error) {
    console.error('[auth] Failed to persist Gmail OAuth tokens', error);
  }
}

async function enforceAuthRateLimit(request?: Request, endpoint: string = 'auth/signin') {
  if (!request) {
    return;
  }

  try {
    const nextRequest = new NextRequest(request.url, {
      headers: request.headers,
      method: request.method,
    });

    const result = await checkRateLimit(nextRequest, endpoint);

    if (!result.success) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((result.reset.getTime() - Date.now()) / 1000),
      );
      throw new AuthRateLimitError(
        'Too many authentication attempts. Please try again later.',
        retryAfterSeconds,
      );
    }
  } catch (error) {
    if (error instanceof AuthRateLimitError) {
      throw error;
    }

    // If rate limiting infrastructure is unavailable, fail open with logging
    console.warn('Failed to enforce auth rate limit:', error);
  }
}

const buildAdapter = (): Adapter | undefined => {
  if (
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY ||
    isPlaceholderValue(SUPABASE_URL) ||
    isPlaceholderValue(SUPABASE_SERVICE_ROLE_KEY)
  ) {
    console.warn('[auth] Supabase adapter disabled: missing credentials');
    authDebugLog('Supabase adapter disabled', {
      hasSupabaseUrl: Boolean(SUPABASE_URL) && !isPlaceholderValue(SUPABASE_URL),
      hasServiceRoleKey: Boolean(SUPABASE_SERVICE_ROLE_KEY) && !isPlaceholderValue(SUPABASE_SERVICE_ROLE_KEY)
    });
    return undefined;
  }

  authDebugLog('Supabase adapter enabled');

  return SupabaseAdapter({
    url: SUPABASE_URL,
    secret: SUPABASE_SERVICE_ROLE_KEY,
    schema: 'public',
  });
};

const buildSocialProviders = (): Provider[] => {
  const providers: Provider[] = [];

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push(
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        checks: ['pkce'],
        state: false,
        allowDangerousEmailAccountLinking: false,
        authorization: {
          params: {
            prompt: 'consent',
            access_type: 'offline',
            response_type: 'code',
            scope: [
              'openid',
              'email',
              'profile',
              'https://www.googleapis.com/auth/gmail.readonly',
              'https://www.googleapis.com/auth/gmail.modify',
            ].join(' '),
            include_granted_scopes: 'true',
          },
        },
      }),
    );
  }

  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    providers.push(
      GitHubProvider({
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
      }),
    );
  }

  return providers;
};

const credentialsProvider = CredentialsProvider({
  name: 'Email and Password',
  credentials: {
    email: { label: 'Email', type: 'email' },
    password: { label: 'Password', type: 'password' },
    remember: { label: 'Remember me', type: 'checkbox' },
  },
  async authorize(credentials, req) {
    const parsed = credentialsSchema.safeParse(credentials ?? {});
    if (!parsed.success) {
      console.warn('[auth] Invalid credential payload received');
      return null;
    }

    const { email, password, remember } = parsed.data;
    const rememberValue = parseRememberValue(remember);

    authDebugLog('Credentials sign-in attempt', {
      email: email.toLowerCase()
    });

    try {
      await enforceAuthRateLimit(req, 'auth/signin');
    } catch (error) {
      if (error instanceof AuthRateLimitError) {
        throw new Error(error.message);
      }
      throw error;
    }

    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
          email,
          password,
        });

        if (!error && data.user) {
          const user = data.user;
          const role = (user.user_metadata?.role as string) ?? 'reader';

          authDebugLog('Supabase authentication succeeded', {
            userId: user.id,
            role
          });

          return {
            id: user.id,
            email: user.email ?? undefined,
            name: (user.user_metadata?.full_name as string) ?? user.email ?? undefined,
            role,
            rememberMe: rememberValue,
          } satisfies AuthenticatedUser;
        }

        console.warn('[auth] Supabase rejected credentials', error);
        authDebugLog('Supabase authentication rejected credentials', {
          email: email.toLowerCase(),
          error: error?.message
        });
      } catch (error) {
        console.error('[auth] Supabase authentication failed', error);
        authDebugLog('Supabase authentication threw error', {
          email: email.toLowerCase(),
          error: error instanceof Error ? error.message : 'unknown'
        });
      }
    }

    const devUser = resolveDevelopmentUser(email, password, rememberValue);
    if (devUser) {
      authDebugLog('Using development fallback user', {
        email: devUser.email,
        role: devUser.role
      });
      return devUser;
    }

    if (!supabaseClient) {
      authDebugLog('Supabase client unavailable during sign-in attempt', {
        email: email.toLowerCase()
      });
      throw new AuthConfigurationError('Supabase client is not configured');
    }

    return null;
  },
});

const adapter = buildAdapter();
const providers: Provider[] = [credentialsProvider, ...buildSocialProviders()];

export const authOptions: NextAuthOptions = {
  adapter,
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
    maxAge: DEFAULT_SESSION_MAX_AGE,
  },
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
    verifyRequest: '/verify-email',
    newUser: '/dashboard',
  },
  providers,
  callbacks: {
    async jwt({ token, user }) {
      const nowInSeconds = Math.floor(Date.now() / 1000);

      if (user) {
        const authUser = user as AuthenticatedUser;
        token.role = authUser.role ?? token.role ?? 'reader';
        token.rememberMe = authUser.rememberMe ?? false;
        token.exp = nowInSeconds + (token.rememberMe ? REMEMBER_ME_SESSION_MAX_AGE : DEFAULT_SESSION_MAX_AGE);
      } else {
        if (!token.exp) {
          token.exp = nowInSeconds + DEFAULT_SESSION_MAX_AGE;
        }

        const remember = Boolean(token.rememberMe);
        const desiredExpiry = nowInSeconds + (remember ? REMEMBER_ME_SESSION_MAX_AGE : DEFAULT_SESSION_MAX_AGE);
        if (!token.exp || token.exp < desiredExpiry) {
          token.exp = desiredExpiry;
        }
      }

      return token;
    },
    async session({ session, token }) {
      const remember = Boolean(token.rememberMe);
      session.user = session.user ?? {};
      session.user.id = (token.sub as string) ?? session.user.id;
      session.user.email = session.user.email ?? (token.email as string | undefined);
      (session.user as any).role = (token.role as string) ?? 'reader';
      (session as any).rememberMe = remember;

      if (token.exp) {
        session.expires = new Date(token.exp * 1000).toISOString();
      }

      return session;
    },
  },
  events: {
    async signIn({ user, account }) {
      console.log('[auth] User signed in', {
        userId: user.id,
        provider: account?.provider,
      });

      await persistGmailTokensFromAccount(user, account);
    },
    async signOut({ token }) {
      console.log('[auth] User signed out', {
        userId: token.sub,
      });
    },
  },
  logger: {
    error(code, metadata) {
      console.error('[auth] error', code, metadata);
    },
    warn(code) {
      console.warn('[auth] warning', code);
    },
    debug(code, metadata) {
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[auth] debug', code, metadata);
      }
    },
  },
  debug: process.env.NODE_ENV !== 'production',
};

type RegistrationInput = z.infer<typeof registrationSchema>;

type RegistrationResult = {
  id: string;
  email?: string;
  email_confirmed_at: string | null;
};

export async function registerUser(input: RegistrationInput): Promise<RegistrationResult> {
  const parsed = registrationSchema.parse(input);

  if (!supabaseAdminClient) {
    throw new AuthConfigurationError('Supabase admin client is not configured');
  }

  const { data, error } = await supabaseAdminClient.auth.admin.createUser({
    email: parsed.email,
    password: parsed.password,
    user_metadata: {
      full_name: parsed.name,
      role: parsed.role,
    },
    email_confirm: false,
  });

  if (error || !data.user) {
    console.error('[auth] Failed to register user', error);
    throw new Error(error?.message ?? 'Unable to create user');
  }

  return {
    id: data.user.id,
    email: data.user.email ?? undefined,
    email_confirmed_at: data.user.email_confirmed_at ?? null,
  };
}

type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;

export async function requestPasswordReset(input: PasswordResetRequestInput): Promise<void> {
  const parsed = passwordResetRequestSchema.parse(input);

  if (!supabaseClient) {
    throw new AuthConfigurationError('Supabase client is not configured');
  }

  const redirectTo = `${APP_URL.replace(/\/$/, '')}/forgot-password`;

  const { error } = await supabaseClient.auth.resetPasswordForEmail(parsed.email, {
    redirectTo,
  });

  if (error) {
    console.error('[auth] Failed to trigger password reset', error);
    throw new Error(error.message);
  }
}

type PasswordResetInput = z.infer<typeof passwordResetSchema>;

export async function resetPassword(input: PasswordResetInput): Promise<void> {
  const parsed = passwordResetSchema.parse(input);

  if (!supabaseClient || !supabaseAdminClient) {
    throw new AuthConfigurationError('Supabase clients are not configured');
  }

  const { data, error } = await supabaseClient.auth.verifyOtp({
    type: 'recovery',
    email: parsed.email,
    token: parsed.token,
  });

  if (error || !data.user) {
    console.error('[auth] Failed to verify password reset token', error);
    throw new Error(error?.message ?? 'Invalid or expired reset token');
  }

  const { error: updateError } = await supabaseAdminClient.auth.admin.updateUserById(data.user.id, {
    password: parsed.password,
  });

  if (updateError) {
    console.error('[auth] Failed to reset password', updateError);
    throw new Error(updateError.message);
  }
}

export function getEnabledSocialProviders(): string[] {
  return providers
    .filter((provider) => provider.id !== 'credentials')
    .map((provider) => provider.id);
}
