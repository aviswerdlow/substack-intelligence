import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createServiceRoleClient, getAnalytics } from '@substack-intelligence/database';

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }
    const userId = user.id;

    const supabase = createServiceRoleClient();
    
    // Check database health
    const dbHealthy = await checkDatabaseHealth(supabase);
    
    // Check Gmail integration status
    const gmailStatus = await checkGmailStatus(supabase, userId);
    
    // Check AI service (by trying to get analytics which uses the system)
    const aiStatus = await checkAIStatus(supabase, userId);
    
    // Calculate processing statistics
    const processingStats = await getProcessingStats(supabase, userId);

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
    return NextResponse.json({
      success: false,
      error: 'Failed to check system status'
    }, { status: 500 });
  }
}

// Helper functions
async function checkDatabaseHealth(supabase: any): Promise<boolean> {
  try {
    // Simple health check query
    const { data, error } = await supabase
      .from('emails')
      .select('id')
      .limit(1);
    
    return !error;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

async function checkGmailStatus(supabase: any, userId: string): Promise<{connected: boolean, details: string}> {
  try {
    // Check if Gmail settings exist and are recent - FILTER BY USER_ID
    const { data: settings, error } = await supabase
      .from('settings')
      .select('gmail_connected, gmail_email, updated_at')
      .eq('user_id', userId)  // CRITICAL: Filter by user_id
      .single();
    
    if (!error && settings?.gmail_connected) {
      const updatedAt = new Date(settings.updated_at);
      const daysSinceUpdate = Math.floor((Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
      
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

async function checkAIStatus(supabase: any, userId: string): Promise<{operational: boolean, details: string}> {
  try {
    // Check if we have recent successful AI extractions - FILTER BY USER_ID
    const { data, error } = await supabase
      .from('company_mentions')
      .select('extracted_at')
      .eq('user_id', userId)  // CRITICAL: Filter by user_id
      .gte('extracted_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(1);
    
    if (error) {
      return { operational: false, details: 'Database query failed' };
    }
    
    if (data && data.length > 0) {
      return { operational: true, details: 'AI extractions running successfully' };
    }
    
    // Check if there are any emails processed recently but no extractions - FILTER BY USER_ID
    const { data: recentEmails } = await supabase
      .from('emails')
      .select('processed_at')
      .eq('user_id', userId)  // CRITICAL: Filter by user_id
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

async function getProcessingStats(supabase: any, userId: string): Promise<any> {
  try {
    // Get analytics for last 7 days
    const analytics = await getAnalytics(supabase, 7);
    
    // Calculate processing rate based on emails vs successful extractions - FILTER BY USER_ID
    const { data: processedEmails, count: processedCount } = await supabase
      .from('emails')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)  // CRITICAL: Filter by user_id
      .gte('received_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .eq('processing_status', 'completed');
    
    const { count: companiesCount } = await supabase
      .from('company_mentions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)  // CRITICAL: Filter by user_id
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
    
    const processingRate = processedCount && processedCount > 0 
      ? ((companiesCount || 0) / processedCount * 100).toFixed(1)
      : 0;
    
    return {
      emailsProcessed: processedCount || 0,
      companiesExtracted: companiesCount || 0,
      processingRate: `${processingRate}%`,
      period: '7 days'
    };
  } catch (error) {
    console.error('Failed to calculate processing stats:', error);
    return {
      emailsProcessed: 0,
      companiesExtracted: 0,
      processingRate: '0%',
      period: '7 days'
    };
  }
}