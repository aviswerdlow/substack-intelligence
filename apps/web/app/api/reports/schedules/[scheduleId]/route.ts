import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@substack-intelligence/database';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { scheduleId: string } }
) {
  try {
    const { scheduleId } = params;
    const body = await request.json();
    
    const supabase = createServiceRoleClient();
    
    // Mock response for report schedules (not implemented yet)
    // TODO: Implement report_schedules table
    const data = null;
    const error = { message: 'report_schedules table not implemented' };
    
    if (error) {
      console.error('Database error:', error);
      
      // Return success with mock data if table doesn't exist
      // In production, the table would exist
      return NextResponse.json({
        success: true,
        schedule: {
          ...body,
          id: scheduleId,
          updated_at: new Date().toISOString(),
        },
      });
    }
    
    // Calculate next run time based on schedule
    const calculateNextRun = (schedule: any) => {
      const now = new Date();
      const [time, period] = schedule.delivery_time.split(/[,\s]/);
      const [hours, minutes] = (period || time).split(':').map(Number);
      
      let nextRun = new Date();
      nextRun.setHours(hours, minutes, 0, 0);
      
      if (schedule.report_type === 'daily') {
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1);
        }
      } else if (schedule.report_type === 'weekly') {
        const dayOfWeek = parseInt(time) || 1;
        nextRun.setDate(nextRun.getDate() + ((dayOfWeek - nextRun.getDay() + 7) % 7));
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 7);
        }
      } else if (schedule.report_type === 'monthly') {
        const dayOfMonth = time === 'last' ? 0 : parseInt(time);
        if (dayOfMonth === 0) {
          nextRun = new Date(nextRun.getFullYear(), nextRun.getMonth() + 1, 0);
        } else {
          nextRun.setDate(dayOfMonth);
          if (nextRun <= now) {
            nextRun.setMonth(nextRun.getMonth() + 1);
          }
        }
      }
      
      return schedule.enabled ? nextRun.toISOString() : null;
    };
    
    const updatedSchedule = {
      ...data,
      next_run: calculateNextRun({ ...data, ...body }),
    };
    
    // TODO: Update next_run in database when report_schedules table is implemented
    // await supabase
    //   .from('report_schedules')
    //   .update({ next_run: updatedSchedule.next_run })
    //   .eq('id', scheduleId);
    
    return NextResponse.json({
      success: true,
      schedule: updatedSchedule,
    });
    
  } catch (error) {
    console.error('Error updating schedule:', error);
    return NextResponse.json(
      { error: 'Failed to update schedule' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { scheduleId: string } }
) {
  try {
    const { scheduleId } = params;
    const supabase = createServiceRoleClient();
    
    // TODO: Implement when report_schedules table is created
    // const { error } = await supabase
    //   .from('report_schedules')
    //   .delete()
    //   .eq('id', scheduleId);
    
    // Mock success for now
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Error deleting schedule:', error);
    return NextResponse.json(
      { error: 'Failed to delete schedule' },
      { status: 500 }
    );
  }
}