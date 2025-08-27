import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createServiceRoleClient } from '@substack-intelligence/database';

export async function GET(request: NextRequest) {
  try {
    // Get current user for filtering
    const user = await currentUser();
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (!user && !isDevelopment) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }
    
    const userId = user?.id || 'development-user';
    
    const searchParams = request.nextUrl.searchParams;
    const days = searchParams.get('days') || '7';
    
    // Initialize Supabase client
    const supabase = createServiceRoleClient();
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    // Fetch companies data - FILTER BY USER_ID
    const { data: companies, error } = await supabase
      .from('companies')
      .select('id, name, industry, funding_status, created_at')
      .eq('user_id', userId)  // CRITICAL: Filter by user_id
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());
    
    if (error) {
      console.error('Error fetching companies:', error);
      throw error;
    }
    
    // Process industry distribution
    const industryMap = new Map<string, number>();
    const fundingMap = new Map<string, number>();
    
    companies?.forEach(company => {
      // Count industries
      const industries = company.industry || ['Unknown'];
      const industryStr = Array.isArray(industries) ? industries.join(', ') : industries;
      industryMap.set(industryStr, (industryMap.get(industryStr) || 0) + 1);
      
      // Count funding stages
      const fundingStage = company.funding_status || 'Unknown';
      fundingMap.set(fundingStage, (fundingMap.get(fundingStage) || 0) + 1);
    });
    
    // Convert to arrays for response
    const industryDistribution = Array.from(industryMap.entries())
      .map(([industry, count]) => ({ industry, count }))
      .sort((a, b) => b.count - a.count);
    
    const fundingDistribution = Array.from(fundingMap.entries())
      .map(([stage, count]) => ({ stage, count }))
      .sort((a, b) => b.count - a.count);
    
    return NextResponse.json({
      success: true,
      distributions: {
        industry: industryDistribution,
        funding: fundingDistribution
      }
    });
    
  } catch (error) {
    console.error('Distributions API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch distributions' 
      },
      { status: 500 }
    );
  }
}