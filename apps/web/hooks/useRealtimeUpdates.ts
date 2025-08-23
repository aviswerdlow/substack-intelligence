'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

interface RealtimeConfig {
  endpoint: string;
  interval?: number;
  onUpdate?: (data: any) => void;
  onError?: (error: Error) => void;
  enabled?: boolean;
}

export function useRealtimeUpdates({
  endpoint,
  interval = 5000,
  onUpdate,
  onError,
  enabled = true
}: RealtimeConfig) {
  const [data, setData] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Polling fallback for environments without WebSocket
  const startPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    const poll = async () => {
      try {
        const response = await fetch(endpoint);
        const newData = await response.json();
        
        setData(newData);
        setLastUpdate(new Date());
        
        if (onUpdate) {
          onUpdate(newData);
        }
      } catch (error) {
        if (onError) {
          onError(error as Error);
        }
      }
    };

    // Initial poll
    poll();
    
    // Set up interval
    intervalRef.current = setInterval(poll, interval);
  }, [endpoint, interval, onUpdate, onError]);

  // WebSocket connection (when available)
  const connectWebSocket = useCallback(() => {
    // Check if WebSocket is available
    if (typeof window === 'undefined' || !window.WebSocket) {
      // Fall back to polling
      startPolling();
      return;
    }

    try {
      // For development, we'll use polling instead of actual WebSocket
      // In production, replace with actual WebSocket URL
      if (process.env.NODE_ENV === 'development') {
        startPolling();
        return;
      }

      const wsUrl = endpoint.replace('http', 'ws');
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        setIsConnected(true);
        console.log('WebSocket connected');
      };

      ws.onmessage = (event) => {
        try {
          const newData = JSON.parse(event.data);
          setData(newData);
          setLastUpdate(new Date());
          
          if (onUpdate) {
            onUpdate(newData);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
        
        if (onError) {
          onError(new Error('WebSocket connection error'));
        }
        
        // Fall back to polling
        startPolling();
      };

      ws.onclose = () => {
        setIsConnected(false);
        console.log('WebSocket disconnected');
        
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          if (enabled) {
            connectWebSocket();
          }
        }, 5000);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to establish WebSocket connection:', error);
      // Fall back to polling
      startPolling();
    }
  }, [endpoint, enabled, startPolling, onUpdate, onError]);

  // Initialize connection
  useEffect(() => {
    if (enabled) {
      connectWebSocket();
    }

    return () => {
      // Cleanup
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, [enabled, connectWebSocket]);

  // Send message through WebSocket
  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  return {
    data,
    isConnected,
    lastUpdate,
    sendMessage,
    reconnect: connectWebSocket
  };
}

// Hook for email status updates
export function useEmailRealtimeUpdates(enabled = true) {
  const [emailStatuses, setEmailStatuses] = useState<Map<string, any>>(new Map());
  
  const { data, isConnected } = useRealtimeUpdates({
    endpoint: '/api/emails/status',
    interval: 3000,
    enabled,
    onUpdate: (updates) => {
      if (updates && Array.isArray(updates)) {
        setEmailStatuses(prev => {
          const newMap = new Map(prev);
          updates.forEach((update: any) => {
            newMap.set(update.id, update);
          });
          return newMap;
        });
      }
    }
  });

  return {
    emailStatuses,
    isConnected,
    getEmailStatus: (emailId: string) => emailStatuses.get(emailId)
  };
}

// Hook for pipeline status
export function usePipelineRealtimeUpdates(enabled = true) {
  return useRealtimeUpdates({
    endpoint: '/api/trigger/intelligence/status',
    interval: 2000,
    enabled
  });
}

// Hook for dashboard metrics
export function useDashboardRealtimeUpdates(enabled = true) {
  return useRealtimeUpdates({
    endpoint: '/api/analytics/metrics/realtime',
    interval: 10000,
    enabled
  });
}