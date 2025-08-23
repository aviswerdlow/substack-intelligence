import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createServiceRoleClient } from '@substack-intelligence/database';
import { z } from 'zod';

// Disable Next.js caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const GetIntelligenceSchema = z.object({
  limit: z.string().nullable().optional().transform(val => val ? parseInt(val) : 50),
  days: z.string().nullable().optional().transform(val => val ? parseInt(val) : 1)
});

export async function GET(request: NextRequest) {
  try {
    // Check authentication (skip in development for testing)
    const user = await currentUser();
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (!user && !isDevelopment) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const params = GetIntelligenceSchema.parse({
      limit: searchParams.get('limit'),
      days: searchParams.get('days')
    });

    // Get companies with their mentions directly (use service role to bypass RLS)
    const supabase = createServiceRoleClient();
    
    // Calculate date range
    const dateThreshold = new Date(Date.now() - params.days * 24 * 60 * 60 * 1000).toISOString();
    
    // Query companies with recent mentions
    const { data: companies, error } = await supabase
      .from('companies')
      .select(`
        *,
        company_mentions(
          id,
          context,
          sentiment,
          confidence,
          extracted_at,
          emails(
            newsletter_name,
            received_at
          )
        )
      `)
      .order('mention_count', { ascending: false })
      .limit(params.limit);
    
    if (error) throw error;
    
    // Transform data for the frontend
    const companiesWithMentions = (companies || []).map(company => ({
      id: company.id,
      name: company.name,
      description: company.description,
      website: company.website,
      funding_status: company.funding_status,
      mentions: (company.company_mentions || []).map((mention: any) => ({
        id: mention.id,
        context: mention.context,
        sentiment: mention.sentiment,
        confidence: mention.confidence,
        newsletter_name: mention.emails?.newsletter_name || 'Unknown',
        received_at: mention.emails?.received_at || mention.extracted_at
      })),
      totalMentions: company.mention_count || company.company_mentions?.length || 0,
      newsletterDiversity: new Set(
        (company.company_mentions || []).map((m: any) => m.emails?.newsletter_name).filter(Boolean)
      ).size
    })).filter(company => company.mentions.length > 0);

    return NextResponse.json({
      success: true,
      data: {
        companies: companiesWithMentions,
        summary: {
          totalCompanies: companiesWithMentions.length,
          totalMentions: companiesWithMentions.reduce((sum, c) => sum + c.totalMentions, 0),
          averageMentionsPerCompany: companiesWithMentions.length > 0 
            ? (companiesWithMentions.reduce((sum, c) => sum + c.totalMentions, 0) / companiesWithMentions.length).toFixed(1)
            : '0',
          timeRange: `${params.days} day${params.days > 1 ? 's' : ''}`
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });

  } catch (error) {
    console.error('Failed to fetch intelligence:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid query parameters',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}