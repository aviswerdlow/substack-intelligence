'use client';

import type { ReactNode } from 'react';

import { SessionProvider } from 'next-auth/react';

import { AnalyticsConsentBanner } from '@/components/analytics/AnalyticsConsentBanner';
import { MonitoringProvider } from '@/components/monitoring-provider';
import { Providers as QueryProviders } from '@/components/providers';
import { Toaster } from '@/components/ui/toaster';
import { AnalyticsProvider } from '@/lib/analytics';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <SessionProvider>
      <MonitoringProvider>
        <AnalyticsProvider>
          <QueryProviders>{children}</QueryProviders>
          <AnalyticsConsentBanner />
          <Toaster />
        </AnalyticsProvider>
      </MonitoringProvider>
    </SessionProvider>
  );
}
