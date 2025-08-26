// import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
// import type { Database } from '@substack-intelligence/database';

/**
 * Debug Mode Audit Log
 * Tracks all debug mode changes and attempts for security compliance
 * 
 * Note: Database table 'debug_mode_audit' doesn't exist yet.
 * All functions are temporarily stubbed out until the table is added to the database schema.
 */

interface DebugModeAuditEntry {
  id: string;
  timestamp: string;
  environment: 'development' | 'production' | 'test';
  type: 'toggle' | 'override' | 'forced' | 'expired' | 'error';
  user_id?: string;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  severity: 'info' | 'warning' | 'critical';
}

/**
 * Log a debug mode audit entry
 */
export async function logDebugModeAudit(entry: Omit<DebugModeAuditEntry, 'id' | 'timestamp'>) {
  try {
    const auditEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      severity: entry.severity || 'info'
    };

    // Log to console for immediate visibility
    console.log('[DEBUG AUDIT]', JSON.stringify(auditEntry));

    // For now, always use fallback logging
    await fallbackAuditLog(auditEntry);

    // Trigger alerts for critical events
    if (auditEntry.severity === 'critical') {
      await triggerSecurityAlert(auditEntry);
    }
  } catch (error) {
    console.error('[ERROR] Failed to log debug audit:', error);
  }
}

/**
 * Fallback audit logging to local storage
 */
async function fallbackAuditLog(entry: DebugModeAuditEntry) {
  try {
    // Store in local storage with rolling limit
    const storedLogs = JSON.parse(localStorage.getItem('debug_audit_logs') || '[]');
    storedLogs.push(entry);
    
    // Keep only last 100 entries
    if (storedLogs.length > 100) {
      storedLogs.shift();
    }
    
    localStorage.setItem('debug_audit_logs', JSON.stringify(storedLogs));
  } catch (error) {
    // Silent fail - audit logging should not break the app
    console.warn('[WARNING] Failed to store audit log locally:', error);
  }
}

/**
 * Get debug audit logs (temporarily returns empty array)
 */
export async function getDebugAuditLogs(
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
  // TODO: Implement once debug_mode_audit table is added
  return [];
}

/**
 * Get audit summary statistics (temporarily returns mock data)
 */
export async function getDebugModeAuditStats(days = 30) {
  // TODO: Implement once debug_mode_audit table is added
  return {
    total_entries: 0,
    by_type: {},
    by_severity: {},
    by_environment: {},
    suspicious_activity: false
  };
}

/**
 * Trigger security alert for critical events
 */
async function triggerSecurityAlert(entry: DebugModeAuditEntry) {
  try {
    // Log critical event
    console.error('[SECURITY ALERT] Critical debug mode event:', entry);
    
    // TODO: Implement actual alerting (email, webhook, etc.)
    // For now, just log to console
  } catch (error) {
    console.error('[ERROR] Failed to trigger security alert:', error);
  }
}

/**
 * Clean up old audit logs (no-op for now)
 */
export async function cleanupOldAuditLogs(daysToKeep = 90) {
  // TODO: Implement once debug_mode_audit table is added
  console.log(`[INFO] Cleanup would remove logs older than ${daysToKeep} days`);
}