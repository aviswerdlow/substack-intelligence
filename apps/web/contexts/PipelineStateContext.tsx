'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';

// Pipeline states
export type PipelineStatus = 'idle' | 'connecting' | 'fetching' | 'extracting' | 'processing' | 'complete' | 'error';

// Company discovery type
export interface CompanyDiscovery {
  name: string;
  description: string;
  isNew: boolean;
  source?: string;
  timestamp: Date;
}

// Pipeline metrics
export interface PipelineMetrics {
  emailsFetched: number;
  companiesExtracted: number;
  newCompanies: number;
  totalMentions: number;
  processingRate: number; // emails per minute
}

// Activity log entry
export interface ActivityLogEntry {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
}

// SSE Update types
export interface PipelineUpdate {
  type: 'connected' | 'status' | 'emails_fetched' | 'processing_email' | 'company_discovered' | 'complete' | 'error' | 'heartbeat';
  status?: PipelineStatus;
  progress?: number;
  message?: string;
  stats?: PipelineMetrics;
  currentEmail?: number;
  totalEmails?: number;
  estimatedTimeRemaining?: number;
  company?: CompanyDiscovery;
  emailCount?: number;
  timestamp?: string;
}

// Pipeline state
export interface PipelineState {
  // Status
  status: PipelineStatus;
  progress: number;
  message: string;
  
  // Metrics
  metrics: PipelineMetrics;
  
  // Runtime data
  currentEmail: number;
  totalEmails: number;
  estimatedTimeRemaining: number | null;
  startTime: Date | null;
  endTime: Date | null;
  
  // Discoveries
  recentDiscoveries: CompanyDiscovery[];
  
  // Activity log
  activityLog: ActivityLogEntry[];
  
  // Connection state
  isConnected: boolean;
  connectionError: string | null;
  
  // Last sync info
  lastSyncTime: Date | null;
  lastSyncSuccess: boolean;
  dataFreshness: 'fresh' | 'stale' | 'outdated' | 'unknown';
}

// Context type
interface PipelineStateContextType {
  state: PipelineState;
  
  // Actions
  startPipeline: () => Promise<void>;
  stopPipeline: () => void;
  pausePipeline: () => void;
  resumePipeline: () => void;
  clearActivityLog: () => void;
  
  // Connection management
  connectToStream: () => void;
  disconnectFromStream: () => void;
  
  // Data freshness
  checkDataFreshness: () => Promise<void>;
  
  // Loading states
  isRunning: boolean;
  isPaused: boolean;
  isConnecting: boolean;
}

// Initial state
const initialState: PipelineState = {
  status: 'idle',
  progress: 0,
  message: '',
  metrics: {
    emailsFetched: 0,
    companiesExtracted: 0,
    newCompanies: 0,
    totalMentions: 0,
    processingRate: 0
  },
  currentEmail: 0,
  totalEmails: 0,
  estimatedTimeRemaining: null,
  startTime: null,
  endTime: null,
  recentDiscoveries: [],
  activityLog: [],
  isConnected: false,
  connectionError: null,
  lastSyncTime: null,
  lastSyncSuccess: false,
  dataFreshness: 'unknown'
};

// Create context
export const PipelineStateContext = createContext<PipelineStateContextType | undefined>(undefined);

// Load state from localStorage
const loadStateFromStorage = (): Partial<PipelineState> => {
  if (typeof window === 'undefined') return {};
  
  const stored = localStorage.getItem('pipelineState');
  if (!stored) return {};
  
  try {
    const parsed = JSON.parse(stored);
    // Convert date strings back to Date objects
    if (parsed.lastSyncTime) parsed.lastSyncTime = new Date(parsed.lastSyncTime);
    if (parsed.startTime) parsed.startTime = new Date(parsed.startTime);
    if (parsed.endTime) parsed.endTime = new Date(parsed.endTime);
    if (parsed.recentDiscoveries) {
      parsed.recentDiscoveries = parsed.recentDiscoveries.map((d: any) => ({
        ...d,
        timestamp: new Date(d.timestamp)
      }));
    }
    if (parsed.activityLog) {
      parsed.activityLog = parsed.activityLog.map((log: any) => ({
        ...log,
        timestamp: new Date(log.timestamp)
      }));
    }
    
    return parsed;
  } catch (error) {
    console.error('Failed to load pipeline state from storage:', error);
    return {};
  }
};

