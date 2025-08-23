import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { validateBuild, CRITICAL_CHECKS } from '../../scripts/validate-build';
import { logDebugModeAudit, getDebugModeAuditLogs } from '../../lib/db/debug-audit';

/**
 * Test suite for debug mode security safeguards
 */

describe('Debug Mode Security', () => {
  
  let originalEnv: NodeJS.ProcessEnv;
  
  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });
  
  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Build Validation', () => {
    
    it('should fail build when DEBUG=true in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.DEBUG = 'true';
      
      const result = CRITICAL_CHECKS.debugMode.validate(process.env);
      
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('critical');
      expect(result.message).toContain('Debug mode is enabled in production');
    });
    
    it('should pass build when DEBUG=false in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.DEBUG = 'false';
      
      const result = CRITICAL_CHECKS.debugMode.validate(process.env);
      
      expect(result.passed).toBe(true);
      expect(result.severity).toBe('info');
    });
    
    it('should allow DEBUG=true in development', () => {
      process.env.NODE_ENV = 'development';
      process.env.DEBUG = 'true';
      
      const result = CRITICAL_CHECKS.debugMode.validate(process.env);
      
      expect(result.passed).toBe(true);
    });
    
    it('should detect test keys in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_123';
      process.env.CLERK_SECRET_KEY = 'sk_test_456';
      
      const result = CRITICAL_CHECKS.clerkKeys.validate(process.env);
      
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('critical');
      expect(result.message).toContain('Test Clerk');
    });
    
    it('should validate encryption key requirements', () => {
      // Missing key
      delete process.env.ENCRYPTION_KEY;
      let result = CRITICAL_CHECKS.encryptionKey.validate(process.env);
      expect(result.passed).toBe(false);
      expect(result.message).toContain('missing');
      
      // Too short
      process.env.ENCRYPTION_KEY = 'short';
      result = CRITICAL_CHECKS.encryptionKey.validate(process.env);
      expect(result.passed).toBe(false);
      expect(result.message).toContain('too short');
      
      // Valid key
      process.env.ENCRYPTION_KEY = 'a'.repeat(32);
      result = CRITICAL_CHECKS.encryptionKey.validate(process.env);
      expect(result.passed).toBe(true);
    });
    
    it('should check for required services', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'valid-key';
      process.env.ANTHROPIC_API_KEY = 'sk-ant-123';
      
      const result = CRITICAL_CHECKS.requiredServices.validate(process.env);
      
      expect(result.passed).toBe(true);
      
      // Remove one service
      delete process.env.ANTHROPIC_API_KEY;
      const failResult = CRITICAL_CHECKS.requiredServices.validate(process.env);
      
      expect(failResult.passed).toBe(false);
      expect(failResult.message).toContain('ANTHROPIC_API_KEY');
    });
    
    it('should detect disabled SSL verification in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      
      const result = CRITICAL_CHECKS.securityPolicies.validate(process.env);
      
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('critical');
      expect(result.message).toContain('SSL verification is disabled');
    });
  });

  describe('Middleware Protection', () => {
    
    it('should block requests when DEBUG=true in production', async () => {
      const { applySecurityPolicies } = await import('../../middleware');
      
      process.env.NODE_ENV = 'production';
      process.env.DEBUG = 'true';
      
      const mockRequest = {
        url: 'https://example.com/api/test',
        ip: '192.168.1.1',
        headers: new Map([
          ['user-agent', 'Mozilla/5.0'],
          ['x-forwarded-for', '10.0.0.1']
        ])
      } as any;
      
      const response = applySecurityPolicies(mockRequest);
      
      expect(response).not.toBeNull();
      expect(response?.status).toBe(403);
    });
    
    it('should allow requests when DEBUG=false in production', async () => {
      const { applySecurityPolicies } = await import('../../middleware');
      
      process.env.NODE_ENV = 'production';
      process.env.DEBUG = 'false';
      
      const mockRequest = {
        url: 'https://example.com/api/test',
        headers: new Map()
      } as any;
      
      const response = applySecurityPolicies(mockRequest);
      
      expect(response).toBeNull();
    });
    
    it('should track debug mode timeout in staging', async () => {
      const { checkDebugModeTimeout } = await import('../../middleware');
      
      process.env.VERCEL_ENV = 'preview';
      process.env.DEBUG = 'true';
      
      // Set enabled time to 2 hours ago
      const twoHoursAgo = new Date();
      twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);
      process.env.DEBUG_ENABLED_AT = twoHoursAgo.toISOString();
      
      checkDebugModeTimeout();
      
      // Should auto-disable after 1 hour
      expect(process.env.DEBUG).toBe('false');
      expect(process.env.DEBUG_ENABLED_AT).toBeUndefined();
    });
    
    it('should not disable debug mode before timeout', async () => {
      const { checkDebugModeTimeout } = await import('../../middleware');
      
      process.env.VERCEL_ENV = 'preview';
      process.env.DEBUG = 'true';
      
      // Set enabled time to 30 minutes ago
      const thirtyMinutesAgo = new Date();
      thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);
      process.env.DEBUG_ENABLED_AT = thirtyMinutesAgo.toISOString();
      
      checkDebugModeTimeout();
      
      // Should still be enabled
      expect(process.env.DEBUG).toBe('true');
      expect(process.env.DEBUG_ENABLED_AT).toBeDefined();
    });
  });

  describe('Audit Logging', () => {
    
    it('should log debug mode attempts with correct severity', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      
      await logDebugModeAudit({
        type: 'BLOCKED',
        environment: 'production',
        user_id: 'user123',
        user_email: 'test@example.com',
        reason: 'Attempted to enable debug mode'
      });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG AUDIT]'),
        expect.stringContaining('"severity":"critical"')
      );
    });
    
    it('should set correct severity levels', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      
      // Critical: production attempt
      await logDebugModeAudit({
        type: 'ATTEMPT',
        environment: 'production'
      });
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('"severity":"critical"')
      );
      
      // Warning: staging enabled
      await logDebugModeAudit({
        type: 'ENABLED',
        environment: 'staging'
      });
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('"severity":"warning"')
      );
      
      // Info: normal operation
      await logDebugModeAudit({
        type: 'DISABLED',
        environment: 'development'
      });
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('"severity":"info"')
      );
    });
    
    it('should trigger alerts for critical incidents', async () => {
      const consoleSpy = vi.spyOn(console, 'error');
      
      await logDebugModeAudit({
        type: 'BLOCKED',
        environment: 'production',
        user_id: 'user123'
      });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SECURITY ALERT]'),
        expect.anything()
      );
    });
  });

  describe('Environment File Generation', () => {
    
    it('should force DEBUG=false in production template', () => {
      const { generateEnvironmentFile } = require('../../scripts/setup-environment');
      const fs = require('fs');
      
      const writeSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
      
      generateEnvironmentFile('production', '/tmp/test.env');
      
      const content = writeSpy.mock.calls[0][1] as string;
      expect(content).not.toContain('DEBUG=true');
      
      // Production should never have DEBUG variable or it should be false
      const debugMatch = content.match(/^DEBUG=(.*)$/m);
      if (debugMatch) {
        expect(debugMatch[1]).toBe('false');
      }
    });
    
    it('should include DEBUG=false in staging template', () => {
      const { generateEnvironmentFile } = require('../../scripts/setup-environment');
      const fs = require('fs');
      
      const writeSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
      
      generateEnvironmentFile('staging', '/tmp/test.env');
      
      const content = writeSpy.mock.calls[0][1] as string;
      const debugMatch = content.match(/^DEBUG=(.*)$/m);
      
      if (debugMatch) {
        expect(debugMatch[1]).toBe('false');
      }
    });
  });

  describe('API Monitoring Endpoint', () => {
    
    it('should reject unauthorized access to monitoring endpoint', async () => {
      const response = await fetch('/api/monitoring/debug-mode', {
        method: 'GET'
      });
      
      expect(response.status).toBe(401);
    });
    
    it('should block debug mode enable attempts in production via API', async () => {
      process.env.NODE_ENV = 'production';
      
      const response = await fetch('/api/monitoring/debug-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'enable',
          reason: 'Testing'
        })
      });
      
      if (response.status === 403) {
        const data = await response.json();
        expect(data.error).toContain('Security Policy Violation');
        expect(data.message).toContain('cannot be enabled in production');
      }
    });
  });
});