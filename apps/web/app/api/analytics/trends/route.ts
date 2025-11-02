import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@substack-intelligence/database';
import { getServerSecuritySession } from '@substack-intelligence/lib/security/session';

interface TrendPoint {
  date: string;
  companies: number;
  mentions: number;
  confidence: number;
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
    startDate.setDate(startDate.getDate() - (days - 1));

    const supabase = createServiceRoleClient();

    const [mentionsRes, companiesRes] = await Promise.all([
      supabase
        .from('company_mentions')
        .select('created_at, confidence, company_id')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString()),
      supabase
        .from('companies')
        .select('id, first_seen_at')
        .eq('user_id', userId)
        .gte('first_seen_at', startDate.toISOString())
        .lte('first_seen_at', endDate.toISOString()),
    ]);

    if (mentionsRes.error) {
      console.error('Failed to fetch mentions for trends:', mentionsRes.error);
    }
    if (companiesRes.error) {
      console.error('Failed to fetch companies for trends:', companiesRes.error);
    }

    const trendMap = new Map<string, {
      companySet: Set<string>;
      mentions: number;
      confidenceTotal: number;
    }>();

    const daysList: TrendPoint[] = [];
    const cursor = new Date(startDate);
    for (let i = 0; i < days; i++) {
      const dateKey = cursor.toISOString().split('T')[0];
      trendMap.set(dateKey, {
        companySet: new Set<string>(),
        mentions: 0,
        confidenceTotal: 0,
      });
      daysList.push({ date: dateKey, companies: 0, mentions: 0, confidence: 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    (mentionsRes.data ?? []).forEach((mention) => {
      const dateKey = new Date(mention.created_at).toISOString().split('T')[0];
      const entry = trendMap.get(dateKey);
      if (!entry) {
        return;
      }
      if (mention.company_id) {
        entry.companySet.add(mention.company_id);
      }
      entry.mentions += 1;
      if (typeof mention.confidence === 'number') {
        entry.confidenceTotal += mention.confidence;
      }
    });

    (companiesRes.data ?? []).forEach((company) => {
      const dateKey = new Date(company.first_seen_at).toISOString().split('T')[0];
      const entry = trendMap.get(dateKey);
      if (!entry) {
        return;
      }
      entry.companySet.add(company.id);
    });

    const trends = daysList.map((point) => {
      const entry = trendMap.get(point.date);
      if (!entry) {
        return point;
      }
      const avgConfidence = entry.mentions > 0 ? Number((entry.confidenceTotal / entry.mentions).toFixed(3)) : 0;
      return {
        date: point.date,
        companies: entry.companySet.size,
        mentions: entry.mentions,
        confidence: avgConfidence,
      };
    });

    return NextResponse.json({
      success: true,
      trends,
    });
  } catch (error) {
    console.error('Failed to fetch trends:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch trends' },
      { status: 500 }
    );
  }
}
