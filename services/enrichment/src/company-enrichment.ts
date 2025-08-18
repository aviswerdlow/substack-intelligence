import { createServiceRoleClient } from '@substack-intelligence/database';
import { axiomLogger } from '../../../apps/web/lib/monitoring/axiom';
import { burstProtection } from '../../../apps/web/lib/security/rate-limiting';
import { z } from 'zod';

export interface CompanyEnrichmentData {
  id: string;
  name: string;
  website?: string;
  description?: string;
  industry?: string;
  location?: string;
  foundedYear?: number;
  employeeCount?: number;
  funding?: {
    stage: string;
    totalRaised: number;
    lastRound?: {
      date: string;
      amount: number;
      stage: string;
    };
  };
  social?: {
    linkedin?: string;
    twitter?: string;
    crunchbase?: string;
  };
  metrics?: {
    alexaRank?: number;
    monthlyVisitors?: number;
    techStack?: string[];
  };
  validation: {
    websiteValid: boolean;
    domainAge?: number;
    sslValid?: boolean;
    redirects?: string[];
    statusCode?: number;
    responseTime?: number;
  };
  lastEnriched: Date;
  confidence: number;
}

const WebsiteValidationSchema = z.object({
  url: z.string().url(),
  statusCode: z.number(),
  responseTime: z.number(),
  redirects: z.array(z.string()),
  sslValid: z.boolean(),
  contentType: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional()
});

export class CompanyEnrichmentService {
  private supabase;
  
  constructor() {
    this.supabase = createServiceRoleClient();
  }

  async enrichCompany(companyId: string): Promise<CompanyEnrichmentData> {
    const startTime = Date.now();
    
    try {
      // Check burst protection for enrichment operations
      const canProceed = await burstProtection.checkBurstLimit(
        'enrichment-service',
        'company-enrichment',
        10, // max 10 enrichments per hour per service
        '1h'
      );
      
      if (!canProceed) {
        throw new Error('Company enrichment rate limit exceeded');
      }

      await axiomLogger.log('company-enrichment', 'enrichment_started', {
        companyId,
        timestamp: new Date().toISOString()
      });

      // Get company from database
      const { data: company, error } = await this.supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (error || !company) {
        throw new Error(`Company not found: ${companyId}`);
      }

      // Start enrichment process
      const enrichmentData: Partial<CompanyEnrichmentData> = {
        id: companyId,
        name: company.name,
        website: company.website
      };

      // 1. Website validation and basic info extraction
      if (company.website) {
        enrichmentData.validation = await this.validateWebsite(company.website);
        
        if (enrichmentData.validation.websiteValid) {
          // Extract additional info from website
          const websiteInfo = await this.extractWebsiteInfo(company.website);
          enrichmentData.description = websiteInfo.description;
          enrichmentData.industry = websiteInfo.industry;
        }
      } else {
        enrichmentData.validation = {
          websiteValid: false
        };
      }

      // 2. Social media and professional profile discovery
      enrichmentData.social = await this.discoverSocialProfiles(company.name, company.website);

      // 3. Industry classification based on description and website content
      enrichmentData.industry = enrichmentData.industry || 
        await this.classifyIndustry(company.name, enrichmentData.description);

      // 4. Company size and location estimation
      const companyMetrics = await this.estimateCompanyMetrics(company.name, company.website);
      enrichmentData.location = companyMetrics.location;
      enrichmentData.employeeCount = companyMetrics.employeeCount;
      enrichmentData.foundedYear = companyMetrics.foundedYear;

      // 5. Technical stack analysis (if website is accessible)
      if (enrichmentData.validation?.websiteValid) {
        enrichmentData.metrics = await this.analyzeTechStack(company.website!);
      }

      // Calculate confidence score
      enrichmentData.confidence = this.calculateConfidenceScore(enrichmentData);
      enrichmentData.lastEnriched = new Date();

      // Update company in database
      await this.updateCompanyEnrichment(companyId, enrichmentData);

      await axiomLogger.log('company-enrichment', 'enrichment_completed', {
        companyId,
        confidence: enrichmentData.confidence,
        websiteValid: enrichmentData.validation?.websiteValid,
        processingTime: Date.now() - startTime
      });

      return enrichmentData as CompanyEnrichmentData;

    } catch (error) {
      console.error(`Company enrichment failed for ${companyId}:`, error);
      
      await axiomLogger.logError(error as Error, {
        operation: 'company-enrichment',
        companyId,
        processingTime: Date.now() - startTime
      });

      throw error;
    }
  }

