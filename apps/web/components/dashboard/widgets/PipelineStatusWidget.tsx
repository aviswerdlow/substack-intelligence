'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  Pause, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Zap,
  Activity
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PipelineStatus {
  status: 'idle' | 'running' | 'completed' | 'failed';
  currentStep: string;
  progress: number;
  lastRun: string;
  nextRun: string;
  steps: {
    name: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    duration?: number;
  }[];
}

export function PipelineStatusWidget() {
  const { toast } = useToast();
  const [status, setStatus] = useState<PipelineStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTriggering, setIsTriggering] = useState(false);

  useEffect(() => {
    fetchPipelineStatus();
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchPipelineStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchPipelineStatus = async () => {
    try {
      // Mock status - replace with actual API call
      const mockStatus: PipelineStatus = {
        status: 'idle',
        currentStep: '',
        progress: 0,
        lastRun: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        nextRun: new Date(Date.now() + 1000 * 60 * 60 * 10).toISOString(),
        steps: [
          { name: 'Fetch Emails', status: 'pending' },
          { name: 'Extract Companies', status: 'pending' },
          { name: 'Enrich Data', status: 'pending' },
          { name: 'Generate Reports', status: 'pending' }
        ]
      };
      
      setStatus(mockStatus);
    } catch (error) {
      console.error('Failed to fetch pipeline status:', error);
    } finally {
      setLoading(false);
    }
  };

  const triggerPipeline = async () => {
    setIsTriggering(true);
    try {
      const response = await fetch('/api/trigger/intelligence', {
        method: 'POST'
      });
      
      if (response.ok) {
        toast({
          title: 'Pipeline Started',
          description: 'Intelligence pipeline has been triggered manually.',
        });
        
        // Update status to running
        setStatus(prev => prev ? {
          ...prev,
          status: 'running',
          currentStep: 'Fetch Emails',
          progress: 25,
          steps: [
            { name: 'Fetch Emails', status: 'running' },
            { name: 'Extract Companies', status: 'pending' },
            { name: 'Enrich Data', status: 'pending' },
            { name: 'Generate Reports', status: 'pending' }
          ]
        } : null);
      } else {
        throw new Error('Failed to trigger pipeline');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to trigger pipeline. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsTriggering(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Activity className="h-4 w-4 animate-pulse" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed': return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTimeUntilNext = (nextRun: string) => {
    const now = Date.now();
    const next = new Date(nextRun).getTime();
    const diff = next - now;
    
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-1/2 mb-2" />
          <div className="h-8 bg-muted rounded w-1/3" />
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <Zap className="h-8 w-8 mx-auto mb-2" />
        <p className="text-sm">Pipeline status unavailable</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusIcon(status.status)}
          <Badge className={getStatusColor(status.status)}>
            {status.status === 'running' ? status.currentStep : status.status}
          </Badge>
        </div>
        <Button
          size="sm"
          variant={status.status === 'running' ? 'outline' : 'default'}
          onClick={triggerPipeline}
          disabled={isTriggering || status.status === 'running'}
          data-pipeline-trigger
        >
          {isTriggering ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : status.status === 'running' ? (
            <>
              <Pause className="h-4 w-4 mr-1" />
              Running
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-1" />
              Run Now
            </>
          )}
        </Button>
      </div>

      {/* Progress Bar */}
      {status.status === 'running' && (
        <div>
          <Progress value={status.progress} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            {status.progress}% complete
          </p>
        </div>
      )}

      {/* Pipeline Steps */}
      <div className="space-y-2">
        {status.steps.map((step, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            {step.status === 'running' ? (
              <RefreshCw className="h-3 w-3 animate-spin text-blue-600" />
            ) : step.status === 'completed' ? (
              <CheckCircle className="h-3 w-3 text-green-600" />
            ) : step.status === 'failed' ? (
              <XCircle className="h-3 w-3 text-red-600" />
            ) : (
              <Circle className="h-3 w-3 text-gray-400" />
            )}
            <span className={step.status === 'running' ? 'font-medium' : 'text-muted-foreground'}>
              {step.name}
            </span>
            {step.duration && (
              <span className="text-xs text-muted-foreground ml-auto">
                {step.duration}ms
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Schedule Info */}
      <div className="pt-3 border-t space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Last run</span>
          <span>{new Date(status.lastRun).toLocaleTimeString()}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Next run</span>
          <span className="font-medium">in {getTimeUntilNext(status.nextRun)}</span>
        </div>
      </div>
    </div>
  );
}

// Import statements for missing icons
import { XCircle, Circle } from 'lucide-react';