'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';

import { CONSENT_STORAGE_KEY, getAnalyticsConsent, setAnalyticsConsent } from './consent';
import { getOrCreateSessionId } from './session';
import {
  resolvePath,
  sendAnalyticsEvent,
} from './tracking';
import type {
  AnalyticsContextValue,
  AnalyticsEventPayload,
  ConsentStatus,
} from './types';

const AnalyticsContext = createContext<AnalyticsContextValue | undefined>(undefined);

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const { user } = useUser();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [consentStatus, setConsentStatus] = useState<ConsentStatus>('unset');
  const sessionIdRef = useRef<string | undefined>();
  const lastTrackedPathRef = useRef<string | undefined>();

  const userId = user?.id ?? (process.env.NODE_ENV === 'development' ? 'development-user' : null);

  const send = useCallback(
    async (payload: AnalyticsEventPayload, options?: { force?: boolean }) => {
      await sendAnalyticsEvent(
        {
          ...payload,
          userId,
          sessionId: payload.sessionId ?? sessionIdRef.current,
        },
        options
      );
    },
    [userId]
  );

  const trackPageView = useCallback(
    async (path?: string, properties?: Record<string, unknown>) => {
      const resolvedPath = path ?? resolvePath();
      if (!resolvedPath) {
        return;
      }

      await send({
        eventName: 'page_view',
        eventCategory: 'page',
        path: resolvedPath,
        referrer: typeof document !== 'undefined' ? document.referrer ?? null : null,
        properties: {
          title: typeof document !== 'undefined' ? document.title : undefined,
          ...properties,
        },
      });
    },
    [send]
  );

  const sendInitialPageView = useCallback(async () => {
    const currentPath = resolvePath();

    if (!currentPath) {
      await trackPageView();
      return;
    }

    lastTrackedPathRef.current = currentPath;
    await trackPageView(currentPath);
  }, [trackPageView]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    sessionIdRef.current = getOrCreateSessionId();
    setConsentStatus(getAnalyticsConsent());
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== CONSENT_STORAGE_KEY) {
        return;
      }

      const nextStatus = getAnalyticsConsent();
      setConsentStatus(nextStatus);

      if (nextStatus === 'granted') {
        void sendInitialPageView();
        return;
      }

      lastTrackedPathRef.current = undefined;
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, [sendInitialPageView]);

  useEffect(() => {
    if (consentStatus !== 'granted') {
      return;
    }

    const search = searchParams?.toString();
    const pathWithQuery = `${pathname}${search ? `?${search}` : ''}`;

    if (lastTrackedPathRef.current === pathWithQuery) {
      return;
    }

    lastTrackedPathRef.current = pathWithQuery;
    void trackPageView(pathWithQuery);
  }, [consentStatus, pathname, searchParams, trackPageView]);

  const trackEvent = useCallback(
    async (eventName: string, properties?: Record<string, unknown>) => {
      await send({
        eventName,
        eventCategory: 'user',
        properties,
      });
    },
    [send]
  );

  const trackConversion = useCallback(
    async (stage: string, properties?: Record<string, unknown>) => {
      await send({
        eventName: `conversion_${stage}`,
        eventCategory: 'conversion',
        conversionStage: stage,
        properties,
      });
    },
    [send]
  );

  const trackExperiment = useCallback(
    async (experimentName: string, variant: string, properties?: Record<string, unknown>) => {
      await send({
        eventName: 'experiment_exposure',
        eventCategory: 'experiment',
        properties: {
          experimentName,
          variant,
          ...properties,
        },
      });
    },
    [send]
  );

  const updateConsent = useCallback(
    async (granted: boolean) => {
      const status = setAnalyticsConsent(granted);
      setConsentStatus(status);

      if (granted) {
        await send(
          {
            eventName: 'analytics_consent_granted',
            eventCategory: 'user',
            properties: {
              grantedAt: new Date().toISOString(),
            },
          },
          { force: true }
        );
        await sendInitialPageView();
      } else {
        lastTrackedPathRef.current = undefined;
      }
    },
    [send, sendInitialPageView]
  );

  const value = useMemo<AnalyticsContextValue>(() => ({
    consentStatus,
    sessionId: sessionIdRef.current,
    trackEvent,
    trackPageView,
    trackConversion,
    trackExperiment,
    updateConsent,
  }), [consentStatus, trackConversion, trackEvent, trackExperiment, trackPageView, updateConsent]);

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}

export function useAnalytics(): AnalyticsContextValue {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
}
