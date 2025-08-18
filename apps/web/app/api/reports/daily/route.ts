import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { ReportScheduler } from '@substack-intelligence/reports';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const body = await request.json();
    const { date, sendEmail = true } = body;

    console.log('Generating daily report...', { date, sendEmail });

    const scheduler = new ReportScheduler();
    
    try {
      const result = await scheduler.generateDailyReport(date);
      
      return NextResponse.json({
        success: true,
        data: {
          reportDate: result.data.date,
          companies: result.data.summary.totalCompanies,
          mentions: result.data.summary.totalMentions,
          pdfSize: result.pdf.length,
          emailSent: sendEmail,
          emailId: result.emailResult.data?.id
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      });

    } finally {
      await scheduler.cleanup();
    }

  } catch (error) {
    console.error('Failed to generate daily report:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

// GET endpoint to fetch existing daily report
export async function GET(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toLocaleDateString();

    // This would fetch from report_history table
    // For now, return a placeholder response
    return NextResponse.json({
      success: true,
      data: {
        date,
        available: false,
        message: 'Report history feature coming soon'
      }
    });

  } catch (error) {
    console.error('Failed to fetch daily report:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}