export { default as DailyIntelligenceReport } from '../emails/daily-intelligence-report';
export { default as WeeklySummaryReport } from '../emails/weekly-summary-report';
export { default as CompanyAlert } from '../emails/company-alert';
export { default as WelcomeEmail } from '../emails/welcome';
export { default as PasswordResetEmail } from '../emails/password-reset';
export { default as NewsletterEmail } from '../emails/newsletter';
export { default as NewPostEmail } from '../emails/new-post';
export { default as SubscriptionConfirmationEmail } from '../emails/subscription-confirmation';

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

export interface WelcomeEmailData {
  name?: string;
  onboardingSteps?: string[];
  primaryActionUrl: string;
  primaryActionLabel?: string;
  secondaryActionUrl?: string;
  secondaryActionLabel?: string;
  supportEmail?: string;
  teamName?: string;
}

export interface PasswordResetEmailData {
  name?: string;
  resetLink: string;
  expiresInMinutes?: number;
  supportEmail?: string;
}

export interface NewsletterEmailSection {
  title: string;
  body: string;
}

export interface NewsletterFeaturedCompany {
  name: string;
  description: string;
  url?: string;
}

export interface NewsletterEmailData {
  title: string;
  intro: string;
  issueDate: string;
  sections: NewsletterEmailSection[];
  featuredCompanies: NewsletterFeaturedCompany[];
  callToAction: { label: string; url: string };
}

export interface NewPostEmailData {
  title: string;
  excerpt: string;
  author: string;
  publishedAt: string;
  readUrl: string;
  readingTimeMinutes?: number;
  categories?: string[];
}

export interface SubscriptionConfirmationData {
  name?: string;
  planName: string;
  price: string;
  billingInterval: string;
  manageUrl: string;
  supportEmail?: string;
  startDate: string;
  nextBillingDate?: string;
}