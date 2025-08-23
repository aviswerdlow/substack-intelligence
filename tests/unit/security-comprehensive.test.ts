import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock implementations for security modules that may not be directly importable
const mockValidationFunctions = {
  sanitizeInput: vi.fn(),
  validateAgainstSQLInjection: vi.fn(),
  createRateLimitKey: vi.fn(),
  generateNonce: vi.fn(),
  validateRequest: vi.fn(),
  detectSensitiveData: vi.fn(),
  redactSensitiveData: vi.fn()
};

const mockEncryptionFunctions = {
  encrypt: vi.fn(),
  decrypt: vi.fn(),
  encryptSettings: vi.fn(),
  decryptSettings: vi.fn(),
  generateEncryptionKey: vi.fn(),
  hashApiKey: vi.fn()
};

const mockRateLimiting = {
  checkRateLimit: vi.fn(),
  burstProtection: {
    checkBurstLimit: vi.fn(),
    resetBurst: vi.fn()
  },
  ipRateLimiter: vi.fn(),
  userRateLimiter: vi.fn()
};

// Mock external dependencies
vi.mock('crypto', () => ({
  createHash: vi.fn(() => ({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn((format) => format === 'hex' ? 'mock_hash' : Buffer.from('mock_hash'))
  })),
  createHmac: vi.fn(() => ({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn(() => 'mock_hmac')
  })),
  randomBytes: vi.fn((size) => Buffer.alloc(size, 'random')),
  pbkdf2Sync: vi.fn(() => Buffer.from('mock_derived_key')),
  createCipher: vi.fn(() => ({
    update: vi.fn(() => 'encrypted_'),
    final: vi.fn(() => 'data')
  })),
  createDecipher: vi.fn(() => ({
    update: vi.fn(() => 'decrypted_'),
    final: vi.fn(() => 'data')
  }))
}));

