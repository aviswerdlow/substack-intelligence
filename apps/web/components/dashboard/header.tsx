'use client';

import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function DashboardHeader() {
  const { toast } = useToast();

  const handleSync = async () => {
    console.log('[SYNC-BUTTON] Button clicked, starting sync...');

    try {
      // Show immediate feedback
      toast({
        title: 'Starting Sync',
        description: 'Initiating Gmail sync and pipeline processing...',
      });

      console.log('[SYNC-BUTTON] Making API call to /api/pipeline/sync...');

      // Call the actual pipeline sync endpoint
      const response = await fetch(`/api/pipeline/sync?_t=${Date.now()}`, {
        method: 'POST',
        headers: {
          'Cache-Control': 'no-cache',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          forceSync: true,
          lookbackDays: 7,  // Look back 7 days for emails
          debug: true       // Enable debug logging
        })
      });

      console.log('[SYNC-BUTTON] Response status:', response.status);
      console.log('[SYNC-BUTTON] Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[SYNC-BUTTON] Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();
      console.log('[SYNC-BUTTON] Response data:', data);

      if (data.success) {
        toast({
          title: 'Sync Completed',
          description: `Synced ${data.emailsSynced || 0} emails. ${data.newEmails || 0} new emails found. ${data.pendingEmails || 0} emails queued for processing.`,
        });

        // Reload after a bit longer to let the user see the message
        setTimeout(() => {
          console.log('[SYNC-BUTTON] Reloading page...');
          window.location.reload();
        }, 3000);
      } else {
        throw new Error(data.error || 'Sync failed');
      }
    } catch (error) {
      console.error('[SYNC-BUTTON] Sync error:', error);
      toast({
        title: 'Sync Failed',
        description: error instanceof Error ? error.message : 'Failed to trigger sync',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Daily venture intelligence from your curated Substack sources
        </p>
      </div>
      <Button className="gap-2" onClick={handleSync}>
        <Zap className="h-4 w-4" />
        Trigger Manual Sync
      </Button>
    </div>
  );
}