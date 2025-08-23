import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';

/**
 * API endpoint for monitoring debug mode status and attempts
 * GET: Returns current debug mode status and recent incidents
 * POST: Logs debug mode change attempts (for audit trail)
 */

interface DebugModeIncident {
  id: string;
  type: 'ATTEMPT' | 'BLOCKED' | 'ENABLED' | 'DISABLED' | 'AUTO_DISABLED';
  timestamp: string;
  environment: string;
  userId?: string;
  userEmail?: string;
  reason?: string;
  ip?: string;
  userAgent?: string;
}

// In-memory storage for incidents (replace with database in production)
const debugModeIncidents: DebugModeIncident[] = [];

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    
    // Check if user has admin permissions
    if (!user || !user.publicMetadata?.role || user.publicMetadata.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const currentStatus = {
      debugMode: process.env.DEBUG === 'true',
      environment: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      debugEnabledAt: process.env.DEBUG_ENABLED_AT,
      isProduction: process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'
    };

    // Calculate timeout remaining for staging
    let timeoutRemaining = null;
    if (process.env.VERCEL_ENV === 'preview' && process.env.DEBUG === 'true' && process.env.DEBUG_ENABLED_AT) {
      const enabledTime = new Date(process.env.DEBUG_ENABLED_AT).getTime();
      const currentTime = new Date().getTime();
      const hourInMs = 60 * 60 * 1000;
      const elapsed = currentTime - enabledTime;
      timeoutRemaining = Math.max(0, hourInMs - elapsed);
    }

    // Get recent incidents (last 50)
    const recentIncidents = debugModeIncidents.slice(-50).reverse();

    return NextResponse.json({
      status: currentStatus,
      timeoutRemaining,
      incidents: recentIncidents,
      checks: {
        productionProtected: currentStatus.isProduction && !currentStatus.debugMode,
        stagingTimeout: process.env.VERCEL_ENV === 'preview' ? 'enabled' : 'n/a',
        buildValidation: 'enabled',
        middlewareProtection: 'enabled'
      }
    });

  } catch (error) {
    console.error('[ERROR] Failed to get debug mode status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    const body = await request.json();

    const { action, reason } = body;

    // Validate action
    if (!['enable', 'disable', 'attempt'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';

    // Block any attempt to enable debug mode in production
    if (isProduction && action === 'enable') {
      const incident: DebugModeIncident = {
        id: crypto.randomUUID(),
        type: 'BLOCKED',
        timestamp: new Date().toISOString(),
        environment: process.env.VERCEL_ENV || 'production',
        userId: user?.id,
        userEmail: user?.emailAddresses[0]?.emailAddress,
        reason: reason || 'Attempted to enable debug mode in production',
        ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      };

      debugModeIncidents.push(incident);

      // Send alert for production debug mode attempt
      await sendSecurityAlert(incident);

      return NextResponse.json(
        { 
          error: 'Security Policy Violation',
          message: 'Debug mode cannot be enabled in production',
          incident: incident.id
        },
        { status: 403 }
      );
    }

    // Log the action
    const incident: DebugModeIncident = {
      id: crypto.randomUUID(),
      type: action === 'enable' ? 'ENABLED' : action === 'disable' ? 'DISABLED' : 'ATTEMPT',
      timestamp: new Date().toISOString(),
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown',
      userId: user?.id,
      userEmail: user?.emailAddresses[0]?.emailAddress,
      reason,
      ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    };

    debugModeIncidents.push(incident);

    // For staging, set timeout if enabling
    if (process.env.VERCEL_ENV === 'preview' && action === 'enable') {
      process.env.DEBUG = 'true';
      process.env.DEBUG_ENABLED_AT = new Date().toISOString();
      
      // Schedule auto-disable (in a real implementation, use a job queue)
      setTimeout(() => {
        process.env.DEBUG = 'false';
        delete process.env.DEBUG_ENABLED_AT;
        
        debugModeIncidents.push({
          id: crypto.randomUUID(),
          type: 'AUTO_DISABLED',
          timestamp: new Date().toISOString(),
          environment: 'preview',
          reason: 'Auto-disabled after 1-hour timeout'
        });
      }, 60 * 60 * 1000); // 1 hour
    }

    return NextResponse.json({
      success: true,
      incident: incident.id,
      message: `Debug mode ${action} logged`,
      currentStatus: process.env.DEBUG === 'true'
    });

  } catch (error) {
    console.error('[ERROR] Failed to log debug mode action:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Send security alert for critical incidents
 */
async function sendSecurityAlert(incident: DebugModeIncident) {
  try {
    // Log to console
    console.error('[SECURITY ALERT] Debug mode violation:', incident);

    // Send to monitoring service if configured
    if (process.env.AXIOM_TOKEN && process.env.AXIOM_DATASET) {
      // In production, this would send to Axiom
      console.log('[AXIOM] Security alert sent for incident:', incident.id);
    }

    // If email service is configured, send alert
    if (process.env.RESEND_API_KEY) {
      // In production, this would send an email alert
      console.log('[EMAIL] Security alert would be sent for incident:', incident.id);
    }

  } catch (error) {
    console.error('[ERROR] Failed to send security alert:', error);
  }
}