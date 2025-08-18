import puppeteer from 'puppeteer';
import { render } from '@react-email/render';
import { 
  DailyIntelligenceReport, 
  WeeklySummaryReport,
  type DailyReportData,
  type WeeklyReportData 
} from '@substack-intelligence/email';

export class PDFGenerator {
  private browser: puppeteer.Browser | null = null;

  async initialize() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      });
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async generateDailyReport(data: DailyReportData): Promise<Buffer> {
    await this.initialize();
    const page = await this.browser!.newPage();

    try {
      // Render React component to HTML
      const html = render(DailyIntelligenceReport(data));
      
      // Enhanced HTML with better PDF styling
      const fullHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Daily Intelligence Report - ${data.date}</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 800px;
                margin: 0 auto;
                padding: 40px 20px;
              }
              .header {
                text-align: center;
                margin-bottom: 40px;
                border-bottom: 2px solid #eee;
                padding-bottom: 20px;
              }
              .logo {
                width: 60px;
                height: 60px;
                background: #000;
                border-radius: 8px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: 24px;
                margin-bottom: 16px;
              }
              .summary-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 20px;
                margin: 30px 0;
                padding: 20px;
                background: #f8f9fa;
                border-radius: 8px;
              }
              .stat {
                text-align: center;
              }
              .stat-number {
                font-size: 32px;
                font-weight: bold;
                color: #000;
                line-height: 1;
              }
              .stat-label {
                font-size: 12px;
                color: #666;
                text-transform: uppercase;
                margin-top: 8px;
              }
              .company-item {
                margin: 20px 0;
                padding: 20px;
                border: 1px solid #e5e5e5;
                border-radius: 8px;
                break-inside: avoid;
              }
              .company-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 12px;
              }
              .company-name {
                font-size: 18px;
                font-weight: 600;
                color: #000;
                margin: 0;
              }
              .company-description {
                color: #666;
                font-size: 14px;
                margin: 8px 0;
              }
              .context-quote {
                background: #f8f9fa;
                border-left: 4px solid #007ee6;
                padding: 12px 16px;
                margin: 16px 0;
                font-style: italic;
                color: #374151;
              }
              .metadata {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-top: 12px;
                font-size: 12px;
                color: #666;
              }
              .sentiment {
                display: inline-flex;
                align-items: center;
                gap: 6px;
              }
              .sentiment-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
              }
              .sentiment-positive { background: #16a34a; }
              .sentiment-negative { background: #dc2626; }
              .sentiment-neutral { background: #6b7280; }
              .footer {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                text-align: center;
                color: #666;
                font-size: 12px;
              }
              @media print {
                body { margin: 0; padding: 20px; }
                .company-item { break-inside: avoid; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo">SI</div>
              <h1>Daily Intelligence Report</h1>
              <p>${data.date} • Consumer VC Deal Sourcing</p>
            </div>

            <div class="summary-grid">
              <div class="stat">
                <div class="stat-number">${data.summary.totalCompanies}</div>
                <div class="stat-label">Companies Discovered</div>
              </div>
              <div class="stat">
                <div class="stat-number">${data.summary.totalMentions}</div>
                <div class="stat-label">Total Mentions</div>
              </div>
              <div class="stat">
                <div class="stat-number">${data.summary.topNewsletters.length}</div>
                <div class="stat-label">Active Sources</div>
              </div>
            </div>

            ${data.companies.length > 0 ? `
              <h2>Company Discoveries</h2>
              ${data.companies.map(company => `
                <div class="company-item">
                  <div class="company-header">
                    <div>
                      <h3 class="company-name">${company.name}</h3>
                      ${company.description ? `<p class="company-description">${company.description}</p>` : ''}
                    </div>
                  </div>
                  
                  <div class="context-quote">
                    "${company.context.slice(0, 300)}${company.context.length > 300 ? '...' : ''}"
                  </div>
                  
                  <div class="metadata">
                    <div class="sentiment">
                      <div class="sentiment-dot sentiment-${company.sentiment}"></div>
                      ${company.sentiment} (${Math.round(company.confidence * 100)}% confidence)
                    </div>
                    <div>${company.newsletter_name}</div>
                  </div>
                </div>
              `).join('')}
            ` : `
              <div style="text-align: center; padding: 40px; color: #666;">
                <p>No companies discovered today.</p>
                <p style="font-size: 14px;">We'll continue monitoring your curated newsletters for emerging brands.</p>
              </div>
            `}

            <div class="footer">
              <p>Substack Intelligence Platform</p>
              <p>AI-powered venture intelligence for consumer VC deal sourcing</p>
              <p>Generated on ${new Date().toLocaleString()}</p>
            </div>
          </body>
        </html>
      `;

      await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
      
      // Generate PDF
      const pdf = await page.pdf({
        format: 'A4',
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        },
        printBackground: true,
        preferCSSPageSize: true
      });

      return pdf;
    } finally {
      await page.close();
    }
  }

  async generateWeeklyReport(data: WeeklyReportData): Promise<Buffer> {
    await this.initialize();
    const page = await this.browser!.newPage();

    try {
      // Enhanced HTML for weekly report
      const fullHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Weekly Intelligence Summary - ${data.weekOf}</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 800px;
                margin: 0 auto;
                padding: 40px 20px;
              }
              .header {
                text-align: center;
                margin-bottom: 40px;
                border-bottom: 2px solid #eee;
                padding-bottom: 20px;
              }
              .logo {
                width: 60px;
                height: 60px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 8px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: 24px;
                margin-bottom: 16px;
              }
              .summary-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 20px;
                margin: 30px 0;
                padding: 24px;
                background: linear-gradient(135deg, #f6f9fc 0%, #e8f4fd 100%);
                border-radius: 12px;
                border: 1px solid #e1e8ed;
              }
              .stat {
                text-align: center;
              }
              .stat-number {
                font-size: 36px;
                font-weight: bold;
                color: #000;
                line-height: 1;
              }
              .stat-label {
                font-size: 12px;
                color: #666;
                margin-top: 8px;
              }
              .section {
                margin: 40px 0;
              }
              .section-title {
                font-size: 20px;
                font-weight: 600;
                margin-bottom: 20px;
                display: flex;
                align-items: center;
                gap: 8px;
              }
              .top-company {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 16px;
                margin: 12px 0;
                background: #f8f9fa;
                border-radius: 8px;
                border: 1px solid #e9ecef;
              }
              .company-rank {
                width: 32px;
                height: 32px;
                background: #000;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: 14px;
                margin-right: 12px;
              }
              .company-info {
                flex: 1;
              }
              .company-stats {
                text-align: right;
              }
              .industry-tags {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin: 16px 0;
              }
              .industry-tag {
                background: #e3f2fd;
                color: #1976d2;
                padding: 4px 12px;
                border-radius: 16px;
                font-size: 12px;
                font-weight: 500;
              }
              .newsletter-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 16px;
                margin: 20px 0;
              }
              .newsletter-item {
                background: #f8f9fa;
                padding: 16px;
                border-radius: 8px;
                border: 1px solid #e9ecef;
              }
              .insights-list {
                list-style: none;
                padding: 0;
              }
              .insights-list li {
                display: flex;
                align-items: flex-start;
                gap: 12px;
                margin: 12px 0;
                padding: 12px 0;
              }
              .insight-bullet {
                width: 8px;
                height: 8px;
                background: #007ee6;
                border-radius: 50%;
                margin-top: 6px;
                flex-shrink: 0;
              }
              .footer {
                margin-top: 60px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                text-align: center;
                color: #666;
                font-size: 12px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo">SI</div>
              <h1>Weekly Intelligence Summary</h1>
              <p>Week of ${data.weekOf} • Venture Intelligence Insights</p>
            </div>

            <div class="summary-grid">
              <div class="stat">
                <div class="stat-number">${data.totalCompanies}</div>
                <div class="stat-label">Companies Discovered</div>
              </div>
              <div class="stat">
                <div class="stat-number">${data.totalMentions}</div>
                <div class="stat-label">Total Mentions</div>
              </div>
              <div class="stat">
                <div class="stat-number">${data.topNewsletters.length}</div>
                <div class="stat-label">Active Sources</div>
              </div>
              <div class="stat">
                <div class="stat-number">${data.trendingIndustries.length}</div>
                <div class="stat-label">Industries</div>
              </div>
            </div>

            ${data.topCompanies.length > 0 ? `
              <div class="section">
                <h2 class="section-title">🏆 Most Mentioned Companies</h2>
                ${data.topCompanies.slice(0, 8).map((company, index) => `
                  <div class="top-company">
                    <div style="display: flex; align-items: center;">
                      <div class="company-rank">${index + 1}</div>
                      <div class="company-info">
                        <div style="font-weight: 600; font-size: 16px;">${company.name}</div>
                        <div style="font-size: 13px; color: #666; margin-top: 2px;">
                          ${company.newsletters.join(', ')}
                        </div>
                      </div>
                    </div>
                    <div class="company-stats">
                      <div style="font-weight: bold; font-size: 18px;">${company.mentionCount} mentions</div>
                      <div style="font-size: 12px; color: #666; text-transform: capitalize;">
                        ${company.sentiment} sentiment
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : ''}

            ${data.trendingIndustries.length > 0 ? `
              <div class="section">
                <h2 class="section-title">📈 Trending Industries</h2>
                <div class="industry-tags">
                  ${data.trendingIndustries.slice(0, 12).map(industry => `
                    <span class="industry-tag">${industry}</span>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            ${data.topNewsletters.length > 0 ? `
              <div class="section">
                <h2 class="section-title">📰 Most Active Sources</h2>
                <div class="newsletter-grid">
                  ${data.topNewsletters.slice(0, 9).map(newsletter => `
                    <div class="newsletter-item">
                      <div style="font-weight: 600; margin-bottom: 4px;">${newsletter.name}</div>
                      <div style="font-size: 12px; color: #666;">${newsletter.companyCount} companies</div>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            ${data.insights.length > 0 ? `
              <div class="section">
                <h2 class="section-title">💡 Key Insights</h2>
                <ul class="insights-list">
                  ${data.insights.map(insight => `
                    <li>
                      <div class="insight-bullet"></div>
                      <div>${insight}</div>
                    </li>
                  `).join('')}
                </ul>
              </div>
            ` : ''}

            <div class="footer">
              <p>Substack Intelligence Platform</p>
              <p>Weekly insights from 26+ curated newsletters</p>
              <p>Generated on ${new Date().toLocaleString()}</p>
            </div>
          </body>
        </html>
      `;

      await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
      
      const pdf = await page.pdf({
        format: 'A4',
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        },
        printBackground: true,
        preferCSSPageSize: true
      });

      return pdf;
    } finally {
      await page.close();
    }
  }

  // Alternative React-PDF implementation (faster but more limited styling)
  async generateReactPDFReport(data: DailyReportData): Promise<Buffer> {
    // Note: This would use @react-pdf/renderer for pure React PDF generation
    // Kept as placeholder for potential future implementation
    throw new Error('React-PDF implementation not yet completed');
  }
}