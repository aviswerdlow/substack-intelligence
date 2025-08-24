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
  const [configError, setConfigError] = useState<{
    isError: boolean;
    missingVars: string[];
    message: string;
  } | null>(null);

  useEffect(() => {
    fetchPipelineStatus();
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchPipelineStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchPipelineStatus = async () => {
    try {
      setConfigError(null); // Clear any previous config errors
      
      // First check Gmail health
      const healthResponse = await fetch('/api/auth/gmail/health', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      const healthData = await healthResponse.json();
      
      // Handle configuration errors
      if (!healthData.success && healthData.details?.configurationIssues) {
        setConfigError({
          isError: true,
          missingVars: healthData.details.missingEnvVars || [],
          message: healthData.error || 'Gmail configuration incomplete'
        });
        setLoading(false);
        return;
      }
      
      // Fetch real pipeline status from API
      const response = await fetch('/api/pipeline/status', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.data?.metrics) {
        const metrics = data.data.metrics;
        const health = data.data.health;
        
        // Transform API response to PipelineStatus format
        const pipelineStatus: PipelineStatus = {
          status: health?.status === 'healthy' ? 'idle' : health?.status === 'warning' ? 'idle' : 'failed',
          currentStep: '',
          progress: 0,
          lastRun: metrics.lastSyncTime || new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
          nextRun: health?.suggestedNextSync || new Date(Date.now() + 1000 * 60 * 60).toISOString(),
          steps: [
            { 
              name: 'Fetch Emails', 
              status: metrics.recentEmails > 0 ? 'completed' : 'pending',
              duration: metrics.recentEmails > 0 ? 1500 : undefined
            },
            { 
              name: 'Extract Companies', 
              status: metrics.recentCompanies > 0 ? 'completed' : 'pending',
              duration: metrics.recentCompanies > 0 ? 2800 : undefined
            },
            { 
              name: 'Enrich Data', 
              status: metrics.totalMentions > 0 ? 'completed' : 'pending',
              duration: metrics.totalMentions > 0 ? 1200 : undefined
            },
            { 
              name: 'Generate Reports', 
              status: metrics.totalCompanies > 0 ? 'completed' : 'pending',
              duration: metrics.totalCompanies > 0 ? 800 : undefined
            }
          ]
        };
        
        setStatus(pipelineStatus);
      } else {
        throw new Error(data.error || 'Invalid API response format');
      }
    } catch (error) {
      console.error('Failed to fetch pipeline status:', error);
      
      // Set error state but don't clear existing status completely
      setStatus(prev => prev ? {
        ...prev,
        status: 'failed',
        currentStep: '',
        progress: 0
      } : null);
      
      toast({
        title: 'Pipeline Status Error',
        description: error instanceof Error ? error.message : 'Failed to fetch pipeline status',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const triggerPipeline = async () => {
    setIsTriggering(true);
    try {
      // Use the actual pipeline sync endpoint
      const response = await fetch('/api/pipeline/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ forceRefresh: true })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        if (data.skipped) {
          toast({
            title: 'Data is Fresh',
            description: 'Pipeline data is up-to-date. No sync needed.',
          });
        } else {
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
        }
        
        // Refresh status after a short delay
        setTimeout(fetchPipelineStatus, 2000);
      } else {
        throw new Error(data.error || `Server responded with status: ${response.status}`);
      }
    } catch (error) {
      console.error('Pipeline trigger failed:', error);
      toast({
        title: 'Pipeline Error',
        description: error instanceof Error ? error.message : 'Failed to trigger pipeline. Please try again.',
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

  // Configuration error state
  if (configError?.isError) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-amber-600">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">Configuration Required</span>
        </div>
        
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
          <p className="text-sm text-amber-800">
            Gmail pipeline setup is incomplete. Missing environment variables:
          </p>
          
          <ul className="text-xs text-amber-700 space-y-1 ml-4">
            {configError.missingVars.map(varName => (
              <li key={varName} className="flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-400 rounded-full" />
                <code className="bg-amber-100 px-1 rounded">{varName}</code>
              </li>
            ))}
          </ul>
          
          <div className="pt-2 border-t border-amber-200">
            <p className="text-xs text-amber-600">
              Contact your administrator to configure Gmail OAuth credentials.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-4 bg-muted rounded w-24" />
            <div className="h-8 bg-muted rounded w-20" />
          </div>
          <div className="h-2 bg-muted rounded w-full" />
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="h-3 w-3 bg-muted rounded-full" />
                <div className="h-3 bg-muted rounded w-32" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Zap className="h-8 w-8 mx-auto mb-2" />
        <p className="text-sm">Pipeline status unavailable</p>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchPipelineStatus}
          className="mt-3"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Retry
        </Button>
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