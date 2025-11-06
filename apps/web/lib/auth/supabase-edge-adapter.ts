import type {
  Adapter,
  AdapterAccount,
  AdapterSession,
  AdapterUser,
  VerificationToken,
} from 'next-auth/adapters';

interface EdgeResponse<T> {
  ok: boolean;
  data?: T | null;
  error?: {
    message: string;
    details?: unknown;
  };
}

interface EdgeSessionAndUser {
  session: EdgeSession | null;
  user: EdgeUser | null;
}

interface EdgeUser {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: string | null;
  image: string | null;
}

interface EdgeSession {
  id: string;
  sessionToken: string | null;
  userId: string | null;
  expires: string | null;
}

interface EdgeVerificationToken {
  identifier: string | null;
  token: string | null;
  expires: string | null;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const EDGE_URL = process.env.NEXTAUTH_SUPABASE_EDGE_URL;
const EDGE_SECRET = process.env.NEXTAUTH_SUPABASE_EDGE_SECRET;
const EDGE_FUNCTION_NAME =
  process.env.NEXTAUTH_SUPABASE_EDGE_FUNCTION_NAME || 'nextauth-proxy';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADAPTER_DEBUG = process.env.AUTH_DEBUG === 'true';

const edgeDebugLog = (...messages: unknown[]) => {
  if (ADAPTER_DEBUG) {
    console.log('[auth][edge]', ...messages);
  }
};

function deriveEdgeUrl(): string | null {
  if (EDGE_URL) {
    return EDGE_URL.replace(/\/+$/, '');
  }

  if (!SUPABASE_URL) {
    return null;
  }

  try {
    const parsed = new URL(SUPABASE_URL);
    const host = parsed.host.replace('.supabase.co', '.functions.supabase.co');
    return `${parsed.protocol}//${host}/${EDGE_FUNCTION_NAME}`;
  } catch {
    return null;
  }
}

const resolvedEdgeUrl = deriveEdgeUrl();

function assertConfiguration() {
  if (!resolvedEdgeUrl) {
    throw new Error('Supabase edge proxy URL is not configured');
  }

  if (!EDGE_SECRET) {
    throw new Error('Supabase edge proxy secret is not configured');
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase service role key is required for edge proxy calls');
  }
}

async function callEdge<T>(action: string, args: Record<string, unknown>): Promise<T | null> {
  assertConfiguration();

  edgeDebugLog('request', {
    action,
    argKeys: Object.keys(args),
  });

  const response = await fetch(resolvedEdgeUrl!, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'x-edge-secret': EDGE_SECRET!,
    },
    body: JSON.stringify({ action, args }),
  });

  if (!response.ok) {
    edgeDebugLog('response_error', {
      action,
      status: response.status,
      statusText: response.statusText,
    });
    const errorText = await response.text().catch(() => '');
    throw new Error(
      `Supabase edge proxy request failed: ${response.status} ${response.statusText} ${errorText}`.trim(),
    );
  }

  const payload = (await response.json()) as EdgeResponse<T>;

  if (!payload.ok) {
    edgeDebugLog('payload_error', {
      action,
      error: payload.error ?? null,
    });
    throw new Error(payload.error?.message ?? 'Supabase edge proxy error');
  }

  edgeDebugLog('response_success', {
    action,
    hasData: payload.data !== undefined && payload.data !== null,
  });

  return (payload.data ?? null) as T | null;
}

function toAdapterUser(user: EdgeUser | null): AdapterUser | null {
  if (!user) return null;

  return {
    id: user.id,
    name: user.name ?? null,
    email: user.email ?? null,
    emailVerified: user.emailVerified ? new Date(user.emailVerified) : null,
    image: user.image ?? null,
  };
}

function toAdapterSession(session: EdgeSession | null): AdapterSession | null {
  if (!session) return null;

  return {
    id: session.id,
    sessionToken: session.sessionToken ?? '',
    userId: session.userId ?? '',
    expires: session.expires ? new Date(session.expires) : new Date(),
  };
}

