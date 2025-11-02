import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@substack-intelligence/database';
import { getServerSecuritySession } from '@substack-intelligence/lib/security/session';

export async function GET(request: NextRequest) {
  try {
    // Get current user for filtering
    const isDevelopment = process.env.NODE_ENV === 'development';
    const session = await getServerSecuritySession();

    if (!session && !isDevelopment) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const userId = session?.user.id || 'development-user';
    
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'all';
    const days = searchParams.get('days') || '30';

    const supabase = createServiceRoleClient() as any;
    
    // Build query - FILTER BY USER_ID
    let query = supabase
      .from('reports')
      .select('*')
      .eq('user_id', userId);  // CRITICAL: Filter by user_id

    // Apply filters
    if (type !== 'all') {
      query = query.eq('report_type', type);
    }

    if (days !== 'all') {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(days));
      query = query.gte('generated_at', daysAgo.toISOString());
    }

    query = query.order('generated_at', { ascending: false }).limit(50);

    const { data: reports, error } = await query;

    if (error) {
      console.error('Database error fetching reports for user:', userId, error);
      // Return empty array instead of mock data to prevent data leakage
      // Each user should only see their own reports
      return NextResponse.json({
        success: true,
        reports: []
      });
    }

    return NextResponse.json({
      success: true,
      reports: reports || []
    });

  } catch (error) {
    console.error('Failed to fetch reports:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}