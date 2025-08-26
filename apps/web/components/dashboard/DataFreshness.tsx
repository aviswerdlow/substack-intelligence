'use client';

import { useEffect, useState, useContext } from 'react';
import { PipelineStateContext } from '@/contexts/PipelineStateContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  RefreshCw, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  Activity,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export function DataFreshness() {
  // Try to use context, but provide fallback
  const context = useContext(PipelineStateContext);
  
  // If no context, return null (component won't be visible)
  if (!context) {
    return null;
  }
  
  const { 
    state,
    startPipeline,
    isRunning,
    checkDataFreshness
  } = context;
  
  const [timeAgo, setTimeAgo] = useState<string>('');
  
  // Update time ago every minute
  useEffect(() => {
    const updateTimeAgo = () => {
      if (state.lastSyncTime) {
        setTimeAgo(formatDistanceToNow(state.lastSyncTime, { addSuffix: true }));
      } else {
        setTimeAgo('Never');
      }
    };
    
    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [state.lastSyncTime]);
  
  // Determine freshness status
  const getFreshnessStatus = () => {
    if (isRunning) {
      return {
        status: 'syncing',
        color: 'text-blue-500',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        icon: RefreshCw,
        label: 'Syncing...',
        message: 'Fetching latest intelligence data'
      };
    }
    
    switch (state.dataFreshness) {
      case 'fresh':
        return {
          status: 'fresh',
          color: 'text-green-500',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          icon: CheckCircle,
          label: 'Fresh',
          message: 'Data is up-to-date'
        };
      case 'stale':
        return {
          status: 'stale',
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          icon: AlertCircle,
          label: 'Getting Stale',
          message: 'Consider refreshing soon'
        };
      case 'outdated':
        return {
          status: 'outdated',
          color: 'text-red-500',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          icon: XCircle,
          label: 'Outdated',
          message: 'Refresh recommended'
        };
      default:
        return {
          status: 'unknown',
          color: 'text-gray-500',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          icon: Activity,
          label: 'Unknown',
          message: 'Check connection status'
        };
    }
  };
  
  const freshnessStatus = getFreshnessStatus();
  const Icon = freshnessStatus.icon;
  
  const handleManualSync = async () => {
    await startPipeline(); // Start pipeline
  };
  
  // Check freshness on mount only once
  useEffect(() => {
    checkDataFreshness();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once on mount
  
  return (
    <div className="flex items-center gap-2">
      {/* Freshness Badge */}
      <Badge 
        variant="outline" 
        className={cn(
          'px-3 py-1 flex items-center gap-2 transition-colors',
          freshnessStatus.bgColor,
          freshnessStatus.borderColor
        )}
      >
        <Icon className={cn('h-3 w-3', freshnessStatus.color, isRunning && 'animate-spin')} />
        <span className={cn('text-xs font-medium', freshnessStatus.color)}>
          {freshnessStatus.label}
        </span>
      </Badge>
      
      {/* Last Sync Time */}
      <span className="text-xs text-muted-foreground">
        {timeAgo !== 'Never' ? `Updated ${timeAgo}` : 'No data yet'}
      </span>
      
      {/* Sync Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm"
            className="h-8 w-8 p-0"
            disabled={isRunning}
          >
            <RefreshCw className={cn('h-4 w-4', isRunning && 'animate-spin')} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Pipeline Status
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {/* Status Info */}
          <div className="px-2 py-2 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status:</span>
              <span className={cn('font-medium', freshnessStatus.color)}>
                {freshnessStatus.message}
              </span>
            </div>
            
            {state.metrics && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total Emails:</span>
                  <span className="font-medium">{state.metrics.emailsFetched}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Companies:</span>
                  <span className="font-medium">{state.metrics.companiesExtracted}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">New Companies:</span>
                  <span className="font-medium">
                    {state.metrics.newCompanies}
                  </span>
                </div>
              </>
            )}
            
            {state.metrics.newCompanies > 0 && (
              <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded p-2">
                <TrendingUp className="h-3 w-3" />
                <span className="text-xs">
                  {state.metrics.newCompanies} new companies found in last sync
                </span>
              </div>
            )}
          </div>
          
          <DropdownMenuSeparator />
          
          {/* Actions */}
          <DropdownMenuItem onClick={handleManualSync} disabled={isRunning}>
            <Sparkles className="mr-2 h-4 w-4" />
            {isRunning ? 'Syncing...' : 'Sync Now'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}