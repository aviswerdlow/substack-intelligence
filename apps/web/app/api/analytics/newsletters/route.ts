import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@substack-intelligence/database';
import { getServerSecuritySession } from '@substack-intelligence/lib/security/session';

interface NewsletterMetrics {
  name: string;
  emails: number;
  companies: number;
  avgConfidence: number;
  effectiveness: number;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSecuritySession();
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (!session && !isDevelopment) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session?.user.id || 'development-user';
    const searchParams = request.nextUrl.searchParams;
    const days = Math.max(1, parseInt(searchParams.get('days') || '7', 10));

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const supabase = createServiceRoleClient();

    const [emailsRes, mentionsRes] = await Promise.all([
      supabase
        .from('emails')
        .select('id, newsletter_name, processing_status, received_at')
        .eq('user_id', userId)
        .gte('received_at', startDate.toISOString())
        .lte('received_at', endDate.toISOString()),
      supabase
        .from('company_mentions')
        .select('email_id, company_id, confidence, created_at')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString()),
    ]);

    if (emailsRes.error) {
      console.error('Failed to fetch emails for newsletter analytics:', emailsRes.error);
    }

    if (mentionsRes.error) {
      console.error('Failed to fetch mentions for newsletter analytics:', mentionsRes.error);
    }

    const newsletterMap = new Map<string, NewsletterMetrics & {
      processed: number;
      confidenceTotal: number;
      mentionCount: number;
      companySet: Set<string>;
    }>();

    const emailToNewsletter = new Map<string, string>();

    (emailsRes.data ?? []).forEach((email) => {
      emailToNewsletter.set(email.id, email.newsletter_name);

      const entry = newsletterMap.get(email.newsletter_name) ?? {
        name: email.newsletter_name,
        emails: 0,
        companies: 0,
        avgConfidence: 0,
        effectiveness: 0,
        processed: 0,
        confidenceTotal: 0,
        mentionCount: 0,
        companySet: new Set<string>(),
      };

      entry.emails += 1;
      if (email.processing_status === 'completed') {
        entry.processed += 1;
      }

      newsletterMap.set(email.newsletter_name, entry);
    });

    (mentionsRes.data ?? []).forEach((mention) => {
      const newsletter = emailToNewsletter.get(mention.email_id);
      if (!newsletter) {
        return;
      }

      const entry = newsletterMap.get(newsletter);
      if (!entry) {
        return;
      }

      if (mention.company_id) {
        entry.companySet.add(mention.company_id);
      }
      if (typeof mention.confidence === 'number') {
        entry.confidenceTotal += mention.confidence;
        entry.mentionCount += 1;
      }
    });

    const newsletters: NewsletterMetrics[] = Array.from(newsletterMap.values())
      .map((entry) => {
        const companies = entry.companySet.size;
        const avgConfidence = entry.mentionCount > 0 ? Number((entry.confidenceTotal / entry.mentionCount).toFixed(3)) : 0;
        const effectiveness = entry.emails > 0 ? Number((companies / entry.emails).toFixed(3)) : 0;
        const processingRate = entry.emails > 0 ? entry.processed / entry.emails : 0;

        return {
          name: entry.name,
          emails: entry.emails,
          companies,
          avgConfidence,
          effectiveness: Number(((effectiveness + processingRate) / 2).toFixed(3)),
        };
      })
      .sort((a, b) => b.companies - a.companies);

    return NextResponse.json({
      success: true,
      newsletters,
    });
  } catch (error) {
    console.error('Failed to fetch newsletter performance:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch newsletter performance', newsletters: [] },
      { status: 500 }
    );
  }
}
