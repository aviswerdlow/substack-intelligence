// Mock data fixtures for testing
export interface CompanyFixture {
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
  logo_url?: string;
  employee_count?: number;
  founded_year?: number;
}

export interface EmailFixture {
  id: string;
  message_id: string;
  subject: string;
  sender: string;
  content?: string;
  html_content?: string;
  received_at: string;
  newsletter_name?: string;
  processed: boolean;
  created_at: string;
  from_address?: string;
  snippet?: string;
}

export interface IntelligenceFixture {
  company_id: string;
  name: string;
  description?: string;
  website?: string;
  context: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  confidence: number;
  newsletter_name: string;
  received_at: string;
  funding_status?: string;
  created_at?: string;
  mention_type?: 'direct' | 'indirect' | 'comparison';
  relevance_score?: number;
}

export interface UserFixture {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  created_at: string;
  last_sign_in?: string;
  preferences?: Record<string, any>;
  subscription_tier?: 'free' | 'pro' | 'enterprise';
}

export interface NewsletterFixture {
  name: string;
  description?: string;
  author: string;
  category: string;
  subscriber_count?: number;
  frequency: 'daily' | 'weekly' | 'monthly';
  domain: string;
}

// Sample Companies
export const SAMPLE_COMPANIES: CompanyFixture[] = [
  {
    id: 'company-1',
    name: 'Glossier',
    description: 'Beauty brand focused on natural, effortless beauty products',
    website: 'https://glossier.com',
    mention_count: 25,
    funding_status: 'Series D',
    industry: 'Beauty & Personal Care',
    location: 'New York, NY',
    employee_count: 200,
    founded_year: 2014,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-15T12:00:00Z'
  },
  {
    id: 'company-2',
    name: 'Warby Parker',
    description: 'Direct-to-consumer eyewear company',
    website: 'https://warbyparker.com',
    mention_count: 18,
    funding_status: 'Public',
    industry: 'Retail',
    location: 'New York, NY',
    employee_count: 3000,
    founded_year: 2010,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-14T10:30:00Z'
  },
  {
    id: 'company-3',
    name: 'Allbirds',
    description: 'Sustainable footwear company using natural materials',
    website: 'https://allbirds.com',
    mention_count: 12,
    funding_status: 'Public',
    industry: 'Footwear',
    location: 'San Francisco, CA',
    employee_count: 500,
    founded_year: 2016,
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-13T14:15:00Z'
  },
  {
    id: 'company-4',
    name: 'Casper',
    description: 'Direct-to-consumer mattress and sleep products company',
    website: 'https://casper.com',
    mention_count: 15,
    funding_status: 'Acquired',
    industry: 'Home & Garden',
    location: 'New York, NY',
    employee_count: 400,
    founded_year: 2014,
    created_at: '2024-01-04T00:00:00Z',
    updated_at: '2024-01-12T09:45:00Z'
  },
  {
    id: 'company-5',
    name: 'Away',
    description: 'Travel luggage and accessories brand',
    website: 'https://awaytravel.com',
    mention_count: 8,
    funding_status: 'Series C',
    industry: 'Travel & Leisure',
    location: 'New York, NY',
    employee_count: 300,
    founded_year: 2015,
    created_at: '2024-01-05T00:00:00Z',
    updated_at: '2024-01-11T16:20:00Z'
  }
];

// Sample Emails
export const SAMPLE_EMAILS: EmailFixture[] = [
  {
    id: 'email-1',
    message_id: 'msg-001',
    subject: 'The Future of Beauty: Why Glossier Matters',
    sender: 'Emily Weiss Newsletter',
    from_address: 'emily@beautyinsider.substack.com',
    content: 'This week we explore how Glossier has revolutionized the beauty industry...',
    html_content: '<p>This week we explore how <strong>Glossier</strong> has revolutionized the beauty industry...</p>',
    snippet: 'This week we explore how Glossier has revolutionized...',
    received_at: '2024-01-15T08:00:00Z',
    newsletter_name: 'Beauty Insider',
    processed: true,
    created_at: '2024-01-15T08:05:00Z'
  },
  {
    id: 'email-2',
    message_id: 'msg-002',
    subject: 'Direct-to-Consumer Winners and Losers',
    sender: 'Retail Trends Weekly',
    from_address: 'insights@retailtrends.substack.com',
    content: 'Warby Parker continues to dominate the eyewear space while others struggle...',
    html_content: '<p><strong>Warby Parker</strong> continues to dominate the eyewear space while others struggle...</p>',
    snippet: 'Warby Parker continues to dominate the eyewear space...',
    received_at: '2024-01-14T10:00:00Z',
    newsletter_name: 'Retail Trends Weekly',
    processed: true,
    created_at: '2024-01-14T10:05:00Z'
  },
  {
    id: 'email-3',
    message_id: 'msg-003',
    subject: 'Sustainable Fashion is Having a Moment',
    sender: 'Green Business Report',
    from_address: 'editor@greenbusiness.substack.com',
    content: 'Allbirds leads the charge in sustainable footwear with their innovative materials...',
    html_content: '<p><strong>Allbirds</strong> leads the charge in sustainable footwear with their innovative materials...</p>',
    snippet: 'Allbirds leads the charge in sustainable footwear...',
    received_at: '2024-01-13T12:00:00Z',
    newsletter_name: 'Green Business Report',
    processed: false,
    created_at: '2024-01-13T12:05:00Z'
  }
];