// Save state to localStorage
const saveStateToStorage = (state: PipelineState) => {
  if (typeof window === 'undefined') return;
  
  try {
    // Only save relevant persistent data
    const toSave = {
      lastSyncTime: state.lastSyncTime,
      lastSyncSuccess: state.lastSyncSuccess,
      dataFreshness: state.dataFreshness,
      metrics: state.metrics,
      recentDiscoveries: state.recentDiscoveries.slice(0, 10) // Keep last 10
    };
    
    localStorage.setItem('pipelineState', JSON.stringify(toSave));
  } catch (error) {
    console.error('Failed to save pipeline state to storage:', error);
  }
};

export function PipelineStateProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const [isPaused, setIsPaused] = useState(false);
  
  // Initialize state with stored data
  const [state, setState] = useState<PipelineState>(() => ({
    ...initialState,
    ...loadStateFromStorage()
  }));
  
  // Save state changes to localStorage
  useEffect(() => {
    saveStateToStorage(state);
  }, [state.lastSyncTime, state.metrics, state.recentDiscoveries]);
  
  // Add a flag to prevent multiple freshness checks
  const isFreshnessCheckingRef = useRef(false);
  
  // Check data freshness with duplicate prevention
  const checkDataFreshness = useCallback(async () => {
    if (isFreshnessCheckingRef.current) {
      console.log('Freshness check already in progress');
      return;
    }
    
    isFreshnessCheckingRef.current = true;
    
    try {
      const response = await fetch('/api/pipeline/sync');
      const data = await response.json();
      
      if (data.success && data.data) {
        const lastSync = data.data.lastSync ? new Date(data.data.lastSync) : null;
        const dataAge = lastSync ? (Date.now() - lastSync.getTime()) / (1000 * 60) : Infinity; // in minutes
        
        let freshness: PipelineState['dataFreshness'] = 'unknown';
        if (dataAge < 30) freshness = 'fresh';
        else if (dataAge < 120) freshness = 'stale';
        else freshness = 'outdated';
        
        setState(prev => ({
          ...prev,
          lastSyncTime: lastSync,
          dataFreshness: freshness,
          metrics: data.data.stats || prev.metrics
        }));
      }
    } catch (error) {
      console.error('Failed to check data freshness:', error);
    } finally {
      isFreshnessCheckingRef.current = false;
    }
  }, []);
  
  // Add activity log entry
  const addActivityLog = useCallback((message: string, type: ActivityLogEntry['type'] = 'info') => {
    const entry: ActivityLogEntry = {
      id: `${Date.now()}-${Math.random()}`,
      message,
      type,
      timestamp: new Date()
    };
    
    setState(prev => ({
      ...prev,
      activityLog: [entry, ...prev.activityLog].slice(0, 100) // Keep last 100 entries
    }));
  }, []);
  
  // Handle SSE updates
  const handleStreamUpdate = useCallback((update: PipelineUpdate) => {
    // Ignore heartbeats
    if (update.type === 'heartbeat') return;
    
    setState(prev => {
      let newState = { ...prev };
      
      switch (update.type) {
        case 'connected':
          newState.isConnected = true;
          newState.connectionError = null;
          addActivityLog('Connected to pipeline stream', 'success');
          break;
          
        case 'status':
          if (update.status) newState.status = update.status;
          if (update.progress !== undefined) newState.progress = update.progress;
          if (update.message) newState.message = update.message;
          if (update.stats) newState.metrics = update.stats;
          addActivityLog(update.message || 'Status update', 'info');
          break;
          
        case 'emails_fetched':
          newState.status = 'fetching';
          if (update.emailCount) newState.totalEmails = update.emailCount;
          if (update.progress !== undefined) newState.progress = update.progress;
          if (update.stats) newState.metrics = update.stats;
          addActivityLog(`Found ${update.emailCount || 0} newsletters to analyze`, 'info');
          break;
          
        case 'processing_email':
          newState.status = 'processing';
          if (update.currentEmail !== undefined) newState.currentEmail = update.currentEmail;
          if (update.totalEmails !== undefined) newState.totalEmails = update.totalEmails;
          if (update.progress !== undefined) newState.progress = update.progress;
          if (update.message) newState.message = update.message;
          if (update.stats) newState.metrics = update.stats;
          break;
          
        case 'company_discovered':
          if (update.company) {
            const discovery: CompanyDiscovery = {
              ...update.company,
              timestamp: new Date()
            };
            newState.recentDiscoveries = [discovery, ...newState.recentDiscoveries].slice(0, 50);
            if (discovery.isNew) {
              addActivityLog(`🎯 New company discovered: ${discovery.name}`, 'success');
            }
          }
          if (update.stats) newState.metrics = update.stats;
          break;
          
        case 'complete':
          newState.status = 'complete';
          newState.progress = 100;
          newState.endTime = new Date();
          newState.lastSyncTime = new Date();
          newState.lastSyncSuccess = true;
          newState.dataFreshness = 'fresh';
          if (update.stats) newState.metrics = update.stats;
          addActivityLog('Pipeline completed successfully', 'success');

          // Show success toast
          toast({
            title: 'Pipeline Complete',
            description: `Discovered ${newState.metrics.companiesExtracted} companies from ${newState.metrics.emailsFetched} emails`,
          });

          // Important: Disconnect from stream after completion to prevent auto-reconnect
          // This prevents the EventSource from reconnecting and fetching stale updates
          setTimeout(() => {
            disconnectFromStream();
            // Reset to idle state after a short delay
            setTimeout(() => {
              setState(prev => ({
                ...prev,
                status: 'idle',
                progress: 0,
                message: ''
              }));
            }, 2000);
          }, 100);
          break;
          
        case 'error':
          newState.status = 'error';
          newState.endTime = new Date();
          newState.lastSyncSuccess = false;
          if (update.message) {
            newState.connectionError = update.message;
            addActivityLog(`Error: ${update.message}`, 'error');
          }

          // Show error toast
          toast({
            title: 'Pipeline Error',
            description: update.message || 'An error occurred during pipeline execution',
            variant: 'destructive'
          });

          // Disconnect from stream after error to prevent auto-reconnect
          setTimeout(() => {
            disconnectFromStream();
            // Reset to idle state after a short delay
            setTimeout(() => {
              setState(prev => ({
                ...prev,
                status: 'idle',
                progress: 0,
                message: ''
              }));
            }, 2000);
          }, 100);
          break;
      }
      
      // Calculate processing rate
      if (newState.startTime && newState.currentEmail > 0) {
        const elapsed = (Date.now() - newState.startTime.getTime()) / 1000 / 60; // in minutes
        newState.metrics.processingRate = Math.round(newState.currentEmail / elapsed);
        
        // Estimate remaining time
        if (newState.totalEmails > 0) {
          const remaining = newState.totalEmails - newState.currentEmail;
          const estimatedMinutes = remaining / newState.metrics.processingRate;
          newState.estimatedTimeRemaining = Math.round(estimatedMinutes * 60); // in seconds
        }
      }
      
      return newState;
    });
  }, [toast, addActivityLog, disconnectFromStream]);
  
  // Connect to SSE stream
  const connectToStream = useCallback(() => {
    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    setState(prev => ({ ...prev, isConnected: false, connectionError: null }));
    
    const es = new EventSource('/api/pipeline/sync/stream');
    
    es.onopen = () => {
      reconnectAttemptsRef.current = 0;
      setState(prev => ({ ...prev, isConnected: true, connectionError: null }));
    };
    
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
      eventSourceRef.current = null;
      
      setState(prev => ({
        ...prev,
        isConnected: false,
        connectionError: 'Connection lost. Reconnecting...'
      }));
      
      // Implement exponential backoff for reconnection
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current++;
          connectToStream();
        }, delay);
      } else {
        setState(prev => ({
          ...prev,
          connectionError: 'Failed to connect to pipeline stream'
        }));
      }
    };
    
    eventSourceRef.current = es;
  }, [handleStreamUpdate]);
  
  // Disconnect from stream
  const disconnectFromStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    setState(prev => ({ ...prev, isConnected: false }));
  }, []);
  
  // Add a ref to track if we're already starting the pipeline
  const isStartingRef = useRef(false);
  
  // Start pipeline with better duplicate prevention
  const startPipeline = useCallback(async () => {
    // Prevent duplicate starts
    if (isStartingRef.current) {
      console.log('Pipeline start already in progress, ignoring duplicate request');
      return;
    }
    
    // Check if already running
    if (['connecting', 'fetching', 'extracting', 'processing'].includes(state.status)) {
      console.log('Pipeline already running with status:', state.status);
      toast({
        title: 'Pipeline Already Running',
        description: 'The intelligence pipeline is already syncing data.',
        variant: 'default'
      });
      return;
    }
    
    // Check if data is fresh (less than 5 minutes old)
    if (state.lastSyncTime) {
      const dataAge = (Date.now() - state.lastSyncTime.getTime()) / (1000 * 60); // in minutes
      if (dataAge < 5) {
        console.log('Data is very fresh (< 5 minutes), skipping sync');
        toast({
          title: 'Data is Fresh',
          description: 'Intelligence data was updated less than 5 minutes ago.',
        });
        return;
      }
    }
    
    isStartingRef.current = true;
    
    try {
      setState(prev => ({
        ...prev,
        status: 'connecting',
        progress: 0,
        message: 'Starting pipeline...',
        startTime: new Date(),
        endTime: null,
        currentEmail: 0,
        totalEmails: 0,
        estimatedTimeRemaining: null,
        recentDiscoveries: [],
        activityLog: []
      }));
      
      // Connect to SSE stream first
      connectToStream();
      
      // Start the pipeline
      const response = await fetch('/api/pipeline/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceRefresh: true })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start pipeline');
      }
      
      addActivityLog('Pipeline started', 'success');
      
    } catch (error) {
      setState(prev => ({
        ...prev,
        status: 'error',
        connectionError: error instanceof Error ? error.message : 'Failed to start pipeline'
      }));
      
      toast({
        title: 'Pipeline Error',
        description: error instanceof Error ? error.message : 'Failed to start pipeline',
        variant: 'destructive'
      });
      
      disconnectFromStream();
    } finally {
      isStartingRef.current = false;
    }
  }, [state.status, state.lastSyncTime, connectToStream, disconnectFromStream, toast, addActivityLog]);
  
  // Stop pipeline
  const stopPipeline = useCallback(() => {
    disconnectFromStream();
    setState(prev => ({
      ...prev,
      status: 'idle',
      progress: 0,
      message: '',
      endTime: new Date()
    }));
    addActivityLog('Pipeline stopped', 'warning');
  }, [disconnectFromStream, addActivityLog]);
  
  // Pause pipeline
  const pausePipeline = useCallback(() => {
    setIsPaused(true);
    addActivityLog('Pipeline paused', 'warning');
  }, [addActivityLog]);
  
  // Resume pipeline
  const resumePipeline = useCallback(() => {
    setIsPaused(false);
    addActivityLog('Pipeline resumed', 'info');
  }, [addActivityLog]);
  
  // Clear activity log
  const clearActivityLog = useCallback(() => {
    setState(prev => ({ ...prev, activityLog: [] }));
  }, []);
  
  // Check freshness on mount only once
  useEffect(() => {
    checkDataFreshness();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once on mount
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectFromStream();
    };
  }, [disconnectFromStream]);
  
  // Compute derived states
  const isRunning = ['connecting', 'fetching', 'extracting', 'processing'].includes(state.status);
  const isConnecting = state.status === 'connecting';
  
  const value: PipelineStateContextType = {
    state,
    startPipeline,
    stopPipeline,
    pausePipeline,
    resumePipeline,
    clearActivityLog,
    connectToStream,
    disconnectFromStream,
    checkDataFreshness,
    isRunning,
    isPaused,
    isConnecting
  };
  
  return (
    <PipelineStateContext.Provider value={value}>
      {children}
    </PipelineStateContext.Provider>
  );
}

// Hook to use pipeline state
export function usePipelineState() {
  const context = useContext(PipelineStateContext);
  if (!context) {
    throw new Error('usePipelineState must be used within a PipelineStateProvider');
  }
  return context;
}