function toVerificationToken(token: EdgeVerificationToken | null): VerificationToken | null {
  if (!token) return null;

  return {
    identifier: token.identifier ?? '',
    token: token.token ?? '',
    expires: token.expires ? new Date(token.expires) : new Date(),
  };
}

function serializeUser(user: AdapterUser) {
  return {
    id: user.id,
    name: user.name ?? null,
    email: user.email ?? null,
    emailVerified: user.emailVerified ? user.emailVerified.toISOString() : null,
    image: user.image ?? null,
  };
}

function serializeSession(session: AdapterSession) {
  return {
    id: session.id,
    sessionToken: session.sessionToken,
    userId: session.userId,
    expires: session.expires ? session.expires.toISOString() : null,
  };
}

function serializeVerificationToken(token: VerificationToken) {
  return {
    identifier: token.identifier,
    token: token.token,
    expires: token.expires ? token.expires.toISOString() : null,
  };
}

export function createSupabaseEdgeAdapter(): Adapter {
  return {
    async createUser(user) {
      const data = await callEdge<EdgeUser>('createUser', serializeUser(user));
      const result = toAdapterUser(data);
      if (!result) {
        throw new Error('Supabase edge proxy returned empty user on createUser');
      }
      return result;
    },
    async getUser(id) {
      const data = await callEdge<EdgeUser>('getUser', { id });
      return toAdapterUser(data);
    },
    async getUserByEmail(email) {
      const data = await callEdge<EdgeUser>('getUserByEmail', { email });
      return toAdapterUser(data);
    },
    async getUserByAccount({ providerAccountId, provider }) {
      const data = await callEdge<EdgeUser>('getUserByAccount', {
        providerAccountId,
        provider,
      });
      return toAdapterUser(data);
    },
    async updateUser(user) {
      if (!user.id) {
        throw new Error('updateUser requires user.id');
      }

      const data = await callEdge<EdgeUser>('updateUser', serializeUser(user));
      const result = toAdapterUser(data);
      if (!result) {
        throw new Error('Supabase edge proxy returned empty user on updateUser');
      }
      return result;
    },
    async deleteUser(userId) {
      await callEdge('deleteUser', { id: userId });
    },
    async linkAccount(account) {
      const payload: Record<string, unknown> = { ...account };
      await callEdge('linkAccount', payload);
    },
    async unlinkAccount({ providerAccountId, provider }) {
      await callEdge('unlinkAccount', { providerAccountId, provider });
    },
    async createSession(session) {
      const data = await callEdge<EdgeSession>('createSession', serializeSession(session));
      const result = toAdapterSession(data);
      if (!result) {
        throw new Error('Supabase edge proxy returned empty session on createSession');
      }
      return result;
    },
    async getSessionAndUser(sessionToken) {
      const data = await callEdge<EdgeSessionAndUser>('getSessionAndUser', { sessionToken });
      if (!data) return null;

      return {
        session: toAdapterSession(data.session),
        user: toAdapterUser(data.user),
      };
    },
    async updateSession(session) {
      const data = await callEdge<EdgeSession>('updateSession', serializeSession(session));
      return toAdapterSession(data);
    },
    async deleteSession(sessionToken) {
      await callEdge('deleteSession', { sessionToken });
    },
    async createVerificationToken(token) {
      const data = await callEdge<EdgeVerificationToken>(
        'createVerificationToken',
        serializeVerificationToken(token),
      );
      const result = toVerificationToken(data);
      if (!result) {
        throw new Error('Supabase edge proxy returned empty verification token on create');
      }
      return result;
    },
    async useVerificationToken({ identifier, token }) {
      const data = await callEdge<EdgeVerificationToken>('useVerificationToken', {
        identifier,
        token,
      });
      return toVerificationToken(data);
    },
  };
}
