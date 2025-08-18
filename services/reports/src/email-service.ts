import { Resend } from 'resend';
import { render } from '@react-email/render';
import {
  DailyIntelligenceReport,
  WeeklySummaryReport,
  CompanyAlert,
  type DailyReportData,
  type WeeklyReportData,
  type CompanyAlertData
} from '@substack-intelligence/email';

export class EmailService {
  private resend: Resend;

  constructor() {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is required');
    }
    
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async sendDailyReport(
    data: DailyReportData, 
    recipients: string[], 
    pdfAttachment?: Buffer
  ) {
    try {
      const html = render(DailyIntelligenceReport(data));
      const text = this.generateTextVersion(data);
      
      const attachments = pdfAttachment ? [{
        filename: `daily-intelligence-${data.date}.pdf`,
        content: pdfAttachment,
      }] : undefined;

      const result = await this.resend.emails.send({
        from: 'Substack Intelligence <intelligence@updates.substackai.com>',
        to: recipients,
        subject: `Daily Intelligence • ${data.summary.totalCompanies} companies discovered`,
        html,
        text,
        attachments,
        headers: {
          'X-Entity-Ref-ID': `daily-${data.date}`,
          'List-Unsubscribe': '<https://intelligence.substack.com/unsubscribe>',
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
        },
        tags: [
          { name: 'type', value: 'daily-report' },
          { name: 'companies', value: data.summary.totalCompanies.toString() },
          { name: 'mentions', value: data.summary.totalMentions.toString() }
        ]
      });

      console.log(`Daily report sent successfully:`, result.data?.id);
      return result;
    } catch (error) {
      console.error('Failed to send daily report:', error);
      throw error;
    }
  }

  async sendWeeklyReport(
    data: WeeklyReportData,
    recipients: string[],
    pdfAttachment?: Buffer
  ) {
    try {
      const html = render(WeeklySummaryReport({ data }));
      const text = this.generateWeeklyTextVersion(data);

      const attachments = pdfAttachment ? [{
        filename: `weekly-summary-${data.weekOf}.pdf`,
        content: pdfAttachment,
      }] : undefined;

      const result = await this.resend.emails.send({
        from: 'Substack Intelligence <intelligence@updates.substackai.com>',
        to: recipients,
        subject: `Weekly Intelligence Summary • ${data.totalCompanies} companies • Week of ${data.weekOf}`,
        html,
        text,
        attachments,
        headers: {
          'X-Entity-Ref-ID': `weekly-${data.weekOf}`,
          'List-Unsubscribe': '<https://intelligence.substack.com/unsubscribe>',
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
        },
        tags: [
          { name: 'type', value: 'weekly-report' },
          { name: 'companies', value: data.totalCompanies.toString() },
          { name: 'mentions', value: data.totalMentions.toString() }
        ]
      });

      console.log(`Weekly report sent successfully:`, result.data?.id);
      return result;
    } catch (error) {
      console.error('Failed to send weekly report:', error);
      throw error;
    }
  }

  async sendCompanyAlert(
    data: CompanyAlertData,
    recipients: string[]
  ) {
    try {
      const html = render(CompanyAlert(data));
      const text = `
🚨 New Company Alert: ${data.companyName}

${data.description ? `${data.description}\n\n` : ''}

Mentioned in: ${data.newsletterName}
Sentiment: ${data.sentiment} (${Math.round(data.confidence * 100)}% confidence)
${data.mentionCount > 1 ? `Total mentions: ${data.mentionCount}\n` : ''}

Context:
"${data.context}"

${data.website ? `\nWebsite: ${data.website}` : ''}

View in dashboard: https://intelligence.substack.com/intelligence

--
Substack Intelligence Platform
Real-time company discovery alerts
      `.trim();

      const result = await this.resend.emails.send({
        from: 'Substack Intelligence <alerts@updates.substackai.com>',
        to: recipients,
        subject: `${data.isHighPriority ? '🚨 HIGH PRIORITY: ' : '📈 '}${data.companyName} mentioned in ${data.newsletterName}`,
        html,
        text,
        headers: {
          'X-Entity-Ref-ID': `alert-${data.companyName}-${Date.now()}`,
          'X-Priority': data.isHighPriority ? '1' : '3',
          'List-Unsubscribe': '<https://intelligence.substack.com/unsubscribe>',
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
        },
        tags: [
          { name: 'type', value: 'company-alert' },
          { name: 'sentiment', value: data.sentiment },
          { name: 'priority', value: data.isHighPriority ? 'high' : 'normal' }
        ]
      });

      console.log(`Company alert sent successfully:`, result.data?.id);
      return result;
    } catch (error) {
      console.error('Failed to send company alert:', error);
      throw error;
    }
  }

