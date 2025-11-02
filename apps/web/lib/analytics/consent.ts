import type { ConsentStatus } from './types';

export const CONSENT_STORAGE_KEY = 'substack-intelligence:analytics-consent';

export function getAnalyticsConsent(): ConsentStatus {
  if (typeof window === 'undefined') {
    return 'unset';
  }

  const stored = window.localStorage.getItem(CONSENT_STORAGE_KEY);
  if (stored === 'granted' || stored === 'denied') {
    return stored;
  }
  return 'unset';
}

export function hasAnalyticsConsent(): boolean {
  return getAnalyticsConsent() === 'granted';
}

export function setAnalyticsConsent(granted: boolean): ConsentStatus {
  if (typeof window === 'undefined') {
    return 'unset';
  }

  const value: ConsentStatus = granted ? 'granted' : 'denied';
  window.localStorage.setItem(CONSENT_STORAGE_KEY, value);
  return value;
}

export function clearAnalyticsConsent(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(CONSENT_STORAGE_KEY);
}
