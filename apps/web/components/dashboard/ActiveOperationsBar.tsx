'use client';

import React, { useContext } from 'react';
import { PipelineStateContext } from '@/contexts/PipelineStateContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  Play, 
  Pause, 
  Square, 
  ChevronDown, 
  ChevronUp,
  Activity,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  XCircle,
  Loader2,
  Mail,
  Building2,
  Clock,
  Zap
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export function ActiveOperationsBar() {
  const context = useContext(PipelineStateContext);
  
  // If no context, return null (component won't be visible)
  if (!context) {
    return null;
  }
  
  const { 
    state, 
    startPipeline, 
    stopPipeline, 
    pausePipeline, 
    resumePipeline,
    isRunning,
    isPaused 
  } = context;
  
  const [isExpanded, setIsExpanded] = React.useState(false);
  
  // Get status icon and color
  const getStatusConfig = () => {
    switch (state.status) {
      case 'idle':
        return { 
          icon: Activity, 
          color: 'text-gray-500', 
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          label: 'Ready' 
        };
      case 'connecting':
        return { 
          icon: Loader2, 
          color: 'text-blue-500', 
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          label: 'Connecting...',
          animate: true 
        };
      case 'fetching':
        return { 
          icon: Mail, 
          color: 'text-blue-500', 
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          label: 'Fetching Emails' 
        };
      case 'extracting':
      case 'processing':
        return { 
          icon: Building2, 
          color: 'text-purple-500', 
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200',
          label: 'Extracting Companies' 
        };
      case 'complete':
        return { 
          icon: CheckCircle, 
          color: 'text-green-500', 
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          label: 'Complete' 
        };
      case 'error':
        return { 
          icon: XCircle, 
          color: 'text-red-500', 
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          label: 'Error' 
        };
      default:
        return { 
          icon: Activity, 
          color: 'text-gray-500', 
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          label: 'Unknown' 
        };
    }
  };
  
  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;
  
  // Format time
  const formatTime = (seconds: number | null) => {
    if (!seconds) return null;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };
  
  // Always show the bar for consistent UI</  // Removed the condition that hid the bar when idle with no sync history
  
  return (
    <div className={cn(
      'mb-6 rounded-lg border transition-all duration-300',
      statusConfig.borderColor,
      statusConfig.bgColor
    )}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left side - Status */}
            <div className="flex items-center gap-4">
              {/* Status Icon */}
              <div className={cn(
                'flex items-center justify-center w-10 h-10 rounded-full',
                'bg-white shadow-sm'
              )}>
                <StatusIcon className={cn(
                  'h-5 w-5',
                  statusConfig.color,
                  statusConfig.animate && 'animate-spin'
                )} />
              </div>
              
              {/* Status Text */}
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold">Intelligence Pipeline</h3>
                  <Badge variant="outline" className={cn('text-xs', statusConfig.color)}>
                    {statusConfig.label}
                  </Badge>
                  {isPaused && (
                    <Badge variant="outline" className="text-xs text-orange-500">
                      Paused
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {state.message || 
                   (state.lastSyncTime 
                     ? `Last run ${formatDistanceToNow(state.lastSyncTime, { addSuffix: true })}`
                     : 'Ready to analyze your newsletters')}
                </p>
              </div>
            </div>
            
            {/* Center - Progress */}
            {isRunning && (
              <div className="flex-1 max-w-md mx-6">
                <div className="flex items-center gap-2 mb-1">
                  <Progress value={state.progress} className="flex-1" />
                  <span className="text-xs font-medium text-muted-foreground">
                    {Math.round(state.progress)}%
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  {/* Emails progress */}
                  {state.totalEmails > 0 && (
                    <div className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      <span>{state.currentEmail}/{state.totalEmails} emails</span>
                    </div>
                  )}
                  
                  {/* Companies found */}
                  {state.metrics.companiesExtracted > 0 && (
                    <div className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      <span>{state.metrics.companiesExtracted} companies</span>
                    </div>
                  )}
                  
                  {/* Processing rate */}
                  {state.metrics.processingRate > 0 && (
                    <div className="flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      <span>{state.metrics.processingRate}/min</span>
                    </div>
                  )}
                  
                  {/* Time remaining */}
                  {state.estimatedTimeRemaining && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatTime(state.estimatedTimeRemaining)} left</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Right side - Controls */}
            <div className="flex items-center gap-2">
              {/* Action Buttons */}
              {!isRunning && state.status !== 'complete' && (
                <Button
                  onClick={startPipeline}
                  size="sm"
                  className="gap-2"
                >
                  <Play className="h-3 w-3" />
                  Run Pipeline
                </Button>
              )}
              
              {isRunning && !isPaused && (
                <Button
                  onClick={pausePipeline}
                  size="sm"
                  variant="outline"
                  className="gap-2"
                >
                  <Pause className="h-3 w-3" />
                  Pause
                </Button>
              )}
              
              {isRunning && isPaused && (
                <Button
                  onClick={resumePipeline}
                  size="sm"
                  variant="outline"
                  className="gap-2"
                >
                  <Play className="h-3 w-3" />
                  Resume
                </Button>
              )}
              
              {isRunning && (
                <Button
                  onClick={stopPipeline}
                  size="sm"
                  variant="ghost"
                  className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Square className="h-3 w-3" />
                  Stop
                </Button>
              )}
              
              {/* Force Unlock button if stuck at 0% for more than 30 seconds */}
              {(state.status === 'connecting' || state.status === 'fetching') && state.progress === 0 && (
                <Button
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/pipeline/unlock', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                      });
                      
                      if (response.ok) {
                        // Reset state and reload
                        window.location.reload();
                      }
                    } catch (error) {
                      console.error('Failed to unlock pipeline:', error);
                    }
                  }}
                  size="sm"
                  variant="ghost"
                  className="gap-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                  title="Force unlock if pipeline is stuck"
                >
                  <AlertTriangle className="h-3 w-3" />
                  Unlock
                </Button>
              )}
              
              {state.status === 'complete' && (
                <Button
                  onClick={startPipeline}
                  size="sm"
                  variant="outline"
                  className="gap-2"
                >
                  <Play className="h-3 w-3" />
                  Run Again
                </Button>
              )}
              
              {/* Expand/Collapse */}
              <CollapsibleTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                >
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </div>
        
        {/* Expandable Content - Activity Log & Recent Discoveries */}
        <CollapsibleContent>
          <div className="border-t px-6 py-4">
            <div className="grid grid-cols-2 gap-6">
              {/* Recent Discoveries */}
              <div>
                <h4 className="text-sm font-medium mb-3">Recent Discoveries</h4>
                {state.recentDiscoveries.length > 0 ? (
                  <div className="space-y-2">
                    {state.recentDiscoveries.slice(0, 5).map((company, index) => (
                      <div 
                        key={`${company.name}-${index}`}
                        className="flex items-start gap-2 text-sm"
                      >
                        <Badge 
                          variant={company.isNew ? 'default' : 'outline'} 
                          className="text-xs"
                        >
                          {company.isNew ? 'New' : 'Known'}
                        </Badge>
                        <div className="flex-1">
                          <p className="font-medium">{company.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {company.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No companies discovered yet
                  </p>
                )}
              </div>
              
              {/* Activity Log */}
              <div>
                <h4 className="text-sm font-medium mb-3">Activity Log</h4>
                {state.activityLog.length > 0 ? (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {state.activityLog.slice(0, 10).map((log) => (
                      <div 
                        key={log.id}
                        className="flex items-start gap-2 text-xs"
                      >
                        <span className="text-muted-foreground">
                          {log.timestamp.toLocaleTimeString()}
                        </span>
                        <span className={cn(
                          'flex-1',
                          log.type === 'error' && 'text-red-600',
                          log.type === 'warning' && 'text-orange-600',
                          log.type === 'success' && 'text-green-600'
                        )}>
                          {log.message}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No activity yet
                  </p>
                )}
              </div>
            </div>
            
            {/* Metrics Summary */}
            {state.metrics && (state.metrics.emailsFetched > 0 || state.lastSyncTime) && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span>
                      📧 {state.metrics.emailsFetched} emails fetched
                    </span>
                    <span>
                      🏢 {state.metrics.companiesExtracted} companies found
                    </span>
                    <span>
                      ✨ {state.metrics.newCompanies} new discoveries
                    </span>
                    <span>
                      📊 {state.metrics.totalMentions} total mentions
                    </span>
                  </div>
                  {state.lastSyncTime && (
                    <span>
                      Last sync: {state.lastSyncTime.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}