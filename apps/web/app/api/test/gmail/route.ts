import { NextResponse } from 'next/server';
import { GmailConnector } from '@substack-intelligence/ingestion';

// Disable Next.js caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const connector = new GmailConnector();
    
    // Test Gmail connection
    const isConnected = await connector.testConnection();
    
    if (!isConnected) {
      return NextResponse.json({
        success: false,
        error: 'Gmail connection failed',
        connected: false
      }, { status: 503 });
    }
    
    // Get basic stats
    const stats = await connector.getStats();
    
    return NextResponse.json({
      success: true,
      connected: true,
      stats,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });
    
  } catch (error) {
    console.error('Gmail test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      connected: false
    }, { status: 500 });
  }
}

// POST endpoint to trigger manual fetch (for testing)
export async function POST(request: Request) {
  try {
    const connector = new GmailConnector();
    
    // Parse request body for optional days parameter
    let daysBack = 30; // Default to 30 days
    try {
      const body = await request.json();
      if (body.days && typeof body.days === 'number') {
        daysBack = Math.min(Math.max(body.days, 1), 90); // Limit between 1 and 90 days
      }
    } catch {
      // If no body or invalid JSON, use default
    }
    
    console.log(`Fetching Substack emails from the past ${daysBack} days...`);
    
    // Fetch emails from the past N days
    const emails = await connector.fetchDailySubstacks(daysBack);
    
    return NextResponse.json({
      success: true,
      data: {
        emailsProcessed: emails.length,
        emails: emails.map(email => ({
          id: email.id,
          subject: email.subject,
          newsletterName: email.newsletterName,
          receivedAt: email.receivedAt,
          textLength: email.text.length
        }))
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });
    
  } catch (error) {
    console.error('Manual Gmail fetch failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}