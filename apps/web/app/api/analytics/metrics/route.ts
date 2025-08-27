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
    
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '7';
    
    console.log('Metrics API called with period:', period, 'for user:', userId);
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));
    
    const supabase = createServiceRoleClient();
    
    // Fetch emails - FILTER BY USER_ID
    const { data: emails, error: emailsError } = await supabase
      .from('emails')
      .select('*')
      .eq('user_id', userId)  // CRITICAL: Filter by user_id
      .gte('received_at', startDate.toISOString())
      .lte('received_at', endDate.toISOString());
    
    if (emailsError) {
      console.error('Error fetching emails:', emailsError);
    }
    
    // Fetch mentions - FILTER BY USER_ID
    const { data: mentions, error: mentionsError } = await supabase
      .from('company_mentions')
      .select('*')
      .eq('user_id', userId)  // CRITICAL: Filter by user_id
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());
    
    if (mentionsError) {
      console.error('Error fetching mentions:', mentionsError);
    }
    
    // Fetch companies - FILTER BY USER_ID
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('*')
      .eq('user_id', userId);  // CRITICAL: Filter by user_id
    
    if (companiesError) {
      console.error('Error fetching companies:', companiesError);
    }
    
    // Fetch unique companies mentioned
    const { data: uniqueCompanies, error: uniqueError } = await supabase
      .from('companies')
      .select('id')
      .eq('user_id', userId)  // CRITICAL: Filter by user_id
      .gte('first_seen_at', startDate.toISOString())
      .lte('first_seen_at', endDate.toISOString());
    
    if (uniqueError) {
      console.error('Error fetching unique companies:', uniqueError);
    }
    
    // Calculate metrics
    const totalEmails = emails?.length || 0;
    const totalMentions = mentions?.length || 0;
    const totalCompanies = companies?.length || 0;
    const avgMentionsPerEmail = totalEmails > 0 ? (totalMentions / totalEmails).toFixed(2) : '0';
    const newCompanies = uniqueCompanies?.length || 0;
    
    // Calculate sentiment distribution from mentions
    const sentimentCounts = mentions?.reduce((acc: any, mention: any) => {
      const sentiment = mention.sentiment || 'neutral';
      acc[sentiment] = (acc[sentiment] || 0) + 1;
      return acc;
    }, {});
    
    const sentimentPercentages = {
      positive: ((sentimentCounts?.positive || 0) / totalMentions * 100).toFixed(1),
      neutral: ((sentimentCounts?.neutral || 0) / totalMentions * 100).toFixed(1),
      negative: ((sentimentCounts?.negative || 0) / totalMentions * 100).toFixed(1)
    };
    
    return NextResponse.json({
      success: true,
      metrics: {
        totalEmails,
        totalMentions,
        totalCompanies,
        avgMentionsPerEmail,
        newCompanies,
        sentimentDistribution: sentimentPercentages,
        period: parseInt(period),
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        }
      }
    });
    
  } catch (error) {
    console.error('Analytics metrics error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics metrics' },
      { status: 500 }
    );
  }
}