import { z } from 'zod';

// Enhanced input validation schemas
export const EmailSchema = z.string().email().max(254);
export const URLSchema = z.string().url().max(2048);

export const NewsletterNameSchema = z
  .string()
  .min(1, 'Newsletter name is required')
  .max(100, 'Newsletter name too long')
  .regex(/^[a-zA-Z0-9\s\-_.]+$/, 'Invalid characters in newsletter name');

export const CompanyNameSchema = z
  .string()
  .min(1, 'Company name is required')
  .max(200, 'Company name too long')
  .regex(/^[a-zA-Z0-9\s\-_.,'&]+$/, 'Invalid characters in company name');

export const UserIdSchema = z
  .string()
  .regex(/^user_[a-zA-Z0-9]+$/, 'Invalid user ID format');

export const OrganizationIdSchema = z
  .string()
  .regex(/^org_[a-zA-Z0-9]+$/, 'Invalid organization ID format');

// API request validation
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export const DateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return new Date(data.startDate) <= new Date(data.endDate);
  }
  return true;
}, 'Start date must be before end date');

// Search query validation
export const SearchQuerySchema = z
  .string()
  .min(1, 'Search query cannot be empty')
  .max(500, 'Search query too long')
  .regex(/^[a-zA-Z0-9\s\-_.,'&()]+$/, 'Invalid characters in search query');

// File upload validation
export const FileUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  mimetype: z.enum(['application/pdf', 'text/plain', 'text/csv']),
  size: z.number().max(10 * 1024 * 1024) // 10MB max
});

// SQL injection prevention patterns
const DANGEROUS_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC)\b)/i,
  /['"`;\\]/,
  /(--|\/\*|\*\/)/,
  /\b(OR|AND)\b\s+\d+\s*=\s*\d+/i
];

export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential XSS vectors
    .slice(0, 1000); // Limit length
}

export function validateAgainstSQLInjection(input: string): boolean {
  return !DANGEROUS_PATTERNS.some(pattern => pattern.test(input));
}

// Rate limiting helpers
export function createRateLimitKey(
  identifier: string, 
  endpoint: string, 
  timeWindow: 'minute' | 'hour' | 'day' = 'minute'
): string {
  const now = new Date();
  let windowStart: string;
  
  switch (timeWindow) {
    case 'minute':
      windowStart = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;
      break;
    case 'hour':
      windowStart = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}`;
      break;
    case 'day':
      windowStart = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
      break;
  }
  
  return `ratelimit:${identifier}:${endpoint}:${windowStart}`;
}

// Content Security Policy helpers
export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode.apply(null, Array.from(array)));
}

// Input validation middleware
export function validateRequest<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): T => {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation failed: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  };
}

// Sensitive data detection
export const SENSITIVE_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b(\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g,
  ssn: /\b\d{3}-?\d{2}-?\d{4}\b/g,
  creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  apiKey: /\b[A-Za-z0-9]{32,}\b/g
};

export function detectSensitiveData(text: string): boolean {
  return Object.values(SENSITIVE_PATTERNS).some(pattern => pattern.test(text));
}

export function redactSensitiveData(text: string): string {
  let redacted = text;
  
  Object.entries(SENSITIVE_PATTERNS).forEach(([type, pattern]) => {
    redacted = redacted.replace(pattern, `[REDACTED_${type.toUpperCase()}]`);
  });
  
  return redacted;
}