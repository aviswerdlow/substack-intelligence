import { z } from 'zod';

// Core data schemas matching the TDD specification
export const CompanyMentionSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().nullable(),
  context: z.string(),
  sentiment: z.enum(['positive', 'negative', 'neutral']),
  confidence: z.number().min(0).max(1),
  metadata: z.object({
    sourceEmailId: z.string(),
    newsletterName: z.string(),
    extractedAt: z.string().datetime(),
    enrichedAt: z.string().datetime().optional()
  })
});

export const CompanySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  normalizedName: z.string().min(1),
  description: z.string().nullable(),
  website: z.string().url().nullable(),
  fundingStatus: z.enum(['unknown', 'bootstrapped', 'seed', 'series-a', 'series-b', 'later-stage', 'public']).nullable(),
  industry: z.array(z.string()).default([]),
  firstSeenAt: z.string().datetime(),
  lastUpdatedAt: z.string().datetime(),
  enrichmentStatus: z.enum(['pending', 'enriched', 'failed']).default('pending'),
  mentionCount: z.number().int().min(0).default(1),
  newsletterDiversity: z.number().int().min(0).default(1)
});

export const EmailSchema = z.object({
  id: z.string().uuid(),
  messageId: z.string(),
  subject: z.string(),
  sender: z.string(),
  newsletterName: z.string(),
  receivedAt: z.string().datetime(),
  processedAt: z.string().datetime(),
  rawHtml: z.string().nullable(),
  cleanText: z.string().nullable(),
  processingStatus: z.enum(['pending', 'processing', 'completed', 'failed']).default('pending'),
  errorMessage: z.string().nullable()
});

export const ExtractionResultSchema = z.object({
  companies: z.array(z.object({
    name: z.string(),
    description: z.string().nullable(),
    context: z.string(),
    sentiment: z.enum(['positive', 'negative', 'neutral']),
    confidence: z.number().min(0).max(1)
  })),
  metadata: z.object({
    processingTime: z.number(),
    tokenCount: z.number(),
    modelVersion: z.string()
  })
});

export const GmailMessageSchema = z.object({
  id: z.string(),
  threadId: z.string(),
  payload: z.object({
    headers: z.array(z.object({
      name: z.string(),
      value: z.string()
    })),
    body: z.object({
      data: z.string().optional()
    }).optional(),
    parts: z.array(z.any()).optional()
  })
});

// Type exports
export type CompanyMention = z.infer<typeof CompanyMentionSchema>;
export type Company = z.infer<typeof CompanySchema>;
export type Email = z.infer<typeof EmailSchema>;
export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;
export type GmailMessage = z.infer<typeof GmailMessageSchema>;

// Utility schemas
export const DateRangeSchema = z.object({
  from: z.date(),
  to: z.date()
});

export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20)
});

export type DateRange = z.infer<typeof DateRangeSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;