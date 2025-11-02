import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createServiceRoleClient } from '@substack-intelligence/database';

type SupabaseClient = ReturnType<typeof createServiceRoleClient>;

type AnalyticsEvent = {
  id: string;
  session_id: string | null;
  event_name: string;
  event_category: string;
  conversion_stage: string | null;
  context_path: string | null;
  referrer: string | null;
  properties: Record<string, unknown> | null;
  created_at: string;
};

type PageView = {
  id: string;
  session_id: string | null;
  user_id: string | null;
  path: string;
  referrer: string | null;
  properties: Record<string, unknown> | null;
  occurred_at: string;
};

type PeriodData = {
  emails: any[];
  mentions: any[];
  companies: any[];
  newCompanies: any[];
  pageViews: PageView[];
  events: AnalyticsEvent[];
};

type RealtimeData = {
  events: AnalyticsEvent[];
  pageViews: PageView[];
};

const DEFAULT_DAYS = 7;

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (!user && !isDevelopment) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }

    const userId = user?.id || 'development-user';
    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get('days') ?? searchParams.get('period') ?? `${DEFAULT_DAYS}`;
    const period = Math.max(1, parseInt(daysParam, 10) || DEFAULT_DAYS);

    const endDate = new Date();
    const startDate = shiftDate(endDate, -period);
    const previousEndDate = new Date(startDate);
    const previousStartDate = shiftDate(previousEndDate, -period);

    const supabase = createServiceRoleClient();

    const [currentData, previousData, realtime] = await Promise.all([
      fetchPeriodData(supabase, userId, startDate, endDate),
      fetchPeriodData(supabase, userId, previousStartDate, previousEndDate),
      fetchRealtimeData(supabase, userId),
    ]);

    const metrics = buildMetrics(period, currentData, previousData, realtime);

    return NextResponse.json({
      success: true,
      metrics,
    });
  } catch (error) {
    console.error('Analytics metrics error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics metrics' },
      { status: 500 }
    );
  }
}

async function fetchPeriodData(
  supabase: SupabaseClient,
  userId: string,
  start: Date,
  end: Date
): Promise<PeriodData> {
  const startIso = start.toISOString();
  const endIso = end.toISOString();

  const [emailsRes, mentionsRes, companiesRes, uniqueCompaniesRes, pageViewsRes, eventsRes] = await Promise.all([
    supabase
      .from('emails')
      .select('*')
      .eq('user_id', userId)
      .gte('received_at', startIso)
      .lte('received_at', endIso),
    supabase
      .from('company_mentions')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startIso)
      .lte('created_at', endIso),
    supabase
      .from('companies')
      .select('*')
      .eq('user_id', userId),
    supabase
      .from('companies')
      .select('id')
      .eq('user_id', userId)
      .gte('first_seen_at', startIso)
      .lte('first_seen_at', endIso),
    supabase
      .from('analytics_page_views')
      .select('id, session_id, user_id, path, referrer, properties, occurred_at')
      .eq('user_id', userId)
      .gte('occurred_at', startIso)
      .lte('occurred_at', endIso),
    supabase
      .from('analytics_events')
      .select('id, session_id, event_name, event_category, conversion_stage, context_path, referrer, properties, created_at')
      .eq('user_id', userId)
      .gte('created_at', startIso)
      .lte('created_at', endIso),
  ]);

  logSupabaseError('emails', emailsRes.error);
  logSupabaseError('company_mentions', mentionsRes.error);
  logSupabaseError('companies', companiesRes.error);
  logSupabaseError('unique_companies', uniqueCompaniesRes.error);
  logSupabaseError('analytics_page_views', pageViewsRes.error);
  logSupabaseError('analytics_events', eventsRes.error);

  return {
    emails: emailsRes.data ?? [],
    mentions: mentionsRes.data ?? [],
    companies: companiesRes.data ?? [],
    newCompanies: uniqueCompaniesRes.data ?? [],
    pageViews: (pageViewsRes.data as PageView[]) ?? [],
    events: normalizeEvents(eventsRes.data),
  };
}

