'use client';

import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function DashboardHeader() {
  const { toast } = useToast();

  const handleSync = async () => {
    try {
      const response = await fetch(`/api/test/gmail?_t=${Date.now()}`, {
        method: 'POST',
        headers: { 
          'Cache-Control': 'no-cache',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ days: 30 }) // Fetch emails from the past 30 days
      });
      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Sync Started',
          description: `Fetched ${data.data.emailsProcessed} emails from Gmail.`,
        });
        setTimeout(() => window.location.reload(), 1500);
      } else {
        throw new Error(data.error || 'Sync failed');
      }
    } catch (error) {
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