import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  EmailSchema,
  URLSchema,
  NewsletterNameSchema,
  CompanyNameSchema,
  UserIdSchema,
  OrganizationIdSchema,
  PaginationSchema,
  DateRangeSchema,
  SearchQuerySchema,
  FileUploadSchema,
  sanitizeInput,
  validateAgainstSQLInjection,
  createRateLimitKey,
  generateNonce,
  validateRequest,
  detectSensitiveData,
  redactSensitiveData,
  SENSITIVE_PATTERNS
} from '@/lib/security/validation';
import { z } from 'zod';

// Mock crypto is already set up in test setup

describe('Security Validation Schemas', () => {
  describe('EmailSchema', () => {
    it('should validate correct email addresses', () => {
      const validEmails = [
        'user@example.com',
        'john.doe+tag@company.org',
        'admin123@test.co.uk'
      ];

      validEmails.forEach(email => {
        expect(() => EmailSchema.parse(email)).not.toThrow();
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        'user@.com',
        'user@example',
        'a'.repeat(255) + '@example.com' // Too long
      ];

      invalidEmails.forEach(email => {
        expect(() => EmailSchema.parse(email)).toThrow();
      });
    });
  });

  describe('URLSchema', () => {
    it('should validate correct URLs', () => {
      const validURLs = [
        'https://example.com',
        'http://subdomain.example.org',
        'https://example.com/path/to/resource?query=value',
        'https://example.com:8080'
      ];

      validURLs.forEach(url => {
        expect(() => URLSchema.parse(url)).not.toThrow();
      });
    });

    it('should reject invalid URLs', () => {
      const invalidURLs = [
        'not a url',
        'example.com', // Missing protocol
        'ftp://example.com', // Wrong protocol
        'https://' + 'a'.repeat(2050) + '.com' // Too long
      ];

      invalidURLs.forEach(url => {
        expect(() => URLSchema.parse(url)).toThrow();
      });
    });
  });

  describe('NewsletterNameSchema', () => {
    it('should validate correct newsletter names', () => {
      const validNames = [
        'TechCrunch',
        'Morning Brew',
        'The_Daily_Newsletter',
        'News-Letter.123'
      ];

      validNames.forEach(name => {
        expect(() => NewsletterNameSchema.parse(name)).not.toThrow();
      });
    });

    it('should reject invalid newsletter names', () => {
      const invalidNames = [
        '', // Empty
        'Newsletter@#$', // Invalid characters
        'a'.repeat(101), // Too long
        'News;Letter' // SQL injection character
      ];

      invalidNames.forEach(name => {
        expect(() => NewsletterNameSchema.parse(name)).toThrow();
      });
    });
  });

  describe('CompanyNameSchema', () => {
    it('should validate correct company names', () => {
      const validNames = [
        'Apple Inc.',
        "O'Reilly Media",
        'Smith & Associates',
        'Tech-Co, LLC',
        '3M Company'
      ];

      validNames.forEach(name => {
        expect(() => CompanyNameSchema.parse(name)).not.toThrow();
      });
    });

    it('should reject invalid company names', () => {
      const invalidNames = [
        '',
        'Company<script>', // XSS attempt
        'a'.repeat(201), // Too long
        'Company; DROP TABLE--' // SQL injection
      ];

      invalidNames.forEach(name => {
        expect(() => CompanyNameSchema.parse(name)).toThrow();
      });
    });
  });

  describe('UserIdSchema', () => {
    it('should validate correct user IDs', () => {
      const validIds = [
        'user_123abc',
        'user_ABC123',
        'user_0000000001'
      ];

      validIds.forEach(id => {
        expect(() => UserIdSchema.parse(id)).not.toThrow();
      });
    });

    it('should reject invalid user IDs', () => {
      const invalidIds = [
        'user123', // Missing underscore
        'usr_123', // Wrong prefix
        'user_123-abc', // Invalid character
        '123_user' // Wrong format
      ];

      invalidIds.forEach(id => {
        expect(() => UserIdSchema.parse(id)).toThrow();
      });
    });
  });

  describe('OrganizationIdSchema', () => {
    it('should validate correct organization IDs', () => {
      const validIds = [
        'org_123abc',
        'org_XYZ789',
        'org_0000000001'
      ];

      validIds.forEach(id => {
        expect(() => OrganizationIdSchema.parse(id)).not.toThrow();
      });
    });

    it('should reject invalid organization IDs', () => {
      const invalidIds = [
        'org123',
        'organization_123',
        'org_123-abc',
        'org_'
      ];

      invalidIds.forEach(id => {
        expect(() => OrganizationIdSchema.parse(id)).toThrow();
      });
    });
  });

  describe('PaginationSchema', () => {
    it('should parse and validate pagination params', () => {
      const result = PaginationSchema.parse({
        page: '2',
        limit: '50'
      });

      expect(result).toEqual({
        page: 2,
        limit: 50
      });
    });

    it('should use default values', () => {
      const result = PaginationSchema.parse({});

      expect(result).toEqual({
        page: 1,
        limit: 20
      });
    });

    it('should enforce limits', () => {
      expect(() => PaginationSchema.parse({ page: 1001 })).toThrow();
      expect(() => PaginationSchema.parse({ limit: 101 })).toThrow();
      expect(() => PaginationSchema.parse({ page: 0 })).toThrow();
      expect(() => PaginationSchema.parse({ limit: 0 })).toThrow();
    });
  });

  describe('DateRangeSchema', () => {
    it('should validate valid date ranges', () => {
      const validRange = {
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z'
      };

      expect(() => DateRangeSchema.parse(validRange)).not.toThrow();
    });

    it('should reject invalid date ranges', () => {
      const invalidRange = {
        startDate: '2024-12-31T00:00:00Z',
        endDate: '2024-01-01T00:00:00Z' // End before start
      };

      expect(() => DateRangeSchema.parse(invalidRange)).toThrow('Start date must be before end date');
    });

    it('should allow optional dates', () => {
      expect(() => DateRangeSchema.parse({})).not.toThrow();
      expect(() => DateRangeSchema.parse({ startDate: '2024-01-01T00:00:00Z' })).not.toThrow();
      expect(() => DateRangeSchema.parse({ endDate: '2024-12-31T00:00:00Z' })).not.toThrow();
    });
  });

  describe('SearchQuerySchema', () => {
    it('should validate valid search queries', () => {
      const validQueries = [
        'simple search',
        'Company Name',
        'search-with-hyphens',
        'search_with_underscores',
        "O'Reilly",
        'Smith & Jones',
        '(grouped terms)'
      ];

      validQueries.forEach(query => {
        expect(() => SearchQuerySchema.parse(query)).not.toThrow();
      });
    });

    it('should reject invalid search queries', () => {
      const invalidQueries = [
        '', // Empty
        'a'.repeat(501), // Too long
        'search; DROP TABLE', // SQL injection
        'search<script>', // XSS attempt
        'search/*comment*/' // SQL comment
      ];

      invalidQueries.forEach(query => {
        expect(() => SearchQuerySchema.parse(query)).toThrow();
      });
    });
  });

  describe('FileUploadSchema', () => {
    it('should validate valid file uploads', () => {
      const validFile = {
        filename: 'document.pdf',
        mimetype: 'application/pdf' as const,
        size: 1024 * 1024 // 1MB
      };

      expect(() => FileUploadSchema.parse(validFile)).not.toThrow();
    });

    it('should reject invalid file uploads', () => {
      expect(() => FileUploadSchema.parse({
        filename: '',
        mimetype: 'application/pdf',
        size: 1024
      })).toThrow();

      expect(() => FileUploadSchema.parse({
        filename: 'file.exe',
        mimetype: 'application/exe' as any,
        size: 1024
      })).toThrow();

      expect(() => FileUploadSchema.parse({
        filename: 'huge.pdf',
        mimetype: 'application/pdf',
        size: 11 * 1024 * 1024 // 11MB
      })).toThrow();
    });
  });
});

describe('Security Functions', () => {
  describe('sanitizeInput', () => {
    it('should remove XSS vectors', () => {
      const input = '<script>alert("XSS")</script>Hello';
      const result = sanitizeInput(input);
      
      expect(result).toBe('script>alert("XSS")/script>Hello');
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });

    it('should trim whitespace', () => {
      const input = '  hello world  ';
      const result = sanitizeInput(input);
      
      expect(result).toBe('hello world');
    });

    it('should limit length to 1000 characters', () => {
      const input = 'a'.repeat(2000);
      const result = sanitizeInput(input);
      
      expect(result.length).toBe(1000);
    });
  });

  describe('validateAgainstSQLInjection', () => {
    it('should detect SQL injection attempts', () => {
      const injectionAttempts = [
        "'; DROP TABLE users--",
        "1' OR '1'='1",
        'SELECT * FROM users',
        'INSERT INTO table VALUES',
        'UPDATE users SET admin=true',
        'DELETE FROM posts',
        'UNION SELECT password',
        '/* comment */ SELECT',
        '-- comment',
        '1 OR 1=1',
        '1 AND 1=1'
      ];

      injectionAttempts.forEach(attempt => {
        expect(validateAgainstSQLInjection(attempt)).toBe(false);
      });
    });

    it('should allow safe inputs', () => {
      const safeInputs = [
        'normal search term',
        'Company Name',
        'user@example.com',
        '123 Main Street',
        'Product #1234'
      ];

      safeInputs.forEach(input => {
        expect(validateAgainstSQLInjection(input)).toBe(true);
      });
    });
  });

  describe('createRateLimitKey', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T10:30:45Z'));
    });

    it('should create minute-based rate limit keys', () => {
      const key = createRateLimitKey('user123', 'api/endpoint', 'minute');
      expect(key).toBe('ratelimit:user123:api/endpoint:2024-0-15-10-30');
    });

    it('should create hour-based rate limit keys', () => {
      const key = createRateLimitKey('user123', 'api/endpoint', 'hour');
      expect(key).toBe('ratelimit:user123:api/endpoint:2024-0-15-10');
    });

    it('should create day-based rate limit keys', () => {
      const key = createRateLimitKey('user123', 'api/endpoint', 'day');
      expect(key).toBe('ratelimit:user123:api/endpoint:2024-0-15');
    });

    it('should default to minute window', () => {
      const key = createRateLimitKey('user123', 'api/endpoint');
      expect(key).toContain('2024-0-15-10-30');
    });

    vi.useRealTimers();
  });

  describe('generateNonce', () => {
    it('should generate different nonces', () => {
      const nonce1 = generateNonce();
      const nonce2 = generateNonce();
      
      expect(nonce1).not.toBe(nonce2);
      expect(nonce1).toMatch(/^[A-Za-z0-9+/=]+$/); // Base64 pattern
      expect(nonce2).toMatch(/^[A-Za-z0-9+/=]+$/);
    });

    it('should generate nonces of consistent length', () => {
      const nonces = Array(10).fill(null).map(() => generateNonce());
      const lengths = nonces.map(n => n.length);
      
      // All nonces should have the same length
      expect(new Set(lengths).size).toBe(1);
    });
  });

  describe('validateRequest', () => {
    it('should validate valid data', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number()
      });

      const validator = validateRequest(schema);
      const result = validator({ name: 'John', age: 30 });
      
      expect(result).toEqual({ name: 'John', age: 30 });
    });

    it('should throw on invalid data', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number()
      });

      const validator = validateRequest(schema);
      
      expect(() => validator({ name: 'John', age: 'thirty' }))
        .toThrow('Validation failed');
    });

    it('should include error messages', () => {
      const schema = z.object({
        email: z.string().email('Invalid email format')
      });

      const validator = validateRequest(schema);
      
      expect(() => validator({ email: 'notanemail' }))
        .toThrow('Invalid email format');
    });
  });

  describe('detectSensitiveData', () => {
    it('should detect email addresses', () => {
      expect(detectSensitiveData('Contact: user@example.com')).toBe(true);
      expect(detectSensitiveData('Email is test123@domain.org')).toBe(true);
    });

    it('should detect phone numbers', () => {
      expect(detectSensitiveData('Call me at 555-123-4567')).toBe(true);
      expect(detectSensitiveData('Phone: +1 (555) 123-4567')).toBe(true);
      expect(detectSensitiveData('Number: 5551234567')).toBe(true);
    });

    it('should detect SSN patterns', () => {
      expect(detectSensitiveData('SSN: 123-45-6789')).toBe(true);
      expect(detectSensitiveData('Social: 123456789')).toBe(true);
    });

    it('should detect credit card patterns', () => {
      expect(detectSensitiveData('Card: 1234 5678 9012 3456')).toBe(true);
      expect(detectSensitiveData('CC: 1234-5678-9012-3456')).toBe(true);
    });

    it('should detect API key patterns', () => {
      expect(detectSensitiveData('Key: ' + 'a'.repeat(32))).toBe(true);
      expect(detectSensitiveData('Token: ' + 'A1B2C3D4'.repeat(5))).toBe(true);
    });

    it('should not detect normal text', () => {
      expect(detectSensitiveData('This is normal text')).toBe(false);
      expect(detectSensitiveData('Product ID: 12345')).toBe(false);
    });
  });

  describe('redactSensitiveData', () => {
    it('should redact email addresses', () => {
      const text = 'Contact user@example.com for info';
      const result = redactSensitiveData(text);
      
      expect(result).toBe('Contact [REDACTED_EMAIL] for info');
    });

    it('should redact phone numbers', () => {
      const text = 'Call 555-123-4567 for support';
      const result = redactSensitiveData(text);
      
      expect(result).toBe('Call [REDACTED_PHONE] for support');
    });

    it('should redact SSNs', () => {
      const text = 'SSN: 123-45-6789';
      const result = redactSensitiveData(text);
      
      expect(result).toBe('SSN: [REDACTED_SSN]');
    });

    it('should redact credit cards', () => {
      const text = 'Payment: 1234 5678 9012 3456';
      const result = redactSensitiveData(text);
      
      expect(result).toBe('Payment: [REDACTED_CREDITCARD]');
    });

    it('should redact API keys', () => {
      const text = 'API Key: ' + 'a1b2c3d4'.repeat(4);
      const result = redactSensitiveData(text);
      
      expect(result).toBe('API Key: [REDACTED_APIKEY]');
    });

    it('should redact multiple sensitive items', () => {
      const text = 'Email: user@example.com, Phone: 555-123-4567';
      const result = redactSensitiveData(text);
      
      expect(result).toBe('Email: [REDACTED_EMAIL], Phone: [REDACTED_PHONE]');
    });

    it('should preserve non-sensitive text', () => {
      const text = 'This is a normal message with no sensitive data';
      const result = redactSensitiveData(text);
      
      expect(result).toBe(text);
    });
  });

  describe('SENSITIVE_PATTERNS', () => {
    it('should have correct pattern keys', () => {
      const expectedKeys = ['email', 'phone', 'ssn', 'creditCard', 'apiKey'];
      const actualKeys = Object.keys(SENSITIVE_PATTERNS);
      
      expect(actualKeys).toEqual(expectedKeys);
    });

    it('should have global regex flags', () => {
      Object.values(SENSITIVE_PATTERNS).forEach(pattern => {
        expect(pattern.global).toBe(true);
      });
    });
  });
});