import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@substack-intelligence/database';
import { getServerSecuritySession } from '@substack-intelligence/lib/security/session';

export async function GET(request: NextRequest) {
  try {
    // Get current user for filtering
    const session = await getServerSecuritySession();
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (!session && !isDevelopment) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const userId = session?.user.id || 'development-user';
    
    const searchParams = request.nextUrl.searchParams;
    const days = searchParams.get('days') || '7';
    
    // Initialize Supabase client
    const supabase = createServiceRoleClient();
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    // Fetch mentions - FILTER BY USER_ID
    const { data: mentions, error: mentionsError } = await supabase
      .from('company_mentions')
      .select('*')
      .eq('user_id', userId)  // CRITICAL: Filter by user_id
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());
    
    if (mentionsError) {
      console.error('Error fetching mentions:', mentionsError);
      throw mentionsError;
    }
    
    // Fetch companies - FILTER BY USER_ID
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name, industry, funding_status')
      .eq('user_id', userId);  // CRITICAL: Filter by user_id
    
    if (companiesError) {
      console.error('Error fetching companies:', companiesError);
      throw companiesError;
    }
    
    // Create a map of companies for quick lookup
    const companiesMap = new Map();
    companies?.forEach(company => {
      companiesMap.set(company.id, company);
    });
    
    // Count mentions per company
    const mentionCounts = new Map();
    const sentimentCounts = new Map();
    
    mentions?.forEach(mention => {
      if (!mentionCounts.has(mention.company_id)) {
        mentionCounts.set(mention.company_id, 0);
        sentimentCounts.set(mention.company_id, {
          positive: 0,
          neutral: 0,
          negative: 0
        });
      }
      
      mentionCounts.set(mention.company_id, mentionCounts.get(mention.company_id) + 1);
      
      const sentiments = sentimentCounts.get(mention.company_id);
      const sentiment = mention.sentiment || 'neutral';
      sentiments[sentiment] = (sentiments[sentiment] || 0) + 1;
    });
    
    // Build top companies list
    const topCompanies = Array.from(mentionCounts.entries())
      .map(([companyId, count]) => {
        const company = companiesMap.get(companyId);
        const sentiments = sentimentCounts.get(companyId);
        
        if (!company) return null;
        
        return {
          id: companyId,
          name: company.name,
          industry: company.industry,
          fundingStatus: company.funding_status,
          mentionCount: count,
          sentiment: {
            positive: sentiments.positive,
            neutral: sentiments.neutral,
            negative: sentiments.negative
          }
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.mentionCount - a.mentionCount)
      .slice(0, 10);
    
    return NextResponse.json({
      success: true,
      companies: topCompanies
    });
    
  } catch (error) {
    console.error('Top companies API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch top companies' 
      },
      { status: 500 }
    );
  }
}