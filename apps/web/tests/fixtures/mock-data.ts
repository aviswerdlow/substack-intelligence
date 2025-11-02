export const mockCompanies = [
  {
    id: 'comp_1',
    name: 'Stripe',
    description: 'Payment infrastructure for the internet',
    website: 'https://stripe.com',
    funding_status: 'series-g',
    totalMentions: 5,
    newsletterDiversity: 3,
    mentions: [
      {
        id: 'mention_1',
        context: 'Stripe continues to dominate the payment processing space with their developer-friendly APIs.',
        sentiment: 'positive',
        confidence: 0.95,
        newsletter_name: 'Tech Weekly',
        received_at: new Date().toISOString()
      },
      {
        id: 'mention_2',
        context: 'The latest Stripe product launch shows their commitment to global commerce.',
        sentiment: 'positive',
        confidence: 0.88,
        newsletter_name: 'Fintech Focus',
        received_at: new Date(Date.now() - 86400000).toISOString()
      }
    ]
  },
  {
    id: 'comp_2',
    name: 'OpenAI',
    description: 'AI research and deployment company',
    website: 'https://openai.com',
    funding_status: 'series-e',
    totalMentions: 8,
    newsletterDiversity: 5,
    mentions: [
      {
        id: 'mention_3',
        context: 'OpenAI\'s latest GPT models are transforming how businesses approach automation.',
        sentiment: 'positive',
        confidence: 0.92,
        newsletter_name: 'AI Weekly',
        received_at: new Date().toISOString()
      }
    ]
  },
  {
    id: 'comp_3',
    name: 'Notion',
    description: 'All-in-one workspace for notes, tasks, wikis, and databases',
    website: 'https://notion.so',
    funding_status: 'series-c',
    totalMentions: 3,
    newsletterDiversity: 2,
    mentions: [
      {
        id: 'mention_4',
        context: 'Notion\'s AI features are making it even more powerful for team collaboration.',
        sentiment: 'positive',
        confidence: 0.85,
        newsletter_name: 'Productivity Post',
        received_at: new Date().toISOString()
      }
    ]
  },
  {
    id: 'comp_4',
    name: 'Linear',
    description: 'Issue tracking tool for modern software teams',
    website: 'https://linear.app',
    funding_status: 'series-b',
    totalMentions: 4,
    newsletterDiversity: 3,
    mentions: [
      {
        id: 'mention_5',
        context: 'Linear\'s approach to project management is refreshingly simple and powerful.',
        sentiment: 'positive',
        confidence: 0.90,
        newsletter_name: 'Dev Tools Daily',
        received_at: new Date().toISOString()
      }
    ]
  },
  {
    id: 'comp_5',
    name: 'Vercel',
    description: 'Platform for frontend developers',
    website: 'https://vercel.com',
    funding_status: 'series-d',
    totalMentions: 6,
    newsletterDiversity: 4,
    mentions: [
      {
        id: 'mention_6',
        context: 'Vercel\'s edge functions are changing how we think about serverless.',
        sentiment: 'positive',
        confidence: 0.87,
        newsletter_name: 'Frontend Focus',
        received_at: new Date().toISOString()
      }
    ]
  },
  {
    id: 'comp_6',
    name: 'Figma',
    description: 'Collaborative design tool',
    website: 'https://figma.com',
    funding_status: 'acquired',
    totalMentions: 7,
    newsletterDiversity: 5,
    mentions: [
      {
        id: 'mention_7',
        context: 'Despite the Adobe acquisition, Figma continues to innovate in collaborative design.',
        sentiment: 'neutral',
        confidence: 0.82,
        newsletter_name: 'Design Weekly',
        received_at: new Date().toISOString()
      }
    ]
  },
  {
    id: 'comp_7',
    name: 'Supabase',
    description: 'Open source Firebase alternative',
    website: 'https://supabase.com',
    funding_status: 'series-b',
    totalMentions: 5,
    newsletterDiversity: 3,
    mentions: [
      {
        id: 'mention_8',
        context: 'Supabase is becoming the go-to choice for developers who want an open-source backend.',
        sentiment: 'positive',
        confidence: 0.91,
        newsletter_name: 'Backend Brief',
        received_at: new Date().toISOString()
      }
    ]
  },
  {
    id: 'comp_8',
    name: 'NextAuth',
    description: 'Authentication and user management platform',
    website: 'https://nextauth.dev',
    funding_status: 'series-a',
    totalMentions: 2,
    newsletterDiversity: 2,
    mentions: [
      {
        id: 'mention_9',
        context: 'NextAuth\'s developer experience for auth is unmatched in the market.',
        sentiment: 'positive',
        confidence: 0.89,
        newsletter_name: 'Auth Insider',
        received_at: new Date().toISOString()
      }
    ]
  },
  {
    id: 'comp_9',
    name: 'Resend',
    description: 'Email API for developers',
    website: 'https://resend.com',
    funding_status: 'seed',
    totalMentions: 3,
    newsletterDiversity: 2,
    mentions: [
      {
        id: 'mention_10',
        context: 'Resend is making transactional email simple and developer-friendly.',
        sentiment: 'positive',
        confidence: 0.86,
        newsletter_name: 'Dev Tools Daily',
        received_at: new Date().toISOString()
      }
    ]
  },
  {
    id: 'comp_10',
    name: 'Anthropic',
    description: 'AI safety company',
    website: 'https://anthropic.com',
    funding_status: 'series-c',
    totalMentions: 9,
    newsletterDiversity: 6,
    mentions: [
      {
        id: 'mention_11',
        context: 'Claude from Anthropic is becoming a serious competitor to ChatGPT.',
        sentiment: 'positive',
        confidence: 0.93,
        newsletter_name: 'AI Weekly',
        received_at: new Date().toISOString()
      }
    ]
  }
];

