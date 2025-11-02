'use client';

import { useEffect, useState } from 'react';
import { useSessionUser } from './use-session-user';

interface GoogleOAuthStatus {
  isConnected: boolean;
  email?: string;
  hasGmailScopes: boolean;
  isLoading: boolean;
}

export function useGoogleOAuth(): GoogleOAuthStatus {
  const { isLoading, isAuthenticated, user, userId } = useSessionUser();
  const [status, setStatus] = useState<GoogleOAuthStatus>({
    isConnected: false,
    hasGmailScopes: false,
    isLoading: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function checkGoogleOAuth() {
      if (isLoading) {
        return;
      }

      if (!isAuthenticated || !userId) {
        if (!cancelled) {
          setStatus({
            isConnected: false,
            hasGmailScopes: false,
            isLoading: false,
          });
        }
        return;
      }

      try {
        const response = await fetch('/api/auth/gmail/status');
        if (!response.ok) {
          throw new Error('Failed to fetch Gmail status');
        }

        const data = await response.json();
        if (cancelled) {
          return;
        }

        setStatus({
          isConnected: Boolean(data.connected),
          email: (data.email as string | undefined) ?? user?.email ?? undefined,
          hasGmailScopes: Boolean(data.connected),
          isLoading: false,
        });
      } catch (error) {
        console.error('Failed to check Google OAuth status:', error);
        if (!cancelled) {
          setStatus({
            isConnected: false,
            email: user?.email ?? undefined,
            hasGmailScopes: false,
            isLoading: false,
          });
        }
      }
    }

    void checkGoogleOAuth();

    return () => {
      cancelled = true;
    };
  }, [isLoading, isAuthenticated, userId, user]);

  return status;
}