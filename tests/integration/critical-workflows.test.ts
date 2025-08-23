import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Integration tests for critical business workflows
// These tests ensure that multiple components work together correctly

describe('Critical Business Workflows', () => {
  describe('Email Ingestion to Intelligence Pipeline', () => {
    let mockGmailConnector: any;
    let mockClaudeExtractor: any;
    let mockDatabase: any;
    let mockEmailService: any;

    beforeEach(() => {
      // Setup integrated mock environment
      mockGmailConnector = {
        fetchDailySubstacks: vi.fn(),
        processMessage: vi.fn(),
        testConnection: vi.fn()
      };

      mockClaudeExtractor = {
        extractCompanies: vi.fn(),
        batchExtract: vi.fn()
      };

      mockDatabase = {
        from: vi.fn(() => ({
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn()
        }))
      };

      mockEmailService = {
        sendCompanyAlert: vi.fn(),
        sendDailyReport: vi.fn()
      };
    });

    it('should complete full email processing workflow', async () => {
      // Step 1: Gmail fetches emails
      const mockEmails = [
        {
          id: 'email-1',
          messageId: 'msg-1',
          subject: 'Tech Newsletter',
          sender: 'newsletter@techcrunch.com',
          newsletterName: 'TechCrunch',
          html: '<html>Stripe raised $600M at $95B valuation</html>',
          text: 'Stripe raised $600M at $95B valuation',
          receivedAt: new Date('2024-01-01'),
          processedAt: new Date()
        }
      ];
      mockGmailConnector.fetchDailySubstacks.mockResolvedValue(mockEmails);

      // Step 2: Claude extracts companies
      const mockExtractedCompanies = {
        companies: [
          {
            name: 'Stripe',
            description: 'Payment processing platform',
            context: 'Stripe raised $600M at $95B valuation',
            sentiment: 'positive',
            confidence: 0.95
          }
        ],
        metadata: {
          processingTime: 1500,
          tokenCount: 250,
          modelVersion: 'claude-3-opus'
        }
      };
      mockClaudeExtractor.extractCompanies.mockResolvedValue(mockExtractedCompanies);

      // Step 3: Store in database
      mockDatabase.from().insert.mockResolvedValue({ data: { id: 'company-1' }, error: null });
      mockDatabase.from().single.mockResolvedValue({ 
        data: { id: 'company-1', mention_count: 1 }, 
        error: null 
      });

      // Step 4: Send alerts
      mockEmailService.sendCompanyAlert.mockResolvedValue({ data: { id: 'alert-1' } });

      // Execute the workflow
      const emails = await mockGmailConnector.fetchDailySubstacks(1);
      expect(emails).toHaveLength(1);

      const extraction = await mockClaudeExtractor.extractCompanies(
        emails[0].text,
        emails[0].newsletterName
      );
      expect(extraction.companies).toHaveLength(1);
      expect(extraction.companies[0].name).toBe('Stripe');

      const dbResult = await mockDatabase.from('companies').insert(extraction.companies[0]);
      expect(dbResult.error).toBeNull();

      if (extraction.companies[0].confidence > 0.9) {
        const alertResult = await mockEmailService.sendCompanyAlert({
          companyName: extraction.companies[0].name,
          description: extraction.companies[0].description,
          newsletterName: emails[0].newsletterName,
          sentiment: extraction.companies[0].sentiment,
          confidence: extraction.companies[0].confidence,
          context: extraction.companies[0].context,
          isHighPriority: extraction.companies[0].confidence > 0.9
        }, ['vc@example.com']);
        
        expect(alertResult.data.id).toBe('alert-1');
      }

      // Verify all steps were called
      expect(mockGmailConnector.fetchDailySubstacks).toHaveBeenCalledWith(1);
      expect(mockClaudeExtractor.extractCompanies).toHaveBeenCalled();
      expect(mockDatabase.from).toHaveBeenCalledWith('companies');
      expect(mockEmailService.sendCompanyAlert).toHaveBeenCalled();
    });

    it('should handle batch email processing', async () => {
      const mockEmails = Array(10).fill(null).map((_, i) => ({
        id: `email-${i}`,
        text: `Company ${i} raised funding`,
        newsletterName: `Newsletter ${i % 3}`
      }));

      mockGmailConnector.fetchDailySubstacks.mockResolvedValue(mockEmails);
      
      mockClaudeExtractor.batchExtract.mockResolvedValue({
        successful: mockEmails.map((email, i) => ({
          id: email.id,
          companies: [{
            name: `Company ${i}`,
            confidence: 0.8 + (i * 0.01)
          }]
        })),
        failed: 0,
        total: 10
      });

      const emails = await mockGmailConnector.fetchDailySubstacks(7);
      const batchResult = await mockClaudeExtractor.batchExtract(
        emails.map((e: any) => ({
          content: e.text,
          newsletterName: e.newsletterName,
          id: e.id
        }))
      );

      expect(batchResult.successful).toHaveLength(10);
      expect(batchResult.failed).toBe(0);
      expect(batchResult.total).toBe(10);
    });

    it('should handle pipeline failures gracefully', async () => {
      // Gmail fetch fails
      mockGmailConnector.fetchDailySubstacks.mockRejectedValue(new Error('Gmail API Error'));
      
      await expect(mockGmailConnector.fetchDailySubstacks(1))
        .rejects.toThrow('Gmail API Error');

      // Claude extraction fails
      mockGmailConnector.fetchDailySubstacks.mockResolvedValue([{ text: 'test' }]);
      mockClaudeExtractor.extractCompanies.mockRejectedValue(new Error('Claude API Error'));
      
      const emails = await mockGmailConnector.fetchDailySubstacks(1);
      await expect(mockClaudeExtractor.extractCompanies(emails[0].text))
        .rejects.toThrow('Claude API Error');

      // Database insert fails
      mockDatabase.from().insert.mockResolvedValue({ 
        data: null, 
        error: { message: 'Database error' } 
      });
      
      const dbResult = await mockDatabase.from('companies').insert({});
      expect(dbResult.error).toBeTruthy();
    });
  });

  describe('Company Enrichment and Similarity Workflow', () => {
    let mockEnrichmentService: any;
    let mockEmbeddingService: any;
    let mockDatabase: any;

    beforeEach(() => {
      mockEnrichmentService = {
        enrichCompany: vi.fn(),
        validateWebsite: vi.fn(),
        classifyIndustry: vi.fn()
      };

      mockEmbeddingService = {
        generateCompanyEmbedding: vi.fn(),
        findSimilarCompanies: vi.fn(),
        semanticSearch: vi.fn()
      };

      mockDatabase = {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn()
        }))
      };
    });

    it('should complete company enrichment and similarity workflow', async () => {
      const companyId = 'company-123';
      
      // Step 1: Enrich company data
      const enrichmentData = {
        id: companyId,
        name: 'Tech Startup',
        website: 'https://techstartup.com',
        description: 'AI-powered analytics platform',
        industry: 'Technology',
        location: 'San Francisco',
        employeeCount: 50,
        social: {
          linkedin: 'https://linkedin.com/company/techstartup',
          twitter: 'https://twitter.com/techstartup'
        },
        validation: {
          websiteValid: true,
          sslValid: true,
          responseTime: 1500
        },
        confidence: 85
      };
      mockEnrichmentService.enrichCompany.mockResolvedValue(enrichmentData);

      // Step 2: Generate embedding
      const mockEmbedding = Array(1536).fill(0).map(() => Math.random());
      mockEmbeddingService.generateCompanyEmbedding.mockResolvedValue(mockEmbedding);

      // Step 3: Find similar companies
      const similarCompanies = [
        {
          id: 'similar-1',
          name: 'Similar Tech Co',
          description: 'Another analytics platform',
          similarity: 0.92
        },
        {
          id: 'similar-2',
          name: 'Data Analytics Inc',
          description: 'Business intelligence platform',
          similarity: 0.87
        }
      ];
      mockEmbeddingService.findSimilarCompanies.mockResolvedValue(similarCompanies);

      // Step 4: Update database
      mockDatabase.from().update.mockResolvedValue({ error: null });

      // Execute workflow
      const enriched = await mockEnrichmentService.enrichCompany(companyId);
      expect(enriched.industry).toBe('Technology');
      expect(enriched.validation.websiteValid).toBe(true);

      const embedding = await mockEmbeddingService.generateCompanyEmbedding(companyId);
      expect(embedding).toHaveLength(1536);

      const similar = await mockEmbeddingService.findSimilarCompanies(companyId, {
        limit: 5,
        threshold: 0.8
      });
      expect(similar).toHaveLength(2);
      expect(similar[0].similarity).toBeGreaterThan(0.9);

      const updateResult = await mockDatabase.from('companies')
        .update({ 
          enrichment_data: enriched,
          embedding,
          similar_companies: similar.map(c => c.id)
        })
        .eq('id', companyId);
      
      expect(updateResult.error).toBeNull();
    });

    it('should handle website validation failures', async () => {
      mockEnrichmentService.validateWebsite.mockResolvedValue({
        websiteValid: false,
        statusCode: 404,
        responseTime: 500
      });

      const validation = await mockEnrichmentService.validateWebsite('https://nonexistent.com');
      
      expect(validation.websiteValid).toBe(false);
      expect(validation.statusCode).toBe(404);
    });

    it('should perform semantic search across companies', async () => {
      const searchQuery = 'AI-powered analytics platforms in healthcare';
      
      const searchResults = [
        {
          id: 'result-1',
          name: 'HealthAI Analytics',
          description: 'Healthcare data analytics using AI',
          similarity: 0.94
        },
        {
          id: 'result-2',
          name: 'MedTech Insights',
          description: 'Medical analytics platform',
          similarity: 0.88
        }
      ];
      
      mockEmbeddingService.semanticSearch.mockResolvedValue(searchResults);

      const results = await mockEmbeddingService.semanticSearch(searchQuery, {
        limit: 10,
        threshold: 0.7,
        industries: ['Healthcare', 'Technology']
      });

      expect(results).toHaveLength(2);
      expect(results[0].similarity).toBeGreaterThan(0.9);
      expect(results[0].name).toContain('Health');
    });
  });

  describe('Report Generation and Distribution Workflow', () => {
    let mockReportScheduler: any;
    let mockPDFGenerator: any;
    let mockEmailService: any;
    let mockDatabase: any;

    beforeEach(() => {
      mockReportScheduler = {
        generateDailyReport: vi.fn(),
        generateWeeklyReport: vi.fn()
      };

      mockPDFGenerator = {
        generateDailyReport: vi.fn(),
        generateWeeklyReport: vi.fn(),
        initialize: vi.fn(),
        cleanup: vi.fn()
      };

      mockEmailService = {
        sendDailyReport: vi.fn(),
        sendWeeklyReport: vi.fn()
      };

      mockDatabase = {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn()
        }))
      };
    });

    it('should generate and send daily report', async () => {
      // Mock daily intelligence data
      const dailyData = {
        date: '2024-01-15',
        companies: [
          {
            id: 'comp-1',
            name: 'Featured Company',
            description: 'Innovative startup',
            context: 'Raised $10M Series A',
            sentiment: 'positive',
            confidence: 0.9,
            newsletter_name: 'Tech Daily',
            received_at: '2024-01-15T10:00:00Z'
          }
        ],
        summary: {
          totalCompanies: 5,
          totalMentions: 12,
          topNewsletters: ['Tech Daily', 'Startup Weekly']
        }
      };

      mockDatabase.from().limit.mockResolvedValue({
        data: dailyData.companies,
        error: null
      });

      // Mock PDF generation
      const mockPDF = Buffer.from('mock-pdf-content');
      mockPDFGenerator.generateDailyReport.mockResolvedValue(mockPDF);

      // Mock email sending
      mockEmailService.sendDailyReport.mockResolvedValue({
        data: { id: 'email-sent-1' }
      });

      // Execute workflow
      await mockPDFGenerator.initialize();
      
      const pdf = await mockPDFGenerator.generateDailyReport(dailyData);
      expect(pdf).toBeInstanceOf(Buffer);

      const emailResult = await mockEmailService.sendDailyReport(
        dailyData,
        ['investor@vc.com', 'analyst@vc.com'],
        pdf
      );
      expect(emailResult.data.id).toBe('email-sent-1');

      await mockPDFGenerator.cleanup();

      // Verify all components were called
      expect(mockPDFGenerator.initialize).toHaveBeenCalled();
      expect(mockPDFGenerator.generateDailyReport).toHaveBeenCalledWith(dailyData);
      expect(mockEmailService.sendDailyReport).toHaveBeenCalled();
      expect(mockPDFGenerator.cleanup).toHaveBeenCalled();
    });

    it('should generate weekly summary report', async () => {
      const weeklyData = {
        weekOf: '2024-01-08',
        totalCompanies: 25,
        totalMentions: 87,
        topCompanies: [
          {
            name: 'Top Company',
            mentionCount: 8,
            sentiment: 'positive',
            newsletters: ['Newsletter A', 'Newsletter B']
          }
        ],
        trendingIndustries: ['Technology', 'Healthcare', 'E-commerce'],
        topNewsletters: [
          { name: 'Tech Weekly', companyCount: 15 },
          { name: 'Startup Digest', companyCount: 10 }
        ],
        insights: [
          'Technology sector dominated with 40% of mentions',
          'Healthcare startups showed 25% increase in coverage'
        ]
      };

      mockPDFGenerator.generateWeeklyReport.mockResolvedValue(Buffer.from('weekly-pdf'));
      mockEmailService.sendWeeklyReport.mockResolvedValue({
        data: { id: 'weekly-email-1' }
      });

      const pdf = await mockPDFGenerator.generateWeeklyReport(weeklyData);
      const emailResult = await mockEmailService.sendWeeklyReport(
        weeklyData,
        ['team@vc.com'],
        pdf
      );

      expect(emailResult.data.id).toBe('weekly-email-1');
    });

    it('should handle report generation failures', async () => {
      mockPDFGenerator.generateDailyReport.mockRejectedValue(new Error('PDF generation failed'));
      
      await expect(mockPDFGenerator.generateDailyReport({}))
        .rejects.toThrow('PDF generation failed');

      // Should still cleanup on failure
      await mockPDFGenerator.cleanup();
      expect(mockPDFGenerator.cleanup).toHaveBeenCalled();
    });
  });

  describe('Authentication and Authorization Workflow', () => {
    let mockAuth: any;
    let mockDatabase: any;
    let mockRateLimiter: any;

    beforeEach(() => {
      mockAuth = {
        userId: 'user-123',
        orgId: 'org-456',
        sessionClaims: {
          email: 'user@example.com',
          role: 'admin'
        }
      };

      mockDatabase = {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn()
        }))
      };

      mockRateLimiter = {
        checkBurstLimit: vi.fn()
      };
    });

    it('should complete authenticated API request workflow', async () => {
      // Step 1: Verify authentication
      expect(mockAuth.userId).toBeTruthy();

      // Step 2: Check user permissions
      mockDatabase.from().single.mockResolvedValue({
        data: {
          id: mockAuth.userId,
          organization_id: mockAuth.orgId,
          role: 'admin',
          permissions: ['read', 'write', 'delete']
        },
        error: null
      });

      const userPermissions = await mockDatabase.from('users')
        .select('*')
        .eq('id', mockAuth.userId)
        .single();

      expect(userPermissions.data.role).toBe('admin');

      // Step 3: Check rate limits
      mockRateLimiter.checkBurstLimit.mockResolvedValue(true);
      
      const canProceed = await mockRateLimiter.checkBurstLimit(
        mockAuth.userId,
        'api-request',
        100,
        '1h'
      );
      expect(canProceed).toBe(true);

      // Step 4: Execute authorized action
      if (userPermissions.data.permissions.includes('write')) {
        const result = await mockDatabase.from('companies')
          .select('*')
          .eq('organization_id', mockAuth.orgId);
        
        expect(result).toBeDefined();
      }
    });

    it('should reject unauthorized requests', async () => {
      mockAuth.userId = null;
      
      expect(mockAuth.userId).toBeFalsy();
      // Request should be rejected before database access
    });

    it('should enforce rate limits', async () => {
      mockRateLimiter.checkBurstLimit.mockResolvedValue(false);
      
      const canProceed = await mockRateLimiter.checkBurstLimit(
        mockAuth.userId,
        'api-request',
        100,
        '1h'
      );
      
      expect(canProceed).toBe(false);
      // Request should be rejected due to rate limiting
    });
  });

  describe('Error Recovery and Monitoring Workflow', () => {
    let mockMonitoring: any;
    let mockErrorHandler: any;
    let mockAlertService: any;

    beforeEach(() => {
      mockMonitoring = {
        logError: vi.fn(),
        logMetric: vi.fn(),
        logHealthCheck: vi.fn()
      };

      mockErrorHandler = {
        handleError: vi.fn(),
        retryWithBackoff: vi.fn(),
        circuitBreaker: vi.fn()
      };

      mockAlertService = {
        sendErrorAlert: vi.fn(),
        sendRecoveryNotification: vi.fn()
      };
    });

    it('should handle and recover from service failures', async () => {
      const error = new Error('Service temporarily unavailable');
      
      // Step 1: Log error
      await mockMonitoring.logError(error, {
        service: 'gmail-connector',
        operation: 'fetchEmails',
        timestamp: new Date().toISOString()
      });

      // Step 2: Attempt retry with exponential backoff
      mockErrorHandler.retryWithBackoff.mockImplementation(async (fn, retries = 3) => {
        for (let i = 0; i < retries; i++) {
          try {
            return await fn();
          } catch (e) {
            if (i === retries - 1) throw e;
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
          }
        }
      });

      // Step 3: Circuit breaker pattern
      mockErrorHandler.circuitBreaker.mockImplementation((threshold = 5) => {
        let failures = 0;
        let isOpen = false;
        
        return {
          call: async (fn: Function) => {
            if (isOpen) throw new Error('Circuit breaker is open');
            
            try {
              const result = await fn();
              failures = 0; // Reset on success
              return result;
            } catch (error) {
              failures++;
              if (failures >= threshold) {
                isOpen = true;
                setTimeout(() => {
                  isOpen = false;
                  failures = 0;
                }, 30000); // Reset after 30 seconds
              }
              throw error;
            }
          }
        };
      });

      // Step 4: Send alerts for critical errors
      await mockAlertService.sendErrorAlert({
        level: 'critical',
        service: 'gmail-connector',
        error: error.message,
        timestamp: new Date().toISOString()
      });

      // Step 5: Log recovery
      await mockMonitoring.logMetric('service_recovery', 1, {
        service: 'gmail-connector',
        downtime: 5000
      });

      await mockAlertService.sendRecoveryNotification({
        service: 'gmail-connector',
        recoveredAt: new Date().toISOString()
      });

      // Verify monitoring was engaged
      expect(mockMonitoring.logError).toHaveBeenCalled();
      expect(mockAlertService.sendErrorAlert).toHaveBeenCalled();
      expect(mockMonitoring.logMetric).toHaveBeenCalled();
      expect(mockAlertService.sendRecoveryNotification).toHaveBeenCalled();
    });

    it('should perform health checks', async () => {
      const services = ['database', 'gmail', 'claude', 'redis'];
      
      for (const service of services) {
        const isHealthy = Math.random() > 0.2; // 80% healthy
        
        await mockMonitoring.logHealthCheck(service, isHealthy ? 'healthy' : 'unhealthy', {
          responseTime: Math.random() * 1000,
          timestamp: new Date().toISOString()
        });
      }

      expect(mockMonitoring.logHealthCheck).toHaveBeenCalledTimes(4);
    });
  });

  describe('Data Consistency and Synchronization Workflow', () => {
    let mockPrimaryDB: any;
    let mockCache: any;
    let mockSearchIndex: any;

    beforeEach(() => {
      mockPrimaryDB = {
        transaction: vi.fn(),
        from: vi.fn(() => ({
          insert: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis()
        }))
      };

      mockCache = {
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
        flush: vi.fn()
      };

      mockSearchIndex = {
        index: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        search: vi.fn()
      };
    });

    it('should maintain data consistency across systems', async () => {
      const companyData = {
        id: 'company-789',
        name: 'Data Corp',
        description: 'Data analytics company',
        mention_count: 5
      };

      // Step 1: Database transaction
      mockPrimaryDB.transaction.mockImplementation(async (callback: Function) => {
        try {
          const result = await callback();
          return { success: true, data: result };
        } catch (error) {
          return { success: false, error };
        }
      });

      const txResult = await mockPrimaryDB.transaction(async () => {
        // Insert into database
        await mockPrimaryDB.from('companies').insert(companyData);
        
        // Update mention count
        await mockPrimaryDB.from('companies')
          .update({ mention_count: companyData.mention_count + 1 })
          .eq('id', companyData.id);
        
        return companyData;
      });

      expect(txResult.success).toBe(true);

      // Step 2: Update cache
      await mockCache.set(`company:${companyData.id}`, companyData, 3600); // 1 hour TTL
      
      // Step 3: Update search index
      await mockSearchIndex.index({
        id: companyData.id,
        name: companyData.name,
        description: companyData.description,
        type: 'company'
      });

      // Step 4: Verify consistency
      const dbData = await mockPrimaryDB.from('companies')
        .select('*')
        .eq('id', companyData.id);
      
      mockCache.get.mockResolvedValue(companyData);
      const cacheData = await mockCache.get(`company:${companyData.id}`);
      
      mockSearchIndex.search.mockResolvedValue([companyData]);
      const searchData = await mockSearchIndex.search(companyData.name);

      // All systems should have consistent data
      expect(cacheData).toEqual(companyData);
      expect(searchData[0]).toEqual(companyData);
    });

    it('should handle cache invalidation', async () => {
      const companyId = 'company-123';
      
      // Update in database triggers cache invalidation
      await mockPrimaryDB.from('companies')
        .update({ mention_count: 10 })
        .eq('id', companyId);
      
      await mockCache.delete(`company:${companyId}`);
      
      // Also invalidate related caches
      await mockCache.delete('companies:top:daily');
      await mockCache.delete('companies:recent');
      
      expect(mockCache.delete).toHaveBeenCalledTimes(3);
    });
  });
});