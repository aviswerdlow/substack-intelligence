import { vi } from 'vitest';

// Type definitions for database entities
export interface MockCompany {
  id: string;
  name: string;
  description?: string;
  website?: string;
  mention_count?: number;
  funding_status?: string;
  created_at?: string;
  updated_at?: string;
  industry?: string;
  location?: string;
}

export interface MockEmail {
  id: string;
  message_id: string;
  subject: string;
  sender: string;
  content?: string;
  received_at: string;
  newsletter_name?: string;
  processed: boolean;
  created_at: string;
}

export interface MockIntelligenceRecord {
  company_id: string;
  name: string;
  description?: string;
  website?: string;
  context: string;
  sentiment?: string;
  confidence: number;
  newsletter_name: string;
  received_at: string;
  funding_status?: string;
}

export interface MockAnalytics {
  totalCompanies: number;
  totalMentions: number;
  avgMentionsPerCompany: number;
  topNewsletters: Array<{
    name: string;
    mentions: number;
  }>;
  recentActivity: Array<{
    date: string;
    companies: number;
    mentions: number;
  }>;
}

// Configuration interface for mock behavior
interface MockQueryConfig {
  shouldResolve: boolean;
  resolveValue?: any;
  rejectValue?: any;
  delay?: number;
}

class DatabaseQueryMocks {
  private _config: Record<string, MockQueryConfig> = {};

  // Configuration methods
  configureQuery(queryName: string, config: MockQueryConfig): void {
    this._config[queryName] = config;
  }

  resetAllConfigs(): void {
    this._config = {};
  }

  private async executeQuery(queryName: string, defaultValue: any): Promise<any> {
    const config = this._config[queryName];
    
    if (config?.delay) {
      await new Promise(resolve => setTimeout(resolve, config.delay));
    }

    if (config?.shouldResolve === false) {
      throw config.rejectValue || new Error(`Mock error for ${queryName}`);
    }

    return config?.resolveValue !== undefined ? config.resolveValue : defaultValue;
  }

  // Company queries
  getCompanyById = vi.fn(async (id: string): Promise<MockCompany | null> => {
    return this.executeQuery('getCompanyById', null);
  });

  getCompanies = vi.fn(async (filters?: any): Promise<MockCompany[]> => {
    return this.executeQuery('getCompanies', []);
  });

  searchCompanies = vi.fn(async (query: string, limit?: number): Promise<MockCompany[]> => {
    return this.executeQuery('searchCompanies', []);
  });

  createCompany = vi.fn(async (company: Partial<MockCompany>): Promise<MockCompany> => {
    return this.executeQuery('createCompany', {
      id: 'mock-company-id',
      name: company.name || 'Mock Company',
      ...company
    });
  });

  updateCompany = vi.fn(async (id: string, updates: Partial<MockCompany>): Promise<MockCompany> => {
    return this.executeQuery('updateCompany', {
      id,
      name: 'Updated Mock Company',
      ...updates
    });
  });

  deleteCompany = vi.fn(async (id: string): Promise<boolean> => {
    return this.executeQuery('deleteCompany', true);
  });

  // Email queries
  getEmailById = vi.fn(async (id: string): Promise<MockEmail | null> => {
    return this.executeQuery('getEmailById', null);
  });

  getRecentEmails = vi.fn(async (limit?: number): Promise<MockEmail[]> => {
    return this.executeQuery('getRecentEmails', []);
  });

  getEmailsByNewsletter = vi.fn(async (newsletter: string): Promise<MockEmail[]> => {
    return this.executeQuery('getEmailsByNewsletter', []);
  });

  createEmail = vi.fn(async (email: Partial<MockEmail>): Promise<MockEmail> => {
    return this.executeQuery('createEmail', {
      id: 'mock-email-id',
      message_id: 'mock-message-id',
      subject: 'Mock Email Subject',
      sender: 'mock@example.com',
      received_at: new Date().toISOString(),
      processed: false,
      created_at: new Date().toISOString(),
      ...email
    });
  });

  markEmailProcessed = vi.fn(async (id: string): Promise<boolean> => {
    return this.executeQuery('markEmailProcessed', true);
  });

  // Intelligence queries
  getDailyIntelligence = vi.fn(async (date?: string): Promise<MockIntelligenceRecord[]> => {
    return this.executeQuery('getDailyIntelligence', [{
      company_id: 'test-company-id',
      name: 'Test Company',
      description: 'A test company',
      website: 'https://test.com',
      context: 'Test company news',
      sentiment: 'positive',
      confidence: 0.9,
      newsletter_name: 'Test Newsletter',
      received_at: '2024-01-15',
      funding_status: 'Series A'
    }]);
  });

  getIntelligenceByCompany = vi.fn(async (companyId: string): Promise<MockIntelligenceRecord[]> => {
    return this.executeQuery('getIntelligenceByCompany', []);
  });

