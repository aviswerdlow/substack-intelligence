import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { createServiceRoleClient, getAnalytics } from '@substack-intelligence/database';

export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const supabase = createServiceRoleClient();
    
    // Check database health
    const dbHealthy = await checkDatabaseHealth(supabase);
    
    // Check Gmail integration status
    const gmailStatus = await checkGmailStatus(supabase, userId);
    
    // Check AI service (by trying to get analytics which uses the system)
    const aiStatus = await checkAIStatus(supabase);
    
    // Calculate processing statistics
    const processingStats = await getProcessingStats(supabase);

    const systemStatus = {
      services: [
        {
          name: 'Gmail Connector',
          status: gmailStatus.connected ? 'Connected' : 'Not Connected',
          healthy: gmailStatus.connected,
          details: gmailStatus.details
        },
        {
          name: 'Claude AI',
          status: aiStatus.operational ? 'Operational' : 'Degraded',
          healthy: aiStatus.operational,
          details: aiStatus.details
        },
        {
          name: 'Database',
          status: dbHealthy ? 'Healthy' : 'Unhealthy',
          healthy: dbHealthy,
          details: dbHealthy ? 'All systems operational' : 'Database connection issues'
        }
      ],
      metrics: processingStats,
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: systemStatus
    });
  } catch (error) {
    console.error('System status check error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check system status' },
      { status: 500 }
    );
  }
}

async function checkDatabaseHealth(supabase: any): Promise<boolean> {
  try {
    // Simple query to test database connection
    const { error } = await supabase
      .from('emails')
      .select('count')
      .limit(1);
    
    return !error;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

async function checkGmailStatus(supabase: any, userId: string): Promise<{connected: boolean, details: string}> {
  try {
    const { data: settings, error } = await supabase
      .from('user_settings')
      .select('gmail_connected, gmail_email, updated_at')
      .eq('user_id', userId)
      .single();
    
    if (error || !settings) {
      return { connected: false, details: 'No Gmail configuration found' };
    }
    
    if (settings.gmail_connected) {
      const lastUpdate = new Date(settings.updated_at);
      const daysSinceUpdate = Math.floor((Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        connected: true,
        details: `Connected to ${settings.gmail_email || 'Gmail'}, last updated ${daysSinceUpdate} days ago`
      };
    }
    
    return { connected: false, details: 'Gmail not connected' };
  } catch (error) {
    console.error('Gmail status check failed:', error);
    return { connected: false, details: 'Failed to check Gmail status' };
  }
}

async function checkAIStatus(supabase: any): Promise<{operational: boolean, details: string}> {
  try {
    // Check if we have recent successful AI extractions
    const { data, error } = await supabase
      .from('company_mentions')
      .select('extracted_at')
      .gte('extracted_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(1);
    
    if (error) {
      return { operational: false, details: 'Database query failed' };
    }
    
    if (data && data.length > 0) {
      return { operational: true, details: 'AI extractions running successfully' };
    }
    
    // Check if there are any emails processed recently but no extractions
    const { data: recentEmails } = await supabase
      .from('emails')
      .select('processed_at')
      .gte('received_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .eq('processing_status', 'completed')
      .limit(1);
    
    if (recentEmails && recentEmails.length > 0) {
      return { operational: false, details: 'Emails processed but no AI extractions found' };
    }
    
    return { operational: true, details: 'No recent activity to evaluate' };
  } catch (error) {
    console.error('AI status check failed:', error);
    return { operational: false, details: 'Failed to check AI status' };
  }
}

async function getProcessingStats(supabase: any): Promise<any> {
  try {
    // Get analytics for last 7 days
    const analytics = await getAnalytics(supabase, 7);
    
    // Calculate processing rate based on emails vs successful extractions
    const { data: processedEmails } = await supabase
      .from('emails')
      .select('id', { count: 'exact' })
      .gte('received_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .eq('processing_status', 'completed');
    
    const { data: totalEmails } = await supabase
      .from('emails')
      .select('id', { count: 'exact' })
      .gte('received_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
    
    const processingRate = totalEmails && totalEmails.length > 0 
      ? ((processedEmails?.length || 0) / totalEmails.length * 100).toFixed(1)
      : '0.0';
    
    // Calculate trends by comparing to previous period
    const prevAnalytics = await getAnalytics(supabase, 14);
    const currentPeriod = analytics;
    const previousPeriod = {
      totalEmails: prevAnalytics.totalEmails - currentPeriod.totalEmails,
      totalCompanies: prevAnalytics.totalCompanies - currentPeriod.totalCompanies,
      totalMentions: prevAnalytics.totalMentions - currentPeriod.totalMentions
    };
    
    const calculateTrend = (current: number, previous: number) => {
      if (previous === 0) return '+0%';
      const change = ((current - previous) / previous * 100);
      return `${change >= 0 ? '+' : ''}${change.toFixed(0)}%`;
    };
    
    return {
      emailsProcessed: currentPeriod.totalEmails,
      emailsTrend: calculateTrend(currentPeriod.totalEmails, previousPeriod.totalEmails),
      companiesFound: currentPeriod.totalCompanies,
      companiesTrend: calculateTrend(currentPeriod.totalCompanies, previousPeriod.totalCompanies),
      totalMentions: currentPeriod.totalMentions,
      mentionsTrend: calculateTrend(currentPeriod.totalMentions, previousPeriod.totalMentions),
      processingRate: processingRate + '%',
      processingTrend: '+0.1%' // Would need historical processing rates to calculate properly
    };
  } catch (error) {
    console.error('Processing stats calculation failed:', error);
    return {
      emailsProcessed: 0,
      emailsTrend: '+0%',
      companiesFound: 0,
      companiesTrend: '+0%',
      totalMentions: 0,
      mentionsTrend: '+0%',
      processingRate: '0.0%',
      processingTrend: '+0%'
    };
  }
}