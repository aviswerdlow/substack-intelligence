import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@substack-intelligence/database';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = searchParams.get('days') || '7';
    
    // Initialize Supabase client
    const supabase = createServiceRoleClient();
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    // First fetch mentions
    const { data: mentions, error: mentionsError } = await supabase
      .from('company_mentions')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());
    
    if (mentionsError) {
      console.error('Error fetching mentions:', mentionsError);
      throw mentionsError;
    }
    
    // Then fetch companies separately
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name, industry, funding_status');
    
    if (companiesError) {
      console.error('Error fetching companies:', companiesError);
      throw companiesError;
    }
    
    // Create a map of companies for quick lookup
    const companiesMap = new Map();
    companies?.forEach(company => {
      companiesMap.set(company.id, company);
    });
    
    // Process mentions to aggregate by company
    const companyMap = new Map<string, any>();
    
    mentions?.forEach(mention => {
      const company = companiesMap.get(mention.company_id);
      if (!company) return;
      
      const companyId = company.id;
      const existing = companyMap.get(companyId) || {
        name: company.name,
        mentions: 0,
        totalSentiment: 0,
        newsletters: new Set(),
        lastSeen: mention.created_at,
        industry: company.industry,
        fundingStage: company.funding_status
      };
      
      existing.mentions++;
      // Convert sentiment to numeric score if needed
      const sentimentValue = mention.confidence || 0.5; // Use confidence as sentiment score
      existing.totalSentiment += sentimentValue;
      
      // Note: We'd need to fetch emails separately to get newsletter names
      // For now, we'll skip the newsletter aggregation
      
      // Update last seen if this mention is more recent
      if (new Date(mention.created_at) > new Date(existing.lastSeen)) {
        existing.lastSeen = mention.created_at;
      }
      
      companyMap.set(companyId, existing);
    });
    
    // Convert to array and calculate average sentiment
    const companiesList = Array.from(companyMap.values()).map(company => {
      const avgSentiment = company.mentions > 0 ? company.totalSentiment / company.mentions : 0;
      let sentiment: 'positive' | 'neutral' | 'negative';
      
      if (avgSentiment > 0.3) {
        sentiment = 'positive';
      } else if (avgSentiment < -0.3) {
        sentiment = 'negative';
      } else {
        sentiment = 'neutral';
      }
      
      return {
        name: company.name,
        mentions: company.mentions,
        sentiment,
        lastSeen: company.lastSeen,
        newsletters: [], // Empty for now since we're not fetching email data
        industry: company.industry,
        fundingStage: company.fundingStage
      };
    });
    
    // Sort by mention count and take top 10
    companiesList.sort((a, b) => b.mentions - a.mentions);
    const topCompanies = companiesList.slice(0, 10);
    
    // If no data, return empty array instead of mock data
    if (topCompanies.length === 0) {
      return NextResponse.json({
        success: true,
        companies: [],
        message: 'No company data available for the selected period'
      });
    }
    
    return NextResponse.json({
      success: true,
      companies: topCompanies
    });
    
  } catch (error) {
    console.error('Failed to fetch top companies:', error);
    
    // Return empty data on error instead of mock
    return NextResponse.json({
      success: false,
      companies: [],
      error: 'Failed to fetch company data'
    });
  }
}