export const mockNewsletters = [
  {
    id: 'newsletter_1',
    name: 'Tech Weekly',
    subscriber_count: 50000,
    frequency: 'weekly',
    category: 'technology'
  },
  {
    id: 'newsletter_2',
    name: 'AI Weekly',
    subscriber_count: 35000,
    frequency: 'weekly',
    category: 'artificial-intelligence'
  },
  {
    id: 'newsletter_3',
    name: 'Fintech Focus',
    subscriber_count: 25000,
    frequency: 'bi-weekly',
    category: 'finance'
  },
  {
    id: 'newsletter_4',
    name: 'Dev Tools Daily',
    subscriber_count: 40000,
    frequency: 'daily',
    category: 'development'
  },
  {
    id: 'newsletter_5',
    name: 'Frontend Focus',
    subscriber_count: 30000,
    frequency: 'weekly',
    category: 'web-development'
  }
];

export const mockDashboardStats = {
  totalCompanies: 156,
  newThisWeek: 23,
  totalMentions: 892,
  averageSentiment: 0.82,
  topNewsletter: 'Tech Weekly',
  lastSync: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
};

export const mockApiResponses = {
  '/api/intelligence': {
    success: true,
    data: {
      companies: mockCompanies.slice(0, 5),
      summary: {
        totalCompanies: 5,
        totalMentions: 25,
        averageMentionsPerCompany: '5.0',
        timeRange: 'Last 24 hours'
      }
    }
  },
  '/api/trigger/intelligence': {
    success: true,
    message: 'Intelligence pipeline triggered successfully',
    jobId: 'job_123456'
  },
  '/api/test/extract': {
    success: true,
    data: {
      companies: [
        { name: 'Test Company', confidence: 0.95 }
      ]
    }
  },
  '/api/health': {
    status: 'healthy',
    services: {
      database: 'connected',
      gmail: 'connected',
      claude: 'operational'
    },
    timestamp: new Date().toISOString()
  },
  '/api/companies': {
    success: true,
    data: mockCompanies
  }
};

export const mockSystemStatus = {
  gmail: {
    status: 'connected',
    lastSync: new Date(Date.now() - 3600000).toISOString(),
    emailsProcessed: 47
  },
  claude: {
    status: 'operational',
    apiCalls: 892,
    successRate: 0.98
  },
  database: {
    status: 'healthy',
    connections: 5,
    latency: '12ms'
  }
};

export const mockUser = {
  id: 'user_test_123',
  email: 'test@substackintel.com',
  firstName: 'Test',
  lastName: 'User',
  fullName: 'Test User',
  role: 'admin',
  createdAt: new Date(Date.now() - 30 * 86400000).toISOString() // 30 days ago
};