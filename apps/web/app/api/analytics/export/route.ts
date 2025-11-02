import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createServiceRoleClient } from '@substack-intelligence/database';

interface DailyExportRow {
  date: string;
  companies: number;
  mentions: number;
  avgConfidence: number;
  pageViews: number;
  conversions: number;
  conversionRate: number;
  uniqueVisitors: number;
  experiments: number;
}

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (!user && !isDevelopment) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user?.id || 'development-user';
    const searchParams = request.nextUrl.searchParams;
    const days = Math.max(1, parseInt(searchParams.get('days') || '7', 10));

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));

    const supabase = createServiceRoleClient();

    const [mentionsRes, companiesRes, pageViewsRes, eventsRes] = await Promise.all([
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
      supabase
        .from('analytics_page_views')
        .select('occurred_at, session_id')
        .eq('user_id', userId)
        .gte('occurred_at', startDate.toISOString())
        .lte('occurred_at', endDate.toISOString()),
      supabase
        .from('analytics_events')
        .select('created_at, event_category, properties')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString()),
    ]);

    logSupabaseError('company_mentions', mentionsRes.error);
    logSupabaseError('companies', companiesRes.error);
    logSupabaseError('analytics_page_views', pageViewsRes.error);
    logSupabaseError('analytics_events', eventsRes.error);

    const rows = generateDailyRows(days, startDate);
    const rowMap = new Map<string, DailyExportRow & {
      confidenceTotal: number;
      mentionCount: number;
      companySet: Set<string>;
      visitorSet: Set<string>;
      experimentSet: Set<string>;
    }>();

    rows.forEach((row) => {
      rowMap.set(row.date, {
        ...row,
        confidenceTotal: 0,
        mentionCount: 0,
        companySet: new Set<string>(),
        visitorSet: new Set<string>(),
        experimentSet: new Set<string>(),
      });
    });

    (mentionsRes.data ?? []).forEach((mention) => {
      const dateKey = toDateKey(mention.created_at);
      const entry = rowMap.get(dateKey);
      if (!entry) {
        return;
      }
      entry.mentions += 1;
      if (mention.company_id) {
        entry.companySet.add(mention.company_id);
      }
      if (typeof mention.confidence === 'number') {
        entry.confidenceTotal += mention.confidence;
        entry.mentionCount += 1;
      }
    });

    (companiesRes.data ?? []).forEach((company) => {
      const dateKey = toDateKey(company.first_seen_at);
      const entry = rowMap.get(dateKey);
      if (!entry) {
        return;
      }
      entry.companySet.add(company.id);
    });

    (pageViewsRes.data ?? []).forEach((view) => {
      const dateKey = toDateKey(view.occurred_at);
      const entry = rowMap.get(dateKey);
      if (!entry) {
        return;
      }
      entry.pageViews += 1;
      if (view.session_id) {
        entry.visitorSet.add(view.session_id);
      }
    });

    (eventsRes.data ?? []).forEach((event) => {
      const dateKey = toDateKey(event.created_at);
      const entry = rowMap.get(dateKey);
      if (!entry) {
        return;
      }
      if (event.event_category === 'conversion') {
        entry.conversions += 1;
      }
      if (event.event_category === 'experiment') {
        const experimentName = (event.properties as Record<string, unknown> | null)?.experimentName as string | undefined;
        if (experimentName) {
          entry.experimentSet.add(experimentName);
        }
      }
    });

    const exportRows = rows.map((row) => {
      const entry = rowMap.get(row.date);
      if (!entry) {
        return row;
      }

      const avgConfidence = entry.mentionCount > 0 ? Number((entry.confidenceTotal / entry.mentionCount).toFixed(3)) : 0;
      const uniqueVisitors = entry.visitorSet.size;
      const conversionRate = entry.pageViews > 0 ? Number((entry.conversions / entry.pageViews).toFixed(3)) : 0;

      return {
        date: row.date,
        companies: entry.companySet.size,
        mentions: entry.mentions,
        avgConfidence,
        pageViews: entry.pageViews,
        conversions: entry.conversions,
        conversionRate,
        uniqueVisitors,
        experiments: entry.experimentSet.size,
      } satisfies DailyExportRow;
    });

    const csvString = convertToCSV(exportRows);

    return new NextResponse(csvString, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="analytics-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Failed to export analytics:', error);
    const errorCSV = 'Error,Message\nExport Failed,Unable to generate analytics export';
    return new NextResponse(errorCSV, {
      status: 500,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="export-error.csv"',
      },
    });
  }
}

function generateDailyRows(days: number, startDate: Date): DailyExportRow[] {
  const rows: DailyExportRow[] = [];
  const cursor = new Date(startDate);
  for (let i = 0; i < days; i++) {
    const dateKey = cursor.toISOString().split('T')[0];
    rows.push({
      date: dateKey,
      companies: 0,
      mentions: 0,
      avgConfidence: 0,
      pageViews: 0,
      conversions: 0,
      conversionRate: 0,
      uniqueVisitors: 0,
      experiments: 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return rows;
}

function convertToCSV(rows: DailyExportRow[]): string {
  const header = ['Date', 'Companies Discovered', 'Mentions', 'Avg Confidence', 'Page Views', 'Conversions', 'Conversion Rate', 'Unique Visitors', 'Active Experiments'];
  const dataRows = rows.map((row) => [
    row.date,
    row.companies.toString(),
    row.mentions.toString(),
    row.avgConfidence.toString(),
    row.pageViews.toString(),
    row.conversions.toString(),
    row.conversionRate.toString(),
    row.uniqueVisitors.toString(),
    row.experiments.toString(),
  ]);

  return [header, ...dataRows]
    .map((cells) => cells.map((cell) => (cell.includes(',') ? `"${cell.replace(/"/g, '""')}"` : cell)).join(','))
    .join('\n');
}

function toDateKey(timestamp: string) {
  return new Date(timestamp).toISOString().split('T')[0];
}

function logSupabaseError(resource: string, error: unknown) {
  if (error) {
    console.error(`[analytics-export] Failed to fetch ${resource}:`, error);
  }
}
