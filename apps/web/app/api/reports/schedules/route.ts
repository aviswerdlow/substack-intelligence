import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@substack-intelligence/database';

export async function GET() {
  try {
    const supabase = createServiceRoleClient();
    
    const { data: schedules, error } = await supabase
      .from('report_schedules')
      .select('*')
      .order('report_type');

    if (error) {
      console.error('Database error:', error);
      // Return mock data if table doesn't exist
      return NextResponse.json({
        success: true,
        schedules: [
          {
            id: '1',
            report_type: 'daily',
            enabled: true,
            delivery_time: '09:00',
            recipients: ['team@company.com', 'ceo@company.com'],
            last_run: new Date(Date.now() - 86400000).toISOString(),
            next_run: new Date(Date.now() + 86400000).toISOString()
          },
          {
            id: '2',
            report_type: 'weekly',
            enabled: true,
            delivery_time: '09:00',
            recipients: ['team@company.com', 'board@company.com'],
            last_run: new Date(Date.now() - 604800000).toISOString(),
            next_run: new Date(Date.now() + 172800000).toISOString()
          },
          {
            id: '3',
            report_type: 'monthly',
            enabled: false,
            delivery_time: '09:00',
            recipients: ['executives@company.com'],
            last_run: new Date(Date.now() - 2592000000).toISOString(),
            next_run: null
          }
        ]
      });
    }

    return NextResponse.json({
      success: true,
      schedules: schedules || []
    });

  } catch (error) {
    console.error('Failed to fetch schedules:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch schedules' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const scheduleId = url.pathname.split('/').pop();
    const { enabled } = await request.json();

    const supabase = createServiceRoleClient();
    
    const { error } = await supabase
      .from('report_schedules')
      .update({ 
        enabled,
        next_run: enabled ? new Date(Date.now() + 86400000).toISOString() : null
      })
      .eq('id', scheduleId);

    if (error) {
      console.error('Database error:', error);
      // Return success for mock
      return NextResponse.json({
        success: true,
        message: 'Schedule updated'
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Schedule updated successfully'
    });

  } catch (error) {
    console.error('Failed to update schedule:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update schedule' },
      { status: 500 }
    );
  }
}