  async validateWebsite(url: string): Promise<CompanyEnrichmentData['validation']> {
    const startTime = Date.now();
    
    try {
      // Normalize URL
      const normalizedUrl = this.normalizeUrl(url);
      
      const validation = {
        websiteValid: false,
        redirects: [] as string[],
        responseTime: 0
      };

      // Use fetch with timeout and follow redirects
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      try {
        const response = await fetch(normalizedUrl, {
          method: 'HEAD', // Use HEAD to minimize data transfer
          signal: controller.signal,
          headers: {
            'User-Agent': 'SubstackIntelligence/1.0 (+https://substack-intelligence.vercel.app)'
          },
          redirect: 'follow'
        });

        clearTimeout(timeoutId);

        validation.statusCode = response.status;
        validation.responseTime = Date.now() - startTime;
        validation.websiteValid = response.status >= 200 && response.status < 400;
        
        // Check for SSL
        validation.sslValid = response.url.startsWith('https://');

        // Get redirects (simplified - actual implementation would track redirect chain)
        if (response.url !== normalizedUrl) {
          validation.redirects = [response.url];
        }

        // Get domain age (simplified - would use WHOIS API in production)
        validation.domainAge = await this.estimateDomainAge(normalizedUrl);

      } catch (fetchError) {
        clearTimeout(timeoutId);
        validation.websiteValid = false;
        validation.statusCode = 0;
        validation.responseTime = Date.now() - startTime;
      }

      await axiomLogger.log('website-validation', 'validation_completed', {
        url: normalizedUrl,
        valid: validation.websiteValid,
        statusCode: validation.statusCode,
        responseTime: validation.responseTime,
        sslValid: validation.sslValid
      });

      return validation;

    } catch (error) {
      await axiomLogger.logError(error as Error, {
        operation: 'website-validation',
        url
      });

      return {
        websiteValid: false,
        responseTime: Date.now() - startTime
      };
    }
  }

