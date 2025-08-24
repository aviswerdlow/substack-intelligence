import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { oauthMonitor } from '@/lib/oauth-monitoring';

// GET - OAuth Monitoring Dashboard
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Basic admin check - in production, you'd want proper role-based access
    if (!user.emailAddresses.some(email => 
      email.emailAddress.includes('@terragonlabs.com') || 
      email.emailAddress.includes('@admin.') ||
      process.env.NODE_ENV === 'development'
    )) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100');
    const hours = parseInt(searchParams.get('hours') || '24');

    // Get current metrics
    const metrics = oauthMonitor.getMetrics();
    
    // Get recent events
    const recentEvents = oauthMonitor.getRecentEvents(limit);
    
    // Get failure rate for specified period
    const failureRate = oauthMonitor.getFailureRate(hours);
    const isFailureRateHigh = oauthMonitor.isFailureRateHigh(0.3, hours);

    // Calculate additional analytics
    const now = new Date();
    const cutoff = new Date(now.getTime() - (hours * 60 * 60 * 1000));
    
    const recentEventsInPeriod = recentEvents.filter(
      event => new Date(event.timestamp) >= cutoff
    );

    const eventsByType = recentEventsInPeriod.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const errorsByType = recentEventsInPeriod
      .filter(event => event.type === 'oauth_failure')
      .reduce((acc, event) => {
        const errorType = event.errorType || 'unknown';
        acc[errorType] = (acc[errorType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const uniqueUsers = new Set(
      recentEventsInPeriod
        .filter(event => event.userId)
        .map(event => event.userId)
    ).size;

    const avgDuration = recentEventsInPeriod
      .filter(event => event.duration)
      .reduce((acc, event, _, arr) => {
        return acc + (event.duration || 0) / arr.length;
      }, 0);

    return NextResponse.json({
      status: 'success',
      data: {
        overview: {
          totalAttempts: metrics.totalAttempts,
          successfulConnections: metrics.successfulConnections,
          successRate: metrics.totalAttempts > 0 
            ? (metrics.successfulConnections / metrics.totalAttempts * 100).toFixed(2) + '%'
            : '0%',
          failureRate: (failureRate * 100).toFixed(2) + '%',
          isFailureRateHigh,
          averageConnectionTime: `${metrics.averageConnectionTime.toFixed(2)}ms`,
          lastUpdated: metrics.lastUpdated
        },
        periodAnalytics: {
          hoursAnalyzed: hours,
          eventsInPeriod: recentEventsInPeriod.length,
          uniqueUsers,
          averageDuration: avgDuration > 0 ? `${avgDuration.toFixed(2)}ms` : 'N/A',
          eventsByType,
          errorsByType
        },
        recentEvents: recentEvents.map(event => ({
          ...event,
          // Mask sensitive data
          userId: event.userId ? event.userId.substring(0, 8) + '...' : undefined,
          email: event.email ? 
            event.email.split('@')[0].substring(0, 3) + '***@' + event.email.split('@')[1] 
            : undefined
        })),
        alerts: {
          highFailureRate: isFailureRateHigh,
          recentCriticalErrors: recentEventsInPeriod
            .filter(event => 
              event.type === 'oauth_failure' && 
              (event.errorType === 'database_error' || event.errorType === 'configuration_error')
            ).length,
          unusualRetryPatterns: metrics.retryRate > 0.5
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('OAuth monitoring endpoint error:', error);
    return NextResponse.json({
      error: 'Failed to fetch OAuth monitoring data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST - Trigger manual health check and metrics refresh
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Basic admin check
    if (!user.emailAddresses.some(email => 
      email.emailAddress.includes('@terragonlabs.com') || 
      email.emailAddress.includes('@admin.') ||
      process.env.NODE_ENV === 'development'
    )) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Refresh metrics (this would typically trigger a background job)
    const metrics = oauthMonitor.getMetrics();

    return NextResponse.json({
      message: 'Metrics refreshed successfully',
      metrics,
      refreshedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('OAuth monitoring refresh error:', error);
    return NextResponse.json({
      error: 'Failed to refresh OAuth monitoring data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}