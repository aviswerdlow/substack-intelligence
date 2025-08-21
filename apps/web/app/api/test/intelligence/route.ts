import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@substack-intelligence/database';

// Disable Next.js caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const supabase = createServiceRoleClient();
    
    // Get companies with their latest mentions
    const { data: companies, error } = await supabase
      .from('companies')
      .select(`
        id,
        name,
        description,
        mention_count,
        company_mentions(
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
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Failed to fetch intelligence:', error);
      throw new Error(`Failed to fetch intelligence: ${error.message}`);
    }
    
    // Transform data to match expected format
    const intelligence = companies?.map(company => {
      const latestMention = company.company_mentions?.[0];
      return {
        company_id: company.id,
        company_name: company.name,
        company_description: company.description,
        total_mentions: company.mention_count || 1,
        latest_mention_date: latestMention?.emails?.received_at || new Date().toISOString(),
        latest_context: latestMention?.context || '',
        latest_newsletter: latestMention?.emails?.newsletter_name || 'Unknown',
        latest_sentiment: latestMention?.sentiment || 'neutral',
        latest_confidence: latestMention?.confidence || 0.8
      };
    }) || [];
    
    return NextResponse.json({
      success: true,
      data: {
        intelligence
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });
    
  } catch (error) {
    console.error('Intelligence API error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}