async function fetchRealtimeData(
  supabase: SupabaseClient,
  userId: string
): Promise<RealtimeData> {
  const windowStart = new Date();
  windowStart.setMinutes(windowStart.getMinutes() - 15);
  const startIso = windowStart.toISOString();

  const [pageViewsRes, eventsRes] = await Promise.all([
    supabase
      .from('analytics_page_views')
      .select('id, session_id, user_id, path, referrer, properties, occurred_at')
      .eq('user_id', userId)
      .gte('occurred_at', startIso)
      .order('occurred_at', { ascending: false }),
    supabase
      .from('analytics_events')
      .select('id, session_id, event_name, event_category, conversion_stage, context_path, referrer, properties, created_at')
      .eq('user_id', userId)
      .gte('created_at', startIso)
      .order('created_at', { ascending: false }),
  ]);

  logSupabaseError('analytics_page_views', pageViewsRes.error);
  logSupabaseError('analytics_events', eventsRes.error);

  return {
    pageViews: (pageViewsRes.data as PageView[]) ?? [],
    events: normalizeEvents(eventsRes.data),
  };
}

function buildMetrics(period: number, current: PeriodData, previous: PeriodData, realtime: RealtimeData) {
  const totalCompanies = current.companies.length;
  const companiesChange = calculatePercentageChange(totalCompanies, previous.companies.length);

  const discoveryVelocity = current.newCompanies.length / period;
  const previousVelocity = previous.newCompanies.length / period;
  const velocityChange = calculatePercentageChange(discoveryVelocity, previousVelocity);

  const avgConfidence = calculateAverageConfidence(current.mentions);
  const previousConfidence = calculateAverageConfidence(previous.mentions);
  const confidenceChange = calculatePercentageChange(avgConfidence, previousConfidence);

  const totalEmails = current.emails.length;
  const processedEmails = current.emails.filter((email: any) => email.processing_status === 'completed').length;
  const successRate = totalEmails > 0 ? processedEmails / totalEmails : 0;
  const newsletterCount = new Set(current.emails.map((email: any) => email.newsletter_name)).size;

  const pageViews = current.pageViews.length;
  const pageViewChange = calculatePercentageChange(pageViews, previous.pageViews.length);
  const uniqueVisitors = new Set(
    current.pageViews.map((view) => view.session_id || view.user_id || view.id)
  ).size;

  const totalEvents = current.events.length;
  const conversionEvents = current.events.filter(
    (event) => event.event_category === 'conversion' || Boolean(event.conversion_stage)
  );
  const conversionRate = pageViews > 0 ? conversionEvents.length / pageViews : 0;

  const activeExperiments = new Set(
    current.events
      .filter((event) => event.event_category === 'experiment')
      .map((event) => (event.properties ?? {})['experimentName'])
      .filter(Boolean)
  ).size;

  const funnel = [
    { stage: 'views', count: pageViews },
    { stage: 'engagements', count: current.events.filter((event) => event.event_category === 'user').length },
    { stage: 'conversions', count: conversionEvents.length },
  ];

  const contentPerformance = buildContentPerformance(current);
  const experiments = buildExperimentSummary(current.events);

  const realtimeMetrics = {
    pageViews: realtime.pageViews.length,
    events: realtime.events.length,
    lastEventAt: realtime.events[0]?.created_at ?? null,
  };

  return {
    totalCompanies,
    companiesChange,
    discoveryVelocity: Number(discoveryVelocity.toFixed(2)),
    velocityChange,
    avgConfidence,
    confidenceChange,
    newsletterCount,
    successRate,
    pageViews,
    pageViewChange,
    uniqueVisitors,
    totalEvents,
    conversionRate,
    activeExperiments,
    funnel,
    realtime: realtimeMetrics,
    contentPerformance,
    experiments,
  };
}

