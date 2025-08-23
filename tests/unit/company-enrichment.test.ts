import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CompanyEnrichmentService, CompanyEnrichmentData } from '@substack-intelligence/enrichment';

// Mock dependencies
vi.mock('@substack-intelligence/database', () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: {
              id: 'company-1',
              name: 'Test Company',
              website: 'https://example.com'
            },
            error: null
          }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          error: null
        }))
      }))
    }))
  }))
}));

vi.mock('../../../apps/web/lib/monitoring/axiom', () => ({
  axiomLogger: {
    log: vi.fn(),
    logError: vi.fn()
  }
}));

vi.mock('../../../apps/web/lib/security/rate-limiting', () => ({
  burstProtection: {
    checkBurstLimit: vi.fn(() => Promise.resolve(true))
  }
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('CompanyEnrichmentService', () => {
  let service: CompanyEnrichmentService;
  let mockSupabaseClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    const { createServiceRoleClient } = require('@substack-intelligence/database');
    mockSupabaseClient = createServiceRoleClient();
    
    service = new CompanyEnrichmentService();
    
    // Default fetch mock
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      url: 'https://example.com',
      headers: new Map([
        ['server', 'nginx/1.18.0'],
        ['content-type', 'text/html']
      ]),
      text: () => Promise.resolve(`
        <html>
          <head>
            <title>Test Company - Software Solutions</title>
            <meta name="description" content="We provide innovative software solutions for businesses">
          </head>
          <body>
            <p>Welcome to our software platform</p>
            <a href="https://www.linkedin.com/company/testcompany">LinkedIn</a>
            <a href="https://twitter.com/testcompany">Twitter</a>
          </body>
        </html>
      `)
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('enrichCompany', () => {
    it('should successfully enrich a company with all data', async () => {
      const { burstProtection } = require('../../../apps/web/lib/security/rate-limiting');
      burstProtection.checkBurstLimit.mockResolvedValue(true);

      const result = await service.enrichCompany('company-1');

      expect(result).toMatchObject({
        id: 'company-1',
        name: 'Test Company',
        website: 'https://example.com',
        description: expect.any(String),
        industry: expect.any(String),
        validation: {
          websiteValid: true,
          statusCode: 200,
          sslValid: true
        },
        social: {
          linkedin: expect.any(String),
          twitter: expect.any(String)
        },
        confidence: expect.any(Number),
        lastEnriched: expect.any(Date)
      });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('companies');
    });

    it('should handle rate limiting', async () => {
      const { burstProtection } = require('../../../apps/web/lib/security/rate-limiting');
      burstProtection.checkBurstLimit.mockResolvedValue(false);

      await expect(service.enrichCompany('company-1'))
        .rejects
        .toThrow('Company enrichment rate limit exceeded');
    });

    it('should handle company not found', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: null,
              error: { message: 'Not found' }
            }))
          }))
        }))
      });

      await expect(service.enrichCompany('nonexistent'))
        .rejects
        .toThrow('Company not found: nonexistent');
    });

    it('should handle companies without websites', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: {
                id: 'company-no-website',
                name: 'Company Without Website',
                website: null
              },
              error: null
            }))
          }))
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({ error: null }))
        }))
      });

      const result = await service.enrichCompany('company-no-website');

      expect(result.validation.websiteValid).toBe(false);
      expect(result.confidence).toBeGreaterThan(0); // Should still have some confidence from other data
    });

    it('should handle enrichment errors gracefully', async () => {
      const { axiomLogger } = require('../../../apps/web/lib/monitoring/axiom');
      
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(service.enrichCompany('company-1')).rejects.toThrow();
      expect(axiomLogger.logError).toHaveBeenCalled();
    });
  });

  describe('validateWebsite', () => {
    it('should validate a working website', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        url: 'https://example.com',
        headers: new Map()
      });

      const result = await service.validateWebsite('https://example.com');

      expect(result).toMatchObject({
        websiteValid: true,
        statusCode: 200,
        sslValid: true,
        responseTime: expect.any(Number)
      });
    });

    it('should handle invalid websites', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        url: 'https://example.com',
        headers: new Map()
      });

      const result = await service.validateWebsite('https://invalid-site.com');

      expect(result).toMatchObject({
        websiteValid: false,
        statusCode: 404
      });
    });

    it('should handle network timeouts', async () => {
      mockFetch.mockImplementation(() => 
        new Promise((resolve, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 100);
        })
      );

      const result = await service.validateWebsite('https://slow-site.com');

      expect(result).toMatchObject({
        websiteValid: false,
        statusCode: 0
      });
    });

    it('should detect redirects', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        url: 'https://new-example.com', // Different from requested URL
        headers: new Map()
      });

      const result = await service.validateWebsite('https://example.com');

      expect(result.redirects).toContain('https://new-example.com');
    });

    it('should normalize URLs correctly', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        url: 'https://example.com',
        headers: new Map()
      });

      await service.validateWebsite('example.com'); // No protocol

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/',
        expect.any(Object)
      );
    });
  });

  describe('extractWebsiteInfo', () => {
    it('should extract title and description from HTML', async () => {
      const html = `
        <html>
          <head>
            <title>Amazing Tech Company</title>
            <meta name="description" content="We build amazing software products">
          </head>
        </html>
      `;

      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(html)
      });

      const result = await service.extractWebsiteInfo('https://example.com');

      expect(result).toMatchObject({
        title: 'Amazing Tech Company',
        description: 'We build amazing software products',
        industry: expect.any(String)
      });
    });

    it('should handle malformed HTML', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('<html><title>Partial HTML')
      });

      const result = await service.extractWebsiteInfo('https://example.com');

      expect(result).toEqual({
        title: 'Partial HTML',
        description: undefined,
        industry: undefined
      });
    });

    it('should handle fetch failures', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404
      });

      const result = await service.extractWebsiteInfo('https://example.com');

      expect(result).toEqual({});
    });
  });

  describe('discoverSocialProfiles', () => {
    it('should generate social media URLs from company name', async () => {
      const result = await service.discoverSocialProfiles('Tech Corp', 'https://example.com');

      expect(result).toMatchObject({
        linkedin: expect.stringContaining('linkedin.com/company/techcorp'),
        twitter: expect.stringContaining('twitter.com/techcorp')
      });
    });

    it('should clean company names for social URLs', async () => {
      const result = await service.discoverSocialProfiles('Tech Corp LLC', 'https://example.com');

      expect(result.linkedin).toContain('techcorp');
      expect(result.linkedin).not.toContain('llc');
    });

    it('should extract social links from website', async () => {
      const html = `
        <html>
          <body>
            <a href="https://www.linkedin.com/company/realcompany">Our LinkedIn</a>
            <a href="https://twitter.com/realhandle">Follow us</a>
            <a href="https://www.crunchbase.com/organization/startup">Crunchbase</a>
          </body>
        </html>
      `;

      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(html)
      });

      const result = await service.discoverSocialProfiles('Test Company', 'https://example.com');

      expect(result.linkedin).toContain('linkedin.com/company/realcompany');
      expect(result.twitter).toContain('twitter.com/realhandle');
      expect(result.crunchbase).toContain('crunchbase.com/organization/startup');
    });
  });

  describe('classifyIndustry', () => {
    it('should classify technology companies', async () => {
      const result = await service.classifyIndustry('TechCorp', 'We build software platforms and AI solutions');

      expect(result).toBe('Technology');
    });

    it('should classify e-commerce companies', async () => {
      const result = await service.classifyIndustry('ShopCorp', 'Online marketplace for retail products');

      expect(result).toBe('E-commerce');
    });

    it('should classify healthcare companies', async () => {
      const result = await service.classifyIndustry('HealthTech', 'Medical software for healthcare providers');

      expect(result).toBe('Healthcare');
    });

    it('should return undefined for unclassifiable companies', async () => {
      const result = await service.classifyIndustry('Generic Corp', 'We do business stuff');

      expect(result).toBeUndefined();
    });

    it('should handle empty descriptions', async () => {
      const result = await service.classifyIndustry('Tech Solutions');

      expect(result).toBe('Technology');
    });
  });

  describe('estimateCompanyMetrics', () => {
    it('should estimate metrics for tech companies', async () => {
      const result = await service.estimateCompanyMetrics('TechCorp', 'https://example.com');

      expect(result).toMatchObject({
        employeeCount: expect.any(Number),
        foundedYear: expect.any(Number),
        location: expect.any(String)
      });

      expect(result.employeeCount).toBeGreaterThanOrEqual(10);
      expect(result.foundedYear).toBeGreaterThanOrEqual(2010);
    });

    it('should estimate location from domain', async () => {
      const ukResult = await service.estimateCompanyMetrics('Company Ltd', 'https://example.co.uk');
      expect(ukResult.location).toBe('United Kingdom');

      const caResult = await service.estimateCompanyMetrics('Company Inc', 'https://example.ca');
      expect(caResult.location).toBe('Canada');

      const auResult = await service.estimateCompanyMetrics('Company Pty', 'https://example.com.au');
      expect(auResult.location).toBe('Australia');

      const usResult = await service.estimateCompanyMetrics('Company Inc', 'https://example.com');
      expect(usResult.location).toBe('United States');
    });

    it('should handle companies without websites', async () => {
      const result = await service.estimateCompanyMetrics('Some Company');

      expect(result.location).toBeUndefined();
    });
  });

  describe('analyzeTechStack', () => {
    it('should detect technologies from headers and HTML', async () => {
      const html = `
        <html>
          <head>
            <script src="https://unpkg.com/react@17/umd/react.production.min.js"></script>
            <script src="/_next/static/chunks/main.js"></script>
            <script src="https://js.stripe.com/v3/"></script>
          </head>
        </html>
      `;

      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([
          ['server', 'nginx/1.18.0'],
          ['x-powered-by', 'Express']
        ]),
        text: () => Promise.resolve(html)
      });

      const result = await service.analyzeTechStack('https://example.com');

      expect(result.techStack).toContain('Nginx');
      expect(result.techStack).toContain('Express');
      expect(result.techStack).toContain('React');
      expect(result.techStack).toContain('Next.js');
      expect(result.techStack).toContain('Stripe');
    });

    it('should handle websites without detectable technologies', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map(),
        text: () => Promise.resolve('<html><body>Simple HTML page</body></html>')
      });

      const result = await service.analyzeTechStack('https://example.com');

      expect(result.techStack).toEqual([]);
    });

    it('should handle fetch failures', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404
      });

      const result = await service.analyzeTechStack('https://example.com');

      expect(result).toEqual({});
    });
  });

  describe('confidence score calculation', () => {
    it('should calculate high confidence for complete data', () => {
      const completeData: Partial<CompanyEnrichmentData> = {
        validation: {
          websiteValid: true,
          sslValid: true,
          responseTime: 1000
        },
        description: 'Complete description',
        industry: 'Technology',
        social: {
          linkedin: 'https://linkedin.com/company/test',
          twitter: 'https://twitter.com/test',
          crunchbase: 'https://crunchbase.com/organization/test'
        },
        location: 'United States',
        employeeCount: 50,
        foundedYear: 2020,
        metrics: {
          techStack: ['React', 'Node.js', 'AWS']
        }
      };

      const confidence = (service as any).calculateConfidenceScore(completeData);

      expect(confidence).toBeGreaterThan(90);
    });

    it('should calculate low confidence for minimal data', () => {
      const minimalData: Partial<CompanyEnrichmentData> = {
        validation: {
          websiteValid: false
        }
      };

      const confidence = (service as any).calculateConfidenceScore(minimalData);

      expect(confidence).toBeLessThan(20);
    });

    it('should cap confidence at 100', () => {
      const excessiveData: Partial<CompanyEnrichmentData> = {
        validation: { websiteValid: true, sslValid: true, responseTime: 500 },
        description: 'Description',
        industry: 'Technology',
        social: { linkedin: 'test', twitter: 'test', crunchbase: 'test' },
        location: 'US',
        employeeCount: 100,
        foundedYear: 2020,
        metrics: { techStack: ['React', 'Vue', 'Angular', 'Node.js', 'Python', 'Java'] }
      };

      const confidence = (service as any).calculateConfidenceScore(excessiveData);

      expect(confidence).toBeLessThanOrEqual(100);
    });
  });

  describe('batch enrichment', () => {
    it('should process multiple companies in batches', async () => {
      const companyIds = ['comp-1', 'comp-2', 'comp-3', 'comp-4', 'comp-5'];
      
      // Mock successful enrichment
      vi.spyOn(service, 'enrichCompany').mockResolvedValue({
        id: 'test',
        name: 'Test Company',
        validation: { websiteValid: true },
        confidence: 85,
        lastEnriched: new Date()
      } as CompanyEnrichmentData);

      const results = await service.enrichCompanies(companyIds);

      expect(results).toHaveLength(5);
      expect(service.enrichCompany).toHaveBeenCalledTimes(5);
    });

    it('should handle partial failures in batch processing', async () => {
      const companyIds = ['comp-1', 'comp-2', 'comp-3'];
      
      vi.spyOn(service, 'enrichCompany')
        .mockResolvedValueOnce({
          id: 'comp-1',
          name: 'Success Company',
          validation: { websiteValid: true },
          confidence: 85,
          lastEnriched: new Date()
        } as CompanyEnrichmentData)
        .mockRejectedValueOnce(new Error('Enrichment failed'))
        .mockResolvedValueOnce({
          id: 'comp-3',
          name: 'Another Success',
          validation: { websiteValid: true },
          confidence: 75,
          lastEnriched: new Date()
        } as CompanyEnrichmentData);

      const results = await service.enrichCompanies(companyIds);

      expect(results).toHaveLength(2); // Only successful ones
      expect(results[0].id).toBe('comp-1');
      expect(results[1].id).toBe('comp-3');
    });

    it('should respect batch size and delays', async () => {
      const companyIds = ['comp-1', 'comp-2', 'comp-3', 'comp-4'];
      
      vi.spyOn(service, 'enrichCompany').mockResolvedValue({
        id: 'test',
        name: 'Test Company',
        validation: { websiteValid: true },
        confidence: 85,
        lastEnriched: new Date()
      } as CompanyEnrichmentData);

      const start = Date.now();
      await service.enrichCompanies(companyIds);
      const duration = Date.now() - start;

      // Should take at least 2 seconds due to batch delay (4 companies = 2 batches with 1 delay)
      expect(duration).toBeGreaterThan(1900);
    });
  });

  describe('database operations', () => {
    it('should update company data in database', async () => {
      const enrichmentData: Partial<CompanyEnrichmentData> = {
        description: 'Updated description',
        industry: 'Technology',
        location: 'United States',
        confidence: 85
      };

      await (service as any).updateCompanyEnrichment('company-1', enrichmentData);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('companies');
      
      const updateCall = mockSupabaseClient.from().update.mock.calls[0][0];
      expect(updateCall).toMatchObject({
        description: 'Updated description',
        industry: 'Technology',
        location: 'United States',
        enrichment_confidence: 85,
        last_enriched_at: expect.any(String),
        updated_at: expect.any(String)
      });
    });

    it('should handle database update errors', async () => {
      mockSupabaseClient.from.mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            error: { message: 'Database error' }
          }))
        }))
      });

      const enrichmentData: Partial<CompanyEnrichmentData> = {
        description: 'Test',
        confidence: 50
      };

      await expect((service as any).updateCompanyEnrichment('company-1', enrichmentData))
        .rejects
        .toThrow();
    });
  });

  describe('utility methods', () => {
    it('should normalize URLs correctly', () => {
      const testCases = [
        { input: 'example.com', expected: 'https://example.com/' },
        { input: 'http://example.com', expected: 'http://example.com/' },
        { input: 'https://example.com', expected: 'https://example.com/' },
        { input: 'invalid-url', expected: 'invalid-url' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = (service as any).normalizeUrl(input);
        expect(result).toBe(expected);
      });
    });

    it('should estimate domain age', async () => {
      const age1 = await (service as any).estimateDomainAge('https://new-startup.com');
      const age2 = await (service as any).estimateDomainAge('https://example.com');

      expect(typeof age1).toBe('number');
      expect(typeof age2).toBe('number');
      expect(age1).toBeGreaterThanOrEqual(1);
      expect(age2).toBeGreaterThanOrEqual(1);
    });

    it('should infer industry from content', () => {
      const testCases = [
        {
          html: '<html><body>Software as a Service platform</body></html>',
          title: 'SaaS Platform',
          expected: 'SaaS'
        },
        {
          html: '<html><body>Online store for products</body></html>',
          title: 'Ecommerce Platform',
          expected: 'E-commerce'
        },
        {
          html: '<html><body>Financial technology solutions</body></html>',
          title: 'FinTech',
          expected: 'FinTech'
        }
      ];

      testCases.forEach(({ html, title, expected }) => {
        const result = (service as any).inferIndustryFromContent(html, title);
        expect(result).toBe(expected);
      });
    });
  });
});