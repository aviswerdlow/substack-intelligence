import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@substack-intelligence/database';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'all';
    const newsletter = searchParams.get('newsletter') || 'all';
    const days = searchParams.get('days') || '7';

    const supabase = createServiceRoleClient();
    
    // Build query
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
      `);

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

    query = query.order('received_at', { ascending: false });

    const { data: emails, error } = await query;

    if (error) {
      throw error;
    }

    // Convert to CSV
    const csvHeaders = [
      'ID',
      'Message ID',
      'Subject',
      'Sender',
      'Newsletter',
      'Received At',
      'Processed At',
      'Status',
      'Error Message'
    ];

    const csvRows = emails?.map(email => [
      email.id,
      email.message_id,
      `"${email.subject.replace(/"/g, '""')}"`,
      `"${email.sender.replace(/"/g, '""')}"`,
      email.newsletter_name,
      email.received_at,
      email.processed_at || '',
      email.processing_status,
      email.error_message ? `"${email.error_message.replace(/"/g, '""')}"` : ''
    ]);

    const csv = [
      csvHeaders.join(','),
      ...(csvRows?.map(row => row.join(',')) || [])
    ].join('\n');

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="emails-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });

  } catch (error) {
    console.error('Failed to export emails:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to export emails' },
      { status: 500 }
    );
  }
}