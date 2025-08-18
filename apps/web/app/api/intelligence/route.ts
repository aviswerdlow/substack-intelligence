import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { createServerComponentClient, getDailyIntelligence } from '@substack-intelligence/database';
import { z } from 'zod';

const GetIntelligenceSchema = z.object({
  limit: z.string().optional().transform(val => val ? parseInt(val) : 50),
  days: z.string().optional().transform(val => val ? parseInt(val) : 1)
});

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = auth();
    if (!userId) {
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

    // Get daily intelligence from database
    const supabase = createServerComponentClient();
    const intelligence = await getDailyIntelligence(supabase, params);

    // Group by company for better organization
    const companiesMap = new Map();
    
    intelligence.forEach(item => {
      if (!companiesMap.has(item.company_id)) {
        companiesMap.set(item.company_id, {
          id: item.company_id,
          name: item.name,
          description: item.description,
          website: item.website,
          funding_status: item.funding_status,
          mentions: [],
          totalMentions: item.mention_count,
          newsletterDiversity: item.newsletter_diversity
        });
      }
      
      companiesMap.get(item.company_id).mentions.push({
        id: item.mention_id,
        context: item.context,
        sentiment: item.sentiment,
        confidence: item.confidence,
        newsletter_name: item.newsletter_name,
        received_at: item.received_at
      });
    });

    const companiesWithMentions = Array.from(companiesMap.values())
      .sort((a, b) => b.totalMentions - a.totalMentions);

    return NextResponse.json({
      success: true,
      data: {
        companies: companiesWithMentions,
        summary: {
          totalCompanies: companiesWithMentions.length,
          totalMentions: intelligence.length,
          averageMentionsPerCompany: companiesWithMentions.length > 0 
            ? (intelligence.length / companiesWithMentions.length).toFixed(1)
            : 0,
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