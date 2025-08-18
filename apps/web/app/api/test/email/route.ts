import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@substack-intelligence/reports';
import { z } from 'zod';

const TestEmailSchema = z.object({
  recipient: z.string().email()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recipient } = TestEmailSchema.parse(body);

    const emailService = new EmailService();
    const result = await emailService.sendTestEmail(recipient);

    return NextResponse.json({
      success: true,
      data: {
        emailId: result.data?.id,
        recipient,
        message: 'Test email sent successfully'
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });

  } catch (error) {
    console.error('Failed to send test email:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid email address',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET endpoint for quick test with default recipient
export async function GET() {
  try {
    const defaultRecipient = process.env.TEST_EMAIL_RECIPIENT || 'test@example.com';
    
    const emailService = new EmailService();
    const result = await emailService.sendTestEmail(defaultRecipient);

    return NextResponse.json({
      success: true,
      data: {
        emailId: result.data?.id,
        recipient: defaultRecipient,
        message: 'Test email sent successfully'
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });

  } catch (error) {
    console.error('Failed to send test email:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}