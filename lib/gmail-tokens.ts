import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'crypto';

import { createServiceRoleClient } from '@substack-intelligence/database';

export interface GmailTokenState {
  connected: boolean;
  email: string | null;
  refreshToken: string | null;
  accessToken: string | null;
  tokenExpiry: string | null;
}

export interface GmailTokenUpdate {
  refreshToken?: string | null;
  accessToken?: string | null;
  expiresAt?: number | Date | null;
  email?: string | null;
  connected?: boolean;
}

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function resolveEncryptionKey(): Buffer {
  const rawKey = process.env.ENCRYPTION_KEY;

  if (!rawKey) {
    throw new Error('ENCRYPTION_KEY environment variable is not configured');
  }

  if (rawKey.length === 32) {
    return Buffer.from(rawKey, 'utf-8');
  }

  return createHash('sha256').update(rawKey).digest();
}

function encryptValue(value: string): string {
  const key = resolveEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, encrypted, tag]);

  return payload.toString('base64');
}

function decryptValue(value: string): string {
  const key = resolveEncryptionKey();
  const payload = Buffer.from(value, 'base64');

  if (payload.length <= IV_LENGTH + TAG_LENGTH) {
    throw new Error('Encrypted payload too short');
  }

  const iv = payload.subarray(0, IV_LENGTH);
  const tag = payload.subarray(payload.length - TAG_LENGTH);
  const encrypted = payload.subarray(IV_LENGTH, payload.length - TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

function tryEncryptToken(token: string | null | undefined): string | null {
  if (!token) {
    return null;
  }

  try {
    return encryptValue(token);
  } catch (error) {
    console.error('[gmail-tokens] Failed to encrypt Gmail token:', error);
    throw new Error('Unable to encrypt Gmail OAuth token');
  }
}

function tryDecryptToken(token: string | null | undefined): string | null {
  if (!token) {
    return null;
  }

  try {
    return decryptValue(token);
  } catch (error) {
    console.warn('[gmail-tokens] Failed to decrypt Gmail token, assuming plaintext storage', error);
    return token;
  }
}

function normalizeExpiry(expiresAt: number | Date | null | undefined): string | null | undefined {
  if (expiresAt === undefined) {
    return undefined;
  }

  if (expiresAt === null) {
    return null;
  }

  if (expiresAt instanceof Date) {
    return expiresAt.toISOString();
  }

  if (typeof expiresAt === 'number') {
    // Account for seconds vs milliseconds
    const isSeconds = expiresAt < 10_000_000_000;
    const date = new Date(isSeconds ? expiresAt * 1000 : expiresAt);
    return date.toISOString();
  }

  return undefined;
}

export async function fetchGmailTokenState(userId: string): Promise<GmailTokenState | null> {
  const supabase = createServiceRoleClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('user_settings')
    .select('gmail_connected, gmail_refresh_token, gmail_access_token, gmail_token_expiry, gmail_email')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[gmail-tokens] Failed to fetch Gmail token state:', error);
    throw new Error('Unable to load Gmail token state');
  }

  if (!data) {
    return null;
  }

  return {
    connected: Boolean(data.gmail_connected),
    email: data.gmail_email ?? null,
    refreshToken: tryDecryptToken(data.gmail_refresh_token ?? null),
    accessToken: tryDecryptToken(data.gmail_access_token ?? null),
    tokenExpiry: data.gmail_token_expiry ?? null,
  };
}

export async function persistGmailTokens(userId: string, update: GmailTokenUpdate): Promise<void> {
  const supabase = createServiceRoleClient();

  if (!supabase) {
    throw new Error('Supabase service role client is not configured');
  }

  const updates: Record<string, any> = { updated_at: new Date().toISOString() };

  if (update.refreshToken !== undefined) {
    updates.gmail_refresh_token = tryEncryptToken(update.refreshToken);
  }

  if (update.accessToken !== undefined) {
    updates.gmail_access_token = tryEncryptToken(update.accessToken);
  }

  if (update.email !== undefined) {
    updates.gmail_email = update.email ?? null;
  }

  const normalizedExpiry = normalizeExpiry(update.expiresAt);
  if (normalizedExpiry !== undefined) {
    updates.gmail_token_expiry = normalizedExpiry;
  }

  if (update.connected !== undefined) {
    updates.gmail_connected = update.connected;
  } else if (update.refreshToken !== undefined || update.accessToken !== undefined) {
    updates.gmail_connected = Boolean(update.refreshToken || update.accessToken);
  }

  const { data: existing, error: lookupError } = await supabase
    .from('user_settings')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (lookupError) {
    console.error('[gmail-tokens] Failed to check existing user settings:', lookupError);
    throw new Error('Unable to look up existing user settings for Gmail tokens');
  }

  if (existing) {
    const { error: updateError } = await supabase
      .from('user_settings')
      .update(updates)
      .eq('user_id', userId);

    if (updateError) {
      console.error('[gmail-tokens] Failed to update Gmail token state:', updateError);
      throw new Error('Unable to update Gmail token state');
    }
  } else {
    const insertPayload = {
      user_id: userId,
      gmail_connected: updates.gmail_connected ?? Boolean(update.refreshToken || update.accessToken),
      gmail_refresh_token: updates.gmail_refresh_token ?? null,
      gmail_access_token: updates.gmail_access_token ?? null,
      gmail_email: updates.gmail_email ?? null,
      gmail_token_expiry: updates.gmail_token_expiry ?? null,
    };

    const { error: insertError } = await supabase
      .from('user_settings')
      .insert(insertPayload);

    if (insertError) {
      console.error('[gmail-tokens] Failed to insert Gmail token state:', insertError);
      throw new Error('Unable to create Gmail token record');
    }
  }
}

export async function clearGmailTokens(userId: string): Promise<void> {
  const supabase = createServiceRoleClient();

  if (!supabase) {
    throw new Error('Supabase service role client is not configured');
  }

  const { error } = await supabase
    .from('user_settings')
    .update({
      gmail_connected: false,
      gmail_refresh_token: null,
      gmail_access_token: null,
      gmail_email: null,
      gmail_token_expiry: null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    console.error('[gmail-tokens] Failed to clear Gmail tokens:', error);
    throw new Error('Unable to clear Gmail tokens');
  }
}
