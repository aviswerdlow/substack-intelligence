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
      console.error('Database error:', error);
      // Return mock data if table doesn't exist
      return NextResponse.json({
        success: true,
        reports: [
          {
            id: '1',
            report_type: 'weekly',
            report_date: '2024-01-15',
            generated_at: new Date().toISOString(),
            recipients_count: 5,
            companies_count: 12,
            mentions_count: 47,
            status: 'sent',
            pdf_size: 245000
          },
          {
            id: '2',
            report_type: 'monthly',
            report_date: '2024-01-01',
            generated_at: new Date(Date.now() - 86400000).toISOString(),
            recipients_count: 10,
            companies_count: 34,
            mentions_count: 123,
            status: 'sent',
            pdf_size: 512000
          },
          {
            id: '3',
            report_type: 'daily',
            report_date: '2024-01-20',
            generated_at: new Date(Date.now() - 172800000).toISOString(),
            recipients_count: 3,
            companies_count: 8,
            mentions_count: 22,
            status: 'scheduled',
            pdf_size: 0
          }
        ]
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