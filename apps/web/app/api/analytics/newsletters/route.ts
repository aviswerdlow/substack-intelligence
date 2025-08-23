import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = searchParams.get('days') || '7';
    
    // Mock newsletter performance data
    const newsletters = [
      {
        name: 'Stratechery',
        emails: 23,
        companies: 18,
        avgConfidence: 0.92,
        effectiveness: 0.78
      },
      {
        name: 'The Information',
        emails: 18,
        companies: 14,
        avgConfidence: 0.88,
        effectiveness: 0.77
      },
      {
        name: 'Platformer',
        emails: 15,
        companies: 12,
        avgConfidence: 0.85,
        effectiveness: 0.80
      },
      {
        name: 'Benedict\'s Newsletter',
        emails: 12,
        companies: 9,
        avgConfidence: 0.83,
        effectiveness: 0.75
      },
      {
        name: 'Axios Pro Rata',
        emails: 10,
        companies: 8,
        avgConfidence: 0.86,
        effectiveness: 0.80
      }
    ];
    
    return NextResponse.json({
      success: true,
      newsletters
    });
    
  } catch (error) {
    console.error('Failed to fetch newsletter performance:', error);
    
    // Return mock data even on error
    return NextResponse.json({
      success: true,
      newsletters: [
        {
          name: 'Stratechery',
          emails: 20,
          companies: 15,
          avgConfidence: 0.90,
          effectiveness: 0.75
        },
        {
          name: 'The Information',
          emails: 15,
          companies: 12,
          avgConfidence: 0.85,
          effectiveness: 0.80
        },
        {
          name: 'Platformer',
          emails: 12,
          companies: 10,
          avgConfidence: 0.82,
          effectiveness: 0.83
        }
      ]
    });
  }
}