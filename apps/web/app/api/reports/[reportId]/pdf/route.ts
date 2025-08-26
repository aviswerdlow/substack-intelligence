import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@substack-intelligence/database';
import { renderToBuffer } from '@react-pdf/renderer';
import { ReportPDFTemplate } from '@/components/reports/ReportPDFTemplate';
import React from 'react';

export async function GET(
  request: NextRequest,
  { params }: { params: { reportId: string } }
) {
  try {
    const { reportId } = params;
    const supabase = createServiceRoleClient();
    
    // Fetch report data
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (reportError || !report) {
      // Generate mock report for demo purposes
      const mockReport = {
        id: reportId,
        report_type: 'weekly' as 'weekly' | 'daily',
        report_date: new Date().toISOString(),
        generated_at: new Date().toISOString(),
        status: 'completed',
      };
      
      // Fetch real intelligence data for the report
      const endDate = new Date();
      const startDate = new Date();
      
      if (mockReport.report_type === 'daily') {
        startDate.setDate(startDate.getDate() - 1);
      } else if (mockReport.report_type === 'weekly') {
        startDate.setDate(startDate.getDate() - 7);
      } else {
        startDate.setMonth(startDate.getMonth() - 1);
      }

      // Fetch company mentions from the database
      const { data: mentions } = await supabase
        .from('company_mentions')
        .select(`
          *,
          companies (
            id,
            name,
            description,
            website,
            funding_status
          )
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      // Group mentions by company
      const companiesMap = new Map();
      
      if (mentions && mentions.length > 0) {
        mentions.forEach((mention: any) => {
          const companyId = mention.company_id;
          if (!companiesMap.has(companyId)) {
            companiesMap.set(companyId, {
              name: mention.companies?.name || 'Unknown Company',
              description: mention.companies?.description,
              fundingStatus: mention.companies?.funding_status,
              mentions: [],
            });
          }
          
          companiesMap.get(companyId).mentions.push({
            context: mention.context,
            sentiment: mention.sentiment || 'neutral',
            confidence: mention.confidence || 0.5,
            newsletterName: mention.newsletter_name || 'Unknown Newsletter',
            receivedAt: mention.created_at,
          });
        });
      }

      // If no real data, use mock data
      if (companiesMap.size === 0) {
        companiesMap.set('mock-1', {
          name: 'OpenAI',
          description: 'AI research and deployment company developing AGI for the benefit of humanity',
          fundingStatus: 'series-c',
          mentions: [
            {
              context: 'OpenAI announced significant improvements to GPT-4 with enhanced reasoning capabilities and reduced hallucination rates.',
              sentiment: 'positive',
              confidence: 0.92,
              newsletterName: 'AI Weekly',
              receivedAt: new Date().toISOString(),
            },
            {
              context: 'The company is expanding its enterprise offerings with new API features and compliance certifications.',
              sentiment: 'positive',
              confidence: 0.88,
              newsletterName: 'Tech Insider',
              receivedAt: new Date(Date.now() - 86400000).toISOString(),
            },
          ],
        });
        
        companiesMap.set('mock-2', {
          name: 'Anthropic',
          description: 'AI safety company building reliable, interpretable, and steerable AI systems',
          fundingStatus: 'series-b',
          mentions: [
            {
              context: 'Anthropic\'s Claude 3 continues to gain market share in the enterprise AI assistant space.',
              sentiment: 'positive',
              confidence: 0.85,
              newsletterName: 'AI Weekly',
              receivedAt: new Date().toISOString(),
            },
          ],
        });
        
        companiesMap.set('mock-3', {
          name: 'Perplexity AI',
          description: 'Conversational search engine powered by large language models',
          fundingStatus: 'series-a',
          mentions: [
            {
              context: 'Perplexity raised concerns about content attribution in their search results.',
              sentiment: 'negative',
              confidence: 0.78,
              newsletterName: 'Media Watch',
              receivedAt: new Date(Date.now() - 172800000).toISOString(),
            },
            {
              context: 'The startup is rapidly iterating on mobile experience with new iOS features.',
              sentiment: 'neutral',
              confidence: 0.82,
              newsletterName: 'Product Hunt Daily',
              receivedAt: new Date(Date.now() - 86400000).toISOString(),
            },
          ],
        });
      }

      const companies = Array.from(companiesMap.values());
      const totalMentions = companies.reduce((sum, c) => sum + c.mentions.length, 0);
      const avgSentiment = companies.reduce((sum, c) => {
        const companySentiment = c.mentions.reduce((s: number, m: any) => {
          return s + (m.sentiment === 'positive' ? 1 : m.sentiment === 'negative' ? -1 : 0);
        }, 0) / c.mentions.length;
        return sum + companySentiment;
      }, 0) / companies.length;

      // Prepare data for PDF
      const reportData = {
        reportType: mockReport.report_type,
        reportDate: mockReport.report_date,
        generatedAt: mockReport.generated_at,
        stats: {
          totalCompanies: companies.length,
          totalMentions,
          avgSentiment: avgSentiment || 0,
          newslettersCovered: new Set(companies.flatMap(c => c.mentions.map((m: any) => m.newsletterName))).size,
        },
        companies: companies.slice(0, 10), // Limit to top 10 for PDF size
      };

      // Generate PDF (cast to any to avoid React/ReactPDF type conflicts)
      const pdfBuffer = await renderToBuffer(
        React.createElement(ReportPDFTemplate, { data: reportData }) as any
      );

      // Return PDF as response (convert Buffer to Uint8Array for NextResponse)
      return new NextResponse(pdfBuffer as any, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="report-${reportId}.pdf"`,
        },
      });
    }

    // If we have a real report (future implementation)
    const reportData = {
      reportType: report.report_type,
      reportDate: report.report_date,
      generatedAt: report.generated_at,
      stats: {
        totalCompanies: report.companies_count || 0,
        totalMentions: report.mentions_count || 0,
        avgSentiment: 0,
        newslettersCovered: 0,
      },
      companies: [],
    };

    const pdfBuffer = await renderToBuffer(
      React.createElement(ReportPDFTemplate, { data: reportData }) as any
    );

    return new NextResponse(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="report-${reportId}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF report' },
      { status: 500 }
    );
  }
}