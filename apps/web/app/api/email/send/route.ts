import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { z } from 'zod';
import { EmailQueue } from '@substack-intelligence/lib/email/queue';
import type { EmailMessage } from '@substack-intelligence/lib/email/provider';
import {
  renderWelcomeEmailTemplate,
  renderPasswordResetTemplate,
  renderNewsletterTemplate,
  renderNewPostTemplate,
  renderSubscriptionConfirmationTemplate,
} from '@substack-intelligence/lib/email/templates';
import { logEmailEvent } from '@substack-intelligence/lib/email/analytics';

const emailQueue = new EmailQueue({ concurrency: 5, retryAttempts: 2, retryDelayMs: 1500 });

const baseSchema = z.object({
  type: z.enum(['welcome', 'password_reset', 'newsletter', 'new_post', 'subscription_confirmation']),
  recipients: z.array(z.string().email()).min(1),
  data: z.record(z.any()),
  scheduleAt: z.coerce.date().optional(),
  metadata: z.record(z.any()).optional(),
  abTest: z.object({
    variants: z.array(z.object({
      name: z.string(),
      subject: z.string().optional(),
      data: z.record(z.any()).optional(),
    })).min(2).max(2),
  }).optional(),
});

const renderers = {
  welcome: renderWelcomeEmailTemplate,
  password_reset: renderPasswordResetTemplate,
  newsletter: renderNewsletterTemplate,
  new_post: renderNewPostTemplate,
  subscription_confirmation: renderSubscriptionConfirmationTemplate,
} as const;

const EMAIL_HEADERS = {
  'List-Unsubscribe': '<https://intelligence.substack.com/unsubscribe>',
  'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
};

const EMAIL_TYPES: Record<string, 'welcome' | 'password_reset' | 'newsletter' | 'new_post' | 'subscription_confirmation' | 'transactional'> = {
  welcome: 'welcome',
  password_reset: 'password_reset',
  newsletter: 'newsletter',
  new_post: 'new_post',
  subscription_confirmation: 'subscription_confirmation',
};

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = baseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
    }

    const { type, recipients, data, scheduleAt, metadata, abTest } = parsed.data;
    const renderer = renderers[type];

    const queuePromises: Array<Promise<any>> = [];
    const logs: Array<Promise<any>> = [];

    const scheduleOptions = scheduleAt ? { delayMs: Math.max(new Date(scheduleAt).getTime() - Date.now(), 0) } : undefined;

    const sendEmails = (recipientList: string[], variantName?: string, variantData?: Record<string, unknown>, overrideSubject?: string) => {
      const rendered = renderer({ ...(data as any), ...(variantData || {}) });
      const subject = overrideSubject ?? rendered.subject;

      recipientList.forEach(recipient => {
        const message: EmailMessage = {
          to: recipient,
          subject,
          html: rendered.html,
          text: rendered.text,
          headers: {
            ...EMAIL_HEADERS,
            'X-Email-Type': type,
            ...(variantName ? { 'X-Email-Variant': variantName } : {}),
          },
          metadata: {
            ...metadata,
            ...(variantName ? { variant: variantName } : {}),
          },
        };

        queuePromises.push(emailQueue.enqueue(message, scheduleOptions));

        logs.push(logEmailEvent({
          userId: user.id,
          recipientEmail: recipient,
          emailType: EMAIL_TYPES[type] ?? 'transactional',
          status: scheduleAt ? 'queued' : 'sent',
          subject,
          metadata: {
            ...metadata,
            ...(variantName ? { variant: variantName } : {}),
          },
        }));
      });
    };

    if (abTest) {
      const [variantA, variantB] = abTest.variants;
      const midpoint = Math.ceil(recipients.length / 2);
      const firstHalf = recipients.slice(0, midpoint);
      const secondHalf = recipients.slice(midpoint);

      sendEmails(firstHalf, variantA.name, variantA.data, variantA.subject);
      sendEmails(secondHalf, variantB.name, variantB.data, variantB.subject);
    } else {
      sendEmails(recipients);
    }

    await Promise.all(queuePromises);
    await Promise.all(logs);

    return NextResponse.json({ success: true, message: 'Emails queued for delivery', metrics: emailQueue.getMetrics() });
  } catch (error) {
    console.error('[EmailSendAPI] Unexpected error:', error);
    return NextResponse.json({ success: false, error: 'Failed to send email' }, { status: 500 });
  }
}