  getIntelligenceByNewsletter = vi.fn(async (newsletter: string): Promise<MockIntelligenceRecord[]> => {
    return this.executeQuery('getIntelligenceByNewsletter', []);
  });

  createIntelligenceRecord = vi.fn(async (record: Partial<MockIntelligenceRecord>): Promise<MockIntelligenceRecord> => {
    return this.executeQuery('createIntelligenceRecord', {
      company_id: 'mock-company-id',
      name: 'Mock Company',
      context: 'Mock context',
      confidence: 0.8,
      newsletter_name: 'Mock Newsletter',
      received_at: new Date().toISOString(),
      ...record
    });
  });

  // Analytics queries
  getAnalytics = vi.fn(async (period?: string): Promise<MockAnalytics> => {
    return this.executeQuery('getAnalytics', {
      totalCompanies: 0,
      totalMentions: 0,
      avgMentionsPerCompany: 0,
      topNewsletters: [],
      recentActivity: []
    });
  });

  getTopNewsletters = vi.fn(async (limit?: number): Promise<Array<{name: string; mentions: number}>> => {
    return this.executeQuery('getTopNewsletters', []);
  });

  getCompanyMentionTrends = vi.fn(async (companyId: string): Promise<Array<{date: string; mentions: number}>> => {
    return this.executeQuery('getCompanyMentionTrends', []);
  });

  // User and settings queries
  getUserSettings = vi.fn(async (userId: string): Promise<any> => {
    return this.executeQuery('getUserSettings', {});
  });

  updateUserSettings = vi.fn(async (userId: string, settings: any): Promise<any> => {
    return this.executeQuery('updateUserSettings', settings);
  });

  // Batch operations
  batchCreateCompanies = vi.fn(async (companies: Partial<MockCompany>[]): Promise<MockCompany[]> => {
    return this.executeQuery('batchCreateCompanies', companies.map((company, index) => ({
      id: `mock-company-${index}`,
      name: company.name || `Mock Company ${index}`,
      ...company
    })));
  });

  batchCreateIntelligence = vi.fn(async (records: Partial<MockIntelligenceRecord>[]): Promise<MockIntelligenceRecord[]> => {
    return this.executeQuery('batchCreateIntelligence', records.map((record, index) => ({
      company_id: `mock-company-${index}`,
      name: record.name || `Mock Company ${index}`,
      context: record.context || 'Mock context',
      confidence: record.confidence || 0.8,
      newsletter_name: record.newsletter_name || 'Mock Newsletter',
      received_at: new Date().toISOString(),
      ...record
    })));
  });

  // Utility methods for test setup
  mockResolvedValue(queryName: string, value: any): void {
    this.configureQuery(queryName, {
      shouldResolve: true,
      resolveValue: value
    });
  }

  mockRejectedValue(queryName: string, error: any): void {
    this.configureQuery(queryName, {
      shouldResolve: false,
      rejectValue: error
    });
  }

  mockDelay(queryName: string, ms: number): void {
    const existing = this._config[queryName] || { shouldResolve: true };
    this.configureQuery(queryName, {
      ...existing,
      delay: ms
    });
  }

  resetAllMocks(): void {
    // Reset all vitest mocks
    Object.getOwnPropertyNames(this)
      .filter(name => typeof (this as any)[name]?.mockReset === 'function')
      .forEach(name => (this as any)[name].mockReset());
    
    // Reset configurations
    this.resetAllConfigs();
  }
}

// Export singleton instance
export const databaseQueryMocks = new DatabaseQueryMocks();

// Export individual mocks for direct use
export const {
  getCompanyById,
  getCompanies,
  searchCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
  getEmailById,
  getRecentEmails,
  getEmailsByNewsletter,
  createEmail,
  markEmailProcessed,
  getDailyIntelligence,
  getIntelligenceByCompany,
  getIntelligenceByNewsletter,
  createIntelligenceRecord,
  getAnalytics,
  getTopNewsletters,
  getCompanyMentionTrends,
  getUserSettings,
  updateUserSettings,
  batchCreateCompanies,
  batchCreateIntelligence
} = databaseQueryMocks;

// Mock implementations for vi.mock()
export const databaseMocks = {
  createServiceRoleClient: vi.fn(() => mockSupabaseClient),
  createClientComponentClient: vi.fn(() => mockSupabaseClient),
  createServerComponentClient: vi.fn(() => mockSupabaseClient),
  createRouteHandlerClient: vi.fn(() => mockSupabaseClient),
  getCompanyById,
  getCompanies,
  getDailyIntelligence,
  getEmailById,
  getRecentEmails,
  getTopNewsletters,
  searchCompanies,
  getAnalytics
};

// Import mock Supabase client from the supabase mock
import { mockSupabaseClient } from './supabase';