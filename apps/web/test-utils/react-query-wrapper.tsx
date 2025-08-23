/**
 * Test wrapper for React Query providers
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SettingsProvider } from '@/contexts/SettingsContext';

export function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <SettingsProvider>
          {children}
        </SettingsProvider>
      </QueryClientProvider>
    );
  };
}