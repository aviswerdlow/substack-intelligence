const SESSION_STORAGE_KEY = 'substack-intelligence:analytics-session';

export function getOrCreateSessionId(): string | undefined {
  if (typeof window === 'undefined' || !window.crypto?.randomUUID) {
    return undefined;
  }

  const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const sessionId = window.crypto.randomUUID();
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  return sessionId;
}
