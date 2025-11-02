'use client';

import { useEffect, useState } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Loader2, Mail, AlertCircle } from 'lucide-react';

export default function GmailSetupPage() {
  const { isLoaded, userId } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [isConnecting, setIsConnecting] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if Gmail is already connected
  useEffect(() => {
    const checkGmailStatus = async () => {
      if (!userId) return;

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

    if (isLoaded && userId) {
      checkGmailStatus();
    }
  }, [isLoaded, userId, router]);

  const connectGmail = async () => {
    if (!userId) {
      setError('You must be signed in to connect Gmail');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Get the Gmail OAuth URL
      const response = await fetch('/api/auth/gmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        throw new Error('Failed to get Gmail authorization URL');
      }

      const { url } = await response.json();

      // Open Gmail OAuth in a popup window
      const width = 500;
      const height = 600;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        url,
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

  if (!isLoaded || checkingStatus) {
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
            {user?.primaryEmailAddress && (
              <div className="mt-2">
                Signed in as: <strong>{user.primaryEmailAddress.emailAddress}</strong>
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