  async sendTestEmail(recipient: string) {
    try {
      const result = await this.resend.emails.send({
        from: 'Substack Intelligence <test@updates.substackai.com>',
        to: recipient,
        subject: 'Test Email - Substack Intelligence Platform',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>Test Email Successful! ✅</h1>
            <p>Your Substack Intelligence platform email service is working correctly.</p>
            <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Service:</strong> Resend Email API</p>
            <hr>
            <p style="color: #666; font-size: 12px;">
              This is a test email from the Substack Intelligence platform.
            </p>
          </div>
        `,
        text: `
Test Email Successful!

Your Substack Intelligence platform email service is working correctly.

Timestamp: ${new Date().toLocaleString()}
Service: Resend Email API

This is a test email from the Substack Intelligence platform.
        `,
        tags: [{ name: 'type', value: 'test' }]
      });

      console.log(`Test email sent successfully:`, result.data?.id);
      return result;
    } catch (error) {
      console.error('Failed to send test email:', error);
      throw error;
    }
  }

  private generateTextVersion(data: DailyReportData): string {
    return `
DAILY INTELLIGENCE REPORT
${data.date}

EXECUTIVE SUMMARY
• ${data.summary.totalCompanies} companies discovered
• ${data.summary.totalMentions} total mentions
• ${data.summary.topNewsletters.length} active sources

${data.companies.length > 0 ? `
COMPANY DISCOVERIES
${data.companies.map((company, index) => `
${index + 1}. ${company.name}
${company.description ? `   ${company.description}` : ''}
   Context: "${company.context.slice(0, 200)}${company.context.length > 200 ? '...' : ''}"
   Source: ${company.newsletter_name}
   Sentiment: ${company.sentiment} (${Math.round(company.confidence * 100)}% confidence)
   ${company.website ? `Website: ${company.website}` : ''}
`).join('')}
` : `
No companies discovered today.
We'll continue monitoring your curated newsletters for emerging brands.
`}

ACTIVE SOURCES TODAY
${data.summary.topNewsletters.slice(0, 5).join(' • ')}

--
Substack Intelligence Platform
AI-powered venture intelligence for consumer VC deal sourcing
Generated on ${new Date().toLocaleString()}
    `.trim();
  }

  private generateWeeklyTextVersion(data: WeeklyReportData): string {
    return `
WEEKLY INTELLIGENCE SUMMARY
Week of ${data.weekOf}

KEY METRICS
• ${data.totalCompanies} companies discovered
• ${data.totalMentions} total mentions
• ${data.topNewsletters.length} active sources
• ${data.trendingIndustries.length} trending industries

${data.topCompanies.length > 0 ? `
TOP COMPANIES THIS WEEK
${data.topCompanies.slice(0, 5).map((company, index) => `
${index + 1}. ${company.name} - ${company.mentionCount} mentions
   Sources: ${company.newsletters.join(', ')}
   Sentiment: ${company.sentiment}
`).join('')}
` : ''}

${data.trendingIndustries.length > 0 ? `
TRENDING INDUSTRIES
${data.trendingIndustries.slice(0, 8).join(' • ')}
` : ''}

${data.insights.length > 0 ? `
KEY INSIGHTS
${data.insights.map((insight, index) => `• ${insight}`).join('\n')}
` : ''}

View full report: https://intelligence.substack.com/intelligence

--
Substack Intelligence Platform
Weekly insights from 26+ curated newsletters
Generated on ${new Date().toLocaleString()}
    `.trim();
  }

  // Get email delivery statistics
  async getDeliveryStats() {
    // Note: Resend doesn't have built-in analytics API yet
    // This would integrate with their webhook system for delivery tracking
    return {
      message: 'Email delivery stats require webhook integration',
      suggestion: 'Implement Resend webhooks for detailed analytics'
    };
  }
}