// Sample Intelligence Records
export const SAMPLE_INTELLIGENCE: IntelligenceFixture[] = [
  {
    company_id: 'company-1',
    name: 'Glossier',
    description: 'Beauty brand focused on natural beauty',
    website: 'https://glossier.com',
    context: 'Featured as a prime example of how direct-to-consumer beauty brands are disrupting traditional retail',
    sentiment: 'positive',
    confidence: 0.92,
    newsletter_name: 'Beauty Insider',
    received_at: '2024-01-15T08:00:00Z',
    funding_status: 'Series D',
    mention_type: 'direct',
    relevance_score: 0.95,
    created_at: '2024-01-15T08:30:00Z'
  },
  {
    company_id: 'company-2',
    name: 'Warby Parker',
    description: 'Direct-to-consumer eyewear company',
    website: 'https://warbyparker.com',
    context: 'Highlighted as a success story in the direct-to-consumer space, particularly in eyewear',
    sentiment: 'positive',
    confidence: 0.88,
    newsletter_name: 'Retail Trends Weekly',
    received_at: '2024-01-14T10:00:00Z',
    funding_status: 'Public',
    mention_type: 'direct',
    relevance_score: 0.90,
    created_at: '2024-01-14T10:30:00Z'
  },
  {
    company_id: 'company-3',
    name: 'Allbirds',
    description: 'Sustainable footwear company',
    website: 'https://allbirds.com',
    context: 'Mentioned as a leader in sustainable fashion, particularly for their innovative use of natural materials',
    sentiment: 'positive',
    confidence: 0.85,
    newsletter_name: 'Green Business Report',
    received_at: '2024-01-13T12:00:00Z',
    funding_status: 'Public',
    mention_type: 'direct',
    relevance_score: 0.87,
    created_at: '2024-01-13T12:30:00Z'
  }
];

// Sample Users
export const SAMPLE_USERS: UserFixture[] = [
  {
    id: 'user-1',
    email: 'investor@vc.com',
    first_name: 'Sarah',
    last_name: 'Johnson',
    created_at: '2024-01-01T00:00:00Z',
    last_sign_in: '2024-01-15T09:00:00Z',
    subscription_tier: 'pro',
    preferences: {
      industries: ['beauty', 'retail', 'sustainability'],
      email_frequency: 'daily',
      alert_threshold: 0.8
    }
  },
  {
    id: 'user-2',
    email: 'analyst@fund.com',
    first_name: 'Mike',
    last_name: 'Chen',
    created_at: '2024-01-05T00:00:00Z',
    last_sign_in: '2024-01-14T14:30:00Z',
    subscription_tier: 'enterprise',
    preferences: {
      industries: ['tech', 'fintech', 'healthcare'],
      email_frequency: 'weekly',
      alert_threshold: 0.9
    }
  }
];

// Sample Newsletters
export const SAMPLE_NEWSLETTERS: NewsletterFixture[] = [
  {
    name: 'Beauty Insider',
    description: 'Weekly insights into the beauty industry',
    author: 'Emily Weiss',
    category: 'Beauty',
    subscriber_count: 15000,
    frequency: 'weekly',
    domain: 'beautyinsider.substack.com'
  },
  {
    name: 'Retail Trends Weekly',
    description: 'Analysis of retail trends and consumer behavior',
    author: 'David Kim',
    category: 'Retail',
    subscriber_count: 22000,
    frequency: 'weekly',
    domain: 'retailtrends.substack.com'
  },
  {
    name: 'Green Business Report',
    description: 'Sustainable business practices and green innovation',
    author: 'Lisa Martinez',
    category: 'Sustainability',
    subscriber_count: 18000,
    frequency: 'weekly',
    domain: 'greenbusiness.substack.com'
  }
];

