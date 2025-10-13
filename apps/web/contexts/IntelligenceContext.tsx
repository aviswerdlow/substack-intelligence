'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';

interface PipelineStatus {
  status: 'idle' | 'fetching' | 'extracting' | 'complete' | 'error';
  progress: number;
  message: string;
  lastSync: Date | null;
  stats: {
    emailsFetched: number;
    companiesExtracted: number;
    newCompanies: number;
    totalMentions: number;
  };
  dataIsFresh: boolean;
  nextSyncIn: number;
}

interface PipelineMetrics {
  totalEmails: number;
  totalCompanies: number;
  totalMentions: number;
  recentEmails: number;
  recentCompanies: number;
  lastSyncTime: string | null;
  dataAge: number;
  isFresh: boolean;
}

interface IntelligenceContextType {
  // Pipeline state
  pipelineStatus: PipelineStatus | null;
  metrics: PipelineMetrics | null;
  isLoading: boolean;
  isSyncing: boolean;
  error: Error | null;
  
  // Actions
  syncPipeline: (forceRefresh?: boolean) => Promise<void>;
  checkStatus: () => Promise<void>;
  refreshMetrics: () => Promise<void>;
  
  // Auto-sync settings
  autoSyncEnabled: boolean;
  setAutoSyncEnabled: (enabled: boolean) => void;
  syncInterval: number; // in minutes
  setSyncInterval: (interval: number) => void;
}

const defaultPipelineStatus: PipelineStatus = {
  status: 'idle',
  progress: 0,
  message: '',
  lastSync: null,
  stats: {
    emailsFetched: 0,
    companiesExtracted: 0,
    newCompanies: 0,
    totalMentions: 0
  },
  dataIsFresh: false,
  nextSyncIn: 0
};

const IntelligenceContext = createContext<IntelligenceContextType | undefined>(undefined);

export function IntelligenceProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus | null>(null);
  const [metrics, setMetrics] = useState<PipelineMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [syncInterval, setSyncInterval] = useState(30); // 30 minutes default
  
  // Check pipeline status
  const checkStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/pipeline/sync', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setPipelineStatus(data.data);
      }
    } catch (error) {
      console.error('Failed to check pipeline status:', error);
    }
  }, []);
  
  // Refresh metrics
  const refreshMetrics = useCallback(async () => {
    try {
      const response = await fetch('/api/pipeline/status', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMetrics(data.metrics);
      }
    } catch (error) {
      console.error('Failed to refresh metrics:', error);
    }
  }, []);
  
  // Sync pipeline
  const syncPipeline = useCallback(async (forceRefresh = false) => {
    if (isSyncing) {
      toast({
        title: 'Sync in Progress',
        description: 'Pipeline is already syncing. Please wait...',
        variant: 'default'
      });
      return;
    }
    
    setIsSyncing(true);
    setError(null);
    
    // Show starting toast
    toast({
      title: 'Starting Intelligence Sync',
      description: 'Fetching emails and extracting companies...',
    });
    
    try {
      const response = await fetch('/api/pipeline/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({ forceRefresh })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setPipelineStatus(data.data);
        
        if (data.skipped) {
          toast({
            title: 'Data is Fresh',
            description: 'Intelligence data is up-to-date. No sync needed.',
          });
        } else {
          const stats = data.data.stats;
          toast({
            title: 'Intelligence Updated',
            description: `Fetched ${stats.emailsFetched} emails, extracted ${stats.companiesExtracted} companies (${stats.newCompanies} new)`,
          });
        }
        
        // Refresh metrics after successful sync
        await refreshMetrics();
      } else {
        throw new Error(data.error || 'Sync failed');
      }
    } catch (error) {
      console.error('Pipeline sync failed:', error);
      setError(error instanceof Error ? error : new Error('Unknown error'));
      
      toast({
        title: 'Sync Failed',
        description: error instanceof Error ? error.message : 'Failed to sync intelligence data',
        variant: 'destructive'
      });
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, toast, refreshMetrics]);
  
  // Initial load
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          checkStatus(),
          refreshMetrics()
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadInitialData();
  }, [checkStatus, refreshMetrics]);
  
  // Auto-sync logic
  useEffect(() => {
    if (!autoSyncEnabled) return;
    
    // Check every minute if we need to sync
    const interval = setInterval(async () => {
      await checkStatus();
      
      if (pipelineStatus && !pipelineStatus.dataIsFresh && !isSyncing) {
        console.log('Auto-syncing stale data...');
        await syncPipeline();
      }
    }, 60 * 1000); // Check every minute
    
    return () => clearInterval(interval);
  }, [autoSyncEnabled, pipelineStatus, isSyncing, checkStatus, syncPipeline]);
  
  // Poll for status updates while syncing
  useEffect(() => {
    if (!isSyncing) return;
    
    const pollInterval = setInterval(() => {
      checkStatus();
    }, 2000); // Poll every 2 seconds while syncing
    
    return () => clearInterval(pollInterval);
  }, [isSyncing, checkStatus]);
  
  const value: IntelligenceContextType = {
    pipelineStatus,
    metrics,
    isLoading,
    isSyncing,
    error,
    syncPipeline,
    checkStatus,
    refreshMetrics,
    autoSyncEnabled,
    setAutoSyncEnabled,
    syncInterval,
    setSyncInterval
  };
  
  return (
    <IntelligenceContext.Provider value={value}>
      {children}
    </IntelligenceContext.Provider>
  );
}

export function useIntelligence() {
  const context = useContext(IntelligenceContext);
  if (!context) {
    throw new Error('useIntelligence must be used within an IntelligenceProvider');
  }
  return context;
}