'use client';

import { useEffect } from 'react';
import { useErrorTracking, usePageTracking, usePerformanceTracking } from '@/lib/monitoring/hooks';

export function MonitoringProvider({ children }: { children: React.ReactNode }) {
  // Initialize monitoring hooks
  useErrorTracking();
  usePageTracking();
  usePerformanceTracking();
  
  useEffect(() => {
    // Initialize monitoring on client side
    if (typeof window !== 'undefined') {
      console.log('Monitoring initialized');
      
      // Track app initialization
      fetch('/api/monitoring/pageview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: window.location.href,
          timestamp: new Date().toISOString(),
          referrer: document.referrer,
          userAgent: navigator.userAgent
        })
      }).catch(() => {
        // Silently fail for monitoring
      });
    }
  }, []);

  return <>{children}</>;
}