// Factory functions for creating variations
export class DataFixtures {
  static createCompany(overrides: Partial<CompanyFixture> = {}): CompanyFixture {
    const base = SAMPLE_COMPANIES[0];
    return {
      ...base,
      id: `company-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides
    };
  }

  static createCompanies(count: number, overrides: Partial<CompanyFixture> = {}): CompanyFixture[] {
    return Array.from({ length: count }, (_, i) => ({
      ...SAMPLE_COMPANIES[i % SAMPLE_COMPANIES.length],
      id: `company-${Date.now()}-${i}`,
      name: `${SAMPLE_COMPANIES[i % SAMPLE_COMPANIES.length].name} ${i + 1}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides
    }));
  }

  static createEmail(overrides: Partial<EmailFixture> = {}): EmailFixture {
    const base = SAMPLE_EMAILS[0];
    return {
      ...base,
      id: `email-${Date.now()}`,
      message_id: `msg-${Date.now()}`,
      received_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      ...overrides
    };
  }

  static createEmails(count: number, overrides: Partial<EmailFixture> = {}): EmailFixture[] {
    return Array.from({ length: count }, (_, i) => ({
      ...SAMPLE_EMAILS[i % SAMPLE_EMAILS.length],
      id: `email-${Date.now()}-${i}`,
      message_id: `msg-${Date.now()}-${i}`,
      received_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
      ...overrides
    }));
  }

  static createIntelligence(overrides: Partial<IntelligenceFixture> = {}): IntelligenceFixture {
    const base = SAMPLE_INTELLIGENCE[0];
    return {
      ...base,
      company_id: `company-${Date.now()}`,
      received_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      ...overrides
    };
  }

  static createIntelligenceRecords(count: number, overrides: Partial<IntelligenceFixture> = {}): IntelligenceFixture[] {
    return Array.from({ length: count }, (_, i) => ({
      ...SAMPLE_INTELLIGENCE[i % SAMPLE_INTELLIGENCE.length],
      company_id: `company-${Date.now()}-${i}`,
      received_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
      ...overrides
    }));
  }

  static createUser(overrides: Partial<UserFixture> = {}): UserFixture {
    const base = SAMPLE_USERS[0];
    return {
      ...base,
      id: `user-${Date.now()}`,
      email: `test-${Date.now()}@example.com`,
      created_at: new Date().toISOString(),
      last_sign_in: new Date().toISOString(),
      ...overrides
    };
  }

  static createNewsletter(overrides: Partial<NewsletterFixture> = {}): NewsletterFixture {
    const base = SAMPLE_NEWSLETTERS[0];
    return {
      ...base,
      name: `Newsletter ${Date.now()}`,
      domain: `newsletter-${Date.now()}.substack.com`,
      ...overrides
    };
  }

  // Scenario builders
  static createScenario(type: 'empty' | 'small' | 'medium' | 'large' = 'medium') {
    const scenarios = {
      empty: { companies: 0, emails: 0, intelligence: 0 },
      small: { companies: 3, emails: 5, intelligence: 8 },
      medium: { companies: 10, emails: 20, intelligence: 35 },
      large: { companies: 50, emails: 100, intelligence: 200 }
    };

    const config = scenarios[type];
    
    return {
      companies: this.createCompanies(config.companies),
      emails: this.createEmails(config.emails),
      intelligence: this.createIntelligenceRecords(config.intelligence),
      users: SAMPLE_USERS,
      newsletters: SAMPLE_NEWSLETTERS
    };
  }

  static createDateRangeData(days: number = 30) {
    const data = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      data.push({
        date: date.toISOString().split('T')[0],
        companies: Math.floor(Math.random() * 10) + 1,
        mentions: Math.floor(Math.random() * 25) + 5,
        emails: Math.floor(Math.random() * 5) + 1
      });
    }
    return data.reverse();
  }
}

// Export all fixtures
export {
  SAMPLE_COMPANIES,
  SAMPLE_EMAILS,
  SAMPLE_INTELLIGENCE,
  SAMPLE_USERS,
  SAMPLE_NEWSLETTERS
};