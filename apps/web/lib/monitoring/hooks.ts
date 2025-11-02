'use client';

import { useEffect, useCallback, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useSessionUser } from '@/hooks/use-session-user';

// Enhanced error tracking hook
export function useErrorTracking() {
  const { userId: sessionUserId } = useSessionUser();
  const userId = useMemo(() => sessionUserId ?? undefined, [sessionUserId]);
  
  useEffect(() => {
    // Global error handler for JavaScript errors
    const handleError = (event: ErrorEvent) => {
      console.error('JavaScript error:', event.error);
      
      const errorData = {
        type: 'javascript_error',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        userId,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        severity: 'medium' as const,
        additionalContext: {
          userAgent: navigator.userAgent,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          }
        }
      };
      
      fetch('/api/monitoring/error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorData)
      }).catch(() => {
        console.debug('Failed to log error to monitoring API');
      });
    };

    // Global error handler for unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      
      const errorData = {
        type: 'unhandled_promise_rejection',
        error: String(event.reason),
        userId,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        severity: 'high' as const,
        additionalContext: {
          reason: event.reason,
          userAgent: navigator.userAgent
        }
      };
      
      fetch('/api/monitoring/error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorData)
      }).catch(() => {
        console.debug('Failed to log promise rejection to monitoring API');
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [userId]);

  // Return function for manual error reporting
  return useCallback((error: Error, context?: Record<string, any>) => {
    const errorData = {
      type: 'manual_error',
      message: error.message,
      stack: error.stack,
      userId,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      severity: 'medium' as const,
      additionalContext: context
    };

    fetch('/api/monitoring/error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorData)
    }).catch(() => {
      console.debug('Failed to log manual error to monitoring API');
    });
  }, [userId]);
}

// Page view tracking hook
export function usePageTracking() {
  const { userId: sessionUserId } = useSessionUser();
  const userId = useMemo(() => sessionUserId ?? undefined, [sessionUserId]);
  const pathname = usePathname();
  
  useEffect(() => {
    const trackPageView = () => {
      fetch('/api/monitoring/pageview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: window.location.href,
          path: pathname,
          userId,
          timestamp: new Date().toISOString(),
          referrer: document.referrer,
          userAgent: navigator.userAgent
        })
      }).catch(() => {
        console.debug('Failed to track page view');
      });
    };

    // Track page view
    trackPageView();
  }, [pathname, userId]);
}

// Performance monitoring hook
export function usePerformanceTracking() {
  const { userId: sessionUserId } = useSessionUser();
  const userId = useMemo(() => sessionUserId ?? undefined, [sessionUserId]);
  
  useEffect(() => {
    const trackPerformance = () => {
      if (!('performance' in window)) return;

      // Track page load metrics
      window.addEventListener('load', () => {
        setTimeout(() => {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          
          if (navigation) {
            const metrics = [
              { name: 'page_load_time', value: navigation.loadEventEnd - navigation.fetchStart },
              { name: 'dns_time', value: navigation.domainLookupEnd - navigation.domainLookupStart },
              { name: 'tcp_time', value: navigation.connectEnd - navigation.connectStart },
              { name: 'response_time', value: navigation.responseEnd - navigation.requestStart },
              { name: 'dom_processing_time', value: navigation.domComplete - navigation.responseEnd }
            ];

            metrics.forEach(({ name, value }) => {
              if (value > 0) {
                fetch('/api/monitoring/performance', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    metric: name,
                    value,
                    userId,
                    url: window.location.href,
                    timestamp: new Date().toISOString()
                  })
                }).catch(() => {
                  console.debug('Failed to track performance metric');
                });
              }
            });
          }
        }, 1000);
      });

      // Track Core Web Vitals
      if ('PerformanceObserver' in window) {
        // First Contentful Paint
        try {
          const fcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const fcp = entries.find(entry => entry.name === 'first-contentful-paint');
            if (fcp) {
              fetch('/api/monitoring/performance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  metric: 'first_contentful_paint',
                  value: fcp.startTime,
                  userId,
                  url: window.location.href,
                  timestamp: new Date().toISOString()
                })
              }).catch(() => {});
            }
          });
          fcpObserver.observe({ entryTypes: ['paint'] });
        } catch (error) {
          console.debug('FCP observer not supported');
        }

        // Largest Contentful Paint
        try {
          const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            if (lastEntry) {
              fetch('/api/monitoring/performance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  metric: 'largest_contentful_paint',
                  value: lastEntry.startTime,
                  userId,
                  url: window.location.href,
                  timestamp: new Date().toISOString()
                })
              }).catch(() => {});
            }
          });
          lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        } catch (error) {
          console.debug('LCP observer not supported');
        }
      }
    };

    trackPerformance();
  }, [userId]);
}

// Custom hook for tracking user interactions
export function useInteractionTracking() {
  const { userId: sessionUserId } = useSessionUser();
  const userId = useMemo(() => sessionUserId ?? undefined, [sessionUserId]);

  return useCallback((action: string, data?: Record<string, any>) => {
    fetch('/api/monitoring/interaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        data,
        userId,
        url: window.location.href,
        timestamp: new Date().toISOString()
      })
    }).catch(() => {
      console.debug('Failed to track interaction');
    });
  }, [userId]);
}