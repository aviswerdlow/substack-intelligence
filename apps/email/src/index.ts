export { default as DailyIntelligenceReport } from '../emails/daily-intelligence-report';
export { default as WeeklySummaryReport } from '../emails/weekly-summary-report';
export { default as CompanyAlert } from '../emails/company-alert';

// Email rendering utilities
export { render } from '@react-email/render';

// Type exports for email data
export interface DailyReportData {
  date: string;
  companies: Array<{
    id: string;
    name: string;
    description?: string;
    website?: string;
    context: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    confidence: number;
    newsletter_name: string;
    received_at: string;
    funding_status?: string;
  }>;
  summary: {
    totalCompanies: number;
    totalMentions: number;
    topNewsletters: string[];
  };
}

export interface WeeklyReportData {
  weekOf: string;
  totalCompanies: number;
  totalMentions: number;
  topCompanies: Array<{
    name: string;
    mentionCount: number;
    sentiment: string;
    newsletters: string[];
  }>;
  trendingIndustries: string[];
  topNewsletters: Array<{
    name: string;
    companyCount: number;
  }>;
  insights: string[];
}

export interface CompanyAlertData {
  companyName: string;
  description?: string;
  website?: string;
  context: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  newsletterName: string;
  receivedAt: string;
  mentionCount: number;
  isHighPriority?: boolean;
}