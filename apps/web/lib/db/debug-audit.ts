import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@substack-intelligence/database';

/**
 * Debug Mode Audit Log
 * Tracks all debug mode changes and attempts for security compliance
 */

export interface DebugModeAuditEntry {
  id: string;
  type: 'ATTEMPT' | 'BLOCKED' | 'ENABLED' | 'DISABLED' | 'AUTO_DISABLED' | 'FORCE_DISABLED';
  environment: string;
  timestamp: string;
  user_id?: string;
  user_email?: string;
  ip_address?: string;
  user_agent?: string;
  reason?: string;
  metadata?: Record<string, any>;
  severity: 'info' | 'warning' | 'critical';
}

/**
 * Log a debug mode audit entry
 */
export async function logDebugModeAudit(entry: Omit<DebugModeAuditEntry, 'id' | 'timestamp'>) {
  try {
    const supabase = createClientComponentClient<Database>();
    
    const auditEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      // Automatically set severity based on type and environment
      severity: getSeverity(entry.type, entry.environment)
    };

    // Log to console for immediate visibility
    console.log('[DEBUG AUDIT]', JSON.stringify(auditEntry));

    // Store in database
    const { error } = await supabase
      .from('debug_mode_audit')
      .insert(auditEntry);

    if (error) {
      console.error('[ERROR] Failed to log debug audit to database:', error);
      // Fall back to local storage or file system
      await fallbackAuditLog(auditEntry);
    }

    // Trigger alerts for critical events
    if (auditEntry.severity === 'critical') {
      await triggerSecurityAlert(auditEntry);
    }

    return auditEntry;

  } catch (error) {
    console.error('[ERROR] Failed to log debug mode audit:', error);
    throw error;
  }
}

/**
 * Retrieve debug mode audit logs
 */
export async function getDebugModeAuditLogs(
  filters?: {
    startDate?: string;
    endDate?: string;
    environment?: string;
    type?: string;
    userId?: string;
    severity?: string;
  },
  limit = 100
) {
  try {
    const supabase = createClientComponentClient<Database>();
    
    let query = supabase
      .from('debug_mode_audit')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (filters?.startDate) {
      query = query.gte('timestamp', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('timestamp', filters.endDate);
    }
    if (filters?.environment) {
      query = query.eq('environment', filters.environment);
    }
    if (filters?.type) {
      query = query.eq('type', filters.type);
    }
    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }
    if (filters?.severity) {
      query = query.eq('severity', filters.severity);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[ERROR] Failed to retrieve debug audit logs:', error);
      throw error;
    }

    return data || [];

  } catch (error) {
    console.error('[ERROR] Failed to get debug mode audit logs:', error);
    throw error;
  }
}

/**
 * Get audit summary statistics
 */
export async function getDebugModeAuditStats(days = 30) {
  try {
    const supabase = createClientComponentClient<Database>();
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('debug_mode_audit')
      .select('type, environment, severity')
      .gte('timestamp', startDate.toISOString());

    if (error) {
      console.error('[ERROR] Failed to get audit stats:', error);
      throw error;
    }

    // Calculate statistics
    const stats = {
      total: data?.length || 0,
      byType: {} as Record<string, number>,
      byEnvironment: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      criticalIncidents: 0,
      productionAttempts: 0
    };

    data?.forEach(entry => {
      // Count by type
      stats.byType[entry.type] = (stats.byType[entry.type] || 0) + 1;
      
      // Count by environment
      stats.byEnvironment[entry.environment] = (stats.byEnvironment[entry.environment] || 0) + 1;
      
      // Count by severity
      stats.bySeverity[entry.severity] = (stats.bySeverity[entry.severity] || 0) + 1;
      
      // Count critical incidents
      if (entry.severity === 'critical') {
        stats.criticalIncidents++;
      }
      
      // Count production attempts
      if (entry.environment === 'production' && entry.type === 'BLOCKED') {
        stats.productionAttempts++;
      }
    });

    return stats;

  } catch (error) {
    console.error('[ERROR] Failed to get debug mode audit stats:', error);
    throw error;
  }
}

/**
 * Determine severity based on type and environment
 */
function getSeverity(type: string, environment: string): 'info' | 'warning' | 'critical' {
  // Critical: Any attempt to enable debug in production
  if (environment === 'production' && (type === 'ATTEMPT' || type === 'BLOCKED')) {
    return 'critical';
  }
  
  // Warning: Debug enabled in staging/preview
  if ((environment === 'staging' || environment === 'preview') && type === 'ENABLED') {
    return 'warning';
  }
  
  // Info: Normal operations
  return 'info';
}

/**
 * Fallback audit logging when database is unavailable
 */
async function fallbackAuditLog(entry: DebugModeAuditEntry) {
  try {
    // Store in local storage for browser environments
    if (typeof window !== 'undefined') {
      const existing = localStorage.getItem('debug_audit_fallback') || '[]';
      const logs = JSON.parse(existing);
      logs.push(entry);
      
      // Keep only last 100 entries
      if (logs.length > 100) {
        logs.shift();
      }
      
      localStorage.setItem('debug_audit_fallback', JSON.stringify(logs));
    }
    
    // For server-side, write to a log file
    console.log('[FALLBACK AUDIT]', JSON.stringify(entry));
    
  } catch (error) {
    console.error('[ERROR] Fallback audit log failed:', error);
  }
}

/**
 * Trigger security alerts for critical events
 */
async function triggerSecurityAlert(entry: DebugModeAuditEntry) {
  try {
    // Send to monitoring service
    if (process.env.AXIOM_TOKEN) {
      // In production, send to Axiom
      console.error('[SECURITY ALERT] Critical debug mode incident:', entry);
    }
    
    // Send email alert if configured
    if (process.env.RESEND_API_KEY) {
      // In production, send email to security team
      console.log('[EMAIL ALERT] Would send security alert for:', entry.id);
    }
    
    // Webhook for external alerting
    if (process.env.SECURITY_WEBHOOK_URL) {
      await fetch(process.env.SECURITY_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'DEBUG_MODE_SECURITY_ALERT',
          incident: entry,
          timestamp: new Date().toISOString()
        })
      });
    }
    
  } catch (error) {
    console.error('[ERROR] Failed to trigger security alert:', error);
  }
}