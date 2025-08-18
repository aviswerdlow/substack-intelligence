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
    const { weekOf, sendEmail = true } = body;

    console.log('Generating weekly report...', { weekOf, sendEmail });

    const scheduler = new ReportScheduler();
    
    try {
      const result = await scheduler.generateWeeklyReport(weekOf);
      
      return NextResponse.json({
        success: true,
        data: {
          weekOf: result.data.weekOf,
          companies: result.data.totalCompanies,
          mentions: result.data.totalMentions,
          pdfSize: result.pdf.length,
          emailSent: sendEmail,
          emailId: result.emailResult.data?.id,
          insights: result.data.insights.length
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
    console.error('Failed to generate weekly report:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

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
    const weekOf = searchParams.get('weekOf');

    return NextResponse.json({
      success: true,
      data: {
        weekOf: weekOf || 'current',
        available: false,
        message: 'Weekly report history feature coming soon'
      }
    });

  } catch (error) {
    console.error('Failed to fetch weekly report:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}