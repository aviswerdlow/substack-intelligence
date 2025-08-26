'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

interface GoogleOAuthStatus {
  isConnected: boolean;
  email?: string;
  hasGmailScopes: boolean;
  isLoading: boolean;
}

export function useGoogleOAuth(): GoogleOAuthStatus {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const [status, setStatus] = useState<GoogleOAuthStatus>({
    isConnected: false,
    hasGmailScopes: false,
    isLoading: true,
  });

  useEffect(() => {
    async function checkGoogleOAuth() {
      if (!isLoaded || !isSignedIn || !user) {
        setStatus({
          isConnected: false,
          hasGmailScopes: false,
          isLoading: false,
        });
        return;
      }

      // Check if user signed in with Google
      const googleAccount = user.externalAccounts?.find(
        account => account.provider === 'google'
      );

      if (googleAccount) {
        // User signed in with Google
        // Now we need to check if we have Gmail scopes
        
        try {
          // Try to get an OAuth token from Clerk
          // This requires proper configuration in Clerk dashboard
          const token = await getToken({ template: 'google_oauth' });
          
          if (token) {
            // We have a token! Check if it includes Gmail scopes
            // In production, you'd validate this token and check scopes
            setStatus({
              isConnected: true,
              email: googleAccount.emailAddress || undefined,
              hasGmailScopes: true, // You'd verify this by checking token scopes
              isLoading: false,
            });
          } else {
            // No token available - user needs to authorize Gmail access
            setStatus({
              isConnected: true,
              email: googleAccount.emailAddress || undefined,
              hasGmailScopes: false,
              isLoading: false,
            });
          }
        } catch (error) {
          console.error('Failed to get Google OAuth token:', error);
          setStatus({
            isConnected: true,
            email: googleAccount.emailAddress || undefined,
            hasGmailScopes: false,
            isLoading: false,
          });
        }
      } else {
        // User didn't sign in with Google
        setStatus({
          isConnected: false,
          hasGmailScopes: false,
          isLoading: false,
        });
      }
    }

    checkGoogleOAuth();
  }, [isLoaded, isSignedIn, user, getToken]);

  return status;
}