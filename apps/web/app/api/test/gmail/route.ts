import { NextResponse } from 'next/server';
import { GmailConnector } from '@substack-intelligence/ingestion';

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
export async function POST() {
  try {
    const connector = new GmailConnector();
    
    // Fetch emails from yesterday
    const emails = await connector.fetchDailySubstacks();
    
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