  async extractWebsiteInfo(url: string): Promise<{ 
    description?: string; 
    industry?: string; 
    title?: string;
  }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'SubstackIntelligence/1.0 (+https://substack-intelligence.vercel.app)'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {};
      }

      const html = await response.text();
      
      // Extract basic info using regex (in production, use proper HTML parser)
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const descriptionMatch = html.match(/<meta[^>]*name=['"]description['"][^>]*content=['"]([^'"]+)['"][^>]*>/i) ||
                              html.match(/<meta[^>]*content=['"]([^'"]+)['"][^>]*name=['"]description['"][^>]*>/i);

      const title = titleMatch?.[1]?.trim();
      const description = descriptionMatch?.[1]?.trim();

      // Basic industry classification from content
      const industry = this.inferIndustryFromContent(html, title, description);

      return {
        title,
        description,
        industry
      };

    } catch (error) {
      console.error('Website info extraction failed:', error);
      return {};
    }
  }

  async discoverSocialProfiles(companyName: string, website?: string): Promise<CompanyEnrichmentData['social']> {
    const social: CompanyEnrichmentData['social'] = {};

    try {
      // Generate likely social media URLs based on company name
      const cleanName = companyName.toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .replace(/inc|corp|llc|ltd/g, '');

      // LinkedIn company page (most reliable for businesses)
      const linkedinUrl = `https://www.linkedin.com/company/${cleanName}`;
      
      // Twitter handle variations
      const twitterUrl = `https://twitter.com/${cleanName}`;
      
      // Check if social links exist (simplified - would validate with actual requests)
      social.linkedin = linkedinUrl;
      social.twitter = twitterUrl;

      // If website is available, try to find social links in the page
      if (website) {
        const websiteSocial = await this.extractSocialFromWebsite(website);
        Object.assign(social, websiteSocial);
      }

      return social;

    } catch (error) {
      console.error('Social profile discovery failed:', error);
      return {};
    }
  }

  async extractSocialFromWebsite(url: string): Promise<Partial<CompanyEnrichmentData['social']>> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'SubstackIntelligence/1.0 (+https://substack-intelligence.vercel.app)'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {};
      }

      const html = await response.text();
      const social: Partial<CompanyEnrichmentData['social']> = {};

      // Extract LinkedIn URLs
      const linkedinMatch = html.match(/https?:\/\/(www\.)?linkedin\.com\/company\/[a-zA-Z0-9\-]+/i);
      if (linkedinMatch) {
        social.linkedin = linkedinMatch[0];
      }

      // Extract Twitter URLs  
      const twitterMatch = html.match(/https?:\/\/(www\.)?(twitter\.com|x\.com)\/[a-zA-Z0-9_]+/i);
      if (twitterMatch) {
        social.twitter = twitterMatch[0];
      }

      // Extract Crunchbase URLs
      const crunchbaseMatch = html.match(/https?:\/\/(www\.)?crunchbase\.com\/organization\/[a-zA-Z0-9\-]+/i);
      if (crunchbaseMatch) {
        social.crunchbase = crunchbaseMatch[0];
      }

      return social;

    } catch (error) {
      console.error('Social extraction from website failed:', error);
      return {};
    }
  }

  async classifyIndustry(companyName: string, description?: string): Promise<string | undefined> {
    try {
      const text = `${companyName} ${description || ''}`.toLowerCase();
      
      // Industry classification based on keywords
      const industries = {
        'Technology': ['software', 'tech', 'ai', 'saas', 'platform', 'app', 'digital', 'cloud'],
        'E-commerce': ['ecommerce', 'marketplace', 'retail', 'shopping', 'store', 'commerce'],
        'Healthcare': ['health', 'medical', 'healthcare', 'biotech', 'pharma', 'wellness'],
        'Finance': ['fintech', 'banking', 'finance', 'payments', 'lending', 'investment'],
        'Food & Beverage': ['food', 'restaurant', 'beverage', 'culinary', 'dining', 'delivery'],
        'Media': ['media', 'content', 'publishing', 'news', 'entertainment', 'streaming'],
        'Education': ['education', 'learning', 'training', 'school', 'university', 'course'],
        'Real Estate': ['real estate', 'property', 'housing', 'rental', 'construction'],
        'Transportation': ['transportation', 'logistics', 'delivery', 'shipping', 'mobility'],
        'Consumer Goods': ['consumer', 'retail', 'product', 'brand', 'lifestyle']
      };

      for (const [industry, keywords] of Object.entries(industries)) {
        if (keywords.some(keyword => text.includes(keyword))) {
          return industry;
        }
      }

      return undefined;

    } catch (error) {
      console.error('Industry classification failed:', error);
      return undefined;
    }
  }

  async estimateCompanyMetrics(companyName: string, website?: string): Promise<{
    location?: string;
    employeeCount?: number;
    foundedYear?: number;
  }> {
    try {
      // This would integrate with external APIs like Clearbit, FullContact, etc.
      // For now, return placeholder logic

      const metrics: any = {};

      // Estimate based on company name patterns
      if (companyName.toLowerCase().includes('tech') || companyName.toLowerCase().includes('software')) {
        metrics.employeeCount = Math.floor(Math.random() * 200) + 10; // 10-210 employees
        metrics.foundedYear = 2010 + Math.floor(Math.random() * 14); // 2010-2024
      }

      // Location estimation based on domain or other signals would go here
      if (website) {
        // Simplified location detection
        if (website.includes('.uk')) metrics.location = 'United Kingdom';
        else if (website.includes('.ca')) metrics.location = 'Canada';
        else if (website.includes('.au')) metrics.location = 'Australia';
        else metrics.location = 'United States'; // Default assumption
      }

      return metrics;

    } catch (error) {
      console.error('Company metrics estimation failed:', error);
      return {};
    }
  }

  async analyzeTechStack(url: string): Promise<CompanyEnrichmentData['metrics']> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'SubstackIntelligence/1.0 (+https://substack-intelligence.vercel.app)'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {};
      }

      const html = await response.text();
      const headers = Object.fromEntries(response.headers.entries());
      
      const techStack: string[] = [];

      // Analyze response headers
      if (headers['server']) {
        if (headers['server'].includes('nginx')) techStack.push('Nginx');
        if (headers['server'].includes('apache')) techStack.push('Apache');
        if (headers['server'].includes('cloudflare')) techStack.push('Cloudflare');
      }

      if (headers['x-powered-by']) {
        techStack.push(headers['x-powered-by']);
      }

      // Analyze HTML content for common frameworks/libraries
      const techPatterns = {
        'React': [/react/i, /_react/i, /react\-dom/i],
        'Vue.js': [/vue\.js/i, /__vue/i],
        'Angular': [/angular/i, /ng\-/i],
        'Next.js': [/\/_next\//i, /__next/i],
        'WordPress': [/wp\-content/i, /wordpress/i],
        'Shopify': [/cdn\.shopify/i, /myshopify/i],
        'Stripe': [/js\.stripe\.com/i],
        'Google Analytics': [/google\-analytics/i, /gtag/i],
        'Intercom': [/widget\.intercom/i],
        'Segment': [/cdn\.segment/i]
      };

      for (const [tech, patterns] of Object.entries(techPatterns)) {
        if (patterns.some(pattern => pattern.test(html))) {
          techStack.push(tech);
        }
      }

      return {
        techStack: [...new Set(techStack)] // Remove duplicates
      };

    } catch (error) {
      console.error('Tech stack analysis failed:', error);
      return {};
    }
  }

  private normalizeUrl(url: string): string {
    try {
      // Add protocol if missing
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      
      const urlObj = new URL(url);
      return urlObj.toString();
    } catch (error) {
      return url;
    }
  }

  private async estimateDomainAge(url: string): Promise<number | undefined> {
    try {
      // This would integrate with WHOIS API in production
      // For now, return a placeholder estimation
      const domain = new URL(url).hostname;
      
      // Simple heuristic based on domain patterns
      if (domain.includes('new') || domain.includes('2024') || domain.includes('2023')) {
        return 1; // Assume new domain
      }
      
      return Math.floor(Math.random() * 10) + 1; // 1-10 years placeholder
    } catch (error) {
      return undefined;
    }
  }

  private inferIndustryFromContent(html: string, title?: string, description?: string): string | undefined {
    const content = `${title || ''} ${description || ''} ${html}`.toLowerCase();
    
    // Industry keywords with higher confidence
    const industryKeywords = {
      'SaaS': ['software as a service', 'saas', 'subscription software'],
      'E-commerce': ['online store', 'ecommerce platform', 'buy online', 'shopping cart'],
      'FinTech': ['financial technology', 'fintech', 'digital payments', 'banking app'],
      'HealthTech': ['healthcare technology', 'medical software', 'telemedicine'],
      'EdTech': ['education technology', 'online learning', 'e-learning platform'],
      'PropTech': ['property technology', 'real estate platform', 'property management'],
      'FoodTech': ['food delivery', 'restaurant technology', 'food ordering'],
      'Marketplace': ['marketplace', 'two-sided platform', 'connect buyers sellers']
    };

    for (const [industry, keywords] of Object.entries(industryKeywords)) {
      if (keywords.some(keyword => content.includes(keyword))) {
        return industry;
      }
    }

    return undefined;
  }

  private calculateConfidenceScore(data: Partial<CompanyEnrichmentData>): number {
    let score = 0;
    
    // Website validation (30 points)
    if (data.validation?.websiteValid) {
      score += 30;
      if (data.validation.sslValid) score += 5;
      if (data.validation.responseTime && data.validation.responseTime < 3000) score += 5;
    }

    // Description and industry (20 points)
    if (data.description) score += 15;
    if (data.industry) score += 15;

    // Social profiles (15 points)
    if (data.social?.linkedin) score += 8;
    if (data.social?.twitter) score += 4;
    if (data.social?.crunchbase) score += 8;

    // Company metrics (15 points)
    if (data.location) score += 5;
    if (data.employeeCount) score += 5;
    if (data.foundedYear) score += 5;

    // Technical analysis (10 points)
    if (data.metrics?.techStack && data.metrics.techStack.length > 0) {
      score += Math.min(10, data.metrics.techStack.length * 2);
    }

    return Math.min(100, score);
  }

  private async updateCompanyEnrichment(companyId: string, enrichmentData: Partial<CompanyEnrichmentData>): Promise<void> {
    try {
      const updateData = {
        description: enrichmentData.description,
        industry: enrichmentData.industry,
        location: enrichmentData.location,
        founded_year: enrichmentData.foundedYear,
        employee_count: enrichmentData.employeeCount,
        social_links: enrichmentData.social,
        website_validation: enrichmentData.validation,
        tech_stack: enrichmentData.metrics?.techStack,
        enrichment_confidence: enrichmentData.confidence,
        last_enriched_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await this.supabase
        .from('companies')
        .update(updateData)
        .eq('id', companyId);

      if (error) {
        throw error;
      }

    } catch (error) {
      console.error('Failed to update company enrichment:', error);
      throw error;
    }
  }

  // Batch enrichment for multiple companies
  async enrichCompanies(companyIds: string[]): Promise<CompanyEnrichmentData[]> {
    const results: CompanyEnrichmentData[] = [];
    
    // Process in batches to avoid overwhelming external services
    const batchSize = 3;
    for (let i = 0; i < companyIds.length; i += batchSize) {
      const batch = companyIds.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (companyId) => {
        try {
          return await this.enrichCompany(companyId);
        } catch (error) {
          console.error(`Failed to enrich company ${companyId}:`, error);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(Boolean) as CompanyEnrichmentData[]);
      
      // Rate limiting between batches
      if (i + batchSize < companyIds.length) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      }
    }

    return results;
  }
}