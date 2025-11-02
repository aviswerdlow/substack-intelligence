export type AnalyticsEventCategory =
  | 'page'
  | 'user'
  | 'content'
  | 'conversion'
  | 'experiment';

export interface AnalyticsEventPayload {
  eventName: string;
  eventCategory?: AnalyticsEventCategory;
  userId?: string | null;
  sessionId?: string;
  path?: string;
  referrer?: string | null;
  properties?: Record<string, unknown>;
  conversionStage?: string;
  consent?: boolean;
  timestamp?: string;
}

export type ConsentStatus = 'granted' | 'denied' | 'unset';

export interface AnalyticsContextValue {
  consentStatus: ConsentStatus;
  sessionId?: string;
  trackEvent: (eventName: string, properties?: Record<string, unknown>) => Promise<void>;
  trackPageView: (path?: string, properties?: Record<string, unknown>) => Promise<void>;
  trackConversion: (stage: string, properties?: Record<string, unknown>) => Promise<void>;
  trackExperiment: (
    experimentName: string,
    variant: string,
    properties?: Record<string, unknown>
  ) => Promise<void>;
  updateConsent: (granted: boolean) => Promise<void>;
}
