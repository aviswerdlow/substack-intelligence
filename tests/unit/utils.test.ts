import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { redactSensitiveData } from '@substack-intelligence/ingestion/utils/validation';
import { burstProtection } from '@substack-intelligence/ingestion/utils/rate-limiting';
import { axiomLogger } from '@substack-intelligence/ingestion/utils/logging';

describe('Validation Utilities', () => {
  describe('redactSensitiveData', () => {
    it('should redact email addresses while keeping domain', () => {
      const input = 'Contact john.doe@example.com for more info';
      const result = redactSensitiveData(input);
      
      expect(result).toBe('Contact ***@example.com for more info');
      expect(result).not.toContain('john.doe');
      expect(result).toContain('@example.com');
    });

    it('should redact multiple email addresses', () => {
      const input = 'Emails: admin@test.com, user123@gmail.com, support@company.org';
      const result = redactSensitiveData(input);
      
      expect(result).toBe('Emails: ***@test.com, ***@gmail.com, ***@company.org');
    });

    it('should redact phone numbers', () => {
      const testCases = [
        { input: 'Call 555-123-4567', expected: 'Call ***-***-****' },
        { input: 'Phone: 555.123.4567', expected: 'Phone: ***-***-****' },
        { input: 'Contact: 5551234567', expected: 'Contact: ***-***-****' },
        { input: 'Numbers: 555-123-4567 and 999-888-7777', expected: 'Numbers: ***-***-**** and ***-***-****' }
      ];

      testCases.forEach(({ input, expected }) => {
        expect(redactSensitiveData(input)).toBe(expected);
      });
    });

    it('should redact SSN-like patterns', () => {
      const input = 'SSN: 123-45-6789 is sensitive';
      const result = redactSensitiveData(input);
      
      expect(result).toBe('SSN: ***-**-**** is sensitive');
    });

    it('should redact credit card-like patterns', () => {
      const testCases = [
        { input: 'Card: 1234 5678 9012 3456', expected: 'Card: ****-****-****-****' },
        { input: 'CC: 1234-5678-9012-3456', expected: 'CC: ****-****-****-****' },
        { input: 'Number: 1234567890123456', expected: 'Number: ****-****-****-****' }
      ];

      testCases.forEach(({ input, expected }) => {
        expect(redactSensitiveData(input)).toBe(expected);
      });
    });

    it('should handle mixed sensitive data', () => {
      const input = 'User john@example.com with phone 555-123-4567 and SSN 123-45-6789';
      const result = redactSensitiveData(input);
      
      expect(result).toBe('User ***@example.com with phone ***-***-**** and SSN ***-**-****');
    });

    it('should preserve non-sensitive data', () => {
      const input = 'This is a normal text with numbers 12345 and dates 2024-01-01';
      const result = redactSensitiveData(input);
      
      expect(result).toBe(input); // Should remain unchanged
    });

    it('should handle empty and null inputs', () => {
      expect(redactSensitiveData('')).toBe('');
      expect(redactSensitiveData('   ')).toBe('   ');
    });

    it('should handle international email domains', () => {
      const input = 'International: user@example.co.uk, admin@test.com.au';
      const result = redactSensitiveData(input);
      
      expect(result).toBe('International: ***@example.co.uk, ***@test.com.au');
    });

    it('should not redact partial matches', () => {
      const input = 'Order #1234 costs $5678 on 9012';
      const result = redactSensitiveData(input);
      
      expect(result).toBe(input); // Should not change non-sensitive number patterns
    });
  });
});

