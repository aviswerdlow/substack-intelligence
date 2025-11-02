import { randomUUID } from 'node:crypto';
import { createServiceRoleClient, type Database } from '@substack-intelligence/database';

export type EmailLogStatus = Database['public']['Tables']['email_logs']['Row']['status'];
export type EmailLogType = Database['public']['Tables']['email_logs']['Row']['email_type'];

export interface LogEmailEventInput {
  userId?: string | null;
  recipientEmail: string;
  emailType: EmailLogType;
  status: EmailLogStatus;
  subject?: string | null;
  metadata?: Record<string, unknown>;
  sentAt?: Date;
}

export interface EmailAnalyticsSummary {
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
  totalComplained: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  complaintRate: number;
}

const supabase = createServiceRoleClient();

export async function logEmailEvent(input: LogEmailEventInput) {
  const { error, data } = await supabase
    .from('email_logs')
    .insert({
      id: randomUUID(),
      user_id: input.userId ?? null,
      recipient_email: input.recipientEmail,
      email_type: input.emailType,
      status: input.status,
      subject: input.subject ?? null,
      metadata: input.metadata ?? null,
      sent_at: input.sentAt ? input.sentAt.toISOString() : new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('[EmailAnalytics] Failed to log email event:', error);
    throw error;
  }

  return data;
}

export async function updateEmailEventStatus(
  id: string,
  status: EmailLogStatus,
  timestamps?: Partial<Pick<Database['public']['Tables']['email_logs']['Row'], 'opened_at' | 'clicked_at' | 'bounced_at' | 'complained_at'>>
) {
  const { error, data } = await supabase
    .from('email_logs')
    .update({
      status,
      ...timestamps,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[EmailAnalytics] Failed to update email status:', error);
    throw error;
  }

  return data;
}

export async function getEmailAnalytics(userId: string, days = 30): Promise<EmailAnalyticsSummary> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from('email_logs')
    .select('status')
    .eq('user_id', userId)
    .gte('sent_at', since.toISOString());

  if (error) {
    console.error('[EmailAnalytics] Failed to fetch analytics:', error);
    throw error;
  }

  const counters = {
    totalSent: 0,
    totalDelivered: 0,
    totalOpened: 0,
    totalClicked: 0,
    totalBounced: 0,
    totalComplained: 0,
  };

  for (const row of data || []) {
    counters.totalSent += 1;

    switch (row.status) {
      case 'delivered':
      case 'sent':
        counters.totalDelivered += 1;
        break;
      case 'opened':
        counters.totalOpened += 1;
        counters.totalDelivered += 1;
        break;
      case 'clicked':
        counters.totalClicked += 1;
        counters.totalOpened += 1;
        counters.totalDelivered += 1;
        break;
      case 'bounced':
        counters.totalBounced += 1;
        break;
      case 'complained':
        counters.totalComplained += 1;
        break;
      default:
        break;
    }
  }

  const safeDivide = (value: number, total: number) => (total > 0 ? Number(((value / total) * 100).toFixed(2)) : 0);

  return {
    ...counters,
    openRate: safeDivide(counters.totalOpened, counters.totalDelivered || counters.totalSent),
    clickRate: safeDivide(counters.totalClicked, counters.totalDelivered || counters.totalSent),
    bounceRate: safeDivide(counters.totalBounced, counters.totalSent),
    complaintRate: safeDivide(counters.totalComplained, counters.totalSent),
  };
}

export async function handleBounceOrComplaint(recipientEmail: string, type: 'bounce' | 'complaint') {
  try {
    const { data: gmailMatch, error: gmailError } = await supabase
      .from('user_settings')
      .select('user_id')
      .eq('gmail_email', recipientEmail)
      .limit(1);

    if (gmailError) {
      throw gmailError;
    }

    let matchedUser = gmailMatch?.[0];

    if (!matchedUser) {
      const { data: accountMatch, error: accountError } = await supabase
        .from('user_settings')
        .select('user_id, account_settings')
        .eq('account_settings->>email', recipientEmail)
        .limit(1);

      if (accountError) {
        throw accountError;
      }

      matchedUser = accountMatch?.[0];
    }

    if (!matchedUser?.user_id) {
      return;
    }

    await supabase
      .from('email_preferences')
      .upsert({
        user_id: matchedUser.user_id,
        newsletter: false,
        marketing: false,
        product_updates: false,
        unsubscribed_at: new Date().toISOString(),
      });

    await logEmailEvent({
      userId: matchedUser.user_id,
      recipientEmail,
      emailType: 'transactional',
      status: type === 'bounce' ? 'bounced' : 'complained',
    });
  } catch (err) {
    console.error(`[EmailAnalytics] Failed to process ${type}:`, err);
  }
}
