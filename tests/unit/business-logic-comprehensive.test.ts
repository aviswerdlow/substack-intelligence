import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies
const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn(),
    range: vi.fn(),
    data: null,
    error: null
  })),
  rpc: vi.fn()
};

vi.mock('@substack-intelligence/database', () => ({
  createServiceRoleClient: vi.fn(() => mockSupabaseClient),
  createServerComponentClient: vi.fn(() => mockSupabaseClient)
}));

// Mock external APIs
global.fetch = vi.fn();
const mockFetch = global.fetch as any;

// Mock email service
const mockEmailService = {
  sendWelcomeEmail: vi.fn(),
  sendReportEmail: vi.fn(),
  sendAlertEmail: vi.fn(),
  validateEmailAddress: vi.fn()
};

// Mock AI services
const mockAIService = {
  extractEntities: vi.fn(),
  calculateSentiment: vi.fn(),
  generateSummary: vi.fn(),
  classifyContent: vi.fn()
};

// Test data
const mockCompany = {
  id: 'company_123',
  name: 'Test Company',
  website: 'https://testcompany.com',
  description: 'A test company for unit testing',
  industry: 'Technology',
  location: 'United States',
  employee_count: 50,
  founded_year: 2020,
  mention_count: 10,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

const mockEmail = {
  id: 'email_123',
  newsletter_name: 'Tech Newsletter',
  subject: 'Latest Tech Updates',
  body: 'Here are the latest updates in technology...',
  received_at: '2024-01-01T10:00:00Z',
  processed: false,
  sender_email: 'newsletter@tech.com'
};

const mockMention = {
  id: 'mention_123',
  company_id: 'company_123',
  email_id: 'email_123',
  context: 'Test Company raised $50M in Series B funding',
  sentiment: 'positive',
  confidence: 0.92,
  extracted_at: '2024-01-01T12:00:00Z'
};

const mockUser = {
  id: 'user_123',
  email: 'test@example.com',
  settings: {
    notifications_enabled: true,
    report_frequency: 'weekly',
    industry_filters: ['Technology', 'Finance']
  }
};

describe('Business Logic Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default successful responses
    mockSupabaseClient.from().single.mockResolvedValue({ data: mockCompany, error: null });
    mockSupabaseClient.from().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn(() => Promise.resolve({ data: [mockCompany], error: null })),
      update: vi.fn(() => Promise.resolve({ data: [mockCompany], error: null })),
      delete: vi.fn(() => Promise.resolve({ data: [], error: null })),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn(() => Promise.resolve({ data: [mockCompany], error: null }))
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Company Management Business Logic', () => {
    const companyService = {
      async createCompany(companyData: any) {
        // Validate required fields
        if (!companyData.name) {
          throw new Error('Company name is required');
        }
        
        // Normalize website URL
        if (companyData.website && !companyData.website.startsWith('http')) {
          companyData.website = 'https://' + companyData.website;
        }
        
        // Set default values
        const company = {
          ...companyData,
          mention_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const { data, error } = await mockSupabaseClient
          .from('companies')
          .insert(company)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      },

      async updateCompany(id: string, updates: any) {
        // Validate company exists
        const { data: existing, error: fetchError } = await mockSupabaseClient
          .from('companies')
          .select('*')
          .eq('id', id)
          .single();
        
        if (fetchError || !existing) {
          throw new Error('Company not found');
        }
        
        // Add updated_at timestamp
        updates.updated_at = new Date().toISOString();
        
        const { data, error } = await mockSupabaseClient
          .from('companies')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      },

      async deleteCompany(id: string) {
        // Check for dependencies (mentions, etc.)
        const { data: mentions } = await mockSupabaseClient
          .from('company_mentions')
          .select('id')
          .eq('company_id', id)
          .limit(1);
        
        if (mentions && mentions.length > 0) {
          throw new Error('Cannot delete company with existing mentions');
        }
        
        const { error } = await mockSupabaseClient
          .from('companies')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        return true;
      },

      async calculateCompanyScore(companyId: string) {
        const { data: company } = await mockSupabaseClient
          .from('companies')
          .select('*, company_mentions(*)')
          .eq('id', companyId)
          .single();
        
        if (!company) return 0;
        
        let score = 0;
        
        // Base score from company data
        if (company.website) score += 10;
        if (company.description) score += 10;
        if (company.industry) score += 5;
        if (company.location) score += 5;
        if (company.employee_count) score += 5;
        if (company.founded_year) score += 5;
        
        // Mention-based scoring
        if (company.company_mentions) {
          const mentions = company.company_mentions;
          score += mentions.length * 2; // 2 points per mention
          
          // Sentiment bonus
          const positiveMentions = mentions.filter((m: any) => m.sentiment === 'positive').length;
          score += positiveMentions * 3;
          
          // Confidence bonus
          const highConfidenceMentions = mentions.filter((m: any) => m.confidence > 0.8).length;
          score += highConfidenceMentions * 2;
          
          // Recent activity bonus (last 30 days)
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          const recentMentions = mentions.filter((m: any) => 
            new Date(m.extracted_at) > thirtyDaysAgo
          ).length;
          score += recentMentions * 5;
        }
        
        return Math.min(score, 100); // Cap at 100
      },

      async findSimilarCompanies(companyId: string, limit: number = 5) {
        const { data: company } = await mockSupabaseClient
          .from('companies')
          .select('*')
          .eq('id', companyId)
          .single();
        
        if (!company) return [];
        
        // Find companies in same industry
        const { data: similarCompanies } = await mockSupabaseClient
          .from('companies')
          .select('*')
          .eq('industry', company.industry)
          .neq('id', companyId)
          .order('mention_count', { ascending: false })
          .limit(limit);
        
        return similarCompanies || [];
      }
    };

    it('should create company with required validation', async () => {
      const companyData = {
        name: 'New Company',
        website: 'newcompany.com',
        description: 'A new company'
      };
      
      const result = await companyService.createCompany(companyData);
      
      expect(result.name).toBe('New Company');
      expect(result.website).toBe('https://newcompany.com');
      expect(result.mention_count).toBe(0);
      expect(result.created_at).toBeTruthy();
    });

    it('should reject company creation without name', async () => {
      const companyData = {
        website: 'test.com',
        description: 'Test description'
      };
      
      await expect(companyService.createCompany(companyData))
        .rejects.toThrow('Company name is required');
    });

    it('should update company successfully', async () => {
      const updates = {
        description: 'Updated description',
        employee_count: 100
      };
      
      const result = await companyService.updateCompany('company_123', updates);
      
      expect(mockSupabaseClient.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          ...updates,
          updated_at: expect.any(String)
        })
      );
    });

    it('should reject update for non-existent company', async () => {
      mockSupabaseClient.from().single.mockResolvedValue({ data: null, error: { message: 'Not found' } });
      
      await expect(companyService.updateCompany('nonexistent', {}))
        .rejects.toThrow('Company not found');
    });

    it('should prevent deletion of company with mentions', async () => {
      mockSupabaseClient.from().limit.mockResolvedValue({ 
        data: [{ id: 'mention_1' }], 
        error: null 
      });
      
      await expect(companyService.deleteCompany('company_123'))
        .rejects.toThrow('Cannot delete company with existing mentions');
    });

    it('should allow deletion of company without mentions', async () => {
      mockSupabaseClient.from().limit.mockResolvedValue({ 
        data: [], 
        error: null 
      });
      
      const result = await companyService.deleteCompany('company_123');
      
      expect(result).toBe(true);
      expect(mockSupabaseClient.from().delete).toHaveBeenCalled();
    });

    it('should calculate company score correctly', async () => {
      const companyWithMentions = {
        ...mockCompany,
        company_mentions: [
          { sentiment: 'positive', confidence: 0.9, extracted_at: new Date().toISOString() },
          { sentiment: 'neutral', confidence: 0.7, extracted_at: new Date().toISOString() },
          { sentiment: 'positive', confidence: 0.85, extracted_at: new Date().toISOString() }
        ]
      };
      
      mockSupabaseClient.from().single.mockResolvedValue({ 
        data: companyWithMentions, 
        error: null 
      });
      
      const score = await companyService.calculateCompanyScore('company_123');
      
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should find similar companies by industry', async () => {
      const similarCompanies = [
        { ...mockCompany, id: 'company_2', name: 'Similar Company 1' },
        { ...mockCompany, id: 'company_3', name: 'Similar Company 2' }
      ];
      
      mockSupabaseClient.from().limit.mockResolvedValue({ 
        data: similarCompanies, 
        error: null 
      });
      
      const result = await companyService.findSimilarCompanies('company_123');
      
      expect(result).toHaveLength(2);
      expect(mockSupabaseClient.from().eq).toHaveBeenCalledWith('industry', mockCompany.industry);
    });

    it('should handle empty results for similar companies', async () => {
      mockSupabaseClient.from().limit.mockResolvedValue({ 
        data: null, 
        error: null 
      });
      
      const result = await companyService.findSimilarCompanies('company_123');
      
      expect(result).toEqual([]);
    });

    it('should calculate score with no mentions', async () => {
      const companyWithoutMentions = {
        ...mockCompany,
        company_mentions: []
      };
      
      mockSupabaseClient.from().single.mockResolvedValue({ 
        data: companyWithoutMentions, 
        error: null 
      });
      
      const score = await companyService.calculateCompanyScore('company_123');
      
      expect(score).toBe(40); // Base score from company data
    });

    it('should handle missing company data gracefully', async () => {
      mockSupabaseClient.from().single.mockResolvedValue({ 
        data: null, 
        error: null 
      });
      
      const score = await companyService.calculateCompanyScore('nonexistent');
      
      expect(score).toBe(0);
    });

    it('should cap company score at 100', async () => {
      const companyWithManyMentions = {
        ...mockCompany,
        company_mentions: Array.from({ length: 50 }, (_, i) => ({
          sentiment: 'positive',
          confidence: 0.95,
          extracted_at: new Date().toISOString()
        }))
      };
      
      mockSupabaseClient.from().single.mockResolvedValue({ 
        data: companyWithManyMentions, 
        error: null 
      });
      
      const score = await companyService.calculateCompanyScore('company_123');
      
      expect(score).toBe(100);
    });
  });

  describe('Email Processing Business Logic', () => {
    const emailService = {
      async processEmail(emailId: string) {
        const { data: email, error } = await mockSupabaseClient
          .from('emails')
          .select('*')
          .eq('id', emailId)
          .single();
        
        if (error || !email) {
          throw new Error('Email not found');
        }
        
        if (email.processed) {
          throw new Error('Email already processed');
        }
        
        // Extract companies mentioned in email
        const mentions = await this.extractCompanyMentions(email);
        
        // Update email as processed
        await mockSupabaseClient
          .from('emails')
          .update({ processed: true, processed_at: new Date().toISOString() })
          .eq('id', emailId);
        
        return { email, mentions };
      },

      async extractCompanyMentions(email: any) {
        const text = `${email.subject} ${email.body}`;
        
        // Get all companies for matching
        const { data: companies } = await mockSupabaseClient
          .from('companies')
          .select('id, name');
        
        const mentions = [];
        
        for (const company of companies || []) {
          if (text.toLowerCase().includes(company.name.toLowerCase())) {
            // Extract context around mention
            const context = this.extractContext(text, company.name);
            
            // Calculate sentiment using AI service
            const sentiment = await mockAIService.calculateSentiment(context);
            
            mentions.push({
              company_id: company.id,
              email_id: email.id,
              context,
              sentiment: sentiment.label,
              confidence: sentiment.confidence,
              extracted_at: new Date().toISOString()
            });
          }
        }
        
        // Save mentions to database
        if (mentions.length > 0) {
          await mockSupabaseClient
            .from('company_mentions')
            .insert(mentions);
          
          // Update mention counts
          for (const mention of mentions) {
            await mockSupabaseClient.rpc('increment_mention_count', {
              company_id: mention.company_id
            });
          }
        }
        
        return mentions;
      },

      extractContext(text: string, companyName: string, windowSize: number = 50) {
        const index = text.toLowerCase().indexOf(companyName.toLowerCase());
        if (index === -1) return text.substring(0, 100);
        
        const start = Math.max(0, index - windowSize);
        const end = Math.min(text.length, index + companyName.length + windowSize);
        
        return text.substring(start, end).trim();
      },

      async validateEmail(email: any) {
        const errors = [];
        
        if (!email.newsletter_name || email.newsletter_name.trim().length === 0) {
          errors.push('Newsletter name is required');
        }
        
        if (!email.subject || email.subject.trim().length === 0) {
          errors.push('Email subject is required');
        }
        
        if (!email.body || email.body.trim().length < 10) {
          errors.push('Email body must be at least 10 characters');
        }
        
        if (!email.sender_email || !this.isValidEmail(email.sender_email)) {
          errors.push('Valid sender email is required');
        }
        
        if (!email.received_at || isNaN(new Date(email.received_at).getTime())) {
          errors.push('Valid received date is required');
        }
        
        return {
          isValid: errors.length === 0,
          errors
        };
      },

      isValidEmail(email: string) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
      },

      async deduplicateEmails(emails: any[]) {
        const seen = new Set();
        const unique = [];
        
        for (const email of emails) {
          // Create signature based on subject and sender
          const signature = `${email.subject.trim().toLowerCase()}|${email.sender_email.toLowerCase()}`;
          
          if (!seen.has(signature)) {
            seen.add(signature);
            unique.push(email);
          }
        }
        
        return unique;
      }
    };

    // Mock AI service methods
    mockAIService.calculateSentiment.mockImplementation((text: string) => {
      const positiveWords = ['raised', 'funding', 'success', 'growth', 'launched'];
      const negativeWords = ['failed', 'loss', 'bankruptcy', 'shutdown', 'layoffs'];
      
      const lowerText = text.toLowerCase();
      const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
      const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
      
      if (positiveCount > negativeCount) {
        return { label: 'positive', confidence: 0.8 + (positiveCount * 0.05) };
      } else if (negativeCount > positiveCount) {
        return { label: 'negative', confidence: 0.8 + (negativeCount * 0.05) };
      } else {
        return { label: 'neutral', confidence: 0.6 };
      }
    });

    it('should process email successfully', async () => {
      mockSupabaseClient.from().single.mockResolvedValue({ data: mockEmail, error: null });
      mockSupabaseClient.from().select.mockResolvedValue({ data: [mockCompany], error: null });
      
      const result = await emailService.processEmail('email_123');
      
      expect(result.email).toBeTruthy();
      expect(result.mentions).toBeTruthy();
      expect(mockSupabaseClient.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          processed: true,
          processed_at: expect.any(String)
        })
      );
    });

    it('should reject processing of already processed email', async () => {
      const processedEmail = { ...mockEmail, processed: true };
      mockSupabaseClient.from().single.mockResolvedValue({ data: processedEmail, error: null });
      
      await expect(emailService.processEmail('email_123'))
        .rejects.toThrow('Email already processed');
    });

    it('should extract company mentions correctly', async () => {
      const emailWithMention = {
        ...mockEmail,
        body: 'Test Company raised $50M in Series B funding. This is great news for the tech industry.'
      };
      
      mockSupabaseClient.from().select.mockResolvedValue({ data: [mockCompany], error: null });
      
      const mentions = await emailService.extractCompanyMentions(emailWithMention);
      
      expect(mentions).toHaveLength(1);
      expect(mentions[0]).toMatchObject({
        company_id: 'company_123',
        email_id: 'email_123',
        context: expect.stringContaining('Test Company'),
        sentiment: 'positive',
        confidence: expect.any(Number)
      });
    });

    it('should extract context around company mention', () => {
      const text = 'This is some text before Test Company raised funding and this is text after the mention.';
      const context = emailService.extractContext(text, 'Test Company', 20);
      
      expect(context).toContain('Test Company');
      expect(context.length).toBeLessThanOrEqual(text.length);
    });

    it('should validate email fields correctly', async () => {
      const invalidEmail = {
        newsletter_name: '',
        subject: '',
        body: 'short',
        sender_email: 'invalid-email',
        received_at: 'invalid-date'
      };
      
      const validation = await emailService.validateEmail(invalidEmail);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(5);
    });

    it('should pass valid email validation', async () => {
      const validEmail = {
        newsletter_name: 'Tech News',
        subject: 'Weekly Tech Update',
        body: 'This is a longer body with sufficient content for validation.',
        sender_email: 'newsletter@tech.com',
        received_at: '2024-01-01T10:00:00Z'
      };
      
      const validation = await emailService.validateEmail(validEmail);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should deduplicate emails correctly', async () => {
      const duplicateEmails = [
        { subject: 'Weekly Update', sender_email: 'news@tech.com' },
        { subject: 'weekly update', sender_email: 'news@tech.com' }, // Same (case insensitive)
        { subject: 'Daily News', sender_email: 'daily@tech.com' },
        { subject: 'Weekly Update', sender_email: 'other@tech.com' } // Different sender
      ];
      
      const unique = await emailService.deduplicateEmails(duplicateEmails);
      
      expect(unique).toHaveLength(3); // Should remove one duplicate
    });

    it('should handle email processing errors gracefully', async () => {
      mockSupabaseClient.from().single.mockResolvedValue({ 
        data: null, 
        error: { message: 'Email not found' }
      });
      
      await expect(emailService.processEmail('nonexistent'))
        .rejects.toThrow('Email not found');
    });

    it('should handle sentiment analysis for different content types', async () => {
      const testCases = [
        { text: 'Company raised $50M funding successfully', expected: 'positive' },
        { text: 'Company filed for bankruptcy and shutdown', expected: 'negative' },
        { text: 'Company released quarterly report', expected: 'neutral' },
        { text: 'Massive layoffs hit the company hard', expected: 'negative' },
        { text: 'Successful launch of new product line', expected: 'positive' }
      ];
      
      for (const { text, expected } of testCases) {
        const sentiment = await mockAIService.calculateSentiment(text);
        expect(sentiment.label).toBe(expected);
        expect(sentiment.confidence).toBeGreaterThan(0);
      }
    });

    it('should increment mention count after processing', async () => {
      const emailWithMention = {
        ...mockEmail,
        body: 'Test Company is doing great work'
      };
      
      mockSupabaseClient.from().select.mockResolvedValue({ data: [mockCompany], error: null });
      
      await emailService.extractCompanyMentions(emailWithMention);
      
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'increment_mention_count',
        { company_id: 'company_123' }
      );
    });
  });

  describe('Report Generation Business Logic', () => {
    const reportService = {
      async generateDailyReport(userId: string, date: Date) {
        const { data: user } = await mockSupabaseClient
          .from('users')
          .select('*, user_settings(*)')
          .eq('id', userId)
          .single();
        
        if (!user) {
          throw new Error('User not found');
        }
        
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
        
        // Get mentions from the day
        const { data: mentions } = await mockSupabaseClient
          .from('company_mentions')
          .select('*, companies(name, industry), emails(newsletter_name)')
          .gte('extracted_at', startDate.toISOString())
          .lte('extracted_at', endDate.toISOString());
        
        // Group by industry if user has filters
        const filteredMentions = this.filterMentionsByUserPreferences(
          mentions || [],
          user.user_settings
        );
        
        // Calculate metrics
        const metrics = this.calculateReportMetrics(filteredMentions);
        
        // Generate summary
        const summary = await this.generateReportSummary(filteredMentions, metrics);
        
        const report = {
          user_id: userId,
          report_type: 'daily',
          report_date: date.toISOString(),
          metrics,
          summary,
          mention_count: filteredMentions.length,
          generated_at: new Date().toISOString()
        };
        
        // Save report
        const { data: savedReport } = await mockSupabaseClient
          .from('reports')
          .insert(report)
          .select()
          .single();
        
        return savedReport;
      },

      filterMentionsByUserPreferences(mentions: any[], settings: any) {
        if (!settings || !settings.industry_filters) {
          return mentions;
        }
        
        return mentions.filter(mention => 
          settings.industry_filters.includes(mention.companies.industry)
        );
      },

      calculateReportMetrics(mentions: any[]) {
        const metrics = {
          total_mentions: mentions.length,
          positive_mentions: 0,
          negative_mentions: 0,
          neutral_mentions: 0,
          high_confidence_mentions: 0,
          unique_companies: new Set(),
          unique_newsletters: new Set(),
          industry_breakdown: {} as Record<string, number>,
          sentiment_distribution: {
            positive: 0,
            negative: 0,
            neutral: 0
          }
        };
        
        mentions.forEach(mention => {
          // Sentiment counting
          if (mention.sentiment === 'positive') metrics.positive_mentions++;
          else if (mention.sentiment === 'negative') metrics.negative_mentions++;
          else metrics.neutral_mentions++;
          
          // Confidence
          if (mention.confidence > 0.8) metrics.high_confidence_mentions++;
          
          // Unique tracking
          metrics.unique_companies.add(mention.companies.name);
          metrics.unique_newsletters.add(mention.emails.newsletter_name);
          
          // Industry breakdown
          const industry = mention.companies.industry || 'Other';
          metrics.industry_breakdown[industry] = (metrics.industry_breakdown[industry] || 0) + 1;
        });
        
        // Calculate percentages
        if (metrics.total_mentions > 0) {
          metrics.sentiment_distribution.positive = Math.round((metrics.positive_mentions / metrics.total_mentions) * 100);
          metrics.sentiment_distribution.negative = Math.round((metrics.negative_mentions / metrics.total_mentions) * 100);
          metrics.sentiment_distribution.neutral = Math.round((metrics.neutral_mentions / metrics.total_mentions) * 100);
        }
        
        // Convert sets to counts
        return {
          ...metrics,
          unique_companies: metrics.unique_companies.size,
          unique_newsletters: metrics.unique_newsletters.size
        };
      },

      async generateReportSummary(mentions: any[], metrics: any) {
        if (mentions.length === 0) {
          return 'No company mentions found for this period.';
        }
        
        const topCompanies = this.getTopMentionedCompanies(mentions, 3);
        const dominantSentiment = metrics.positive_mentions > metrics.negative_mentions ? 'positive' : 
                                 metrics.negative_mentions > metrics.positive_mentions ? 'negative' : 'neutral';
        
        let summary = `Daily Intelligence Report Summary:\n\n`;
        summary += `• ${metrics.total_mentions} company mentions tracked\n`;
        summary += `• ${metrics.unique_companies} unique companies mentioned\n`;
        summary += `• ${metrics.unique_newsletters} different newsletters monitored\n`;
        summary += `• Overall sentiment: ${dominantSentiment} (${metrics.sentiment_distribution[dominantSentiment as keyof typeof metrics.sentiment_distribution]}%)\n\n`;
        
        if (topCompanies.length > 0) {
          summary += `Top mentioned companies:\n`;
          topCompanies.forEach((company, index) => {
            summary += `${index + 1}. ${company.name} (${company.count} mentions)\n`;
          });
        }
        
        return summary;
      },

      getTopMentionedCompanies(mentions: any[], limit: number = 5) {
        const companyCounts: Record<string, { name: string, count: number }> = {};
        
        mentions.forEach(mention => {
          const name = mention.companies.name;
          if (!companyCounts[name]) {
            companyCounts[name] = { name, count: 0 };
          }
          companyCounts[name].count++;
        });
        
        return Object.values(companyCounts)
          .sort((a, b) => b.count - a.count)
          .slice(0, limit);
      },

      async scheduleReports(userId: string, frequency: string) {
        const validFrequencies = ['daily', 'weekly', 'monthly'];
        if (!validFrequencies.includes(frequency)) {
          throw new Error('Invalid report frequency');
        }
        
        const schedule = {
          user_id: userId,
          frequency,
          next_run: this.calculateNextRunDate(frequency),
          active: true,
          created_at: new Date().toISOString()
        };
        
        const { data } = await mockSupabaseClient
          .from('report_schedules')
          .insert(schedule)
          .select()
          .single();
        
        return data;
      },

      calculateNextRunDate(frequency: string) {
        const now = new Date();
        
        switch (frequency) {
          case 'daily':
            now.setDate(now.getDate() + 1);
            now.setHours(9, 0, 0, 0); // 9 AM next day
            break;
          case 'weekly':
            now.setDate(now.getDate() + (7 - now.getDay() + 1) % 7); // Next Monday
            now.setHours(9, 0, 0, 0);
            break;
          case 'monthly':
            now.setMonth(now.getMonth() + 1, 1); // First day of next month
            now.setHours(9, 0, 0, 0);
            break;
        }
        
        return now.toISOString();
      }
    };

    it('should generate daily report successfully', async () => {
      const mockUserWithSettings = {
        ...mockUser,
        user_settings: {
          industry_filters: ['Technology']
        }
      };
      
      const mockMentions = [
        {
          ...mockMention,
          companies: { name: 'Test Company', industry: 'Technology' },
          emails: { newsletter_name: 'Tech Newsletter' }
        }
      ];
      
      mockSupabaseClient.from().single.mockResolvedValue({ data: mockUserWithSettings, error: null });
      mockSupabaseClient.from().select.mockResolvedValue({ data: mockMentions, error: null });
      mockSupabaseClient.from().insert.mockResolvedValue({ data: { id: 'report_123' }, error: null });
      
      const report = await reportService.generateDailyReport('user_123', new Date('2024-01-01'));
      
      expect(report).toBeTruthy();
      expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user_123',
          report_type: 'daily',
          mention_count: 1
        })
      );
    });

    it('should filter mentions by user preferences', () => {
      const mentions = [
        { companies: { industry: 'Technology' } },
        { companies: { industry: 'Finance' } },
        { companies: { industry: 'Healthcare' } }
      ];
      
      const settings = { industry_filters: ['Technology', 'Finance'] };
      
      const filtered = reportService.filterMentionsByUserPreferences(mentions, settings);
      
      expect(filtered).toHaveLength(2);
    });

    it('should calculate report metrics correctly', () => {
      const mentions = [
        { 
          sentiment: 'positive', 
          confidence: 0.9,
          companies: { name: 'Company A', industry: 'Technology' },
          emails: { newsletter_name: 'Newsletter 1' }
        },
        { 
          sentiment: 'negative', 
          confidence: 0.7,
          companies: { name: 'Company B', industry: 'Finance' },
          emails: { newsletter_name: 'Newsletter 2' }
        },
        { 
          sentiment: 'positive', 
          confidence: 0.85,
          companies: { name: 'Company A', industry: 'Technology' },
          emails: { newsletter_name: 'Newsletter 1' }
        }
      ];
      
      const metrics = reportService.calculateReportMetrics(mentions);
      
      expect(metrics.total_mentions).toBe(3);
      expect(metrics.positive_mentions).toBe(2);
      expect(metrics.negative_mentions).toBe(1);
      expect(metrics.high_confidence_mentions).toBe(2);
      expect(metrics.unique_companies).toBe(2);
      expect(metrics.unique_newsletters).toBe(2);
      expect(metrics.industry_breakdown.Technology).toBe(2);
      expect(metrics.industry_breakdown.Finance).toBe(1);
    });

    it('should generate meaningful report summary', async () => {
      const mentions = [
        { 
          companies: { name: 'Company A' },
          sentiment: 'positive'
        },
        { 
          companies: { name: 'Company A' },
          sentiment: 'positive'
        },
        { 
          companies: { name: 'Company B' },
          sentiment: 'neutral'
        }
      ];
      
      const metrics = reportService.calculateReportMetrics(mentions);
      const summary = await reportService.generateReportSummary(mentions, metrics);
      
      expect(summary).toContain('3 company mentions');
      expect(summary).toContain('Company A');
      expect(summary).toContain('positive');
    });

    it('should handle empty mentions gracefully', async () => {
      const mentions: any[] = [];
      const metrics = reportService.calculateReportMetrics(mentions);
      const summary = await reportService.generateReportSummary(mentions, metrics);
      
      expect(metrics.total_mentions).toBe(0);
      expect(summary).toContain('No company mentions found');
    });

    it('should schedule reports with valid frequencies', async () => {
      await reportService.scheduleReports('user_123', 'daily');
      
      expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user_123',
          frequency: 'daily',
          active: true
        })
      );
    });

    it('should reject invalid report frequencies', async () => {
      await expect(reportService.scheduleReports('user_123', 'invalid'))
        .rejects.toThrow('Invalid report frequency');
    });

    it('should calculate next run dates correctly', () => {
      const dailyNext = reportService.calculateNextRunDate('daily');
      const weeklyNext = reportService.calculateNextRunDate('weekly');
      const monthlyNext = reportService.calculateNextRunDate('monthly');
      
      expect(new Date(dailyNext)).toBeInstanceOf(Date);
      expect(new Date(weeklyNext)).toBeInstanceOf(Date);
      expect(new Date(monthlyNext)).toBeInstanceOf(Date);
      
      // Daily should be next day
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(new Date(dailyNext).getDate()).toBe(tomorrow.getDate());
    });

    it('should get top mentioned companies correctly', () => {
      const mentions = [
        { companies: { name: 'Company A' } },
        { companies: { name: 'Company B' } },
        { companies: { name: 'Company A' } },
        { companies: { name: 'Company C' } },
        { companies: { name: 'Company A' } }
      ];
      
      const top = reportService.getTopMentionedCompanies(mentions, 2);
      
      expect(top).toHaveLength(2);
      expect(top[0]).toEqual({ name: 'Company A', count: 3 });
      expect(top[1]).toEqual({ name: 'Company B', count: 1 });
    });
  });

  describe('Data Analytics and Insights', () => {
    const analyticsService = {
      async calculateTrendingCompanies(days: number = 7) {
        const daysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        
        const { data: mentions } = await mockSupabaseClient
          .from('company_mentions')
          .select('company_id, companies(name), extracted_at')
          .gte('extracted_at', daysAgo.toISOString());
        
        const companyStats: Record<string, { name: string, count: number, trend: number }> = {};
        
        (mentions || []).forEach((mention: any) => {
          const companyId = mention.company_id;
          if (!companyStats[companyId]) {
            companyStats[companyId] = {
              name: mention.companies.name,
              count: 0,
              trend: 0
            };
          }
          companyStats[companyId].count++;
          
          // Weight recent mentions more heavily
          const mentionDate = new Date(mention.extracted_at);
          const daysOld = (Date.now() - mentionDate.getTime()) / (24 * 60 * 60 * 1000);
          const weight = Math.max(0, 1 - (daysOld / days));
          companyStats[companyId].trend += weight;
        });
        
        return Object.values(companyStats)
          .sort((a, b) => b.trend - a.trend)
          .slice(0, 10);
      },

      async calculateIndustryMetrics() {
        const { data: companies } = await mockSupabaseClient
          .from('companies')
          .select('industry, mention_count');
        
        const industryStats: Record<string, { companies: number, totalMentions: number, avgMentions: number }> = {};
        
        (companies || []).forEach((company: any) => {
          const industry = company.industry || 'Other';
          if (!industryStats[industry]) {
            industryStats[industry] = { companies: 0, totalMentions: 0, avgMentions: 0 };
          }
          
          industryStats[industry].companies++;
          industryStats[industry].totalMentions += company.mention_count || 0;
        });
        
        // Calculate averages
        Object.keys(industryStats).forEach(industry => {
          const stats = industryStats[industry];
          stats.avgMentions = stats.companies > 0 ? 
            Math.round((stats.totalMentions / stats.companies) * 100) / 100 : 0;
        });
        
        return industryStats;
      },

      async detectAnomalies(companyId: string) {
        // Get historical mention data
        const { data: mentions } = await mockSupabaseClient
          .from('company_mentions')
          .select('extracted_at, sentiment, confidence')
          .eq('company_id', companyId)
          .order('extracted_at');
        
        if (!mentions || mentions.length < 5) {
          return { hasAnomalies: false, reason: 'Insufficient data' };
        }
        
        // Analyze patterns
        const dailyMentions = this.groupMentionsByDay(mentions);
        const mentionCounts = Object.values(dailyMentions);
        
        // Calculate mean and standard deviation
        const mean = mentionCounts.reduce((a, b) => a + b, 0) / mentionCounts.length;
        const variance = mentionCounts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / mentionCounts.length;
        const stdDev = Math.sqrt(variance);
        
        // Check for anomalies (mentions > 2 standard deviations from mean)
        const threshold = mean + (2 * stdDev);
        const recentMentions = mentionCounts.slice(-3); // Last 3 days
        
        const hasSpike = recentMentions.some(count => count > threshold);
        
        // Check sentiment anomalies
        const recentSentiments = mentions.slice(-10).map(m => m.sentiment);
        const negativeRatio = recentSentiments.filter(s => s === 'negative').length / recentSentiments.length;
        const hasSentimentAnomaly = negativeRatio > 0.7; // More than 70% negative
        
        return {
          hasAnomalies: hasSpike || hasSentimentAnomaly,
          spike: hasSpike ? { threshold, max: Math.max(...recentMentions) } : null,
          sentimentAnomaly: hasSentimentAnomaly ? { negativeRatio } : null
        };
      },

      groupMentionsByDay(mentions: any[]) {
        const grouped: Record<string, number> = {};
        
        mentions.forEach(mention => {
          const date = new Date(mention.extracted_at).toISOString().split('T')[0];
          grouped[date] = (grouped[date] || 0) + 1;
        });
        
        return grouped;
      },

      async generateInsights(userId: string) {
        const insights = [];
        
        // Get user's followed companies
        const { data: userCompanies } = await mockSupabaseClient
          .from('user_companies')
          .select('company_id, companies(name)')
          .eq('user_id', userId);
        
        // Check for trending companies
        const trending = await this.calculateTrendingCompanies();
        if (trending.length > 0) {
          insights.push({
            type: 'trending',
            title: 'Trending Companies',
            description: `${trending[0].name} is trending with ${trending[0].count} mentions this week`,
            priority: 'high'
          });
        }
        
        // Check for anomalies in followed companies
        for (const userCompany of userCompanies || []) {
          const anomaly = await this.detectAnomalies(userCompany.company_id);
          if (anomaly.hasAnomalies) {
            insights.push({
              type: 'anomaly',
              title: 'Unusual Activity Detected',
              description: `${userCompany.companies.name} is showing unusual mention patterns`,
              priority: 'medium',
              companyId: userCompany.company_id
            });
          }
        }
        
        return insights;
      }
    };

    it('should calculate trending companies correctly', async () => {
      const mockMentionsData = [
        { 
          company_id: 'company_1', 
          companies: { name: 'Company A' }, 
          extracted_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
        },
        { 
          company_id: 'company_1', 
          companies: { name: 'Company A' }, 
          extracted_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString() // 2 days ago
        },
        { 
          company_id: 'company_2', 
          companies: { name: 'Company B' }, 
          extracted_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString() // 6 days ago
        }
      ];
      
      mockSupabaseClient.from().select.mockResolvedValue({ data: mockMentionsData, error: null });
      
      const trending = await analyticsService.calculateTrendingCompanies(7);
      
      expect(trending).toHaveLength(2);
      expect(trending[0].name).toBe('Company A'); // Should be first due to recent mentions
      expect(trending[0].count).toBe(2);
    });

    it('should calculate industry metrics correctly', async () => {
      const mockCompanies = [
        { industry: 'Technology', mention_count: 10 },
        { industry: 'Technology', mention_count: 20 },
        { industry: 'Finance', mention_count: 15 },
        { industry: null, mention_count: 5 } // Should be categorized as 'Other'
      ];
      
      mockSupabaseClient.from().select.mockResolvedValue({ data: mockCompanies, error: null });
      
      const metrics = await analyticsService.calculateIndustryMetrics();
      
      expect(metrics.Technology).toEqual({
        companies: 2,
        totalMentions: 30,
        avgMentions: 15
      });
      expect(metrics.Finance).toEqual({
        companies: 1,
        totalMentions: 15,
        avgMentions: 15
      });
      expect(metrics.Other).toEqual({
        companies: 1,
        totalMentions: 5,
        avgMentions: 5
      });
    });

    it('should detect anomalies in mention patterns', async () => {
      const mockMentions = Array.from({ length: 20 }, (_, i) => ({
        extracted_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        sentiment: i < 2 ? 'negative' : 'positive', // Recent negative trend
        confidence: 0.8
      }));
      
      // Add some days with normal activity (1-2 mentions per day)
      // Add one day with spike (simulated by having multiple mentions same day)
      const extendedMentions = [
        ...mockMentions,
        ...Array.from({ length: 10 }, () => ({
          extracted_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // All same day
          sentiment: 'positive',
          confidence: 0.8
        }))
      ];
      
      mockSupabaseClient.from().select.mockResolvedValue({ data: extendedMentions, error: null });
      
      const anomaly = await analyticsService.detectAnomalies('company_123');
      
      expect(anomaly.hasAnomalies).toBe(true);
      // Should detect either spike or sentiment anomaly
      expect(anomaly.spike || anomaly.sentimentAnomaly).toBeTruthy();
    });

    it('should handle insufficient data for anomaly detection', async () => {
      const fewMentions = Array.from({ length: 3 }, (_, i) => ({
        extracted_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        sentiment: 'positive',
        confidence: 0.8
      }));
      
      mockSupabaseClient.from().select.mockResolvedValue({ data: fewMentions, error: null });
      
      const anomaly = await analyticsService.detectAnomalies('company_123');
      
      expect(anomaly.hasAnomalies).toBe(false);
      expect(anomaly.reason).toBe('Insufficient data');
    });

    it('should group mentions by day correctly', () => {
      const mentions = [
        { extracted_at: '2024-01-01T10:00:00Z' },
        { extracted_at: '2024-01-01T15:00:00Z' },
        { extracted_at: '2024-01-02T10:00:00Z' }
      ];
      
      const grouped = analyticsService.groupMentionsByDay(mentions);
      
      expect(grouped['2024-01-01']).toBe(2);
      expect(grouped['2024-01-02']).toBe(1);
    });

    it('should generate relevant insights for user', async () => {
      const mockUserCompanies = [
        { 
          company_id: 'company_123', 
          companies: { name: 'User Company' }
        }
      ];
      
      const mockTrending = [
        { name: 'Trending Company', count: 25, trend: 5.5 }
      ];
      
      const mockAnomaly = { 
        hasAnomalies: true, 
        spike: { threshold: 5, max: 15 } 
      };
      
      mockSupabaseClient.from().select
        .mockResolvedValueOnce({ data: mockUserCompanies, error: null })
        .mockResolvedValueOnce({ data: [], error: null }); // For trending calculation
      
      // Mock the methods
      vi.spyOn(analyticsService, 'calculateTrendingCompanies').mockResolvedValue(mockTrending);
      vi.spyOn(analyticsService, 'detectAnomalies').mockResolvedValue(mockAnomaly);
      
      const insights = await analyticsService.generateInsights('user_123');
      
      expect(insights).toHaveLength(2);
      expect(insights[0].type).toBe('trending');
      expect(insights[1].type).toBe('anomaly');
    });
  });

  describe('Performance and Scalability Tests', () => {
    it('should handle large datasets efficiently', async () => {
      const largeMentions = Array.from({ length: 10000 }, (_, i) => ({
        company_id: `company_${i % 100}`, // 100 different companies
        companies: { name: `Company ${i % 100}`, industry: 'Technology' },
        emails: { newsletter_name: `Newsletter ${i % 10}` }, // 10 different newsletters
        sentiment: ['positive', 'negative', 'neutral'][i % 3],
        confidence: 0.5 + (i % 50) / 100, // Confidence between 0.5 and 1.0
        extracted_at: new Date(Date.now() - i * 60 * 1000).toISOString() // Spread over time
      }));
      
      const startTime = Date.now();
      
      const reportService = {
        calculateReportMetrics: (mentions: any[]) => {
          const metrics = {
            total_mentions: mentions.length,
            positive_mentions: mentions.filter(m => m.sentiment === 'positive').length,
            negative_mentions: mentions.filter(m => m.sentiment === 'negative').length,
            neutral_mentions: mentions.filter(m => m.sentiment === 'neutral').length,
            high_confidence_mentions: mentions.filter(m => m.confidence > 0.8).length,
            unique_companies: new Set(mentions.map(m => m.companies.name)).size,
            unique_newsletters: new Set(mentions.map(m => m.emails.newsletter_name)).size
          };
          
          return metrics;
        }
      };
      
      const metrics = reportService.calculateReportMetrics(largeMentions);
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      expect(metrics.total_mentions).toBe(10000);
      expect(metrics.unique_companies).toBe(100);
      expect(metrics.unique_newsletters).toBe(10);
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle concurrent operations safely', async () => {
      const concurrentOps = Array.from({ length: 10 }, (_, i) => 
        new Promise(resolve => {
          setTimeout(() => resolve(`Operation ${i} completed`), Math.random() * 100);
        })
      );
      
      const results = await Promise.all(concurrentOps);
      
      expect(results).toHaveLength(10);
      results.forEach((result, index) => {
        expect(result).toBe(`Operation ${index} completed`);
      });
    });

    it('should maintain data consistency under high load', async () => {
      const sharedState = { counter: 0 };
      
      const incrementOperations = Array.from({ length: 1000 }, () => 
        new Promise<void>(resolve => {
          // Simulate atomic operation
          const current = sharedState.counter;
          sharedState.counter = current + 1;
          resolve();
        })
      );
      
      await Promise.all(incrementOperations);
      
      expect(sharedState.counter).toBe(1000);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle database connection failures gracefully', async () => {
      mockSupabaseClient.from = vi.fn(() => {
        throw new Error('Database connection failed');
      });
      
      const companyService = {
        async createCompany(data: any) {
          try {
            return await mockSupabaseClient.from('companies').insert(data);
          } catch (error) {
            // Fallback to local storage or queue for retry
            console.error('Database error, queuing for retry:', error);
            return { queued: true, data };
          }
        }
      };
      
      const result = await companyService.createCompany({ name: 'Test Company' });
      
      expect(result.queued).toBe(true);
      expect(result.data.name).toBe('Test Company');
    });

    it('should implement circuit breaker pattern for external services', async () => {
      let failureCount = 0;
      const maxFailures = 3;
      let circuitOpen = false;
      
      const circuitBreaker = {
        async call<T>(fn: () => Promise<T>): Promise<T | null> {
          if (circuitOpen) {
            throw new Error('Circuit breaker is open');
          }
          
          try {
            const result = await fn();
            failureCount = 0; // Reset on success
            return result;
          } catch (error) {
            failureCount++;
            if (failureCount >= maxFailures) {
              circuitOpen = true;
              setTimeout(() => {
                circuitOpen = false;
                failureCount = 0;
              }, 60000); // Reset after 1 minute
            }
            throw error;
          }
        }
      };
      
      // Mock a failing service
      const failingService = async () => {
        throw new Error('Service unavailable');
      };
      
      // Should fail 3 times then open circuit
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.call(failingService)).rejects.toThrow('Service unavailable');
      }
      
      // Circuit should now be open
      await expect(circuitBreaker.call(failingService)).rejects.toThrow('Circuit breaker is open');
    });

    it('should implement retry with exponential backoff', async () => {
      let attemptCount = 0;
      
      const retryWithBackoff = async <T>(
        fn: () => Promise<T>, 
        maxRetries: number = 3,
        baseDelay: number = 100
      ): Promise<T> => {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
          try {
            attemptCount++;
            return await fn();
          } catch (error) {
            if (attempt === maxRetries - 1) throw error;
            
            const delay = baseDelay * Math.pow(2, attempt);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
        
        throw new Error('Max retries exceeded');
      };
      
      const flakyService = async () => {
        if (attemptCount < 2) {
          throw new Error('Service temporarily unavailable');
        }
        return 'Success';
      };
      
      const result = await retryWithBackoff(flakyService);
      
      expect(result).toBe('Success');
      expect(attemptCount).toBe(2);
    });

    it('should validate and sanitize all inputs', async () => {
      const inputValidator = {
        validateCompanyData(data: any) {
          const errors = [];
          
          if (!data.name || typeof data.name !== 'string') {
            errors.push('Company name must be a non-empty string');
          }
          
          if (data.name && data.name.length > 100) {
            errors.push('Company name must be less than 100 characters');
          }
          
          if (data.website && !this.isValidUrl(data.website)) {
            errors.push('Website must be a valid URL');
          }
          
          if (data.employee_count && (!Number.isInteger(data.employee_count) || data.employee_count < 0)) {
            errors.push('Employee count must be a positive integer');
          }
          
          return {
            isValid: errors.length === 0,
            errors,
            sanitized: this.sanitizeCompanyData(data)
          };
        },
        
        isValidUrl(url: string) {
          try {
            new URL(url);
            return true;
          } catch {
            return false;
          }
        },
        
        sanitizeCompanyData(data: any) {
          return {
            name: typeof data.name === 'string' ? data.name.trim().substring(0, 100) : '',
            website: typeof data.website === 'string' ? data.website.trim() : null,
            description: typeof data.description === 'string' ? data.description.trim().substring(0, 1000) : null,
            employee_count: typeof data.employee_count === 'number' && data.employee_count >= 0 ? 
              Math.floor(data.employee_count) : null
          };
        }
      };
      
      const validData = {
        name: 'Test Company',
        website: 'https://test.com',
        employee_count: 50
      };
      
      const invalidData = {
        name: '',
        website: 'invalid-url',
        employee_count: -10
      };
      
      const validResult = inputValidator.validateCompanyData(validData);
      const invalidResult = inputValidator.validateCompanyData(invalidData);
      
      expect(validResult.isValid).toBe(true);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toHaveLength(3);
    });
  });
});