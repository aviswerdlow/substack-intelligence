import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@substack-intelligence/database';

// Disable Next.js caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    // Get current user for filtering
    const { currentUser } = await import('@clerk/nextjs/server');
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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') || 'all';
    const newsletter = searchParams.get('newsletter') || 'all';
    const days = searchParams.get('days') || '7';
    const search = searchParams.get('search') || '';

    const supabase = createServiceRoleClient();
    
    // Build query - FILTER BY USER_ID
    let query = supabase
      .from('emails')
      .select(`
        id,
        message_id,
        subject,
        sender,
        newsletter_name,
        received_at,
        processed_at,
        processing_status,
        error_message
      `, { count: 'exact' })
      .eq('user_id', userId);  // CRITICAL: Filter by user_id

    // Apply filters
    if (status !== 'all') {
      query = query.eq('processing_status', status);
    }

    if (newsletter !== 'all') {
      query = query.eq('newsletter_name', newsletter);
    }

    if (days !== 'all') {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(days));
      query = query.gte('received_at', daysAgo.toISOString());
    }

    if (search) {
      query = query.or(`subject.ilike.%${search}%,newsletter_name.ilike.%${search}%`);
    }

    // Pagination
    const start = (page - 1) * limit;
    query = query
      .order('received_at', { ascending: false })
      .range(start, start + limit - 1);

    const { data: emails, error, count } = await query;

    if (error) {
      throw error;
    }

    // Get company counts for each email - FILTER BY USER_ID
    const emailIds = emails?.map(e => e.id) || [];
    const { data: companyCounts } = await supabase
      .from('company_mentions')
      .select('email_id, confidence')
      .eq('user_id', userId)  // CRITICAL: Filter by user_id
      .in('email_id', emailIds);

    // Aggregate company data
    const emailCompanyMap = new Map<string, { count: number; avgConfidence: number }>();
    companyCounts?.forEach(mention => {
      const existing = emailCompanyMap.get(mention.email_id) || { count: 0, avgConfidence: 0 };
      existing.count++;
      existing.avgConfidence = (existing.avgConfidence * (existing.count - 1) + mention.confidence) / existing.count;
      emailCompanyMap.set(mention.email_id, existing);
    });

    // Enhance emails with company data
    const enhancedEmails = emails?.map(email => ({
      ...email,
      companies_extracted: emailCompanyMap.get(email.id)?.count || 0,
      confidence_avg: emailCompanyMap.get(email.id)?.avgConfidence || 0
    }));

    // Get unique newsletters for filter - FILTER BY USER_ID
    const { data: newsletters } = await supabase
      .from('emails')
      .select('newsletter_name')
      .eq('user_id', userId)  // CRITICAL: Filter by user_id
      .limit(100);
    
    const uniqueNewsletters = Array.from(new Set(newsletters?.map(n => n.newsletter_name) || []));

    return NextResponse.json({
      success: true,
      emails: enhancedEmails,
      totalPages: Math.ceil((count || 0) / limit),
      currentPage: page,
      totalCount: count,
      newsletters: uniqueNewsletters
    });

  } catch (error) {
    console.error('Failed to fetch emails:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch emails' },
      { status: 500 }
    );
  }
}