function buildContentPerformance(data: PeriodData) {
  const contentMap = new Map<string, {
    id: string;
    views: number;
    events: number;
    conversions: number;
    lastInteraction: string;
  }>();

  data.events.forEach((event) => {
    const props = (event.properties ?? {}) as Record<string, unknown>;
    const contentId = (props.postId || props.contentId || props.slug) as string | undefined;
    if (!contentId) {
      return;
    }

    const existing = contentMap.get(contentId) ?? {
      id: contentId,
      views: 0,
      events: 0,
      conversions: 0,
      lastInteraction: event.created_at,
    };

    existing.events += 1;
    if (event.event_category === 'conversion') {
      existing.conversions += 1;
    }
    existing.lastInteraction = maxTimestamp(existing.lastInteraction, event.created_at);
    contentMap.set(contentId, existing);
  });

  data.pageViews.forEach((view) => {
    const props = (view.properties ?? {}) as Record<string, unknown>;
    const explicitId = props.postId as string | undefined;
    const inferredId = deriveContentIdFromPath(view.path);
    const contentId = explicitId || inferredId;
    if (!contentId) {
      return;
    }

    const existing = contentMap.get(contentId) ?? {
      id: contentId,
      views: 0,
      events: 0,
      conversions: 0,
      lastInteraction: view.occurred_at,
    };

    existing.views += 1;
    existing.lastInteraction = maxTimestamp(existing.lastInteraction, view.occurred_at);
    contentMap.set(contentId, existing);
  });

  return Array.from(contentMap.values())
    .map((entry) => ({
      ...entry,
      conversionRate: entry.views > 0 ? Number((entry.conversions / entry.views).toFixed(3)) : 0,
    }))
    .sort((a, b) => b.events - a.events)
    .slice(0, 15);
}

function buildExperimentSummary(events: AnalyticsEvent[]) {
  const experiments = new Map<string, {
    name: string;
    variants: Record<string, number>;
    lastSeen: string;
  }>();

  events
    .filter((event) => event.event_category === 'experiment')
    .forEach((event) => {
      const props = (event.properties ?? {}) as Record<string, unknown>;
      const experimentName = props.experimentName as string | undefined;
      const variant = props.variant as string | undefined;
      if (!experimentName || !variant) {
        return;
      }

      const experiment = experiments.get(experimentName) ?? {
        name: experimentName,
        variants: {},
        lastSeen: event.created_at,
      };

      experiment.variants[variant] = (experiment.variants[variant] || 0) + 1;
      experiment.lastSeen = maxTimestamp(experiment.lastSeen, event.created_at);
      experiments.set(experimentName, experiment);
    });

  return Array.from(experiments.values()).map((experiment) => ({
    name: experiment.name,
    variants: experiment.variants,
    lastSeen: experiment.lastSeen,
  }));
}

function normalizeEvents(rows: any[] | null): AnalyticsEvent[] {
  if (!rows) {
    return [];
  }

  return rows.map((row) => ({
    ...row,
    properties: row.properties ?? {},
  }));
}

function calculatePercentageChange(currentValue: number, previousValue: number) {
  if (previousValue === 0) {
    return currentValue === 0 ? 0 : 100;
  }

  const change = ((currentValue - previousValue) / previousValue) * 100;
  return Number.isFinite(change) ? Math.round(change) : 0;
}

function calculateAverageConfidence(mentions: any[]): number {
  if (!mentions.length) {
    return 0;
  }
  const total = mentions.reduce((acc, mention) => acc + (mention.confidence || 0), 0);
  return Number((total / mentions.length).toFixed(3));
}

function deriveContentIdFromPath(path: string) {
  if (!path) {
    return undefined;
  }
  const match = path.match(/posts\/(\w[\w-]+)/);
  return match ? match[1] : undefined;
}

function shiftDate(date: Date, amount: number, unit: 'days' | 'hours' = 'days') {
  const result = new Date(date);
  if (unit === 'days') {
    result.setDate(result.getDate() + amount);
  } else {
    result.setHours(result.getHours() + amount);
  }
  return result;
}

function maxTimestamp(a: string, b: string) {
  return new Date(a) > new Date(b) ? a : b;
}

function logSupabaseError(resource: string, error: unknown) {
  if (error) {
    console.error(`[analytics] Failed to fetch ${resource}:`, error);
  }
}
