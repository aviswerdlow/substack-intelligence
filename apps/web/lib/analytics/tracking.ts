import { hasAnalyticsConsent } from './consent';
import { getOrCreateSessionId } from './session';
import type { AnalyticsEventPayload } from './types';

function sanitizeProperties(properties?: Record<string, unknown>) {
  if (!properties) {
    return undefined;
  }

  return Object.entries(properties).reduce<Record<string, unknown>>((acc, [key, value]) => {
    if (value === undefined) {
      return acc;
    }

    if (value instanceof Date) {
      acc[key] = value.toISOString();
      return acc;
    }

    if (typeof value === 'object' && value !== null) {
      acc[key] = JSON.parse(JSON.stringify(value));
      return acc;
    }

    acc[key] = value;
    return acc;
  }, {});
}

export async function sendAnalyticsEvent(
  payload: AnalyticsEventPayload,
  options: { force?: boolean } = {}
) {
  if (typeof fetch === 'undefined') {
    return;
  }

  const consent = payload.consent ?? hasAnalyticsConsent();
  if (!options.force && !consent) {
    return;
  }

  const sessionId = payload.sessionId || getOrCreateSessionId();

  const body: AnalyticsEventPayload = {
    ...payload,
    sessionId,
    properties: sanitizeProperties(payload.properties),
    consent,
    timestamp: payload.timestamp ?? new Date().toISOString(),
  };

  try {
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[analytics] Failed to send event', error);
    }
  }
}

export function resolvePath(path?: string): string | undefined {
  if (path) {
    return path;
  }

  if (typeof window === 'undefined') {
    return undefined;
  }

  const url = new URL(window.location.href);
  return `${url.pathname}${url.search}`;
}

export async function trackPageView(path?: string, properties?: Record<string, unknown>) {
  const resolvedPath = resolvePath(path);
  await sendAnalyticsEvent({
    eventName: 'page_view',
    eventCategory: 'page',
    path: resolvedPath,
    referrer: typeof document !== 'undefined' ? document.referrer ?? null : null,
    properties,
  });
}

export async function trackEvent(eventName: string, properties?: Record<string, unknown>) {
  await sendAnalyticsEvent({
    eventName,
    eventCategory: 'user',
    properties,
  });
}

export async function trackConversion(stage: string, properties?: Record<string, unknown>) {
  await sendAnalyticsEvent({
    eventName: `conversion_${stage}`,
    eventCategory: 'conversion',
    conversionStage: stage,
    properties,
  });
}

export async function trackExperiment(
  experimentName: string,
  variant: string,
  properties?: Record<string, unknown>
) {
  await sendAnalyticsEvent({
    eventName: 'experiment_exposure',
    eventCategory: 'experiment',
    properties: {
      experimentName,
      variant,
      ...properties,
    },
  });
}
