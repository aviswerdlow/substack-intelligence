'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { signIn } from 'next-auth/react';
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
  const [gmailStatus, setGmailStatus] = useState<{ connected: boolean; email: string | null }>({
    connected: false,
    email: null
  });

  const refreshStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/gmail/status');
      if (!response.ok) {
        throw new Error('Failed to fetch Gmail status');
      }

      const data = await response.json();
      setGmailStatus({
        connected: Boolean(data.connected),
        email: data.email ?? null
      });
      return data;
    } catch (error) {
      console.error('Failed to refresh Gmail status:', error);
      setGmailStatus({ connected: false, email: null });
      return null;
    }
  }, []);

  // Check Gmail status when modal opens
  useEffect(() => {
    if (isOpen) {
      refreshStatus();
    }
  }, [isOpen, refreshStatus]);

  const handleGmailConnect = useCallback(async () => {
    setIsConnecting(true);
    setConnectionError(null);

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
        throw new Error(result?.error || 'Failed to initiate Gmail authentication');
      }

      // Open OAuth flow in popup window
      const width = 600;
      const height = 700;
      const left = (screen.width / 2) - (width / 2);
      const top = (screen.height / 2) - (height / 2);

      const popup = window.open(
        result.url,
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

      const verifyConnection = async () => {
        try {
          const status = await refreshStatus();

          if (status?.connected) {
            toast({
              title: 'Gmail Connected!',
              description: status.email ? `Connected as ${status.email}` : undefined,
            });

            setIsConnecting(false);
            onConnectionSuccess?.();
            onOpenChange(false);
          } else {
            setConnectionError('Gmail connection was not completed. Please try again.');
            setIsConnecting(false);
          }
        } catch (error) {
          console.error('Failed to verify Gmail connection:', error);
          setConnectionError('Failed to verify Gmail connection. Please try again.');
          setIsConnecting(false);
        }
        setAuthWindow(null);
      };

      // Check for completion
      const checkInterval = setInterval(() => {
        try {
          if (!popup || popup.closed) {
            clearInterval(checkInterval);
            clearTimeout(timeoutId);
            setAuthWindow(null);
            verifyConnection();
          }
        } catch {
          // Ignore cross-origin access errors while popup is open
        }
      }, 1000);

      // Timeout after 5 minutes
      const timeoutId = window.setTimeout(() => {
        clearInterval(checkInterval);
        if (popup && !popup.closed) {
          popup.close();
        }
        setAuthWindow(null);
        setConnectionError('Connection timeout - please try again');
        setIsConnecting(false);
      }, 5 * 60 * 1000);
    } catch (error) {
      console.error('Gmail connection error:', error);
      setConnectionError(error instanceof Error ? error.message : 'Unknown error occurred');
      setIsConnecting(false);
    }
  }, [toast, onConnectionSuccess, onOpenChange, refreshStatus]);

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
            {gmailStatus.connected ? 'Reconnect Gmail Account' : 'Connect Your Gmail Account'}
          </DialogTitle>
          <DialogDescription>
            {gmailStatus.connected
              ? `Your Gmail account${gmailStatus.email ? ` (${gmailStatus.email})` : ''} is connected. Reconnect if you'd like to refresh permissions.`
              : 'Connect Gmail to automatically analyze your newsletter emails using our secure OAuth flow.'
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
                <div className="flex-1">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {connectionError}
                  </p>
                </div>
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
                {gmailStatus.connected ? 'Reconnect Gmail' : 'Connect Gmail'}
                <ArrowRight className="h-3 w-3" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}