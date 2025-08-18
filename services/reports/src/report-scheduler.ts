import { PDFGenerator } from './pdf-generator';
import { EmailService } from './email-service';
import { createServiceRoleClient, getDailyIntelligence } from '@substack-intelligence/database';
import type { DailyReportData, WeeklyReportData } from '@substack-intelligence/email';

export class ReportScheduler {
  private pdfGenerator: PDFGenerator;
  private emailService: EmailService;
  private supabase;

  constructor() {
    this.pdfGenerator = new PDFGenerator();
    this.emailService = new EmailService();
    this.supabase = createServiceRoleClient();
  }

  async generateDailyReport(date?: string): Promise<{
    data: DailyReportData;
    pdf: Buffer;
    emailResult: any;
  }> {
    const reportDate = date || new Date().toLocaleDateString();
    
    try {
      console.log(`Generating daily report for ${reportDate}...`);
      
      // Get daily intelligence data
      const intelligence = await getDailyIntelligence(this.supabase, { 
        limit: 100,
        days: 1
      });

      // Transform data for email template
      const reportData: DailyReportData = {
        date: reportDate,
        companies: intelligence.map(item => ({
          id: item.company_id,
          name: item.name,
          description: item.description,
          website: item.website,
          context: item.context,
          sentiment: item.sentiment as any,
          confidence: item.confidence,
          newsletter_name: item.newsletter_name,
          received_at: item.received_at,
          funding_status: item.funding_status
        })),
        summary: {
          totalCompanies: new Set(intelligence.map(i => i.company_id)).size,
          totalMentions: intelligence.length,
          topNewsletters: [...new Set(intelligence.map(i => i.newsletter_name))].slice(0, 5)
        }
      };

      // Generate PDF
      console.log('Generating PDF report...');
      const pdf = await this.pdfGenerator.generateDailyReport(reportData);

      // Get recipients (for now, use environment variable)
      const recipients = this.getReportRecipients();

      // Send email with PDF attachment
      console.log(`Sending daily report to ${recipients.length} recipients...`);
      const emailResult = await this.emailService.sendDailyReport(
        reportData,
        recipients,
        pdf
      );

      // Store report record in database
      await this.storeReportRecord({
        type: 'daily',
        date: reportDate,
        recipients: recipients.length,
        companies: reportData.summary.totalCompanies,
        mentions: reportData.summary.totalMentions,
        email_id: emailResult.data?.id
      });

      console.log(`Daily report generated and sent successfully`);
      
      return {
        data: reportData,
        pdf,
        emailResult
      };

    } catch (error) {
      console.error('Failed to generate daily report:', error);
      
      // Log error to database
      await this.logReportError({
        type: 'daily',
        date: reportDate,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  }

  async generateWeeklyReport(weekOf?: string): Promise<{
    data: WeeklyReportData;
    pdf: Buffer;
    emailResult: any;
  }> {
    const reportWeek = weekOf || this.getWeekStart().toLocaleDateString();
    
    try {
      console.log(`Generating weekly report for week of ${reportWeek}...`);
      
      // Get weekly intelligence data (7 days)
      const intelligence = await getDailyIntelligence(this.supabase, { 
        limit: 1000,
        days: 7
      });

      // Aggregate weekly data
      const companiesMap = new Map();
      const newsletterStats = new Map();
      const industries = new Set();

      intelligence.forEach(item => {
        // Company aggregation
        if (!companiesMap.has(item.company_id)) {
          companiesMap.set(item.company_id, {
            name: item.name,
            mentionCount: 0,
            sentiment: item.sentiment,
            newsletters: new Set()
          });
        }
        const company = companiesMap.get(item.company_id);
        company.mentionCount++;
        company.newsletters.add(item.newsletter_name);

        // Newsletter stats
        if (!newsletterStats.has(item.newsletter_name)) {
          newsletterStats.set(item.newsletter_name, new Set());
        }
        newsletterStats.get(item.newsletter_name).add(item.company_id);

        // Industries (placeholder - would be enhanced with actual classification)
        if (item.description) {
          const words = item.description.toLowerCase().split(' ');
          if (words.some(w => ['beauty', 'cosmetic', 'skincare'].includes(w))) industries.add('Beauty');
          if (words.some(w => ['fashion', 'clothing', 'apparel'].includes(w))) industries.add('Fashion');
          if (words.some(w => ['food', 'beverage', 'drink'].includes(w))) industries.add('Food & Beverage');
          if (words.some(w => ['tech', 'software', 'app'].includes(w))) industries.add('Technology');
          if (words.some(w => ['health', 'wellness', 'fitness'].includes(w))) industries.add('Health & Wellness');
        }
      });

      // Sort and format data
      const topCompanies = Array.from(companiesMap.values())
        .sort((a, b) => b.mentionCount - a.mentionCount)
        .slice(0, 10)
        .map(company => ({
          name: company.name,
          mentionCount: company.mentionCount,
          sentiment: company.sentiment,
          newsletters: Array.from(company.newsletters)
        }));

      const topNewsletters = Array.from(newsletterStats.entries())
        .map(([name, companies]) => ({
          name,
          companyCount: companies.size
        }))
        .sort((a, b) => b.companyCount - a.companyCount)
        .slice(0, 10);

      // Generate insights
      const insights = this.generateWeeklyInsights({
        totalCompanies: companiesMap.size,
        totalMentions: intelligence.length,
        topCompanies,
        topNewsletters,
        industries: Array.from(industries)
      });

      const reportData: WeeklyReportData = {
        weekOf: reportWeek,
        totalCompanies: companiesMap.size,
        totalMentions: intelligence.length,
        topCompanies,
        trendingIndustries: Array.from(industries),
        topNewsletters,
        insights
      };

      // Generate PDF
      console.log('Generating weekly PDF report...');
      const pdf = await this.pdfGenerator.generateWeeklyReport(reportData);

      // Get recipients
      const recipients = this.getReportRecipients();

      // Send email
      console.log(`Sending weekly report to ${recipients.length} recipients...`);
      const emailResult = await this.emailService.sendWeeklyReport(
        reportData,
        recipients,
        pdf
      );

      // Store report record
      await this.storeReportRecord({
        type: 'weekly',
        date: reportWeek,
        recipients: recipients.length,
        companies: reportData.totalCompanies,
        mentions: reportData.totalMentions,
        email_id: emailResult.data?.id
      });

      console.log(`Weekly report generated and sent successfully`);

      return {
        data: reportData,
        pdf,
        emailResult
      };

    } catch (error) {
      console.error('Failed to generate weekly report:', error);
      
      await this.logReportError({
        type: 'weekly',
        date: reportWeek,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  }

  async cleanup() {
    await this.pdfGenerator.cleanup();
  }

  private getReportRecipients(): string[] {
    // For now, use environment variable for recipients
    const recipients = process.env.REPORT_RECIPIENTS;
    if (!recipients) {
      console.warn('No REPORT_RECIPIENTS configured, using default');
      return ['intelligence@substackai.com'];
    }
    return recipients.split(',').map(email => email.trim());
  }

  private getWeekStart(): Date {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek;
    return new Date(now.setDate(diff));
  }

  private generateWeeklyInsights(data: {
    totalCompanies: number;
    totalMentions: number;
    topCompanies: any[];
    topNewsletters: any[];
    industries: string[];
  }): string[] {
    const insights: string[] = [];

    if (data.totalCompanies > 0) {
      insights.push(`Discovered ${data.totalCompanies} unique companies this week, representing a ${data.totalCompanies > 20 ? 'strong' : 'moderate'} deal flow.`);
    }

    if (data.topCompanies.length > 0) {
      const topCompany = data.topCompanies[0];
      insights.push(`${topCompany.name} dominated conversations with ${topCompany.mentionCount} mentions across ${topCompany.newsletters.length} newsletters.`);
    }

    if (data.industries.length > 0) {
      insights.push(`${data.industries.length} distinct industries are trending, with ${data.industries.slice(0, 3).join(', ')} leading the conversation.`);
    }

    if (data.topNewsletters.length > 0) {
      const topNewsletter = data.topNewsletters[0];
      insights.push(`${topNewsletter.name} was the most active source, featuring ${topNewsletter.companyCount} different companies.`);
    }

    const averageMentions = data.totalMentions / Math.max(data.totalCompanies, 1);
    if (averageMentions > 2) {
      insights.push(`High mention density this week with ${averageMentions.toFixed(1)} mentions per company on average, indicating strong market interest.`);
    }

    return insights;
  }

  private async storeReportRecord(record: {
    type: 'daily' | 'weekly';
    date: string;
    recipients: number;
    companies: number;
    mentions: number;
    email_id?: string;
  }) {
    try {
      const { error } = await this.supabase
        .from('report_history')
        .insert({
          report_type: record.type,
          report_date: record.date,
          recipients_count: record.recipients,
          companies_count: record.companies,
          mentions_count: record.mentions,
          email_id: record.email_id,
          generated_at: new Date().toISOString(),
          status: 'sent'
        });

      if (error) {
        console.error('Failed to store report record:', error);
      }
    } catch (error) {
      console.error('Error storing report record:', error);
    }
  }

  private async logReportError(error: {
    type: 'daily' | 'weekly';
    date: string;
    error: string;
  }) {
    try {
      await this.supabase
        .from('report_history')
        .insert({
          report_type: error.type,
          report_date: error.date,
          recipients_count: 0,
          companies_count: 0,
          mentions_count: 0,
          generated_at: new Date().toISOString(),
          status: 'failed',
          error_message: error.error
        });
    } catch (dbError) {
      console.error('Failed to log report error to database:', dbError);
    }
  }
}