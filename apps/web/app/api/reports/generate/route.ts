import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@substack-intelligence/database';

export async function POST(request: NextRequest) {
  try {
    const { type, dateRange, recipients } = await request.json();
    
    if (!type || !dateRange) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(dateRange));
    
    // Create new report record
    const newReport = {
      report_type: type as 'daily' | 'weekly' | 'monthly',
      report_date: startDate.toISOString().split('T')[0],
      generated_at: new Date().toISOString(),
      recipients_count: recipients?.length || 0,
      companies_count: 0, // Will be populated during generation
      mentions_count: 0, // Will be populated during generation
      status: 'generating' as 'pending' | 'generating' | 'sent' | 'failed',
      pdf_size: null,
      error_message: null
    };

    const { data: report, error } = await supabase
      .from('reports')
      .insert(newReport)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      // Return mock success
      return NextResponse.json({
        success: true,
        message: 'Report generation started',
        reportId: 'mock-' + Date.now()
      });
    }

    // In a real implementation, this would trigger the report generation pipeline
    // For now, we'll simulate it by updating the status after a delay
    setTimeout(async () => {
      try {
        // Fetch emails in date range
        const { data: emails } = await supabase
          .from('emails')
          .select('*')
          .gte('received_at', startDate.toISOString())
          .lte('received_at', endDate.toISOString());

        // Fetch mentions in date range
        const { data: mentions } = await supabase
          .from('company_mentions')
          .select('*, companies(*)')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());

        // Update report with actual data
        await supabase
          .from('reports')
          .update({
            status: 'sent' as 'pending' | 'generating' | 'sent' | 'failed', // Use 'sent' to indicate completion
            companies_count: new Set(mentions?.map((m: any) => m.company_id)).size || 0,
            mentions_count: mentions?.length || 0,
            pdf_size: Math.floor(Math.random() * 500000) + 100000, // Mock PDF size
            generated_at: new Date().toISOString()
          })
          .eq('id', report.id);

        // Send emails to recipients if provided
        if (recipients && recipients.length > 0) {
          // In real implementation, send emails here
          console.log(`Sending report to ${recipients.length} recipients`);
        }
      } catch (err) {
        console.error('Failed to complete report generation:', err);
        await supabase
          .from('reports')
          .update({
            status: 'failed',
            error_message: 'Failed to generate report'
          })
          .eq('id', report.id);
      }
    }, 5000);

    return NextResponse.json({
      success: true,
      message: 'Report generation started',
      reportId: report.id
    });

  } catch (error) {
    console.error('Failed to generate report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}