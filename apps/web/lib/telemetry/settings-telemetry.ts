/**
 * @file Settings page telemetry for monitoring performance and failures
 * @description Tracks loading times, errors, and user interactions to prevent future hanging issues
 */

interface SettingsTelemetryEvent {
  event: string;
  data?: Record<string, any>;
  timestamp: number;
  sessionId: string;
  userId?: string;
}

interface SettingsLoadMetrics {
  startTime: number;
  endTime?: number;
  loadTime?: number;
  errorCount: number;
  retryCount: number;
  success: boolean;
  errorType?: string;
}

class SettingsTelemetry {
  private sessionId: string;
  private loadMetrics: SettingsLoadMetrics | null = null;
  private events: SettingsTelemetryEvent[] = [];

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `settings_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  /**
   * Track settings page load start
   */
  trackLoadStart(): void {
    this.loadMetrics = {
      startTime: performance.now(),
      errorCount: 0,
      retryCount: 0,
      success: false
    };

    this.recordEvent('settings_load_start', {
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      timestamp: Date.now()
    });
  }

  /**
   * Track successful settings load completion
   */
  trackLoadSuccess(): void {
    if (!this.loadMetrics) return;

    const endTime = performance.now();
    const loadTime = endTime - this.loadMetrics.startTime;

    this.loadMetrics.endTime = endTime;
    this.loadMetrics.loadTime = loadTime;
    this.loadMetrics.success = true;

    this.recordEvent('settings_load_success', {
      loadTime,
      errorCount: this.loadMetrics.errorCount,
      retryCount: this.loadMetrics.retryCount,
      wasRetried: this.loadMetrics.retryCount > 0
    });

    // Report slow loads
    if (loadTime > 5000) {
      this.recordEvent('settings_slow_load', {
        loadTime,
        threshold: 5000
      });
    }
  }

  /**
   * Track settings load failure
   */
  trackLoadError(error: Error, errorType: 'network' | 'auth' | 'server' | 'unknown' = 'unknown'): void {
    if (!this.loadMetrics) return;

    this.loadMetrics.errorCount++;
    this.loadMetrics.errorType = errorType;

    this.recordEvent('settings_load_error', {
      error: error.message,
      errorType,
      stack: error.stack,
      errorCount: this.loadMetrics.errorCount,
      retryCount: this.loadMetrics.retryCount,
      timeToError: performance.now() - this.loadMetrics.startTime
    });
  }

  /**
   * Track retry attempt
   */
  trackRetry(attempt: number, reason: string): void {
    if (!this.loadMetrics) return;

    this.loadMetrics.retryCount++;

    this.recordEvent('settings_retry', {
      attempt,
      reason,
      totalRetries: this.loadMetrics.retryCount,
      timeToRetry: performance.now() - this.loadMetrics.startTime
    });
  }

  /**
   * Track hanging detection
   */
  trackHangingDetected(duration: number): void {
    this.recordEvent('settings_hanging_detected', {
      duration,
      loadMetrics: this.loadMetrics,
      possibleCause: duration > 30000 ? 'infinite_loop' : 'slow_network'
    });
  }

  /**
   * Track user interaction (e.g., Add Company button click)
   */
  trackUserInteraction(action: string, metadata: Record<string, any> = {}): void {
    this.recordEvent('settings_user_interaction', {
      action,
      ...metadata,
      interactionTime: performance.now()
    });
  }

  /**
   * Track API call performance
   */
  trackApiCall(endpoint: string, method: string, duration: number, success: boolean, errorType?: string): void {
    this.recordEvent('settings_api_call', {
      endpoint,
      method,
      duration,
      success,
      errorType,
      timestamp: Date.now()
    });

    // Track slow API calls
    if (duration > 3000) {
      this.recordEvent('settings_slow_api', {
        endpoint,
        method,
        duration,
        threshold: 3000
      });
    }
  }

  /**
   * Track React Query state changes
   */
  trackQueryState(queryKey: string, state: 'loading' | 'success' | 'error', data?: any): void {
    this.recordEvent('settings_query_state', {
      queryKey,
      state,
      hasData: !!data,
      timestamp: Date.now()
    });
  }

  /**
   * Record telemetry event
   */
  private recordEvent(event: string, data: Record<string, any> = {}): void {
    const telemetryEvent: SettingsTelemetryEvent = {
      event,
      data,
      timestamp: Date.now(),
      sessionId: this.sessionId
    };

    this.events.push(telemetryEvent);

    // Send to telemetry service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToTelemetryService(telemetryEvent);
    } else {
      // Log in development for debugging
      console.log('[Settings Telemetry]', event, data);
    }
  }

  /**
   * Send telemetry data to monitoring service
   */
  private async sendToTelemetryService(event: SettingsTelemetryEvent): Promise<void> {
    try {
      // Send to your preferred monitoring service (DataDog, PostHog, etc.)
      await fetch('/api/telemetry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          service: 'settings-page',
          event: event.event,
          data: event.data,
          timestamp: event.timestamp,
          sessionId: event.sessionId
        })
      });
    } catch (error) {
      // Don't let telemetry errors affect the user experience
      console.warn('Failed to send telemetry:', error);
    }
  }

  /**
   * Get session summary for debugging
   */
  getSessionSummary(): {
    sessionId: string;
    loadMetrics: SettingsLoadMetrics | null;
    eventCount: number;
    events: SettingsTelemetryEvent[];
  } {
    return {
      sessionId: this.sessionId,
      loadMetrics: this.loadMetrics,
      eventCount: this.events.length,
      events: this.events
    };
  }

  /**
   * Export telemetry data (for debugging or support)
   */
  exportData(): string {
    return JSON.stringify({
      sessionId: this.sessionId,
      loadMetrics: this.loadMetrics,
      events: this.events,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: Date.now()
    }, null, 2);
  }
}

// Create a singleton instance
export const settingsTelemetry = new SettingsTelemetry();

// React hook for easy integration
import { useEffect } from 'react';

export function useSettingsTelemetry() {
  useEffect(() => {
    // Set up hanging detection
    const hangingTimer = setTimeout(() => {
      settingsTelemetry.trackHangingDetected(30000);
    }, 30000);

    return () => {
      clearTimeout(hangingTimer);
    };
  }, []);

  return {
    trackLoadStart: settingsTelemetry.trackLoadStart.bind(settingsTelemetry),
    trackLoadSuccess: settingsTelemetry.trackLoadSuccess.bind(settingsTelemetry),
    trackLoadError: settingsTelemetry.trackLoadError.bind(settingsTelemetry),
    trackRetry: settingsTelemetry.trackRetry.bind(settingsTelemetry),
    trackUserInteraction: settingsTelemetry.trackUserInteraction.bind(settingsTelemetry),
    trackApiCall: settingsTelemetry.trackApiCall.bind(settingsTelemetry),
    trackQueryState: settingsTelemetry.trackQueryState.bind(settingsTelemetry),
    getSessionSummary: settingsTelemetry.getSessionSummary.bind(settingsTelemetry),
    exportData: settingsTelemetry.exportData.bind(settingsTelemetry)
  };
}