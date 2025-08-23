import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CompanyEnrichmentService } from '../../services/enrichment/src/company-enrichment';

// Mock dependencies
const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis()
  }))
};

vi.mock('@substack-intelligence/database', () => ({
  createServiceRoleClient: vi.fn(() => mockSupabaseClient)
}));

// Mock axiom logger
const mockAxiomLogger = {
  log: vi.fn(),
  logError: vi.fn()
};

vi.mock('../../../apps/web/lib/monitoring/axiom', () => ({
  axiomLogger: mockAxiomLogger
}));

// Mock rate limiting
const mockBurstProtection = {
  checkBurstLimit: vi.fn()
};

vi.mock('../../../apps/web/lib/security/rate-limiting', () => ({
  burstProtection: mockBurstProtection
}));

// Mock fetch globally
global.fetch = vi.fn();
const mockFetch = global.fetch as any;

// Mock crypto for CSRF tokens
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: vi.fn()
  }
});

// Mock setTimeout and clearTimeout
global.setTimeout = vi.fn((fn, delay) => {
  if (typeof fn === 'function') fn();
  return 123 as any;
});
global.clearTimeout = vi.fn();

// Test data
const mockCompany = {
  id: 'company_123',
  name: 'Test Company',
  website: 'https://testcompany.com',
  description: 'A test company',
  created_at: '2024-01-01T00:00:00Z'
};

const mockEnrichedCompany = {
  id: 'company_123',
  name: 'Test Company',
  website: 'https://testcompany.com',
  description: 'Enhanced description from website',
  industry: 'Technology',
  location: 'United States',
  employeeCount: 50,
  foundedYear: 2020,
  social: {
    linkedin: 'https://www.linkedin.com/company/testcompany',
    twitter: 'https://twitter.com/testcompany'
  },
  validation: {
    websiteValid: true,
    statusCode: 200,
    responseTime: 1500,
    sslValid: true,
    redirects: [],
    domainAge: 4
  },
  metrics: {
    techStack: ['React', 'Next.js', 'Stripe']
  },
  confidence: 85,
  lastEnriched: expect.any(Date)
};

