'use client';

import { SessionProvider } from 'next-auth/react';
import { MonitoringProvider } from '@/components/monitoring-provider';
import { Toaster } from '@/components/ui/toaster';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <MonitoringProvider>
        {children}
        <Toaster />
      </MonitoringProvider>
    </SessionProvider>
  );
}
