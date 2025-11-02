import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Import centralized mock factories
import { nextauthMocks } from './mocks/auth/nextauth';
import { externalServicesMocks } from './mocks/external/services';
import { gmailMocks } from './mocks/external/gmail';
import { puppeteerMocks } from './mocks/external/puppeteer';
import { axiomMocks } from './mocks/external/axiom';
import { databaseQueryMocks } from './mocks/database/queries';
import { mockSupabaseClient } from './mocks/database/supabase';
import { createMockNextRequest, createMockNextResponse } from './mocks/nextjs/server';
import { DataFixtures, SAMPLE_COMPANIES } from './mocks/fixtures/data';
import { mockUtilities } from './mocks/utils/index';

/**
 * Test suite to verify the centralized mock infrastructure works correctly.
 * This serves as both a test and a demonstration of the mock capabilities.
 */
describe('Centralized Mock Infrastructure', () => {
  afterEach(() => {
    // Reset all mocks after each test
    testUtils.resetAllTestMocks();
  });

  describe('Global Test Utilities', () => {
    it('should provide easy access to common mock scenarios', () => {
      // Test signed-out user scenario
      testUtils.mockSignedOutUser();
      expect(nextauthMocks.useAuth().isSignedIn).toBe(false);

      // Test signed-in user scenario
      const user = testUtils.mockSignedInUser({ email: 'test@example.com' });
      expect(user.email).toBe('test@example.com');
      expect(nextauthMocks.useAuth().isSignedIn).toBe(true);
    });

    it('should provide easy external service mocking', () => {
      testUtils.mockAnthropicSuccess('Test AI response');
      testUtils.mockOpenAIEmbeddingsSuccess();
      testUtils.mockResendSuccess();
      testUtils.mockGmailSuccess();
      
      // Verify mocks are configured
      expect(externalServicesMocks.createAnthropicMessage).toBeDefined();
      expect(externalServicesMocks.createOpenAIEmbedding).toBeDefined();
      expect(externalServicesMocks.sendEmail).toBeDefined();
    });
  });

  describe('Authentication Mocks (NextAuth)', () => {
    it('should handle user authentication scenarios', () => {
      // Test user creation
      const user = nextauthMocks.createTestUser({
        email: 'auth-test@example.com',
        firstName: 'Auth',
        lastName: 'Test'
      });

      expect(user.email).toBe('auth-test@example.com');
      expect(user.firstName).toBe('Auth');
      expect(user.lastName).toBe('Test');
      expect(user.id).toBeTruthy();
    });

    it('should handle organization scenarios', () => {
      const { user, organization } = nextauthMocks.mockUserWithOrganization(
        { email: 'org-user@example.com' },
        { name: 'Test Organization' }
      );

      expect(user.email).toBe('org-user@example.com');
      expect(organization.name).toBe('Test Organization');
      expect(nextauthMocks.useAuth().isSignedIn).toBe(true);
    });

    it('should handle sign in/out flows', () => {
      const user = nextauthMocks.createTestUser();
      
      // Test sign in
      nextauthMocks.signIn(user);
      expect(nextauthMocks.useAuth().isSignedIn).toBe(true);
      expect(nextauthMocks.useAuth().userId).toBe(user.id);

      // Test sign out
      nextauthMocks.signOut();
      expect(nextauthMocks.useAuth().isSignedIn).toBe(false);
      expect(nextauthMocks.useAuth().userId).toBeNull();
    });
  });

  describe('External Service Mocks', () => {
    it('should mock Anthropic AI service', async () => {
      const testResponse = JSON.stringify({
        companies: [{ name: 'Test Company', description: 'A test company' }]
      });

      externalServicesMocks.mockAnthropicSuccess(testResponse);

      const result = await externalServicesMocks.createAnthropicMessage({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        messages: [{ role: 'user', content: 'Extract companies from this text' }]
      });

      expect(result.content[0].text).toBe(testResponse);
      expect(result.model).toBe('claude-3-5-sonnet-20241022');
    });

    it('should mock OpenAI embeddings', async () => {
      // The mock returns 1536-dimensional embeddings by default
      externalServicesMocks.mockOpenAIEmbeddingsSuccess();

      const result = await externalServicesMocks.createOpenAIEmbedding({
        input: 'test text',
        model: 'text-embedding-3-small'
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].embedding).toHaveLength(1536); // Standard embedding size
      expect(result.data[0].embedding[0]).toBeTypeOf('number');
      expect(result.model).toBe('text-embedding-3-small');
    });

    it('should mock Resend email service', async () => {
      const customEmailId = 'custom-email-123';
      externalServicesMocks.mockResendSuccess(customEmailId);

      const result = await externalServicesMocks.sendEmail({
        from: 'test@example.com',
        to: 'recipient@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>'
      });

      expect(result.data?.id).toBe(customEmailId);
      expect(result.data?.from).toBe('test@example.com');
      expect(result.data?.to).toEqual(['recipient@example.com']);
    });

    it('should handle service errors', async () => {
      const customError = new Error('Service temporarily unavailable');
      externalServicesMocks.mockAnthropicError(customError);

      await expect(
        externalServicesMocks.createAnthropicMessage({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1000,
          messages: [{ role: 'user', content: 'test' }]
        })
      ).rejects.toThrow('Service temporarily unavailable');
    });
  });

  describe('Gmail API Mocks', () => {
    it('should mock OAuth2 authentication', () => {
      const customCredentials = {
        access_token: 'custom-access-token',
        refresh_token: 'custom-refresh-token',
        scope: 'https://www.googleapis.com/auth/gmail.readonly',
        token_type: 'Bearer',
        expiry_date: Date.now() + 3600000
      };

      gmailMocks.mockSuccessfulAuth(customCredentials);
      
      const credentials = gmailMocks.getCredentials();
      expect(credentials.access_token).toBe('custom-access-token');
      expect(credentials.refresh_token).toBe('custom-refresh-token');
    });

    it('should mock message listing and retrieval', async () => {
      gmailMocks.mockMessagesListSuccess({
        messages: [
          { id: 'msg-1', threadId: 'thread-1' },
          { id: 'msg-2', threadId: 'thread-2' }
        ],
        resultSizeEstimate: 2
      });

      gmailMocks.mockMessageGetSuccess({
        id: 'msg-1',
        payload: {
          headers: [
            { name: 'From', value: 'newsletter@substack.com' },
            { name: 'Subject', value: 'Test Newsletter' }
          ]
        }
      });

      const listResult = await gmailMocks.listMessages({
        userId: 'me',
        q: 'from:substack.com'
      });

      expect(listResult.data.messages).toHaveLength(2);
      expect(listResult.data.resultSizeEstimate).toBe(2);

      const messageResult = await gmailMocks.getMessage({
        userId: 'me',
        id: 'msg-1'
      });

      expect(messageResult.data.id).toBe('msg-1');
      expect(messageResult.data.payload.headers).toContainEqual({
        name: 'Subject',
        value: 'Test Newsletter'
      });
    });
  });

  describe('Puppeteer Mocks', () => {
    it('should mock browser launch and PDF generation', async () => {
      const customPdfContent = Buffer.from('custom-pdf-content');
      puppeteerMocks.mockSuccessfulLaunch();
      puppeteerMocks.mockPDFGeneration(customPdfContent);

      const browser = await puppeteerMocks.launch({ headless: true });
      const page = await browser.newPage();
      
      await page.setContent('<html><body><h1>Test PDF</h1></body></html>');
      const pdf = await page.pdf({ format: 'A4' });

      expect(pdf).toEqual(customPdfContent);
      
      await page.close();
      await browser.close();
    });

    it('should handle browser launch failures', async () => {
      const launchError = new Error('Chrome not found');
      puppeteerMocks.mockLaunchError(launchError);

      await expect(puppeteerMocks.launch()).rejects.toThrow('Chrome not found');
    });
  });

  describe('Axiom Logging Mocks', () => {
    beforeEach(() => {
      axiomMocks.clearCollectedData();
    });

    it('should collect and track logs', async () => {
      axiomMocks.mockSuccessfulLogging();

      await axiomMocks.log('Test info message', { userId: '123' }, 'info');
      await axiomMocks.logError(new Error('Test error'), { context: 'testing' });
      await axiomMocks.logBusinessMetric('user.signup', 1, 'count');

      expect(axiomMocks.getLogCount()).toBe(1);
      expect(axiomMocks.getErrorCount()).toBe(1);
      expect(axiomMocks.getMetricCount()).toBe(1);
      
      expect(axiomMocks.assertLoggedMessage('Test info message')).toBe(true);
      expect(axiomMocks.assertLoggedError('Test error')).toBe(true);
      expect(axiomMocks.assertLoggedMetric('business.user.signup')).toBe(true);
    });

    it('should handle logging failures', async () => {
      const loggingError = new Error('Axiom service unavailable');
      axiomMocks.mockLoggingError(loggingError);

      await expect(
        axiomMocks.log('This should fail')
      ).rejects.toThrow('Axiom service unavailable');
    });
  });

  describe('Database Mocks', () => {
    it('should mock Supabase client operations', async () => {
      // Test chainable query builder
      const result = await mockSupabaseClient
        .from('companies')
        .select('*')
        .eq('id', 'test-id')
        .single();

      expect(result).toEqual({ data: null, error: null });
    });

    it('should mock database query functions', async () => {
      const mockCompanies = [
        { id: '1', name: 'Mock Company A', funding_status: 'Series A' },
        { id: '2', name: 'Mock Company B', funding_status: 'Seed' }
      ];

      databaseQueryMocks.mockResolvedValue('getCompanies', mockCompanies);

      const companies = await databaseQueryMocks.getCompanies();
      expect(companies).toEqual(mockCompanies);
      expect(companies).toHaveLength(2);
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Connection timeout');
      databaseQueryMocks.mockRejectedValue('getCompanyById', dbError);

      await expect(
        databaseQueryMocks.getCompanyById('invalid-id')
      ).rejects.toThrow('Connection timeout');
    });
  });

  describe('Next.js Mocks', () => {
    it('should mock NextRequest and NextResponse', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: { data: 'test' }
      });

      expect(request.url).toBe('http://localhost:3000/api/test');
      expect(request.method).toBe('POST');
      expect(request.headers.get('content-type')).toBe('application/json');

      const body = await request.json();
      expect(body).toEqual({ data: 'test' });

      const response = createMockNextResponse();
      response.json({ success: true }, { status: 201 });

      expect(response.status).toBe(201);
      expect(await response.getBody()).toEqual({ success: true });
    });
  });

  describe('Test Data Fixtures', () => {
    it('should provide sample data', () => {
      expect(SAMPLE_COMPANIES).toHaveLength(5);
      
      const glossier = SAMPLE_COMPANIES.find(c => c.name === 'Glossier');
      expect(glossier).toBeDefined();
      expect(glossier?.industry).toBe('Beauty & Personal Care');
      expect(glossier?.funding_status).toBe('Series D');
    });

    it('should create custom test data', () => {
      const customCompany = DataFixtures.createCompany({
        name: 'Custom Test Company',
        industry: 'Technology',
        funding_status: 'Series B'
      });

      expect(customCompany.name).toBe('Custom Test Company');
      expect(customCompany.industry).toBe('Technology');
      expect(customCompany.funding_status).toBe('Series B');
      expect(customCompany.id).toBeTruthy();
      expect(customCompany.created_at).toBeTruthy();
    });

    it('should create bulk test data', () => {
      const companies = DataFixtures.createCompanies(3, {
        industry: 'Healthcare'
      });

      expect(companies).toHaveLength(3);
      companies.forEach(company => {
        expect(company.industry).toBe('Healthcare');
        expect(company.id).toBeTruthy();
      });
    });

    it('should create test scenarios', () => {
      const scenario = DataFixtures.createScenario('medium');
      
      expect(scenario.companies).toHaveLength(10);
      expect(scenario.emails).toHaveLength(20);
      expect(scenario.intelligence).toHaveLength(35);
      expect(scenario.users).toBeDefined();
      expect(scenario.newsletters).toBeDefined();
    });
  });

  describe('Mock Utilities', () => {
    it('should provide utility functions', () => {
      const { mockUtils } = mockUtilities;
      
      // Test partial mock creation
      const base = { a: 1, b: 2, c: 3 };
      const partial = mockUtils.createPartialMock(base, { b: 20, d: 4 } as any);
      expect(partial).toEqual({ a: 1, b: 20, c: 3, d: 4 });

      // Test ID generation
      const id = mockUtils.generateMockId('test');
      expect(id).toMatch(/^test-\d+-[a-z0-9]+$/);

      // Test email generation
      const email = mockUtils.generateMockEmail('testdomain.com');
      expect(email).toMatch(/^user[a-z0-9]+@testdomain\.com$/);
    });

    it('should handle deep cloning and merging', () => {
      const { mockUtils } = mockUtilities;
      
      const original = {
        a: 1,
        b: { c: 2, d: { e: 3 } },
        f: [4, 5, { g: 6 }]
      };

      const cloned = mockUtils.deepClone(original);
      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.b).not.toBe(original.b);
      expect(cloned.f).not.toBe(original.f);

      const merged = mockUtils.deepMerge(original, {
        b: { d: { e: 30 } },
        h: 'new'
      } as any);

      expect(merged.a).toBe(1);
      expect(merged.b.c).toBe(2);
      expect(merged.b.d.e).toBe(30);
      expect((merged as any).h).toBe('new');
    });
  });

  describe('Integration Testing', () => {
    it('should support complex test scenarios', async () => {
      // Set up authenticated user with organization
      const { user, organization } = nextauthMocks.mockUserWithOrganization(
        { email: 'integration@example.com' },
        { name: 'Integration Test Org' }
      );

      // Mock external services
      externalServicesMocks.mockAnthropicSuccess(JSON.stringify({
        companies: [
          { name: 'Discovered Company', description: 'Found via AI' }
        ]
      }));
      
      externalServicesMocks.mockResendSuccess('integration-email-123');
      axiomMocks.mockSuccessfulLogging();

      // Mock database responses
      const testCompanies = DataFixtures.createCompanies(2);
      databaseQueryMocks.mockResolvedValue('getCompanies', testCompanies);

      // Simulate a complex workflow
      const companies = await databaseQueryMocks.getCompanies();
      expect(companies).toHaveLength(2);

      const aiResult = await externalServicesMocks.createAnthropicMessage({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        messages: [{ role: 'user', content: 'Analyze companies' }]
      });

      const parsedResult = JSON.parse(aiResult.content[0].text);
      expect(parsedResult.companies).toHaveLength(1);
      expect(parsedResult.companies[0].name).toBe('Discovered Company');

      await axiomMocks.logBusinessMetric('companies.analyzed', 3);
      expect(axiomMocks.assertLoggedMetric('business.companies.analyzed')).toBe(true);

      const emailResult = await externalServicesMocks.sendEmail({
        from: 'system@example.com',
        to: user.emailAddress!,
        subject: 'Analysis Complete',
        html: '<p>Your analysis is ready</p>'
      });

      expect(emailResult.data?.id).toBe('integration-email-123');
      
      // Verify all mocks were called appropriately
      expect(nextauthMocks.useAuth().isSignedIn).toBe(true);
      expect(nextauthMocks.useAuth().userId).toBe(user.id);
      expect(databaseQueryMocks.getCompanies).toHaveBeenCalled();
      expect(externalServicesMocks.createAnthropicMessage).toHaveBeenCalled();
      expect(externalServicesMocks.sendEmail).toHaveBeenCalled();
    });
  });
});