describe('Rate Limiting Utilities', () => {
  let consoleWarnSpy: any;

  beforeEach(() => {
    // Clear the singleton instance state between tests
    const instance = (burstProtection as any);
    if (instance.limits) {
      instance.limits.clear();
    }
    
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('burstProtection.checkBurstLimit', () => {
    it('should allow requests within limit', async () => {
      const result1 = await burstProtection.checkBurstLimit('user1', 'action1', 3, '1m');
      const result2 = await burstProtection.checkBurstLimit('user1', 'action1', 3, '1m');
      const result3 = await burstProtection.checkBurstLimit('user1', 'action1', 3, '1m');
      
      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(result3).toBe(true);
    });

    it('should block requests exceeding limit', async () => {
      // Use up the limit
      await burstProtection.checkBurstLimit('user2', 'action2', 2, '1m');
      await burstProtection.checkBurstLimit('user2', 'action2', 2, '1m');
      
      // This should be blocked
      const result = await burstProtection.checkBurstLimit('user2', 'action2', 2, '1m');
      
      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith('Burst limit exceeded for action2:user2');
    });

    it('should handle different identifiers independently', async () => {
      await burstProtection.checkBurstLimit('user3', 'action3', 1, '1m');
      await burstProtection.checkBurstLimit('user4', 'action3', 1, '1m');
      
      const result1 = await burstProtection.checkBurstLimit('user3', 'action3', 1, '1m');
      const result2 = await burstProtection.checkBurstLimit('user4', 'action3', 1, '1m');
      
      expect(result1).toBe(false); // user3 exceeded
      expect(result2).toBe(false); // user4 exceeded
    });

    it('should handle different operations independently', async () => {
      await burstProtection.checkBurstLimit('user5', 'read', 1, '1m');
      const writeResult = await burstProtection.checkBurstLimit('user5', 'write', 1, '1m');
      
      expect(writeResult).toBe(true); // Different operation should work
      
      const readResult = await burstProtection.checkBurstLimit('user5', 'read', 1, '1m');
      expect(readResult).toBe(false); // Same operation should be blocked
    });

    it('should parse minute windows correctly', async () => {
      const result = await burstProtection.checkBurstLimit('user6', 'action6', 5, '5m');
      expect(result).toBe(true);
    });

    it('should parse hour windows correctly', async () => {
      const result = await burstProtection.checkBurstLimit('user7', 'action7', 10, '2h');
      expect(result).toBe(true);
    });

    it('should use default window when invalid format', async () => {
      const result = await burstProtection.checkBurstLimit('user8', 'action8', 3, 'invalid');
      expect(result).toBe(true); // Should default to 1 minute window
    });

    it('should reset limit after window expires', async () => {
      // Mock time to control window expiration
      const now = Date.now();
      vi.spyOn(Date, 'now')
        .mockReturnValueOnce(now) // First call
        .mockReturnValueOnce(now) // Second call
        .mockReturnValueOnce(now + 61000); // Third call after window expires

      await burstProtection.checkBurstLimit('user9', 'action9', 1, '1m');
      const blockedResult = await burstProtection.checkBurstLimit('user9', 'action9', 1, '1m');
      expect(blockedResult).toBe(false);

      // After window expires, should allow again
      const resetResult = await burstProtection.checkBurstLimit('user9', 'action9', 1, '1m');
      expect(resetResult).toBe(true);

      vi.spyOn(Date, 'now').mockRestore();
    });

    it('should handle concurrent requests correctly', async () => {
      const promises = Array(5).fill(null).map(() => 
        burstProtection.checkBurstLimit('user10', 'action10', 3, '1m')
      );
      
      const results = await Promise.all(promises);
      const allowedCount = results.filter(r => r === true).length;
      const blockedCount = results.filter(r => r === false).length;
      
      expect(allowedCount).toBe(3);
      expect(blockedCount).toBe(2);
    });

    it('should maintain singleton instance', () => {
      const instance1 = (burstProtection as any).constructor.getInstance();
      const instance2 = (burstProtection as any).constructor.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });
});

describe('Logging Utilities', () => {
  let consoleLogSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('axiomLogger', () => {
    it('should log email events', async () => {
      const eventData = { emailId: '123', action: 'processed' };
      await axiomLogger.logEmailEvent('email_received', eventData);
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Email Event] email_received:',
        eventData
      );
    });

    it('should log errors with context', async () => {
      const error = new Error('Test error message');
      const context = { userId: 'user123', operation: 'test' };
      
      await axiomLogger.logError(error, context);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Error] Test error message:',
        context
      );
    });

    it('should log health checks', async () => {
      const healthData = { status: 'ok', latency: 100 };
      await axiomLogger.logHealthCheck('database', 'healthy', healthData);
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Health Check] database - healthy:',
        healthData
      );
    });

    it('should log database events', async () => {
      const dbEvent = { table: 'users', operation: 'insert', rowCount: 5 };
      await axiomLogger.logDatabaseEvent('bulk_insert', dbEvent);
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Database Event] bulk_insert:',
        dbEvent
      );
    });

    it('should log business metrics', async () => {
      const metricData = { source: 'api', timeframe: 'daily' };
      await axiomLogger.logBusinessMetric('revenue', 10000, metricData);
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Business Metric] revenue: 10000',
        metricData
      );
    });

    it('should handle null and undefined data gracefully', async () => {
      await axiomLogger.logEmailEvent('test', null);
      await axiomLogger.logEmailEvent('test', undefined);
      await axiomLogger.logBusinessMetric('test', 0, null);
      
      expect(consoleLogSpy).toHaveBeenCalledTimes(3);
    });

    it('should handle complex nested objects', async () => {
      const complexData = {
        level1: {
          level2: {
            level3: {
              value: 'deep',
              array: [1, 2, 3]
            }
          }
        },
        circular: null as any
      };
      complexData.circular = complexData; // Create circular reference
      
      await axiomLogger.logEmailEvent('complex', complexData);
      
      expect(consoleLogSpy).toHaveBeenCalled();
      // Should not throw on circular reference
    });

    it('should handle error objects without message', async () => {
      const errorWithoutMessage = {} as Error;
      await axiomLogger.logError(errorWithoutMessage, { test: true });
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Error] undefined:',
        { test: true }
      );
    });

    it('should handle various health check statuses', async () => {
      const statuses = ['healthy', 'unhealthy', 'degraded', 'unknown'];
      
      for (const status of statuses) {
        await axiomLogger.logHealthCheck('service', status, { detail: status });
      }
      
      expect(consoleLogSpy).toHaveBeenCalledTimes(4);
      statuses.forEach(status => {
        expect(consoleLogSpy).toHaveBeenCalledWith(
          `[Health Check] service - ${status}:`,
          { detail: status }
        );
      });
    });

    it('should handle numeric metric values correctly', async () => {
      const testCases = [
        { metric: 'count', value: 0 },
        { metric: 'percentage', value: 0.5 },
        { metric: 'large', value: 1000000 },
        { metric: 'negative', value: -100 },
        { metric: 'float', value: 3.14159 }
      ];

      for (const { metric, value } of testCases) {
        await axiomLogger.logBusinessMetric(metric, value, {});
      }

      expect(consoleLogSpy).toHaveBeenCalledTimes(5);
      testCases.forEach(({ metric, value }) => {
        expect(consoleLogSpy).toHaveBeenCalledWith(
          `[Business Metric] ${metric}: ${value}`,
          {}
        );
      });
    });
  });
});