'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { 
  Mail, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Shield,
  Sparkles,
  ArrowRight,
  X
} from 'lucide-react';

interface GmailConnectionModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConnectionSuccess?: () => void;
  showBenefits?: boolean;
}

export function GmailConnectionModal({ 
  isOpen, 
  onOpenChange, 
  onConnectionSuccess,
  showBenefits = true 
}: GmailConnectionModalProps) {
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [authWindow, setAuthWindow] = useState<Window | null>(null);
  const [hasGoogleOAuth, setHasGoogleOAuth] = useState(false);
  
  // Check Google OAuth status when modal opens
  useEffect(() => {
    if (isOpen) {
      fetch('/api/auth/gmail/clerk-status')
        .then(res => res.json())
        .then(data => setHasGoogleOAuth(data.hasGoogleOAuth || false))
        .catch(() => setHasGoogleOAuth(false));
    }
  }, [isOpen]);

  const handleGmailConnect = useCallback(async () => {
    setIsConnecting(true);
    setConnectionError(null);

    try {
      // Check if user has Google OAuth through Clerk
      const clerkResponse = await fetch('/api/auth/gmail/clerk-status');
      const clerkData = await clerkResponse.json();

      if (!clerkResponse.ok) {
        throw new Error(clerkData.error || 'Failed to check Gmail connection');
      }

      if (clerkData.hasGoogleOAuth) {
        // User already has Google OAuth through Clerk
        toast({
          title: 'Gmail Connected!',
          description: `Connected as ${clerkData.googleEmail}`,
        });
        
        // Mark as connected in the database
        await fetch('/api/auth/gmail/mark-connected', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: clerkData.googleEmail })
        });
        
        setIsConnecting(false);
        onConnectionSuccess?.();
        onOpenChange(false);
        return;
      } else {
        // User needs to sign in with Google
        setConnectionError('Please sign out and sign back in with Google to connect Gmail');
        toast({
          title: 'Google Sign-in Required',
          description: 'Sign out and use "Sign in with Google" to connect Gmail.',
          variant: 'destructive',
        });
        setIsConnecting(false);
        
        // Optionally redirect to sign-in after a delay
        setTimeout(() => {
          if (confirm('Would you like to sign out and sign in with Google?')) {
            window.location.href = '/sign-in';
          }
        }, 2000);
        return;
      }

      // Fallback to old OAuth flow (shouldn't reach here)
      const response = await fetch('/api/auth/gmail');
      const data = await response.json();

      if (!response.ok) {
        if (data.error === 'Configuration Error') {
          setConnectionError(`Missing configuration: ${data.details?.join(', ') || 'Unknown'}`);
          return;
        }
        throw new Error(data.message || data.error || 'Failed to initiate Gmail authentication');
      }

      if (data.authUrl) {
        // Open OAuth flow in popup window
        const width = 600;
        const height = 700;
        const left = (screen.width / 2) - (width / 2);
        const top = (screen.height / 2) - (height / 2);
        
        const popup = window.open(
          data.authUrl,
          'gmail-auth',
          `width=${width},height=${height},left=${left},top=${top},status=yes,scrollbars=yes,resizable=yes`
        );

        if (!popup) {
          toast({
            title: 'Popup Blocked',
            description: 'Please allow popups for this site to connect Gmail.',
            variant: 'destructive',
          });
          setIsConnecting(false);
          return;
        }

        setAuthWindow(popup);

        // Check for completion
        const checkInterval = setInterval(() => {
          try {
            if (popup.closed) {
              clearInterval(checkInterval);
              setAuthWindow(null);
              
              // Check localStorage for success/error markers
              const connectedEmail = localStorage.getItem('gmail_connected_email');
              const connectionError = localStorage.getItem('gmail_connection_error');
              
              if (connectedEmail) {
                // Success!
                localStorage.removeItem('gmail_connected_email');
                localStorage.removeItem('gmail_connection_time');
                
                toast({
                  title: 'Gmail Connected Successfully!',
                  description: `Connected account: ${connectedEmail}`,
                });
                
                setIsConnecting(false);
                onConnectionSuccess?.();
                onOpenChange(false);
              } else if (connectionError) {
                // Error occurred
                setConnectionError(connectionError);
                localStorage.removeItem('gmail_connection_error');
                localStorage.removeItem('gmail_connection_error_time');
                setIsConnecting(false);
              } else {
                // Window closed without completion
                setConnectionError('Connection incomplete - please try again');
                setIsConnecting(false);
              }
            }
          } catch (e) {
            // Cross-origin errors are expected, continue checking
          }
        }, 1000);

        // Timeout after 5 minutes
        setTimeout(() => {
          clearInterval(checkInterval);
          if (popup && !popup.closed) {
            popup.close();
          }
          setAuthWindow(null);
          setConnectionError('Connection timeout - please try again');
          setIsConnecting(false);
        }, 5 * 60 * 1000);
      }
    } catch (error) {
      console.error('Gmail connection error:', error);
      setConnectionError(error instanceof Error ? error.message : 'Unknown error occurred');
      setIsConnecting(false);
    }
  }, [toast, onConnectionSuccess, onOpenChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (authWindow && !authWindow.closed) {
        authWindow.close();
      }
    };
  }, [authWindow]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Connect Your Gmail Account
          </DialogTitle>
          <DialogDescription>
            {hasGoogleOAuth 
              ? "Your Gmail is already connected through Google sign-in!"
              : "For the best experience, sign out and sign back in with Google to connect Gmail automatically"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {showBenefits && (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-green-100 p-1.5 dark:bg-green-900/20">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Automatic Processing</p>
                  <p className="text-xs text-muted-foreground">
                    Your newsletters will be processed automatically every day
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-blue-100 p-1.5 dark:bg-blue-900/20">
                  <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">AI-Powered Extraction</p>
                  <p className="text-xs text-muted-foreground">
                    Automatically identify companies and insights from your newsletters
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-purple-100 p-1.5 dark:bg-purple-900/20">
                  <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Secure & Private</p>
                  <p className="text-xs text-muted-foreground">
                    We only read newsletter emails, your data is encrypted and secure
                  </p>
                </div>
              </div>
            </div>
          )}

          {connectionError && (
            <div className="rounded-lg border border-red-500/50 bg-red-50/10 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-500" />
                <p className="text-sm text-red-600 dark:text-red-400">
                  {connectionError}
                </p>
              </div>
            </div>
          )}

          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">
              <strong>Note:</strong> You'll be redirected to Google to authorize access. 
              We only request permission to read emails from newsletter senders.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isConnecting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleGmailConnect}
            disabled={isConnecting}
            className="gap-2"
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4" />
                Connect Gmail
                <ArrowRight className="h-3 w-3" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}