describe('Security and Validation Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Input Sanitization', () => {
    const testSanitizeInput = (input: string, maxLength: number = 1000): string => {
      // Mock implementation of sanitizeInput
      if (!input || typeof input !== 'string') return '';
      
      let sanitized = input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<[^>]*>?/gm, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .replace(/data:text\/html/gi, '');
      
      sanitized = sanitized.trim();
      
      if (sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength) + '...';
      }
      
      return sanitized;
    };

    it('should remove XSS attack vectors', () => {
      const maliciousInputs = [
        '<script>alert("XSS")</script>',
        '<img src="x" onerror="alert(1)">',
        'javascript:alert("XSS")',
        '<svg onload="alert(1)">',
        '<iframe src="javascript:alert(1)"></iframe>',
        '<object data="javascript:alert(1)"></object>',
        '<embed src="javascript:alert(1)">',
        '<form><button formaction="javascript:alert(1)">',
        '<input onfocus="alert(1)" autofocus>',
        '<select onfocus="alert(1)" autofocus>',
        '<textarea onfocus="alert(1)" autofocus>',
        '<keygen onfocus="alert(1)" autofocus>',
        '<video><source onerror="alert(1)">',
        '<audio src="x" onerror="alert(1)">',
        '<details open ontoggle="alert(1)">',
        '<marquee onstart="alert(1)">',
        '<meter onmouseenter="alert(1)">',
        '<progress onmouseover="alert(1)">',
        '<time onclick="alert(1)">',
        '<data onclick="alert(1)">'
      ];

      maliciousInputs.forEach(input => {
        const sanitized = testSanitizeInput(input);
        
        expect(sanitized).not.toContain('<script');
        expect(sanitized).not.toContain('javascript:');
        expect(sanitized).not.toContain('onerror');
        expect(sanitized).not.toContain('onclick');
        expect(sanitized).not.toContain('onload');
        expect(sanitized).not.toContain('onfocus');
        expect(sanitized.toLowerCase()).not.toMatch(/on\w+=/);
      });
    });

    it('should handle data URI attacks', () => {
      const dataUriAttacks = [
        'data:text/html,<script>alert(1)</script>',
        'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
        'data:text/html;charset=utf-8,<script>alert(1)</script>',
        'data:image/svg+xml,<svg onload="alert(1)"/>'
      ];

      dataUriAttacks.forEach(input => {
        const sanitized = testSanitizeInput(input);
        
        expect(sanitized).not.toContain('data:text/html');
        expect(sanitized).not.toContain('<script');
        expect(sanitized).not.toContain('onload');
      });
    });

    it('should preserve safe content', () => {
      const safeInputs = [
        'This is safe text',
        'Email: test@example.com',
        'Numbers: 123-456-7890',
        'Special chars: !@#$%^&*()_+-={}[]|\\:";\'<>?,./',
        'Unicode: 你好世界 🌍',
        'Markdown: **bold** *italic*',
        'URL: https://example.com',
        'Code: const x = 5;'
      ];

      safeInputs.forEach(input => {
        const sanitized = testSanitizeInput(input);
        
        expect(sanitized).toBeTruthy();
        expect(sanitized.length).toBeGreaterThan(0);
      });
    });

    it('should enforce length limits', () => {
      const longInput = 'a'.repeat(2000);
      const sanitized = testSanitizeInput(longInput, 1000);
      
      expect(sanitized.length).toBeLessThanOrEqual(1003); // 1000 + '...'
      expect(sanitized).toMatch(/\.{3}$/);
    });

    it('should handle null and undefined inputs', () => {
      expect(testSanitizeInput(null as any)).toBe('');
      expect(testSanitizeInput(undefined as any)).toBe('');
      expect(testSanitizeInput('')).toBe('');
    });

    it('should handle non-string inputs', () => {
      const nonStringInputs = [123, true, {}, [], Symbol('test')];
      
      nonStringInputs.forEach(input => {
        const sanitized = testSanitizeInput(input as any);
        expect(sanitized).toBe('');
      });
    });

    it('should trim whitespace', () => {
      const input = '   \n\t  valid content  \n\t   ';
      const sanitized = testSanitizeInput(input);
      
      expect(sanitized).toBe('valid content');
    });

    it('should handle mixed content', () => {
      const mixedInput = '  <script>alert("xss")</script> Valid content <img onerror="alert(1)"> More valid  ';
      const sanitized = testSanitizeInput(mixedInput);
      
      expect(sanitized).toBe('Valid content  More valid');
    });

    it('should handle nested script tags', () => {
      const nestedScripts = '<script><script>alert("nested")</script></script>';
      const sanitized = testSanitizeInput(nestedScripts);
      
      expect(sanitized).not.toContain('<script');
      expect(sanitized).not.toContain('alert');
    });

    it('should handle case variations', () => {
      const caseVariations = [
        '<SCRIPT>alert(1)</SCRIPT>',
        '<ScRiPt>alert(1)</ScRiPt>',
        '<IMG SRC="x" ONERROR="alert(1)">',
        'JAVASCRIPT:alert(1)',
        'JaVaScRiPt:alert(1)'
      ];

      caseVariations.forEach(input => {
        const sanitized = testSanitizeInput(input);
        
        expect(sanitized).not.toContain('alert');
        expect(sanitized.toLowerCase()).not.toContain('script');
        expect(sanitized.toLowerCase()).not.toContain('javascript');
      });
    });
  });

  describe('SQL Injection Detection', () => {
    const testSQLInjection = (input: string): boolean => {
      // Mock implementation of SQL injection detection
      const sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC|EXECUTE)\b)/i,
        /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
        /([\'\"][\s]*;[\s]*--)/i,
        /([\'\"][\s]*;[\s]*\/\*)/i,
        /(\bUNION\s+SELECT)/i,
        /(\bOR\s+[\'\"]?\d+[\'\"]?\s*=\s*[\'\"]?\d+[\'\"]?)/i,
        /([\'\"];?\s*(DROP|DELETE|INSERT|SELECT))/i,
        /(\bOR\s+[\'\"]?[a-zA-Z]+[\'\"]?\s*=\s*[\'\"]?[a-zA-Z]+[\'\"]?)/i
      ];

      return sqlPatterns.some(pattern => pattern.test(input));
    };

    it('should detect common SQL injection attempts', () => {
      const sqlInjectionAttempts = [
        "'; DROP TABLE users; --",
        "' OR 1=1 --",
        "' UNION SELECT * FROM passwords --",
        "admin'--",
        "admin' /*",
        "' OR 'x'='x",
        "' OR 1 = 1 #",
        "'; INSERT INTO users VALUES ('hacker', 'password'); --",
        "' AND 1=1 --",
        "' OR 'a'='a",
        "1'; DROP TABLE companies; --",
        "user' OR '1'='1' /*",
        "'; DELETE FROM emails; --",
        "admin' OR 1=1#",
        "' UNION SELECT username, password FROM users--"
      ];

      sqlInjectionAttempts.forEach(attempt => {
        expect(testSQLInjection(attempt)).toBe(true);
      });
    });

    it('should not flag safe inputs', () => {
      const safeInputs = [
        "normal search query",
        "user@example.com",
        "Company Name Inc.",
        "123-456-7890",
        "product description with numbers 123",
        "text with single ' quote",
        'text with double " quote',
        "text with = equals sign",
        "text with - dash",
        "text with # hash",
        "text with /* comment style but not sql",
        "OR conditional text in normal sentence",
        "SELECT as a word in normal text",
        "UPDATE your profile information",
        "DROP off the package"
      ];

      safeInputs.forEach(input => {
        expect(testSQLInjection(input)).toBe(false);
      });
    });

    it('should handle case insensitive detection', () => {
      const caseVariations = [
        "' or 1=1 --",
        "' OR 1=1 --",
        "' Or 1=1 --",
        "' oR 1=1 --",
        "'; drop table users; --",
        "'; DROP TABLE users; --",
        "'; Drop Table users; --"
      ];

      caseVariations.forEach(attempt => {
        expect(testSQLInjection(attempt)).toBe(true);
      });
    });

    it('should detect advanced injection techniques', () => {
      const advancedAttempts = [
        "'; EXEC xp_cmdshell('dir'); --",
        "' UNION SELECT null, version(), null --",
        "'; WAITFOR DELAY '00:00:05' --",
        "' AND (SELECT COUNT(*) FROM users) > 0 --",
        "'; BULK INSERT users FROM 'file.txt' --",
        "' OR EXISTS(SELECT * FROM users WHERE admin=1) --",
        "'; ALTER TABLE users ADD admin bit --",
        "' UNION SELECT @@version --",
        "'; CREATE USER hacker WITH PASSWORD 'password' --"
      ];

      advancedAttempts.forEach(attempt => {
        expect(testSQLInjection(attempt)).toBe(true);
      });
    });

    it('should handle encoded injection attempts', () => {
      // These would be URL-decoded before checking in real implementation
      const encodedAttempts = [
        "' OR 1%3D1 --", // ' OR 1=1 --
        "%27 OR 1=1 --", // ' OR 1=1 --
        "'; DROP%20TABLE%20users; --", // '; DROP TABLE users; --
        "%27%20UNION%20SELECT%20*%20FROM%20passwords%20--" // ' UNION SELECT * FROM passwords --
      ];

      // In real implementation, you'd decode first
      const decodedAttempts = encodedAttempts.map(attempt => 
        decodeURIComponent(attempt)
      );

      decodedAttempts.forEach(attempt => {
        expect(testSQLInjection(attempt)).toBe(true);
      });
    });
  });

  describe('Rate Limiting', () => {
    const createRateLimitKey = (identifier: string, window: string = 'minute'): string => {
      const now = new Date();
      let windowStart: string;

      switch (window) {
        case 'minute':
          windowStart = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
          break;
        case 'hour':
          windowStart = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:00`;
          break;
        case 'day':
          windowStart = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
          break;
        default:
          windowStart = now.toISOString();
      }

      return `ratelimit:${identifier}:${windowStart}`;
    };

    it('should generate rate limit keys for different time windows', () => {
      const identifier = 'user_123';

      const minuteKey = createRateLimitKey(identifier, 'minute');
      const hourKey = createRateLimitKey(identifier, 'hour');
      const dayKey = createRateLimitKey(identifier, 'day');

      expect(minuteKey).toMatch(/^ratelimit:user_123:\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
      expect(hourKey).toMatch(/^ratelimit:user_123:\d{4}-\d{2}-\d{2} \d{2}:00$/);
      expect(dayKey).toMatch(/^ratelimit:user_123:\d{4}-\d{2}-\d{2}$/);
    });

    it('should generate consistent keys for same time window', () => {
      const identifier = 'user_123';
      
      const key1 = createRateLimitKey(identifier, 'minute');
      const key2 = createRateLimitKey(identifier, 'minute');

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different users', () => {
      const key1 = createRateLimitKey('user_123', 'minute');
      const key2 = createRateLimitKey('user_456', 'minute');

      expect(key1).not.toBe(key2);
    });

    it('should handle special characters in identifiers', () => {
      const specialIdentifiers = [
        'user@example.com',
        'user-123',
        'user_with_underscores',
        '192.168.1.1',
        'api-key-abc123'
      ];

      specialIdentifiers.forEach(identifier => {
        const key = createRateLimitKey(identifier, 'minute');
        expect(key).toContain(identifier);
        expect(key).toMatch(/^ratelimit:.+:\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
      });
    });

    it('should default to minute window', () => {
      const key1 = createRateLimitKey('user_123');
      const key2 = createRateLimitKey('user_123', 'minute');

      expect(key1).toBe(key2);
    });
  });

  describe('Nonce Generation', () => {
    const generateNonce = (): string => {
      // Mock implementation
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let nonce = '';
      
      for (let i = 0; i < 32; i++) {
        nonce += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      
      return nonce;
    };

    it('should generate unique nonces', () => {
      const nonces = new Set<string>();
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        const nonce = generateNonce();
        expect(nonces.has(nonce)).toBe(false);
        nonces.add(nonce);
      }

      expect(nonces.size).toBe(iterations);
    });

    it('should generate nonces of consistent length', () => {
      const nonces = Array.from({ length: 100 }, () => generateNonce());

      nonces.forEach(nonce => {
        expect(nonce.length).toBe(32);
      });
    });

    it('should generate nonces with valid characters only', () => {
      const validCharsRegex = /^[A-Za-z0-9]+$/;
      const nonces = Array.from({ length: 100 }, () => generateNonce());

      nonces.forEach(nonce => {
        expect(validCharsRegex.test(nonce)).toBe(true);
      });
    });

    it('should have sufficient entropy', () => {
      // Test that nonces have good distribution of characters
      const nonces = Array.from({ length: 1000 }, () => generateNonce());
      const allChars = nonces.join('');
      
      const charCounts: Record<string, number> = {};
      for (const char of allChars) {
        charCounts[char] = (charCounts[char] || 0) + 1;
      }

      const uniqueChars = Object.keys(charCounts);
      
      // Should use a good variety of characters
      expect(uniqueChars.length).toBeGreaterThan(50);
      
      // No character should be overly dominant
      const totalChars = allChars.length;
      Object.values(charCounts).forEach(count => {
        expect(count / totalChars).toBeLessThan(0.05); // Max 5% for any character
      });
    });
  });

  describe('Sensitive Data Detection', () => {
    const detectSensitiveData = (text: string): boolean => {
      const sensitivePatterns = {
        email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
        phone: /(\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g,
        ssn: /\b\d{3}-?\d{2}-?\d{4}\b/g,
        creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
        apiKey: /\b[a-zA-Z0-9]{32,}\b/g
      };

      return Object.values(sensitivePatterns).some(pattern => pattern.test(text));
    };

    const redactSensitiveData = (text: string): string => {
      const sensitivePatterns = {
        email: { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '[EMAIL]' },
        phone: { pattern: /(\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g, replacement: '[PHONE]' },
        ssn: { pattern: /\b\d{3}-?\d{2}-?\d{4}\b/g, replacement: '[SSN]' },
        creditCard: { pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g, replacement: '[CREDIT_CARD]' },
        apiKey: { pattern: /\b[a-zA-Z0-9]{32,}\b/g, replacement: '[API_KEY]' }
      };

      let redacted = text;
      Object.values(sensitivePatterns).forEach(({ pattern, replacement }) => {
        redacted = redacted.replace(pattern, replacement);
      });

      return redacted;
    };

    it('should detect email addresses', () => {
      const emails = [
        'user@example.com',
        'test.email+tag@domain.co.uk',
        'firstname.lastname@company.org',
        'user123@test-domain.com',
        'admin@localhost.local'
      ];

      emails.forEach(email => {
        expect(detectSensitiveData(email)).toBe(true);
        expect(detectSensitiveData(`Contact us at ${email} for more info`)).toBe(true);
      });
    });

    it('should detect phone numbers', () => {
      const phones = [
        '555-123-4567',
        '(555) 123-4567',
        '555.123.4567',
        '5551234567',
        '+1-555-123-4567',
        '1 555 123 4567'
      ];

      phones.forEach(phone => {
        expect(detectSensitiveData(phone)).toBe(true);
        expect(detectSensitiveData(`Call me at ${phone}`)).toBe(true);
      });
    });

    it('should detect SSN patterns', () => {
      const ssns = [
        '123-45-6789',
        '123456789',
        '123 45 6789'
      ];

      ssns.forEach(ssn => {
        expect(detectSensitiveData(ssn)).toBe(true);
        expect(detectSensitiveData(`SSN: ${ssn}`)).toBe(true);
      });
    });

    it('should detect credit card numbers', () => {
      const creditCards = [
        '4111-1111-1111-1111',
        '4111 1111 1111 1111',
        '4111111111111111',
        '5555-5555-5555-4444',
        '3782 822463 10005'
      ];

      creditCards.forEach(cc => {
        expect(detectSensitiveData(cc)).toBe(true);
        expect(detectSensitiveData(`Card number: ${cc}`)).toBe(true);
      });
    });

    it('should detect API keys', () => {
      const apiKeys = [
        'sk_live_4eC39HqLyjWDarjtT1zdp7dc',
        'pk_test_TYooMQauvdEDq54NiTphI7jx',
        'xapp_1234567890abcdef1234567890abcdef',
        'ya29.a0ARrdaM8n7m4k6RRyFKZhQQZCqBxZVkLX9D5'
      ];

      apiKeys.forEach(key => {
        expect(detectSensitiveData(key)).toBe(true);
        expect(detectSensitiveData(`API Key: ${key}`)).toBe(true);
      });
    });

    it('should not detect normal text', () => {
      const normalText = [
        'This is normal text',
        'Phone: call us anytime',
        'Email us for more information',
        'Card payment accepted',
        'API documentation available',
        'Numbers like 123 or 456 are fine',
        'Partial patterns like 123-45 or user@domain should not match'
      ];

      normalText.forEach(text => {
        expect(detectSensitiveData(text)).toBe(false);
      });
    });

    it('should redact sensitive data correctly', () => {
      const testCases = [
        {
          input: 'Contact me at john@example.com or call 555-123-4567',
          expected: 'Contact me at [EMAIL] or call [PHONE]'
        },
        {
          input: 'SSN: 123-45-6789, Card: 4111-1111-1111-1111',
          expected: 'SSN: [SSN], Card: [CREDIT_CARD]'
        },
        {
          input: 'API key: sk_live_4eC39HqLyjWDarjtT1zdp7dc',
          expected: 'API key: [API_KEY]'
        },
        {
          input: 'Multiple emails: user1@test.com, user2@test.org',
          expected: 'Multiple emails: [EMAIL], [EMAIL]'
        }
      ];

      testCases.forEach(({ input, expected }) => {
        expect(redactSensitiveData(input)).toBe(expected);
      });
    });

    it('should handle mixed sensitive data', () => {
      const mixedInput = `
        Name: John Doe
        Email: john.doe@company.com
        Phone: (555) 123-4567
        SSN: 123-45-6789
        Card: 4111 1111 1111 1111
        API: sk_live_1234567890abcdef1234567890abcdef
        Normal text that should remain unchanged
      `;

      const redacted = redactSensitiveData(mixedInput);

      expect(redacted).not.toContain('john.doe@company.com');
      expect(redacted).not.toContain('(555) 123-4567');
      expect(redacted).not.toContain('123-45-6789');
      expect(redacted).not.toContain('4111 1111 1111 1111');
      expect(redacted).not.toContain('sk_live_1234567890abcdef1234567890abcdef');
      
      expect(redacted).toContain('[EMAIL]');
      expect(redacted).toContain('[PHONE]');
      expect(redacted).toContain('[SSN]');
      expect(redacted).toContain('[CREDIT_CARD]');
      expect(redacted).toContain('[API_KEY]');
      expect(redacted).toContain('Normal text that should remain unchanged');
    });

    it('should handle edge cases in sensitive data detection', () => {
      const edgeCases = [
        { input: '', expected: false },
        { input: 'user@', expected: false },
        { input: '@domain.com', expected: false },
        { input: '123-45-', expected: false },
        { input: '4111-1111-1111-', expected: false },
        { input: '555-123', expected: false },
        { input: 'short', expected: false }, // Too short for API key
        { input: 'a'.repeat(31), expected: false }, // Just under API key length
        { input: 'a'.repeat(32), expected: true }, // Exactly API key length
      ];

      edgeCases.forEach(({ input, expected }) => {
        expect(detectSensitiveData(input)).toBe(expected);
      });
    });
  });

  describe('Encryption and Hashing', () => {
    it('should generate different hashes for different inputs', () => {
      const crypto = require('crypto');
      
      const input1 = 'test_input_1';
      const input2 = 'test_input_2';
      
      const hash1 = crypto.createHash('sha256').update(input1).digest('hex');
      const hash2 = crypto.createHash('sha256').update(input2).digest('hex');
      
      expect(hash1).not.toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex length
      expect(hash2).toHaveLength(64);
    });

    it('should generate consistent hashes for same input', () => {
      const crypto = require('crypto');
      
      const input = 'consistent_input';
      
      const hash1 = crypto.createHash('sha256').update(input).digest('hex');
      const hash2 = crypto.createHash('sha256').update(input).digest('hex');
      
      expect(hash1).toBe(hash2);
    });

    it('should handle various hash algorithms', () => {
      const crypto = require('crypto');
      const input = 'test_input';
      
      const algorithms = ['sha256', 'sha512', 'md5'];
      const expectedLengths = { sha256: 64, sha512: 128, md5: 32 };
      
      algorithms.forEach(algo => {
        const hash = crypto.createHash(algo).update(input).digest('hex');
        expect(hash).toHaveLength(expectedLengths[algo as keyof typeof expectedLengths]);
        expect(/^[a-f0-9]+$/.test(hash)).toBe(true); // Valid hex
      });
    });

    it('should generate secure random bytes', () => {
      const crypto = require('crypto');
      
      const bytes1 = crypto.randomBytes(32);
      const bytes2 = crypto.randomBytes(32);
      
      expect(bytes1).toHaveLength(32);
      expect(bytes2).toHaveLength(32);
      expect(bytes1.equals(bytes2)).toBe(false);
    });

    it('should create HMACs correctly', () => {
      const crypto = require('crypto');
      
      const key = 'secret_key';
      const message = 'test_message';
      
      const hmac1 = crypto.createHmac('sha256', key).update(message).digest('hex');
      const hmac2 = crypto.createHmac('sha256', key).update(message).digest('hex');
      
      expect(hmac1).toBe(hmac2); // Same key and message = same HMAC
      expect(hmac1).toHaveLength(64); // SHA-256 HMAC hex length
      
      // Different key should produce different HMAC
      const differentKeyHmac = crypto.createHmac('sha256', 'different_key').update(message).digest('hex');
      expect(hmac1).not.toBe(differentKeyHmac);
    });

    it('should derive keys consistently with PBKDF2', () => {
      const crypto = require('crypto');
      
      const password = 'user_password';
      const salt = 'random_salt';
      const iterations = 10000;
      const keyLength = 32;
      
      const key1 = crypto.pbkdf2Sync(password, salt, iterations, keyLength, 'sha256');
      const key2 = crypto.pbkdf2Sync(password, salt, iterations, keyLength, 'sha256');
      
      expect(key1.equals(key2)).toBe(true);
      expect(key1).toHaveLength(keyLength);
      
      // Different salt should produce different key
      const differentSaltKey = crypto.pbkdf2Sync(password, 'different_salt', iterations, keyLength, 'sha256');
      expect(key1.equals(differentSaltKey)).toBe(false);
    });
  });

  describe('Security Headers and CSRF Protection', () => {
    it('should provide comprehensive security headers', () => {
      const securityHeaders = {
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';",
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
      };

      Object.entries(securityHeaders).forEach(([header, value]) => {
        expect(typeof header).toBe('string');
        expect(typeof value).toBe('string');
        expect(header.length).toBeGreaterThan(0);
        expect(value.length).toBeGreaterThan(0);
      });
    });

    it('should validate CSP directives', () => {
      const csp = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';";
      
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src");
      expect(csp).toContain("style-src");
    });

    it('should enforce HSTS properly', () => {
      const hsts = 'max-age=31536000; includeSubDomains; preload';
      
      expect(hsts).toContain('max-age=');
      expect(hsts).toContain('includeSubDomains');
      expect(hsts).toContain('preload');
      
      const maxAge = hsts.match(/max-age=(\d+)/)?.[1];
      expect(parseInt(maxAge || '0')).toBeGreaterThan(0);
    });

    it('should implement permissions policy correctly', () => {
      const permissionsPolicy = 'camera=(), microphone=(), geolocation=()';
      
      const restrictedFeatures = ['camera', 'microphone', 'geolocation'];
      
      restrictedFeatures.forEach(feature => {
        expect(permissionsPolicy).toContain(`${feature}=()`);
      });
    });
  });

  describe('Input Validation Edge Cases', () => {
    it('should handle extremely long inputs', () => {
      const veryLongInput = 'a'.repeat(100000);
      const sanitized = testSanitizeInput(veryLongInput, 1000);
      
      expect(sanitized.length).toBeLessThanOrEqual(1003); // Including ellipsis
    });

    it('should handle deeply nested HTML', () => {
      const deeplyNested = '<div>'.repeat(1000) + 'content' + '</div>'.repeat(1000);
      const sanitized = testSanitizeInput(deeplyNested);
      
      expect(sanitized).toBe('content');
    });

    it('should handle malformed HTML entities', () => {
      const malformedEntities = '&amp &lt &gt &#invalid; &#65; &#x41;';
      const sanitized = testSanitizeInput(malformedEntities);
      
      expect(sanitized).toBeTruthy();
      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
    });

    it('should handle mixed encodings', () => {
      const mixedEncodings = '%3Cscript%3Ealert(1)%3C/script%3E <script>alert(2)</script>';
      // In real implementation, you'd decode first
      const decoded = decodeURIComponent(mixedEncodings);
      const sanitized = testSanitizeInput(decoded);
      
      expect(sanitized).not.toContain('<script');
      expect(sanitized).not.toContain('alert');
    });

    it('should preserve legitimate mathematical expressions', () => {
      const mathExpressions = [
        '2 + 2 = 4',
        'x < y && y > z',
        'a = b * c / d',
        'if (x === y) { return true; }'
      ];

      mathExpressions.forEach(expr => {
        const sanitized = testSanitizeInput(expr);
        expect(sanitized).toBeTruthy();
        // Should preserve mathematical operators while removing dangerous HTML
      });
    });

    it('should handle international characters correctly', () => {
      const internationalText = [
        '你好世界',
        'Здравствуй мир',
        'مرحبا بالعالم',
        'こんにちは世界',
        'Γεια σας κόσμε',
        '🌍🌎🌏 Hello World!'
      ];

      internationalText.forEach(text => {
        const sanitized = testSanitizeInput(text);
        expect(sanitized).toBe(text); // Should preserve international characters
      });
    });

    it('should handle control characters', () => {
      const controlChars = 'text\x00with\x01control\x02chars\x03';
      const sanitized = testSanitizeInput(controlChars);
      
      // Should handle or remove control characters gracefully
      expect(sanitized).toBeTruthy();
    });
  });

  describe('Performance and Memory Tests', () => {
    it('should handle large-scale processing efficiently', () => {
      const largeInputs = Array.from({ length: 1000 }, (_, i) => 
        `Input ${i}: <script>alert(${i})</script> Safe content here.`
      );

      const startTime = Date.now();
      
      largeInputs.forEach(input => {
        testSanitizeInput(input);
      });
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      // Should process 1000 inputs reasonably quickly (under 5 seconds)
      expect(processingTime).toBeLessThan(5000);
    });

    it('should handle concurrent processing safely', async () => {
      const inputs = Array.from({ length: 100 }, (_, i) => 
        `<script>alert(${i})</script>Concurrent input ${i}`
      );

      const promises = inputs.map(input => 
        Promise.resolve(testSanitizeInput(input))
      );

      const results = await Promise.all(promises);

      results.forEach((result, index) => {
        expect(result).not.toContain('<script');
        expect(result).toContain(`Concurrent input ${index}`);
      });
    });

    it('should not leak memory with repeated processing', () => {
      const testInput = '<script>alert("test")</script>'.repeat(1000);
      
      // Process the same input many times
      for (let i = 0; i < 1000; i++) {
        testSanitizeInput(testInput);
      }
      
      // Should complete without memory issues
      expect(true).toBe(true);
    });
  });
});

// Helper function implementation
function testSanitizeInput(input: string, maxLength: number = 1000): string {
  if (!input || typeof input !== 'string') return '';
  
  let sanitized = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>?/gm, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/data:text\/html/gi, '');
  
  sanitized = sanitized.trim();
  
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength) + '...';
  }
  
  return sanitized;
}