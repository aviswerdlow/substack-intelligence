import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { Pool, PoolClient } from 'https://deno.land/x/postgres@v0.17.0/mod.ts';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

interface EdgeRequestPayload {
  action: string;
  args?: Record<string, unknown>;
}

interface AdapterUserRow {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: string | null;
  image: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface AdapterSessionRow {
  id: string;
  sessionToken: string | null;
  userId: string | null;
  expires: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface AdapterAccountRow {
  id: string;
  userId: string | null;
  type: string | null;
  provider: string | null;
  providerAccountId: string | null;
  refresh_token: string | null;
  access_token: string | null;
  expires_at: number | null;
  token_type: string | null;
  scope: string | null;
  id_token: string | null;
  session_state: string | null;
  oauth_token_secret: string | null;
  oauth_token: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface AdapterVerificationTokenRow {
  id: string;
  identifier: string | null;
  token: string | null;
  expires: string | null;
  created_at: string | null;
}

const EDGE_SHARED_SECRET = Deno.env.get('NEXTAUTH_EDGE_FUNCTION_SECRET');
const DATABASE_URL = Deno.env.get('SUPABASE_DB_URL');

if (!EDGE_SHARED_SECRET) {
  console.error('Missing NEXTAUTH_EDGE_FUNCTION_SECRET environment variable');
  throw new Error('Edge function misconfigured: missing shared secret');
}

if (!DATABASE_URL) {
  console.error('Missing SUPABASE_DB_URL environment variable');
  throw new Error('Edge function misconfigured: missing database connection string');
}

const pool = new Pool(DATABASE_URL, 3, true);

let schemaReady = false;

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
};

const success = (data: JsonValue, status = 200) =>
  new Response(JSON.stringify({ ok: true, data }), {
    status,
    headers: JSON_HEADERS,
  });

const failure = (status: number, message: string, details?: JsonValue) =>
  new Response(JSON.stringify({ ok: false, error: { message, details } }), {
    status,
    headers: JSON_HEADERS,
  });

async function ensureSchema(client: PoolClient) {
  if (schemaReady) {
    return;
  }

  await client.queryArray`CREATE SCHEMA IF NOT EXISTS next_auth;`;

  await client.queryArray`
    CREATE TABLE IF NOT EXISTS next_auth.users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      "name" TEXT,
      "email" TEXT UNIQUE,
      "emailVerified" TIMESTAMPTZ,
      "image" TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await client.queryArray`
    CREATE TABLE IF NOT EXISTS next_auth.accounts (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      "userId" UUID REFERENCES next_auth.users(id) ON DELETE CASCADE,
      type TEXT,
      provider TEXT,
      "providerAccountId" TEXT,
      refresh_token TEXT,
      access_token TEXT,
      expires_at BIGINT,
      token_type TEXT,
      scope TEXT,
      id_token TEXT,
      session_state TEXT,
      oauth_token_secret TEXT,
      oauth_token TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(provider, "providerAccountId")
    );
  `;

  await client.queryArray`
    CREATE TABLE IF NOT EXISTS next_auth.sessions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      "sessionToken" TEXT UNIQUE,
      "userId" UUID REFERENCES next_auth.users(id) ON DELETE CASCADE,
      "expires" TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await client.queryArray`
    CREATE TABLE IF NOT EXISTS next_auth.verification_tokens (
      id BIGSERIAL PRIMARY KEY,
      identifier TEXT,
      token TEXT,
      expires TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(identifier, token)
    );
  `;

  schemaReady = true;
}

function toAdapterUser(row: AdapterUserRow | null) {
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    emailVerified: row.emailVerified,
    image: row.image,
  };
}

function toAdapterSession(row: AdapterSessionRow | null) {
  if (!row) return null;

  return {
    id: row.id,
    sessionToken: row.sessionToken,
    userId: row.userId,
    expires: row.expires,
  };
}

function toAdapterVerificationToken(row: AdapterVerificationTokenRow | null) {
  if (!row) return null;

  return {
    identifier: row.identifier,
    token: row.token,
    expires: row.expires,
  };
}

async function withClient<T>(handler: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();

  try {
    await ensureSchema(client);
    return await handler(client);
  } finally {
    client.release();
  }
}

async function createUser(args: Record<string, unknown>) {
  const name = (args.name ?? null) as string | null;
  const email = (args.email ?? null) as string | null;
  const emailVerified = args.emailVerified ? new Date(args.emailVerified as string) : null;
  const image = (args.image ?? null) as string | null;

  return await withClient(async (client) => {
    const result = await client.queryObject<AdapterUserRow>({
      text: `
        INSERT INTO next_auth.users ("name", "email", "emailVerified", "image")
        VALUES ($1, $2, $3, $4)
        RETURNING *;
      `,
      args: [name, email, emailVerified, image],
    });

    return toAdapterUser(result.rows.at(0) ?? null);
  });
}

async function getUser(args: Record<string, unknown>) {
  const id = args.id as string;

  return await withClient(async (client) => {
    const result = await client.queryObject<AdapterUserRow>({
      text: `SELECT * FROM next_auth.users WHERE id = $1 LIMIT 1;`,
      args: [id],
    });

    return toAdapterUser(result.rows.at(0) ?? null);
  });
}

async function getUserByEmail(args: Record<string, unknown>) {
  const email = args.email as string;

  return await withClient(async (client) => {
    const result = await client.queryObject<AdapterUserRow>({
      text: `SELECT * FROM next_auth.users WHERE LOWER("email") = LOWER($1) LIMIT 1;`,
      args: [email],
    });

    return toAdapterUser(result.rows.at(0) ?? null);
  });
}

async function getUserByAccount(args: Record<string, unknown>) {
  const provider = args.provider as string;
  const providerAccountId = args.providerAccountId as string;

  return await withClient(async (client) => {
    const result = await client.queryObject<AdapterUserRow>({
      text: `
        SELECT u.*
        FROM next_auth.accounts a
        JOIN next_auth.users u ON u.id = a."userId"
        WHERE a.provider = $1 AND a."providerAccountId" = $2
        LIMIT 1;
      `,
      args: [provider, providerAccountId],
    });

    return toAdapterUser(result.rows.at(0) ?? null);
  });
}

async function updateUser(args: Record<string, unknown>) {
  const id = args.id as string;

  const updates: string[] = [];
  const values: unknown[] = [];

  let index = 1;

  if ('name' in args) {
    updates.push(`"name" = $${index++}`);
    values.push(args.name);
  }

  if ('email' in args) {
    updates.push(`"email" = $${index++}`);
    values.push(args.email);
  }

  if ('emailVerified' in args) {
    updates.push(`"emailVerified" = $${index++}`);
    const value = args.emailVerified ? new Date(args.emailVerified as string) : null;
    values.push(value);
  }

  if ('image' in args) {
    updates.push(`"image" = $${index++}`);
    values.push(args.image);
  }

  if (updates.length === 0) {
    return getUser({ id });
  }

  updates.push(`updated_at = NOW()`);

  values.push(id);

  return await withClient(async (client) => {
    const result = await client.queryObject<AdapterUserRow>({
      text: `
        UPDATE next_auth.users
        SET ${updates.join(', ')}
        WHERE id = $${index}
        RETURNING *;
      `,
      args: values,
    });

    return toAdapterUser(result.rows.at(0) ?? null);
  });
}

async function deleteUser(args: Record<string, unknown>) {
  const id = args.id as string;

  await withClient(async (client) => {
    await client.queryArray`
      DELETE FROM next_auth.users
      WHERE id = ${id};
    `;
  });

  return null;
}

async function linkAccount(args: Record<string, unknown>) {
  const columns = [
    'userId',
    'type',
    'provider',
    'providerAccountId',
    'refresh_token',
    'access_token',
    'expires_at',
    'token_type',
    'scope',
    'id_token',
    'session_state',
    'oauth_token_secret',
    'oauth_token',
  ] as const;

  const values = columns.map((column) => args[column] ?? null);

  await withClient(async (client) => {
    await client.queryArray({
      text: `
        INSERT INTO next_auth.accounts (
          "userId",
          type,
          provider,
          "providerAccountId",
          refresh_token,
          access_token,
          expires_at,
          token_type,
          scope,
          id_token,
          session_state,
          oauth_token_secret,
          oauth_token
        )
        VALUES (${columns.map((_, idx) => `$${idx + 1}`).join(', ')})
        ON CONFLICT (provider, "providerAccountId")
        DO UPDATE SET
          "userId" = EXCLUDED."userId",
          refresh_token = EXCLUDED.refresh_token,
          access_token = EXCLUDED.access_token,
          expires_at = EXCLUDED.expires_at,
          token_type = EXCLUDED.token_type,
          scope = EXCLUDED.scope,
          id_token = EXCLUDED.id_token,
          session_state = EXCLUDED.session_state,
          oauth_token_secret = EXCLUDED.oauth_token_secret,
          oauth_token = EXCLUDED.oauth_token,
          updated_at = NOW();
      `,
      args: values,
    });
  });

  return null;
}

async function unlinkAccount(args: Record<string, unknown>) {
  const provider = args.provider as string;
  const providerAccountId = args.providerAccountId as string;

  await withClient(async (client) => {
    await client.queryArray`
      DELETE FROM next_auth.accounts
      WHERE provider = ${provider}
        AND "providerAccountId" = ${providerAccountId};
    `;
  });

  return null;
}

async function createSession(args: Record<string, unknown>) {
  const sessionToken = args.sessionToken as string | null;
  const userId = args.userId as string | null;
  const expires = args.expires ? new Date(args.expires as string) : null;

  return await withClient(async (client) => {
    const result = await client.queryObject<AdapterSessionRow>({
      text: `
        INSERT INTO next_auth.sessions ("sessionToken", "userId", "expires")
        VALUES ($1, $2, $3)
        RETURNING *;
      `,
      args: [sessionToken, userId, expires],
    });

    return toAdapterSession(result.rows.at(0) ?? null);
  });
}

async function getSessionAndUser(args: Record<string, unknown>) {
  const sessionToken = args.sessionToken as string;

  return await withClient(async (client) => {
    const sessionResult = await client.queryObject<AdapterSessionRow>({
      text: `
        SELECT *
        FROM next_auth.sessions
        WHERE "sessionToken" = $1
        LIMIT 1;
      `,
      args: [sessionToken],
    });

    const sessionRow = sessionResult.rows.at(0) ?? null;
    const session = toAdapterSession(sessionRow);

    if (!session || !session.userId) {
      return session ? { session, user: null } : null;
    }

    const userResult = await client.queryObject<AdapterUserRow>({
      text: `
        SELECT *
        FROM next_auth.users
        WHERE id = $1
        LIMIT 1;
      `,
      args: [session.userId],
    });

    const userRow = userResult.rows.at(0) ?? null;

    return {
      session,
      user: toAdapterUser(userRow),
    };
  });
}

async function updateSession(args: Record<string, unknown>) {
  const sessionToken = args.sessionToken as string;

  const updates: string[] = [];
  const values: unknown[] = [];
  let index = 1;

  if ('userId' in args) {
    updates.push(`"userId" = $${index++}`);
    values.push(args.userId);
  }

  if ('expires' in args) {
    updates.push(`"expires" = $${index++}`);
    const value = args.expires ? new Date(args.expires as string) : null;
    values.push(value);
  }

  if (updates.length === 0) {
    return getSession({ sessionToken });
  }

  updates.push(`updated_at = NOW()`);
  values.push(sessionToken);

  return await withClient(async (client) => {
    const result = await client.queryObject<AdapterSessionRow>({
      text: `
        UPDATE next_auth.sessions
        SET ${updates.join(', ')}
        WHERE "sessionToken" = $${index}
        RETURNING *;
      `,
      args: values,
    });

    return toAdapterSession(result.rows.at(0) ?? null);
  });
}

async function getSession(args: { sessionToken: string }) {
  return await withClient(async (client) => {
    const result = await client.queryObject<AdapterSessionRow>({
      text: `SELECT * FROM next_auth.sessions WHERE "sessionToken" = $1 LIMIT 1;`,
      args: [args.sessionToken],
    });

    return toAdapterSession(result.rows.at(0) ?? null);
  });
}

async function deleteSession(args: Record<string, unknown>) {
  const sessionToken = args.sessionToken as string;

  await withClient(async (client) => {
    await client.queryArray`
      DELETE FROM next_auth.sessions
      WHERE "sessionToken" = ${sessionToken};
    `;
  });

  return null;
}

async function createVerificationToken(args: Record<string, unknown>) {
  const identifier = args.identifier as string | null;
  const token = args.token as string | null;
  const expires = args.expires ? new Date(args.expires as string) : null;

  return await withClient(async (client) => {
    const result = await client.queryObject<AdapterVerificationTokenRow>({
      text: `
        INSERT INTO next_auth.verification_tokens (identifier, token, expires)
        VALUES ($1, $2, $3)
        ON CONFLICT (identifier, token)
        DO UPDATE SET expires = EXCLUDED.expires
        RETURNING identifier, token, expires;
      `,
      args: [identifier, token, expires],
    });

    return toAdapterVerificationToken(result.rows.at(0) ?? null);
  });
}

async function useVerificationToken(args: Record<string, unknown>) {
  const identifier = args.identifier as string;
  const token = args.token as string;

  return await withClient(async (client) => {
    const result = await client.queryObject<AdapterVerificationTokenRow>({
      text: `
        DELETE FROM next_auth.verification_tokens
        WHERE identifier = $1 AND token = $2
        RETURNING identifier, token, expires;
      `,
      args: [identifier, token],
    });

    return toAdapterVerificationToken(result.rows.at(0) ?? null);
  });
}

const ACTION_MAP: Record<
  string,
  (args: Record<string, unknown>) => Promise<JsonValue>
> = {
  createUser,
  getUser,
  getUserByEmail,
  getUserByAccount,
  updateUser,
  deleteUser,
  linkAccount,
  unlinkAccount,
  createSession,
  getSessionAndUser,
  updateSession,
  deleteSession,
  createVerificationToken,
  useVerificationToken,
};

serve(async (req) => {
  if (req.method !== 'POST') {
    return failure(405, 'Method not allowed');
  }

  const edgeSecret = req.headers.get('x-edge-secret')?.trim();
  if (!edgeSecret) {
    return failure(401, 'Missing edge authorization header');
  }

  if (edgeSecret !== EDGE_SHARED_SECRET) {
    return failure(401, 'Invalid edge authorization token');
  }

  let payload: EdgeRequestPayload;

  try {
    payload = (await req.json()) as EdgeRequestPayload;
  } catch (error) {
    console.error('[nextauth-proxy] Failed to parse JSON body', error);
    return failure(400, 'Invalid JSON payload');
  }

  if (!payload.action) {
    return failure(400, 'Missing action');
  }

  const handler = ACTION_MAP[payload.action];
  if (!handler) {
    return failure(400, `Unsupported action: ${payload.action}`);
  }

  try {
    const data = await handler(payload.args ?? {});
    return success(data ?? null);
  } catch (error) {
    console.error('[nextauth-proxy] Handler failed', {
      action: payload.action,
      error,
    });

    let message = 'Internal server error';

    if (error instanceof Error) {
      message = error.message;
    }

    return failure(500, message);
  }
});
