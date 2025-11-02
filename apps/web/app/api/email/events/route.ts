import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  logEmailEvent,
  updateEmailEventStatus,
  handleBounceOrComplaint,
  type EmailLogStatus,
  type EmailLogType,
} from '@substack-intelligence/lib/email/analytics';

const eventSchema = z.object({
  event: z.enum(['delivered', 'opened', 'clicked', 'bounced', 'complained', 'failed']),
  email_log_id: z.string().uuid().optional(),
  user_id: z.string().optional(),
  recipient: z.string().email(),
  email_type: z.enum(['welcome', 'password_reset', 'newsletter', 'new_post', 'subscription_confirmation', 'transactional', 'test']).optional(),
  subject: z.string().optional(),
  timestamp: z.coerce.date().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const parsed = eventSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const status = data.event as EmailLogStatus;
    const emailType: EmailLogType = data.email_type ?? 'transactional';

    if (data.email_log_id) {
      await updateEmailEventStatus(data.email_log_id, status, {
        opened_at: status === 'opened' ? new Date().toISOString() : undefined,
        clicked_at: status === 'clicked' ? new Date().toISOString() : undefined,
        bounced_at: status === 'bounced' ? new Date().toISOString() : undefined,
        complained_at: status === 'complained' ? new Date().toISOString() : undefined,
      });
    } else {
      await logEmailEvent({
        userId: data.user_id,
        recipientEmail: data.recipient,
        emailType,
        status,
        subject: data.subject,
        sentAt: data.timestamp,
      });
    }

    if (status === 'bounced' || status === 'complained') {
      await handleBounceOrComplaint(data.recipient, status === 'bounced' ? 'bounce' : 'complaint');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[EmailEvents] Unexpected error:', error);
    return NextResponse.json({ success: false, error: 'Failed to record event' }, { status: 500 });
  }
}
