import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceRoleClient } from '@substack-intelligence/database';

const eventSchema = z.object({
  eventName: z.string().min(1),
  eventCategory: z.enum(['page', 'user', 'content', 'conversion', 'experiment']).optional(),
  userId: z.string().trim().min(1).max(190).nullable().optional(),
  sessionId: z.string().trim().min(6).max(190).nullable().optional(),
  path: z.string().max(512).optional(),
  referrer: z.string().max(512).nullable().optional(),
  properties: z.record(z.any()).optional(),
  conversionStage: z.string().max(120).optional(),
  consent: z.boolean().optional(),
  timestamp: z.string().optional(),
});

const MAX_PAYLOAD_SIZE = 1024 * 32; // 32kb

export async function POST(request: NextRequest) {
  try {
    if (!process.env.ENABLE_ANALYTICS || process.env.ENABLE_ANALYTICS !== 'true') {
      return NextResponse.json({ success: true, skipped: true, reason: 'Analytics disabled' }, { status: 202 });
    }
    const rawBody = await request.text();

    if (rawBody.length > MAX_PAYLOAD_SIZE) {
      return NextResponse.json({ success: false, error: 'Payload too large' }, { status: 413 });
    }

    let json: unknown = {};
    if (rawBody) {
      try {
        json = JSON.parse(rawBody);
      } catch (parseError) {
        console.error('[analytics] Invalid JSON payload', parseError);
        return NextResponse.json(
          { success: false, error: 'Invalid analytics payload' },
          { status: 400 }
        );
      }
    }
    const parsed = eventSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid analytics payload', issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const {
      eventName,
      eventCategory = 'user',
      userId,
      sessionId,
      path,
      referrer,
      properties,
      conversionStage,
      consent,
      timestamp,
    } = parsed.data;

    if (!consent) {
      return NextResponse.json({ success: true, skipped: true }, { status: 202 });
    }

    const supabase = createServiceRoleClient();
    const occurredAt = (() => {
      if (!timestamp) return new Date().toISOString();
      const parsedDate = new Date(timestamp);
      return Number.isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString();
    })();

    const sanitizedProperties = properties ? JSON.parse(JSON.stringify(properties)) : {};
    const userAgent = request.headers.get('user-agent');
    if (userAgent && typeof sanitizedProperties === 'object') {
      (sanitizedProperties as Record<string, unknown>).userAgent = userAgent;
    }

    if (eventCategory === 'page') {
      const { error } = await supabase.from('analytics_page_views').insert({
        user_id: userId || null,
        session_id: sessionId || null,
        path: path || 'unknown',
        referrer: referrer || null,
        properties: sanitizedProperties,
        occurred_at: occurredAt,
      });

      if (error) {
        console.error('[analytics] Failed to store page view', error);
        return NextResponse.json(
          { success: false, error: 'Failed to store page view' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    const { error } = await supabase.from('analytics_events').insert({
      user_id: userId || null,
      session_id: sessionId || null,
      event_name: eventName,
      event_category: eventCategory,
      conversion_stage: conversionStage || null,
      context_path: path || null,
      referrer: referrer || null,
      properties: sanitizedProperties,
      created_at: occurredAt,
    });

    if (error) {
      console.error('[analytics] Failed to store event', error);
      return NextResponse.json(
        { success: false, error: 'Failed to store analytics event' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[analytics] Unexpected error', error);
    return NextResponse.json(
      { success: false, error: 'Analytics tracking failed' },
      { status: 500 }
    );
  }
}
