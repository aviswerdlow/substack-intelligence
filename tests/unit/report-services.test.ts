import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PDFGenerator } from '@substack-intelligence/reports/pdf-generator';
import { ReportScheduler } from '@substack-intelligence/reports/report-scheduler';
import { EmailService } from '@substack-intelligence/reports/email-service';
import { createServiceRoleClient, getDailyIntelligence } from '@substack-intelligence/database';

// Create mocks for the classes
vi.mock('@substack-intelligence/reports/pdf-generator');
vi.mock('@substack-intelligence/reports/email-service');
vi.mock('@substack-intelligence/reports/report-scheduler');
vi.mock('@substack-intelligence/database');

// These services are mocked globally in setup.ts

vi.mock('@react-email/render', () => ({
  render: vi.fn((component) => '<html>Mock rendered email</html>')
}));

vi.mock('@substack-intelligence/email', () => ({
  DailyIntelligenceReport: vi.fn(() => 'Daily Report Component'),
  WeeklySummaryReport: vi.fn(() => 'Weekly Report Component'),
  CompanyAlert: vi.fn(() => 'Company Alert Component')
}));

// Database is mocked globally in setup.ts

// Mock environment variables
const originalEnv = process.env;

describe('Report Services', () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      RESEND_API_KEY: 'test-api-key',
      REPORT_RECIPIENTS: 'test1@example.com,test2@example.com'
    };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('PDFGenerator', () => {
    let pdfGenerator: PDFGenerator;
    let mockBrowser: any;
    let mockPage: any;

    beforeEach(() => {
      pdfGenerator = new PDFGenerator();
      mockPage = {
        setContent: vi.fn(),
        pdf: vi.fn(() => Promise.resolve(Buffer.from('mock-pdf-content'))),
        close: vi.fn()
      };
      mockBrowser = {
        newPage: vi.fn(() => Promise.resolve(mockPage)),
        close: vi.fn()
      };
    });

    describe('generateDailyReport', () => {
      it('should generate PDF from daily report data', async () => {
        const mockReportData = {
          date: '2024-01-01',
          companies: [
            {
              id: 'company-1',
              name: 'Test Company',
              description: 'A test company',
              website: 'https://example.com',
              context: 'Test company is doing well',
              sentiment: 'positive' as any,
              confidence: 0.9,
              newsletter_name: 'Test Newsletter',
              received_at: '2024-01-01',
              funding_status: 'Series A'
            }
          ],
          summary: {
            totalCompanies: 1,
            totalMentions: 1,
            topNewsletters: ['Test Newsletter']
          }
        };

        await pdfGenerator.initialize();
        const result = await pdfGenerator.generateDailyReport(mockReportData);

        expect(result).toBeInstanceOf(Buffer);
        expect(result.toString()).toBe('mock-pdf-content');
      });

      it('should handle browser initialization', async () => {
        const puppeteer = require('puppeteer');
        await pdfGenerator.initialize();
        
        expect(puppeteer.default.launch).toHaveBeenCalledWith({
          headless: true,
          args: expect.arrayContaining([
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
          ])
        });
      });

      it('should cleanup browser resources', async () => {
        const puppeteer = require('puppeteer');
        const mockBrowser = await puppeteer.default.launch();
        
        await pdfGenerator.initialize();
        await pdfGenerator.cleanup();
        
        expect(mockBrowser.close).toHaveBeenCalled();
      });

      it('should generate PDF with proper HTML structure', async () => {
        const puppeteer = require('puppeteer');
        const mockBrowser = await puppeteer.default.launch();
        mockBrowser.newPage.mockResolvedValue(mockPage);

        const reportData = {
          date: '2024-01-01',
          companies: [
            {
              id: 'company-1',
              name: 'Test Company',
              description: 'Test description',
              website: 'https://example.com',
              context: 'Test context',
              sentiment: 'positive' as any,
              confidence: 0.9,
              newsletter_name: 'Test Newsletter',
              received_at: '2024-01-01',
              funding_status: 'Seed'
            }
          ],
          summary: {
            totalCompanies: 1,
            totalMentions: 1,
            topNewsletters: ['Test Newsletter']
          }
        };

        await pdfGenerator.generateDailyReport(reportData);

        expect(mockPage.setContent).toHaveBeenCalledWith(
          expect.stringContaining('Daily Intelligence Report'),
          { waitUntil: 'networkidle0' }
        );
        expect(mockPage.pdf).toHaveBeenCalledWith({
          format: 'A4',
          margin: expect.any(Object),
          printBackground: true,
          preferCSSPageSize: true
        });
        expect(mockPage.close).toHaveBeenCalled();
      });
    });

    describe('generateWeeklyReport', () => {
      it('should generate weekly PDF report', async () => {
        const puppeteer = require('puppeteer');
        const mockBrowser = await puppeteer.default.launch();
        mockBrowser.newPage.mockResolvedValue(mockPage);

        const weeklyData = {
          weekOf: '2024-01-01',
          totalCompanies: 5,
          totalMentions: 15,
          topCompanies: [
            {
              name: 'Top Company',
              mentionCount: 5,
              sentiment: 'positive',
              newsletters: ['Newsletter 1', 'Newsletter 2']
            }
          ],
          trendingIndustries: ['Technology', 'Healthcare'],
          topNewsletters: [
            { name: 'Newsletter 1', companyCount: 3 },
            { name: 'Newsletter 2', companyCount: 2 }
          ],
          insights: ['Insight 1', 'Insight 2']
        };

        const result = await pdfGenerator.generateWeeklyReport(weeklyData);

        expect(result).toBeInstanceOf(Buffer);
        expect(mockPage.setContent).toHaveBeenCalledWith(
          expect.stringContaining('Weekly Intelligence Summary'),
          { waitUntil: 'networkidle0' }
        );
      });
    });

    describe('error handling', () => {
      it('should handle puppeteer launch failures', async () => {
        const puppeteer = require('puppeteer');
        (puppeteer.default.launch as any).mockRejectedValue(new Error('Browser launch failed'));

        await expect(pdfGenerator.initialize()).rejects.toThrow('Browser launch failed');
      });

      it('should handle PDF generation failures', async () => {
        const puppeteer = require('puppeteer');
        const mockBrowser = await puppeteer.default.launch();
        const failingPage = {
          setContent: vi.fn(),
          pdf: vi.fn(() => Promise.reject(new Error('PDF generation failed'))),
          close: vi.fn()
        };
        mockBrowser.newPage.mockResolvedValue(failingPage);

        const reportData = {
          date: '2024-01-01',
          companies: [],
          summary: { totalCompanies: 0, totalMentions: 0, topNewsletters: [] }
        };

        await expect(pdfGenerator.generateDailyReport(reportData)).rejects.toThrow('PDF generation failed');
        expect(failingPage.close).toHaveBeenCalled(); // Ensure cleanup
      });
    });
  });

  describe('EmailService', () => {
    let emailService: EmailService;
    let mockResend: any;

    beforeEach(() => {
      const { Resend } = require('resend');
      mockResend = new Resend();
      emailService = new EmailService();
    });

    describe('constructor', () => {
      it('should require RESEND_API_KEY', () => {
        delete process.env.RESEND_API_KEY;
        expect(() => new EmailService()).toThrow('RESEND_API_KEY environment variable is required');
      });

      it('should initialize with API key', () => {
        process.env.RESEND_API_KEY = 'test-key';
        const service = new EmailService();
        expect(service).toBeInstanceOf(EmailService);
      });
    });

    describe('sendDailyReport', () => {
      it('should send daily report email', async () => {
        const reportData = {
          date: '2024-01-01',
          companies: [
            {
              id: 'company-1',
              name: 'Test Company',
              description: 'Test description',
              website: 'https://example.com',
              context: 'Test context',
              sentiment: 'positive' as any,
              confidence: 0.9,
              newsletter_name: 'Test Newsletter',
              received_at: '2024-01-01',
              funding_status: 'Seed'
            }
          ],
          summary: {
            totalCompanies: 1,
            totalMentions: 1,
            topNewsletters: ['Test Newsletter']
          }
        };
        
        const recipients = ['test@example.com'];
        const pdfBuffer = Buffer.from('mock-pdf');

        const result = await emailService.sendDailyReport(reportData, recipients, pdfBuffer);

        expect(mockResend.emails.send).toHaveBeenCalledWith({
          from: 'Substack Intelligence <intelligence@updates.substackai.com>',
          to: recipients,
          subject: 'Daily Intelligence • 1 companies discovered',
          html: expect.any(String),
          text: expect.any(String),
          attachments: [{
            filename: 'daily-intelligence-2024-01-01.pdf',
            content: pdfBuffer
          }],
          headers: expect.objectContaining({
            'X-Entity-Ref-ID': 'daily-2024-01-01',
            'List-Unsubscribe': expect.any(String)
          }),
          tags: expect.arrayContaining([
            { name: 'type', value: 'daily-report' },
            { name: 'companies', value: '1' },
            { name: 'mentions', value: '1' }
          ])
        });

        expect(result.data?.id).toBe('mock-email-id');
      });

      it('should send email without PDF attachment', async () => {
        const reportData = {
          date: '2024-01-01',
          companies: [],
          summary: { totalCompanies: 0, totalMentions: 0, topNewsletters: [] }
        };
        
        const recipients = ['test@example.com'];

        await emailService.sendDailyReport(reportData, recipients);

        expect(mockResend.emails.send).toHaveBeenCalledWith(
          expect.objectContaining({
            attachments: undefined
          })
        );
      });

      it('should handle email sending failures', async () => {
        mockResend.emails.send.mockRejectedValue(new Error('Email sending failed'));

        const reportData = {
          date: '2024-01-01',
          companies: [],
          summary: { totalCompanies: 0, totalMentions: 0, topNewsletters: [] }
        };

        await expect(emailService.sendDailyReport(reportData, ['test@example.com']))
          .rejects.toThrow('Email sending failed');
      });
    });

    describe('sendWeeklyReport', () => {
      it('should send weekly report email', async () => {
        const weeklyData = {
          weekOf: '2024-01-01',
          totalCompanies: 5,
          totalMentions: 15,
          topCompanies: [
            {
              name: 'Top Company',
              mentionCount: 5,
              sentiment: 'positive',
              newsletters: ['Newsletter 1']
            }
          ],
          trendingIndustries: ['Technology'],
          topNewsletters: [{ name: 'Newsletter 1', companyCount: 3 }],
          insights: ['Weekly insight']
        };

        const result = await emailService.sendWeeklyReport(weeklyData, ['test@example.com']);

        expect(mockResend.emails.send).toHaveBeenCalledWith(
          expect.objectContaining({
            from: 'Substack Intelligence <intelligence@updates.substackai.com>',
            subject: 'Weekly Intelligence Summary • 5 companies • Week of 2024-01-01',
            tags: expect.arrayContaining([
              { name: 'type', value: 'weekly-report' }
            ])
          })
        );
      });
    });

    describe('sendCompanyAlert', () => {
      it('should send high priority company alert', async () => {
        const alertData = {
          companyName: 'Urgent Company',
          description: 'Hot startup alert',
          newsletterName: 'VC Newsletter',
          sentiment: 'positive' as any,
          confidence: 0.95,
          mentionCount: 3,
          context: 'Urgent Company just raised $50M Series B',
          website: 'https://urgent.com',
          isHighPriority: true
        };

        const result = await emailService.sendCompanyAlert(alertData, ['vc@example.com']);

        expect(mockResend.emails.send).toHaveBeenCalledWith(
          expect.objectContaining({
            from: 'Substack Intelligence <alerts@updates.substackai.com>',
            subject: '🚨 HIGH PRIORITY: Urgent Company mentioned in VC Newsletter',
            headers: expect.objectContaining({
              'X-Priority': '1'
            }),
            tags: expect.arrayContaining([
              { name: 'priority', value: 'high' }
            ])
          })
        );
      });

      it('should send normal priority company alert', async () => {
        const alertData = {
          companyName: 'Normal Company',
          description: 'Regular startup',
          newsletterName: 'Tech Newsletter',
          sentiment: 'neutral' as any,
          confidence: 0.7,
          mentionCount: 1,
          context: 'Normal Company launched new feature',
          isHighPriority: false
        };

        await emailService.sendCompanyAlert(alertData, ['analyst@example.com']);

        expect(mockResend.emails.send).toHaveBeenCalledWith(
          expect.objectContaining({
            subject: '📈 Normal Company mentioned in Tech Newsletter',
            headers: expect.objectContaining({
              'X-Priority': '3'
            }),
            tags: expect.arrayContaining([
              { name: 'priority', value: 'normal' }
            ])
          })
        );
      });
    });

    describe('sendTestEmail', () => {
      it('should send test email', async () => {
        const result = await emailService.sendTestEmail('test@example.com');

        expect(mockResend.emails.send).toHaveBeenCalledWith(
          expect.objectContaining({
            from: 'Substack Intelligence <test@updates.substackai.com>',
            to: 'test@example.com',
            subject: 'Test Email - Substack Intelligence Platform',
            tags: [{ name: 'type', value: 'test' }]
          })
        );
      });
    });

    describe('text version generation', () => {
      it('should generate text version for daily reports', async () => {
        const reportData = {
          date: '2024-01-01',
          companies: [
            {
              id: 'company-1',
              name: 'Test Company',
              description: 'A test company',
              website: 'https://example.com',
              context: 'Test company context that is long enough to be truncated if needed',
              sentiment: 'positive' as any,
              confidence: 0.85,
              newsletter_name: 'Test Newsletter',
              received_at: '2024-01-01',
              funding_status: 'Series A'
            }
          ],
          summary: {
            totalCompanies: 1,
            totalMentions: 1,
            topNewsletters: ['Test Newsletter']
          }
        };

        await emailService.sendDailyReport(reportData, ['test@example.com']);

        const textContent = mockResend.emails.send.mock.calls[0][0].text;
        expect(textContent).toContain('DAILY INTELLIGENCE REPORT');
        expect(textContent).toContain('Test Company');
        expect(textContent).toContain('positive (85% confidence)');
      });

      it('should handle empty company list in text version', async () => {
        const reportData = {
          date: '2024-01-01',
          companies: [],
          summary: { totalCompanies: 0, totalMentions: 0, topNewsletters: [] }
        };

        await emailService.sendDailyReport(reportData, ['test@example.com']);

        const textContent = mockResend.emails.send.mock.calls[0][0].text;
        expect(textContent).toContain('No companies discovered today');
      });
    });

    describe('getDeliveryStats', () => {
      it('should return placeholder delivery stats', async () => {
        const stats = await emailService.getDeliveryStats();
        
        expect(stats).toEqual({
          message: 'Email delivery stats require webhook integration',
          suggestion: 'Implement Resend webhooks for detailed analytics'
        });
      });
    });
  });

  describe('ReportScheduler', () => {
    let scheduler: ReportScheduler;
    let mockPdfGenerator: any;
    let mockEmailService: any;
    let mockSupabase: any;

    beforeEach(() => {
      // Mock the services used by ReportScheduler
      const PDFGeneratorMock = PDFGenerator as any;
      PDFGeneratorMock.mockImplementation(() => ({
        generateDailyReport: vi.fn(() => Promise.resolve(Buffer.from('mock-daily-pdf'))),
        generateWeeklyReport: vi.fn(() => Promise.resolve(Buffer.from('mock-weekly-pdf'))),
        cleanup: vi.fn()
      }));

      const EmailServiceMock = EmailService as any;
      EmailServiceMock.mockImplementation(() => ({
        sendDailyReport: vi.fn(() => Promise.resolve({ data: { id: 'email-id' } })),
        sendWeeklyReport: vi.fn(() => Promise.resolve({ data: { id: 'weekly-email-id' } }))
      }));

      mockSupabase = createServiceRoleClient();

      scheduler = new ReportScheduler();
      mockPdfGenerator = (scheduler as any).pdfGenerator;
      mockEmailService = (scheduler as any).emailService;
    });

    describe('generateDailyReport', () => {
      it('should generate complete daily report', async () => {
        
        const result = await scheduler.generateDailyReport('2024-01-01');

        expect(getDailyIntelligence).toHaveBeenCalledWith(mockSupabase, {
          limit: 100,
          days: 1
        });

        expect(mockPdfGenerator.generateDailyReport).toHaveBeenCalledWith(
          expect.objectContaining({
            date: '2024-01-01',
            companies: expect.any(Array),
            summary: expect.objectContaining({
              totalCompanies: expect.any(Number),
              totalMentions: expect.any(Number),
              topNewsletters: expect.any(Array)
            })
          })
        );

        expect(mockEmailService.sendDailyReport).toHaveBeenCalledWith(
          expect.any(Object),
          ['test1@example.com', 'test2@example.com'],
          Buffer.from('mock-daily-pdf')
        );

        expect(result).toMatchObject({
          data: expect.any(Object),
          pdf: expect.any(Buffer),
          emailResult: { data: { id: 'email-id' } }
        });
      });

      it('should use current date when no date provided', async () => {
        const today = new Date().toLocaleDateString();
        
        const result = await scheduler.generateDailyReport();
        
        expect(result.data.date).toBe(today);
      });

      it('should handle database errors', async () => {
        getDailyIntelligence.mockRejectedValue(new Error('Database connection failed'));

        await expect(scheduler.generateDailyReport('2024-01-01'))
          .rejects.toThrow('Database connection failed');

        // Should log error to database
        expect(mockSupabase.from).toHaveBeenCalledWith('report_history');
      });

      it('should store report record on success', async () => {
        await scheduler.generateDailyReport('2024-01-01');

        expect(mockSupabase.from).toHaveBeenCalledWith('report_history');
        const insertCall = mockSupabase.from().insert.mock.calls[0][0];
        expect(insertCall).toMatchObject({
          report_type: 'daily',
          report_date: '2024-01-01',
          recipients_count: 2,
          status: 'sent'
        });
      });
    });

    describe('generateWeeklyReport', () => {
      it('should generate complete weekly report', async () => {
        
        const result = await scheduler.generateWeeklyReport('2024-01-01');

        expect(getDailyIntelligence).toHaveBeenCalledWith(mockSupabase, {
          limit: 1000,
          days: 7
        });

        expect(mockPdfGenerator.generateWeeklyReport).toHaveBeenCalledWith(
          expect.objectContaining({
            weekOf: '2024-01-01',
            totalCompanies: expect.any(Number),
            totalMentions: expect.any(Number),
            topCompanies: expect.any(Array),
            trendingIndustries: expect.any(Array),
            topNewsletters: expect.any(Array),
            insights: expect.any(Array)
          })
        );

        expect(mockEmailService.sendWeeklyReport).toHaveBeenCalled();
        expect(result.emailResult.data.id).toBe('weekly-email-id');
      });

      it('should aggregate company data correctly', async () => {
        // Mock data with duplicate companies
        getDailyIntelligence.mockResolvedValue([
          {
            company_id: 'company-1',
            name: 'Test Company',
            description: 'A tech startup',
            sentiment: 'positive',
            newsletter_name: 'Tech Newsletter'
          },
          {
            company_id: 'company-1',
            name: 'Test Company',
            description: 'A tech startup',
            sentiment: 'positive',
            newsletter_name: 'Business Newsletter'
          },
          {
            company_id: 'company-2',
            name: 'Beauty Brand',
            description: 'Beauty and cosmetics company',
            sentiment: 'neutral',
            newsletter_name: 'Beauty Newsletter'
          }
        ]);

        const result = await scheduler.generateWeeklyReport();

        // Should deduplicate companies but count mentions
        expect(result.data.totalCompanies).toBe(2);
        expect(result.data.totalMentions).toBe(3);
        
        // Top company should have 2 mentions
        const topCompany = result.data.topCompanies[0];
        expect(topCompany.mentionCount).toBe(2);
        expect(topCompany.newsletters).toContain('Tech Newsletter');
        expect(topCompany.newsletters).toContain('Business Newsletter');
      });

      it('should generate weekly insights', async () => {
        const result = await scheduler.generateWeeklyReport();
        
        expect(result.data.insights).toEqual(
          expect.arrayContaining([
            expect.stringContaining('companies this week'),
            expect.stringContaining('dominated conversations'),
            expect.stringContaining('trending')
          ])
        );
      });
    });

    describe('recipient management', () => {
      it('should parse recipients from environment variable', async () => {
        process.env.REPORT_RECIPIENTS = 'user1@test.com,user2@test.com, user3@test.com';
        const scheduler = new ReportScheduler();
        
        await scheduler.generateDailyReport();
        
        expect(mockEmailService.sendDailyReport).toHaveBeenCalledWith(
          expect.any(Object),
          ['user1@test.com', 'user2@test.com', 'user3@test.com'],
          expect.any(Buffer)
        );
      });

      it('should use default recipient when environment variable missing', async () => {
        delete process.env.REPORT_RECIPIENTS;
        const scheduler = new ReportScheduler();
        
        await scheduler.generateDailyReport();
        
        expect(mockEmailService.sendDailyReport).toHaveBeenCalledWith(
          expect.any(Object),
          ['intelligence@substackai.com'],
          expect.any(Buffer)
        );
      });
    });

    describe('date utilities', () => {
      it('should calculate week start correctly', () => {
        const scheduler = new ReportScheduler();
        const weekStart = (scheduler as any).getWeekStart();
        
        expect(weekStart).toBeInstanceOf(Date);
        expect(weekStart.getDay()).toBe(0); // Sunday
      });
    });

    describe('error handling and logging', () => {
      it('should log errors to database on failure', async () => {
        mockPdfGenerator.generateDailyReport.mockRejectedValue(new Error('PDF generation failed'));

        await expect(scheduler.generateDailyReport('2024-01-01'))
          .rejects.toThrow('PDF generation failed');

        // Should log error to report_history
        const insertCalls = mockSupabase.from().insert.mock.calls;
        const errorLog = insertCalls.find(call => call[0].status === 'failed');
        expect(errorLog).toBeDefined();
        expect(errorLog[0]).toMatchObject({
          report_type: 'daily',
          status: 'failed',
          error_message: 'PDF generation failed'
        });
      });

      it('should handle database logging failures gracefully', async () => {
        mockSupabase.from.mockReturnValue({
          insert: vi.fn(() => Promise.reject(new Error('Database insert failed')))
        });

        // Should not throw even if logging fails
        expect(async () => {
          await (scheduler as any).logReportError({
            type: 'daily',
            date: '2024-01-01',
            error: 'Test error'
          });
        }).not.toThrow();
      });
    });

    describe('cleanup', () => {
      it('should cleanup PDF generator', async () => {
        await scheduler.cleanup();
        expect(mockPdfGenerator.cleanup).toHaveBeenCalled();
      });
    });

    describe('industry classification', () => {
      it('should classify companies into industries', async () => {
        getDailyIntelligence.mockResolvedValue([
          {
            company_id: 'beauty-1',
            name: 'Beauty Co',
            description: 'skincare and beauty products',
            sentiment: 'positive',
            newsletter_name: 'Beauty Newsletter'
          },
          {
            company_id: 'tech-1',
            name: 'Tech Co',
            description: 'software and app development',
            sentiment: 'positive',
            newsletter_name: 'Tech Newsletter'
          }
        ]);

        const result = await scheduler.generateWeeklyReport();

        expect(result.data.trendingIndustries).toContain('Beauty');
        expect(result.data.trendingIndustries).toContain('Technology');
      });
    });
  });
});