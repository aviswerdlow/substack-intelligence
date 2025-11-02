'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Loader2, Mail, AlertCircle } from 'lucide-react';
import { useSessionUser } from '@/hooks/use-session-user';

export default function GmailSetupPage() {
  const router = useRouter();
  const { isLoading: sessionLoading, isAuthenticated, user: sessionUser, userId } = useSessionUser();
  const [isConnecting, setIsConnecting] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if Gmail is already connected
  useEffect(() => {
    const checkGmailStatus = async () => {
      try {
        const response = await fetch('/api/auth/gmail/status');
        const data = await response.json();
        setGmailConnected(data.connected || false);

        // If already connected, redirect to dashboard
        if (data.connected) {
          setTimeout(() => {
            router.push('/dashboard');
          }, 2000);
        }
      } catch (error) {
        console.error('Failed to check Gmail status:', error);
      } finally {
        setCheckingStatus(false);
      }
    };

    if (sessionLoading) {
      return;
    }

    if (!isAuthenticated || !userId) {
      setCheckingStatus(false);
      return;
    }

    void checkGmailStatus();
  }, [sessionLoading, isAuthenticated, userId, router]);

  useEffect(() => {
    if (!sessionLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [sessionLoading, isAuthenticated, router]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get('autoClose') !== '1') {
      return;
    }

    const finalizePopup = async () => {
      try {
        const response = await fetch('/api/auth/gmail/status');
        const data = await response.json();

        if (data.connected && window.opener) {
          window.opener.postMessage({ type: 'gmail-connected' }, window.location.origin);
          window.close();
        }
      } catch (error) {
        console.error('Failed to finalize Gmail popup:', error);
      }

      if (window.opener) {
        setTimeout(() => {
          try {
            window.close();
          } catch (error) {
            console.error('Failed to close Gmail popup window:', error);
          }
        }, 1500);
      }
    };

    void finalizePopup();
  }, []);

  const connectGmail = async () => {
    if (!userId) {
      setError('You must be signed in to connect Gmail');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const result = await signIn(
        'google',
        {
          redirect: false,
          callbackUrl: `${window.location.origin}/auth/gmail-setup?autoClose=1`,
        },
        {
          prompt: 'consent',
          access_type: 'offline',
          include_granted_scopes: 'true',
        }
      );

      if (!result?.url) {
        throw new Error(result?.error || 'Failed to start Gmail authentication');
      }

      // Open Gmail OAuth in a popup window
      const width = 500;
      const height = 600;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        result.url,
        'gmail-oauth',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
      );

      // Monitor popup for completion
      const checkInterval = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(checkInterval);
          setIsConnecting(false);

          // Check if Gmail was successfully connected
          setTimeout(async () => {
            const response = await fetch('/api/auth/gmail/status');
            const data = await response.json();

            if (data.connected) {
              setGmailConnected(true);
              setTimeout(() => {
                router.push('/dashboard');
              }, 2000);
            } else {
              setError('Gmail connection was not completed. Please try again.');
            }
          }, 1000);
        }
      }, 1000);

    } catch (error) {
      console.error('Failed to connect Gmail:', error);
      setError('Failed to connect Gmail. Please try again.');
      setIsConnecting(false);
    }
  };

  const skipGmailSetup = () => {
    router.push('/dashboard');
  };

  if (sessionLoading || checkingStatus) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (gmailConnected) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-4" />
            <CardTitle>Gmail Connected Successfully!</CardTitle>
            <CardDescription>
              Redirecting you to the dashboard...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-6 w-6 text-blue-600" />
            <CardTitle>Connect Your Gmail</CardTitle>
          </div>
          <CardDescription>
            {sessionUser?.email && (
              <div className="mt-2">
                Signed in as: <strong>{sessionUser.email}</strong>
              </div>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="font-medium">Why connect Gmail?</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Automatically import and analyze your newsletter subscriptions</li>
                <li>• Get AI-powered insights from your email content</li>
                <li>• Track engagement and discover new opportunities</li>
                <li>• Secure OAuth connection - we never store your password</li>
              </ul>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 rounded-lg">
                <AlertCircle className="h-4 w-4" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-3">
              <Button
                onClick={connectGmail}
                disabled={isConnecting}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting Gmail...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Connect Gmail Account
                  </>
                )}
              </Button>

              <Button
                onClick={skipGmailSetup}
                variant="outline"
                className="w-full"
                disabled={isConnecting}
              >
                Skip for now
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              You can always connect Gmail later from your account settings
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}