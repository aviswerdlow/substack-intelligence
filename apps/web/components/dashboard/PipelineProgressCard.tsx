'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
// ScrollArea component - using native scroll instead
import { useToast } from '@/hooks/use-toast';
import { 
  Play, 
  Pause, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Zap,
  Activity,
  Sparkles,
  Mail,
  Building2,
  ArrowRight,
  Loader2
} from 'lucide-react';

interface CompanyDiscovery {
  name: string;
  description: string;
  isNew: boolean;
  source?: string;
}

interface PipelineUpdate {
  type: 'connected' | 'status' | 'emails_fetched' | 'processing_email' | 'company_discovered' | 'complete' | 'error' | 'heartbeat' | 'continuing_background' | 'background_progress';
  status?: string;
  progress?: number;
  message?: string;
  stats?: {
    emailsFetched: number;
    companiesExtracted: number;
    newCompanies: number;
    totalMentions: number;
  };
  currentEmail?: number;
  totalEmails?: number;
  estimatedTimeRemaining?: number;
  companiesFound?: CompanyDiscovery[];
  company?: CompanyDiscovery;
  emailCount?: number;
  timestamp?: string;
  remainingCount?: number;
  processedCount?: number;
  totalCount?: number;
}

export function PipelineProgressCard() {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [currentStep, setCurrentStep] = useState<string>('');
  const [stats, setStats] = useState({
    emailsFetched: 0,
    companiesExtracted: 0,
    newCompanies: 0,
    totalMentions: 0
  });
  const [companiesDiscovered, setCompaniesDiscovered] = useState<CompanyDiscovery[]>([]);
  const [activityLog, setActivityLog] = useState<string[]>([]);
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  // Connect to SSE stream when pipeline starts
  const connectToStream = useCallback(() => {
    const es = new EventSource('/api/pipeline/sync/stream');
    
    es.onmessage = (event) => {
      try {
        const update: PipelineUpdate = JSON.parse(event.data);
        handleStreamUpdate(update);
      } catch (error) {
        console.error('Failed to parse SSE update:', error);
      }
    };
    
    es.onerror = (error) => {
      console.error('SSE connection error:', error);
      es.close();
      setEventSource(null);
      setIsRunning(false);
    };
    
    setEventSource(es);
  }, []);

  // Handle updates from SSE stream
  const handleStreamUpdate = (update: PipelineUpdate) => {
    if (update.type === 'heartbeat') return;
    
    switch (update.type) {
      case 'connected':
        addActivityLog('✅ Connected to pipeline stream');
        break;
        
      case 'status':
        setProgress(update.progress || 0);
        setStatusMessage(update.message || '');
        if (update.stats) setStats(update.stats);
        addActivityLog(`⚡ ${update.message}`);
        break;
        
      case 'emails_fetched':
        setProgress(update.progress || 0);
        setStatusMessage(update.message || '');
        if (update.stats) setStats(update.stats);
        addActivityLog(`📧 Found ${update.emailCount} newsletters to analyze`);
        break;
        
      case 'processing_email':
        setProgress(update.progress || 0);
        setStatusMessage(update.message || '');
        setCurrentStep(`Email ${update.currentEmail}/${update.totalEmails}`);
        if (update.stats) setStats(update.stats);
        if (update.estimatedTimeRemaining) {
          setEstimatedTime(update.estimatedTimeRemaining);
        }
        if (update.companiesFound && update.companiesFound.length > 0) {
          setCompaniesDiscovered(prev => [...update.companiesFound!, ...prev].slice(0, 20));
        }
        addActivityLog(`🔍 ${update.message}`);
        break;
        
      case 'company_discovered':
        if (update.company) {
          setCompaniesDiscovered(prev => [update.company!, ...prev].slice(0, 20));
          if (update.company.isNew) {
            addActivityLog(`💎 Discovered new company: ${update.company.name}`);
            toast({
              title: 'New Company Discovered!',
              description: update.company.name,
            });
          } else {
            addActivityLog(`🔄 Updated: ${update.company.name}`);
          }
        }
        if (update.stats) setStats(update.stats);
        break;
      
      case 'continuing_background':
        setStatusMessage(update.message || 'Continuing processing in background...');
        addActivityLog(`🔄 ${update.message}`);
        if (update.stats) setStats(update.stats);
        toast({
          title: 'Processing Continues',
          description: `Processing ${update.remainingCount} emails in background. No action needed.`,
        });
        break;
        
      case 'background_progress':
        if (update.processedCount && update.totalCount) {
          setProgress(Math.round((update.processedCount / update.totalCount) * 100));
          setStatusMessage(`Background: Processing ${update.processedCount} of ${update.totalCount} emails...`);
        }
        addActivityLog(`⚡ Background: Processed ${update.processedCount || 0} emails`);
        break;
        
      case 'background_complete':
        setIsRunning(false);
        setProgress(100);
        setStatusMessage('All emails processed successfully!');
        addActivityLog(`✅ Background processing complete: ${update.companiesExtracted} companies extracted`);
        toast({
          title: 'Processing Complete!',
          description: `Successfully processed all emails and extracted ${update.companiesExtracted} companies.`,
        });
        break;
        
      case 'complete':
        setIsRunning(false);
        setProgress(100);
        setStatusMessage(update.message || 'Pipeline completed');
        setCurrentStep('Complete');
        if (update.stats) setStats(update.stats);
        addActivityLog(`🎉 ${update.message}`);
        
        toast({
          title: 'Pipeline Complete!',
          description: update.message,
        });
        
        // Close SSE connection
        if (eventSource) {
          eventSource.close();
          setEventSource(null);
        }
        break;
        
      case 'error':
        setIsRunning(false);
        setProgress(0);
        setStatusMessage('Pipeline error');
        addActivityLog(`❌ Error: ${update.message}`);
        
        toast({
          title: 'Pipeline Error',
          description: update.message,
          variant: 'destructive',
        });
        
        // Close SSE connection
        if (eventSource) {
          eventSource.close();
          setEventSource(null);
        }
        break;
    }
  };

  const addActivityLog = (message: string) => {
    setActivityLog(prev => [message, ...prev].slice(0, 50));
  };

  const runPipeline = async () => {
    setIsRunning(true);
    setProgress(5);
    setStatusMessage('Starting pipeline...');
    setCompaniesDiscovered([]);
    setActivityLog([]);
    addActivityLog('🚀 Starting intelligence pipeline...');
    
    // Connect to SSE stream
    connectToStream();
    
    try {
      const response = await fetch('/api/pipeline/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ forceRefresh: true })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Pipeline failed');
      }
      
      // Response handling moved to SSE updates
    } catch (error) {
      setIsRunning(false);
      setProgress(0);
      console.error('Pipeline error:', error);
      
      toast({
        title: 'Pipeline Error',
        description: error instanceof Error ? error.message : 'Failed to run pipeline',
        variant: 'destructive',
      });
      
      // Close SSE connection on error
      if (eventSource) {
        eventSource.close();
        setEventSource(null);
      }
    }
  };

  // Clean up SSE connection on unmount
  useEffect(() => {
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [eventSource]);

  // Format time remaining
  const formatTimeRemaining = (seconds: number) => {
    if (seconds < 60) return `${seconds} seconds`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Main Progress Card */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Intelligence Pipeline
              </CardTitle>
              <CardDescription>
                {isRunning ? statusMessage : 'Extract insights from your newsletters'}
              </CardDescription>
            </div>
            <Button
              onClick={runPipeline}
              disabled={isRunning}
              size="sm"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Processing
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-1" />
                  Run Pipeline
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Progress Bar */}
          {(isRunning || progress > 0) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{currentStep}</span>
                {estimatedTime !== null && estimatedTime > 0 && (
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTimeRemaining(estimatedTime)} remaining
                  </span>
                )}
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{progress}% complete</span>
              </div>
            </div>
          )}
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span className="text-xs">Emails</span>
              </div>
              <p className="text-2xl font-bold">{stats.emailsFetched}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span className="text-xs">Companies</span>
              </div>
              <p className="text-2xl font-bold">{stats.companiesExtracted}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Sparkles className="h-4 w-4" />
                <span className="text-xs">New</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{stats.newCompanies}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Activity className="h-4 w-4" />
                <span className="text-xs">Mentions</span>
              </div>
              <p className="text-2xl font-bold">{stats.totalMentions}</p>
            </div>
          </div>
          
          {/* Recently Discovered Companies */}
          {companiesDiscovered.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Recently Discovered
              </h3>
              <div className="space-y-2">
                {companiesDiscovered.slice(0, 5).map((company, index) => (
                  <div
                    key={`${company.name}-${index}`}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 animate-in slide-in-from-left duration-500"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{company.name}</span>
                        {company.isNew && (
                          <Badge variant="secondary" className="text-xs">New</Badge>
                        )}
                      </div>
                      {company.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {company.description}
                        </p>
                      )}
                      {company.source && (
                        <p className="text-xs text-muted-foreground">
                          via {company.source}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Skeleton Loading for Pending Companies */}
          {isRunning && companiesDiscovered.length < 3 && (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="p-3 rounded-lg bg-muted/30 animate-pulse">
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-1/3" />
                    <div className="h-3 bg-muted rounded w-full" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Activity Log Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Activity Log</CardTitle>
          <CardDescription className="text-xs">
            Live updates from the pipeline
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] overflow-y-auto pr-4">
            <div className="space-y-2">
              {activityLog.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">
                  Activity will appear here when the pipeline runs
                </p>
              ) : (
                activityLog.map((log, index) => (
                  <div
                    key={index}
                    className="text-xs text-muted-foreground animate-in slide-in-from-top duration-300"
                  >
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}