describe('CompanyEnrichmentService', () => {
  let service: CompanyEnrichmentService;

  beforeEach(() => {
    service = new CompanyEnrichmentService();
    vi.clearAllMocks();
    
    // Default mocks
    mockBurstProtection.checkBurstLimit.mockResolvedValue(true);
    mockSupabaseClient.from().single.mockResolvedValue({
      data: mockCompany,
      error: null
    });
    mockSupabaseClient.from().update.mockResolvedValue({
      data: mockEnrichedCompany,
      error: null
    });
    
    // Mock successful fetch responses
    mockFetch.mockImplementation((url: string, options: any) => {
      if (options?.method === 'HEAD') {
        return Promise.resolve({
          status: 200,
          url: url,
          headers: new Map([
            ['server', 'nginx'],
            ['content-type', 'text/html']
          ])
        });
      }
      
      return Promise.resolve({
        ok: true,
        status: 200,
        url: url,
        text: () => Promise.resolve(`
          <html>
            <head>
              <title>Test Company - Leading Technology Solutions</title>
              <meta name="description" content="We provide cutting-edge software solutions for businesses">
            </head>
            <body>
              <script src="https://js.stripe.com/v3/"></script>
              <script src="/_next/static/chunks/main.js"></script>
              <a href="https://linkedin.com/company/testcompany">LinkedIn</a>
              <a href="https://twitter.com/testcompany">Twitter</a>
            </body>
          </html>
        `),
        headers: new Map([
          ['server', 'nginx'],
          ['x-powered-by', 'Next.js']
        ])
      });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('enrichCompany', () => {
    it('should enrich company successfully with all data sources', async () => {
      const result = await service.enrichCompany('company_123');

      expect(mockBurstProtection.checkBurstLimit).toHaveBeenCalledWith(
        'enrichment-service',
        'company-enrichment',
        10,
        '1h'
      );

      expect(mockAxiomLogger.log).toHaveBeenCalledWith(
        'company-enrichment',
        'enrichment_started',
        expect.objectContaining({
          companyId: 'company_123'
        })
      );

      expect(result).toMatchObject({
        id: 'company_123',
        name: 'Test Company',
        website: 'https://testcompany.com',
        description: expect.any(String),
        industry: expect.any(String),
        validation: expect.objectContaining({
          websiteValid: true
        }),
        social: expect.any(Object),
        confidence: expect.any(Number),
        lastEnriched: expect.any(Date)
      });

      expect(mockAxiomLogger.log).toHaveBeenCalledWith(
        'company-enrichment',
        'enrichment_completed',
        expect.objectContaining({
          companyId: 'company_123',
          confidence: expect.any(Number)
        })
      );
    });

    it('should handle rate limiting gracefully', async () => {
      mockBurstProtection.checkBurstLimit.mockResolvedValue(false);

      await expect(service.enrichCompany('company_123'))
        .rejects.toThrow('Company enrichment rate limit exceeded');

      expect(mockAxiomLogger.logError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          operation: 'company-enrichment',
          companyId: 'company_123'
        })
      );
    });

    it('should handle company not found error', async () => {
      mockSupabaseClient.from().single.mockResolvedValue({
        data: null,
        error: { message: 'Company not found' }
      });

      await expect(service.enrichCompany('nonexistent_company'))
        .rejects.toThrow('Company not found: nonexistent_company');
    });

    it('should handle company without website', async () => {
      const companyWithoutWebsite = { ...mockCompany, website: null };
      mockSupabaseClient.from().single.mockResolvedValue({
        data: companyWithoutWebsite,
        error: null
      });

      const result = await service.enrichCompany('company_123');

      expect(result.validation).toEqual({ websiteValid: false });
      expect(result.confidence).toBeGreaterThan(0); // Should still have some confidence
    });

    it('should handle enrichment service failures gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await service.enrichCompany('company_123');

      // Should still complete with partial data
      expect(result.id).toBe('company_123');
      expect(result.validation?.websiteValid).toBe(false);
    });

    it('should calculate confidence score correctly', async () => {
      const result = await service.enrichCompany('company_123');

      // Confidence should be based on available data
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
    });

    it('should handle database update errors', async () => {
      mockSupabaseClient.from().update.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      await expect(service.enrichCompany('company_123'))
        .rejects.toThrow('Database error');
    });

    it('should enrich company with minimal data gracefully', async () => {
      const minimalCompany = {
        id: 'company_minimal',
        name: 'Minimal Company',
        website: null,
        description: null
      };

      mockSupabaseClient.from().single.mockResolvedValue({
        data: minimalCompany,
        error: null
      });

      const result = await service.enrichCompany('company_minimal');

      expect(result).toMatchObject({
        id: 'company_minimal',
        name: 'Minimal Company',
        validation: { websiteValid: false },
        confidence: expect.any(Number)
      });
    });
  });

  describe('validateWebsite', () => {
    it('should validate website successfully', async () => {
      mockFetch.mockResolvedValue({
        status: 200,
        url: 'https://testcompany.com',
        headers: new Map()
      });

      const result = await service.validateWebsite('https://testcompany.com');

      expect(result).toMatchObject({
        websiteValid: true,
        statusCode: 200,
        responseTime: expect.any(Number),
        sslValid: true,
        redirects: [],
        domainAge: expect.any(Number)
      });

      expect(mockAxiomLogger.log).toHaveBeenCalledWith(
        'website-validation',
        'validation_completed',
        expect.objectContaining({
          url: 'https://testcompany.com',
          valid: true
        })
      );
    });

    it('should handle HTTP websites', async () => {
      mockFetch.mockResolvedValue({
        status: 200,
        url: 'http://testcompany.com',
        headers: new Map()
      });

      const result = await service.validateWebsite('http://testcompany.com');

      expect(result.websiteValid).toBe(true);
      expect(result.sslValid).toBe(false);
    });

    it('should handle website redirects', async () => {
      mockFetch.mockResolvedValue({
        status: 200,
        url: 'https://www.testcompany.com',
        headers: new Map()
      });

      const result = await service.validateWebsite('https://testcompany.com');

      expect(result.redirects).toContain('https://www.testcompany.com');
    });

    it('should handle website timeouts', async () => {
      mockFetch.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      const result = await service.validateWebsite('https://slow-website.com');

      expect(result.websiteValid).toBe(false);
      expect(result.statusCode).toBe(0);
      expect(result.responseTime).toBeGreaterThan(0);
    });

    it('should handle invalid URLs', async () => {
      const result = await service.validateWebsite('invalid-url');

      expect(result.websiteValid).toBe(false);
    });

    it('should handle server errors', async () => {
      mockFetch.mockResolvedValue({
        status: 500,
        url: 'https://error-site.com',
        headers: new Map()
      });

      const result = await service.validateWebsite('https://error-site.com');

      expect(result.websiteValid).toBe(false);
      expect(result.statusCode).toBe(500);
    });

    it('should normalize URLs correctly', async () => {
      const testUrls = [
        'testcompany.com',
        'www.testcompany.com',
        'https://testcompany.com/',
        'https://testcompany.com/path'
      ];

      for (const url of testUrls) {
        await service.validateWebsite(url);
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringMatching(/^https:\/\//),
          expect.any(Object)
        );
      }
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network unreachable'));

      const result = await service.validateWebsite('https://unreachable.com');

      expect(result.websiteValid).toBe(false);
      expect(mockAxiomLogger.logError).toHaveBeenCalled();
    });
  });

  describe('extractWebsiteInfo', () => {
    it('should extract basic website information', async () => {
      const htmlContent = `
        <html>
          <head>
            <title>Test Company - Leading Tech Solutions</title>
            <meta name="description" content="We provide innovative software solutions">
          </head>
        </html>
      `;

      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(htmlContent)
      });

      const result = await service.extractWebsiteInfo('https://testcompany.com');

      expect(result).toEqual({
        title: 'Test Company - Leading Tech Solutions',
        description: 'We provide innovative software solutions',
        industry: expect.any(String)
      });
    });

    it('should handle missing meta tags', async () => {
      const htmlContent = '<html><head><title>Simple Site</title></head></html>';

      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(htmlContent)
      });

      const result = await service.extractWebsiteInfo('https://simple.com');

      expect(result).toEqual({
        title: 'Simple Site',
        description: undefined,
        industry: undefined
      });
    });

    it('should handle malformed HTML', async () => {
      const htmlContent = '<html><head><title>Broken HTML</title>';

      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(htmlContent)
      });

      const result = await service.extractWebsiteInfo('https://broken.com');

      expect(result.title).toBe('Broken HTML');
    });

    it('should handle request failures', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404
      });

      const result = await service.extractWebsiteInfo('https://notfound.com');

      expect(result).toEqual({});
    });

    it('should handle request timeouts', async () => {
      mockFetch.mockImplementation(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      const result = await service.extractWebsiteInfo('https://timeout.com');

      expect(result).toEqual({});
    });

    it('should extract meta description in various formats', async () => {
      const testCases = [
        {
          html: '<meta name="description" content="Description 1">',
          expected: 'Description 1'
        },
        {
          html: '<meta content="Description 2" name="description">',
          expected: 'Description 2'
        },
        {
          html: '<META NAME="DESCRIPTION" CONTENT="Description 3">',
          expected: 'Description 3'
        }
      ];

      for (const { html, expected } of testCases) {
        mockFetch.mockResolvedValue({
          ok: true,
          text: () => Promise.resolve(`<html><head>${html}</head></html>`)
        });

        const result = await service.extractWebsiteInfo('https://test.com');
        expect(result.description).toBe(expected);
      }
    });
  });

  describe('discoverSocialProfiles', () => {
    it('should generate social profile URLs', async () => {
      const result = await service.discoverSocialProfiles('Test Company Inc');

      expect(result).toMatchObject({
        linkedin: expect.stringContaining('linkedin.com'),
        twitter: expect.stringContaining('twitter.com')
      });
    });

    it('should clean company names for URL generation', async () => {
      const testCases = [
        'Test Company Inc',
        'Test Company LLC',
        'Test Company Corp',
        'Test Company Ltd'
      ];

      for (const companyName of testCases) {
        const result = await service.discoverSocialProfiles(companyName);
        
        expect(result.linkedin).toContain('testcompany');
        expect(result.twitter).toContain('testcompany');
      }
    });

    it('should extract social links from website', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(`
          <html>
            <body>
              <a href="https://linkedin.com/company/actualcompany">LinkedIn</a>
              <a href="https://twitter.com/actualcompany">Twitter</a>
              <a href="https://crunchbase.com/organization/actualcompany">Crunchbase</a>
            </body>
          </html>
        `)
      });

      const result = await service.discoverSocialProfiles('Test Company', 'https://testcompany.com');

      expect(result).toMatchObject({
        linkedin: 'https://linkedin.com/company/actualcompany',
        twitter: 'https://twitter.com/actualcompany',
        crunchbase: 'https://crunchbase.com/organization/actualcompany'
      });
    });

    it('should handle website extraction errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await service.discoverSocialProfiles('Test Company', 'https://error.com');

      // Should still return generated URLs
      expect(result.linkedin).toBeTruthy();
      expect(result.twitter).toBeTruthy();
    });

    it('should handle special characters in company names', async () => {
      const result = await service.discoverSocialProfiles('Test & Company-123!');

      expect(result.linkedin).toContain('testcompany123');
      expect(result.twitter).toContain('testcompany123');
    });

    it('should handle X.com URLs (new Twitter)', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(`
          <html>
            <body>
              <a href="https://x.com/actualcompany">X Profile</a>
            </body>
          </html>
        `)
      });

      const result = await service.discoverSocialProfiles('Test Company', 'https://testcompany.com');

      expect(result.twitter).toBe('https://x.com/actualcompany');
    });
  });

  describe('classifyIndustry', () => {
    it('should classify technology companies correctly', async () => {
      const testCases = [
        { name: 'TechCorp', description: 'We build software solutions', expected: 'Technology' },
        { name: 'AI Innovations', description: 'Artificial intelligence platform', expected: 'Technology' },
        { name: 'CloudTech', description: 'Cloud computing services', expected: 'Technology' },
        { name: 'AppBuilder', description: 'Mobile app development', expected: 'Technology' }
      ];

      for (const { name, description, expected } of testCases) {
        const result = await service.classifyIndustry(name, description);
        expect(result).toBe(expected);
      }
    });

    it('should classify various industries correctly', async () => {
      const testCases = [
        { name: 'ShopNow', description: 'Online retail marketplace', expected: 'E-commerce' },
        { name: 'HealthTech', description: 'Medical software solutions', expected: 'Healthcare' },
        { name: 'FinanceApp', description: 'Banking and payments', expected: 'Finance' },
        { name: 'FoodDelivery', description: 'Restaurant delivery service', expected: 'Food & Beverage' },
        { name: 'NewsDaily', description: 'Media and entertainment', expected: 'Media' },
        { name: 'EduPlatform', description: 'Online learning platform', expected: 'Education' }
      ];

      for (const { name, description, expected } of testCases) {
        const result = await service.classifyIndustry(name, description);
        expect(result).toBe(expected);
      }
    });

    it('should return undefined for unclear industries', async () => {
      const result = await service.classifyIndustry('Generic Corp', 'We do business things');
      expect(result).toBeUndefined();
    });

    it('should handle empty or null descriptions', async () => {
      const result1 = await service.classifyIndustry('TechCorp', '');
      const result2 = await service.classifyIndustry('TechCorp', undefined);
      
      expect(result1).toBe('Technology'); // Should still classify based on name
      expect(result2).toBe('Technology');
    });

    it('should handle case insensitive matching', async () => {
      const result = await service.classifyIndustry('TECHCORP', 'SOFTWARE SOLUTIONS');
      expect(result).toBe('Technology');
    });

    it('should handle multiple keyword matches', async () => {
      const result = await service.classifyIndustry(
        'HealthTech Solutions',
        'We provide software for medical professionals'
      );
      
      // Should match on 'software' (Technology) and 'medical' (Healthcare)
      // Implementation should prefer more specific matches
      expect(['Technology', 'Healthcare']).toContain(result);
    });
  });

  describe('estimateCompanyMetrics', () => {
    it('should estimate metrics for tech companies', async () => {
      const result = await service.estimateCompanyMetrics('TechCorp Software');

      expect(result).toMatchObject({
        employeeCount: expect.any(Number),
        foundedYear: expect.any(Number)
      });

      expect(result.employeeCount).toBeGreaterThan(0);
      expect(result.employeeCount).toBeLessThan(250);
      expect(result.foundedYear).toBeGreaterThanOrEqual(2010);
      expect(result.foundedYear).toBeLessThanOrEqual(2024);
    });

    it('should estimate location from domain TLD', async () => {
      const testCases = [
        { website: 'https://company.co.uk', expected: 'United Kingdom' },
        { website: 'https://company.ca', expected: 'Canada' },
        { website: 'https://company.com.au', expected: 'Australia' },
        { website: 'https://company.com', expected: 'United States' }
      ];

      for (const { website, expected } of testCases) {
        const result = await service.estimateCompanyMetrics('Test Company', website);
        expect(result.location).toBe(expected);
      }
    });

    it('should handle companies without websites', async () => {
      const result = await service.estimateCompanyMetrics('Test Company');

      expect(result).toMatchObject({
        location: undefined,
        employeeCount: undefined,
        foundedYear: undefined
      });
    });

    it('should handle errors gracefully', async () => {
      // Mock an error in the estimation process
      const originalRandom = Math.random;
      Math.random = vi.fn(() => {
        throw new Error('Random error');
      });

      const result = await service.estimateCompanyMetrics('Test Company');

      expect(result).toEqual({});

      Math.random = originalRandom;
    });
  });

  describe('analyzeTechStack', () => {
    it('should analyze tech stack from HTML and headers', async () => {
      const htmlContent = `
        <html>
          <head>
            <script src="/_next/static/chunks/main.js"></script>
            <script src="https://js.stripe.com/v3/"></script>
            <script>window.__REACT_DEVTOOLS_GLOBAL_HOOK__</script>
          </head>
          <body>
            <div id="__next"></div>
          </body>
        </html>
      `;

      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(htmlContent),
        headers: new Map([
          ['server', 'nginx'],
          ['x-powered-by', 'Express']
        ])
      });

      const result = await service.analyzeTechStack('https://testcompany.com');

      expect(result.techStack).toEqual(
        expect.arrayContaining(['Nginx', 'Express', 'Next.js', 'React', 'Stripe'])
      );
    });

    it('should detect various technologies', async () => {
      const testCases = [
        { content: '<script src="/wp-content/"></script>', expected: 'WordPress' },
        { content: '<script>angular.module</script>', expected: 'Angular' },
        { content: '<script src="cdn.shopify.com"></script>', expected: 'Shopify' },
        { content: '<script>gtag("config")</script>', expected: 'Google Analytics' },
        { content: '<script src="widget.intercom.io"></script>', expected: 'Intercom' }
      ];

      for (const { content, expected } of testCases) {
        mockFetch.mockResolvedValue({
          ok: true,
          text: () => Promise.resolve(`<html>${content}</html>`),
          headers: new Map()
        });

        const result = await service.analyzeTechStack('https://test.com');
        expect(result.techStack).toContain(expected);
      }
    });

    it('should handle request failures', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404
      });

      const result = await service.analyzeTechStack('https://notfound.com');

      expect(result).toEqual({});
    });

    it('should deduplicate technologies', async () => {
      const htmlContent = `
        <script src="/_next/static/main.js"></script>
        <script src="/_next/static/webpack.js"></script>
        <div id="__next"></div>
      `;

      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(htmlContent),
        headers: new Map()
      });

      const result = await service.analyzeTechStack('https://testcompany.com');

      // Should only contain Next.js once
      const nextjsCount = result.techStack?.filter(tech => tech === 'Next.js').length || 0;
      expect(nextjsCount).toBe(1);
    });

    it('should handle empty responses', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(''),
        headers: new Map()
      });

      const result = await service.analyzeTechStack('https://empty.com');

      expect(result.techStack).toEqual([]);
    });

    it('should handle malformed HTML', async () => {
      const malformedHtml = '<html><script>broken html';

      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(malformedHtml),
        headers: new Map()
      });

      const result = await service.analyzeTechStack('https://broken.com');

      // Should not crash and return empty or partial results
      expect(result).toBeDefined();
    });
  });

  describe('enrichCompanies - Batch Processing', () => {
    it('should process companies in batches', async () => {
      const companyIds = ['company_1', 'company_2', 'company_3', 'company_4', 'company_5'];
      
      // Mock each company enrichment
      companyIds.forEach((id, index) => {
        mockSupabaseClient.from().single
          .mockResolvedValueOnce({
            data: { ...mockCompany, id, name: `Company ${index + 1}` },
            error: null
          });
      });

      const results = await service.enrichCompanies(companyIds);

      expect(results).toHaveLength(5);
      expect(mockAxiomLogger.log).toHaveBeenCalledTimes(10); // 5 start + 5 complete logs
    });

    it('should handle batch processing errors gracefully', async () => {
      const companyIds = ['company_good', 'company_bad', 'company_good2'];
      
      mockSupabaseClient.from().single
        .mockResolvedValueOnce({ data: { ...mockCompany, id: 'company_good' }, error: null })
        .mockResolvedValueOnce({ data: null, error: { message: 'Not found' } })
        .mockResolvedValueOnce({ data: { ...mockCompany, id: 'company_good2' }, error: null });

      const results = await service.enrichCompanies(companyIds);

      // Should return only successful enrichments
      expect(results).toHaveLength(2);
      expect(results.map(r => r.id)).toEqual(['company_good', 'company_good2']);
    });

    it('should implement rate limiting between batches', async () => {
      const companyIds = ['1', '2', '3', '4', '5', '6', '7']; // More than batch size
      
      const startTime = Date.now();
      await service.enrichCompanies(companyIds);
      const endTime = Date.now();

      // Should take some time due to delays between batches
      // Note: In real test, you'd mock setTimeout more precisely
      expect(endTime - startTime).toBeGreaterThan(0);
    });

    it('should handle empty company list', async () => {
      const results = await service.enrichCompanies([]);

      expect(results).toEqual([]);
    });

    it('should process single company correctly', async () => {
      const results = await service.enrichCompanies(['company_1']);

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('company_1');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle network timeouts gracefully', async () => {
      mockFetch.mockImplementation(() => 
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 100);
        })
      );

      const result = await service.enrichCompany('company_123');

      expect(result.validation?.websiteValid).toBe(false);
      expect(result.confidence).toBeGreaterThan(0); // Should still have some confidence
    });

    it('should handle malformed URLs', async () => {
      const companyWithBadUrl = {
        ...mockCompany,
        website: 'not-a-url'
      };

      mockSupabaseClient.from().single.mockResolvedValue({
        data: companyWithBadUrl,
        error: null
      });

      const result = await service.enrichCompany('company_123');

      expect(result.validation?.websiteValid).toBe(false);
    });

    it('should handle very large HTML responses', async () => {
      const largeHtml = '<html>' + 'x'.repeat(10000000) + '</html>'; // 10MB HTML

      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(largeHtml),
        headers: new Map()
      });

      // Should not crash or timeout
      const result = await service.analyzeTechStack('https://large.com');
      expect(result).toBeDefined();
    });

    it('should handle concurrent enrichments safely', async () => {
      const promises = Array.from({ length: 5 }, (_, i) => 
        service.enrichCompany(`company_${i}`)
      );

      const results = await Promise.allSettled(promises);

      // All should complete without interfering with each other
      results.forEach(result => {
        expect(result.status).toBe('fulfilled');
      });
    });

    it('should handle database connection failures', async () => {
      mockSupabaseClient.from = vi.fn(() => {
        throw new Error('Database connection failed');
      });

      await expect(service.enrichCompany('company_123'))
        .rejects.toThrow('Database connection failed');
    });

    it('should validate confidence score boundaries', async () => {
      // Test various scenarios that should produce different confidence scores
      const scenarios = [
        { websiteValid: true, hasDescription: true, hasSocial: true },
        { websiteValid: true, hasDescription: false, hasSocial: false },
        { websiteValid: false, hasDescription: true, hasSocial: true },
        { websiteValid: false, hasDescription: false, hasSocial: false }
      ];

      for (const scenario of scenarios) {
        const result = await service.enrichCompany('company_test');
        
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(100);
      }
    });

    it('should handle Unicode and special characters in company data', async () => {
      const unicodeCompany = {
        ...mockCompany,
        name: '测试公司 Test Company 🚀',
        description: 'Descripción con caracteres especiales & símbolos'
      };

      mockSupabaseClient.from().single.mockResolvedValue({
        data: unicodeCompany,
        error: null
      });

      const result = await service.enrichCompany('company_unicode');

      expect(result.name).toBe('测试公司 Test Company 🚀');
      expect(result).toBeDefined();
    });
  });

  describe('Performance and Scalability', () => {
    it('should complete enrichment within reasonable time', async () => {
      const startTime = Date.now();
      await service.enrichCompany('company_123');
      const endTime = Date.now();

      // Should complete within 30 seconds (generous for testing)
      expect(endTime - startTime).toBeLessThan(30000);
    });

    it('should handle memory efficiently with large datasets', async () => {
      // Process multiple companies to test memory usage
      const companyIds = Array.from({ length: 50 }, (_, i) => `company_${i}`);
      
      // Mock minimal responses to reduce memory usage in test
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('<html><title>Test</title></html>'),
        headers: new Map()
      });

      const results = await service.enrichCompanies(companyIds);

      // Should complete without memory issues
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle rate limiting across multiple requests', async () => {
      mockBurstProtection.checkBurstLimit
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      const promises = [
        service.enrichCompany('company_1'),
        service.enrichCompany('company_2'),
        service.enrichCompany('company_3')
      ];

      const results = await Promise.allSettled(promises);

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('fulfilled');
    });
  });
});