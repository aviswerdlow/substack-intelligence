/**
 * Report Services (Fixed) - Mock Infrastructure Validation Tests
 * 
 * This test file validates that the centralized mock infrastructure from Issue #20
 * is working correctly for all external services used by the report services.
 * 
 * Tests validate that global mocks from tests/setup.ts work properly:
 * - Puppeteer: PDF generation functionality
 * - Resend: Email sending functionality  
 * - Anthropic SDK: AI processing functionality
 * - OpenAI SDK: Embeddings functionality
 * - Database functions: Data retrieval functionality
 * - Supabase client: Database operations
 * 
 * These tests ensure the mock infrastructure supports the report services
 * and help identify any issues with the centralized mock setup.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// This file tests the centralized mock infrastructure to ensure
// all external services are properly mocked for report services

describe('Report Services (Fixed)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Mock Infrastructure Validation', () => {
    it('should have puppeteer mocked globally', async () => {
      const puppeteer = await import('puppeteer');
      expect(puppeteer.default.launch).toBeDefined();
      
      const browser = await puppeteer.default.launch();
      const page = await browser.newPage();
      
      expect(page.setContent).toBeDefined();
      expect(page.pdf).toBeDefined();
      expect(page.close).toBeDefined();
      
      const pdfBuffer = await page.pdf();
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.toString()).toBe('mock-pdf-content');
    });

    it('should have Resend mocked globally', async () => {
      const { Resend } = await import('resend');
      const resendClient = new Resend('test-key');
      
      expect(resendClient.emails.send).toBeDefined();
      
      const result = await resendClient.emails.send({
        from: 'test@example.com',
        to: 'recipient@example.com',
        subject: 'Test',
        html: '<p>Test</p>'
      });
      
      expect(result.data).toEqual(expect.objectContaining({
        id: expect.any(String),
        from: expect.any(String),
        to: expect.any(Array)
      }));
    });

    it('should have Anthropic SDK mocked globally', async () => {
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      const client = new Anthropic({ apiKey: 'test-key' });
      
      expect(client.messages.create).toBeDefined();
      
      const response = await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        messages: [{ role: 'user', content: 'Test message' }]
      });
      
      expect(response.id).toBe('msg_test_id');
      expect(response.content).toEqual(expect.arrayContaining([
        expect.objectContaining({
          type: 'text',
          text: expect.any(String)
        })
      ]));
    });

    it('should have OpenAI SDK mocked globally', async () => {
      const { default: OpenAI } = await import('openai');
      const client = new OpenAI({ apiKey: 'test-key' });
      
      expect(client.embeddings.create).toBeDefined();
      
      const response = await client.embeddings.create({
        model: 'text-embedding-3-small',
        input: 'Test text',
        dimensions: 1536
      });
      
      expect(response.object).toBe('list');
      expect(response.data).toHaveLength(1);
      expect(response.data[0].embedding).toHaveLength(1536);
    });

    it('should have database functions mocked globally', async () => {
      const { getDailyIntelligence, createServiceRoleClient } = await import('@substack-intelligence/database');
      
      expect(getDailyIntelligence).toBeDefined();
      const dailyData = await getDailyIntelligence({} as any, { limit: 100, days: 1 });
      
      expect(Array.isArray(dailyData)).toBe(true);
      expect(dailyData.length).toBeGreaterThan(0);
      expect(dailyData[0]).toEqual(expect.objectContaining({
        company_id: expect.any(String),
        name: expect.any(String),
        description: expect.any(String)
      }));

      const client = createServiceRoleClient();
      expect(client.from).toBeDefined();
      
      const queryBuilder = client.from('companies');
      expect(queryBuilder.select).toBeDefined();
      expect(queryBuilder.insert).toBeDefined();
    });

    it('should have Supabase client mocked globally', async () => {
      const { createClient } = await import('@supabase/supabase-js');
      const client = createClient('https://test.supabase.co', 'test-key');
      
      expect(client.from).toBeDefined();
      
      const queryBuilder = client.from('test_table');
      expect(queryBuilder.select).toBeDefined();
      expect(queryBuilder.insert).toBeDefined();
      expect(queryBuilder.eq).toBeDefined();
      
      // Test chainable methods
      const chainedBuilder = queryBuilder.select('*').eq('id', '123');
      expect(chainedBuilder.single).toBeDefined();
      
      const result = await chainedBuilder.single();
      expect(result).toEqual({ data: null, error: null });
    });
  });

  describe('Integration Tests', () => {
    it('should integrate all mocks for a complete workflow', async () => {
      // Test a complete workflow that uses all the mocked services
      const puppeteer = await import('puppeteer');
      const { Resend } = await import('resend');
      const { getDailyIntelligence } = await import('@substack-intelligence/database');
      
      // Get data
      const dailyData = await getDailyIntelligence({} as any, { limit: 100, days: 1 });
      expect(dailyData).toHaveLength(1);
      
      // Generate PDF
      const browser = await puppeteer.default.launch();
      const page = await browser.newPage();
      await page.setContent('<h1>Daily Report</h1>');
      const pdfBuffer = await page.pdf();
      await page.close();
      await browser.close();
      
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      
      // Send email
      const resend = new Resend('test-key');
      const emailResult = await resend.emails.send({
        from: 'reports@example.com',
        to: 'recipient@example.com',
        subject: 'Daily Intelligence Report',
        html: '<h1>Daily Report</h1>'
      });
      
      expect(emailResult.data).toEqual(expect.objectContaining({
        id: expect.any(String)
      }));
    });
  });
});