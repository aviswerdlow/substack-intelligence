import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { currentUser } from '@clerk/nextjs/server';
import { z } from 'zod';
import { createServiceRoleClient } from '@substack-intelligence/database';

const preferenceSchema = z.object({
  newsletter: z.boolean().optional(),
  new_posts: z.boolean().optional(),
  comments: z.boolean().optional(),
  marketing: z.boolean().optional(),
  product_updates: z.boolean().optional(),
  digest_frequency: z.string().optional(),
  preferred_format: z.enum(['html', 'text', 'both']).optional(),
  timezone: z.string().optional(),
});

const DEFAULT_PREFERENCES = {
  newsletter: true,
  new_posts: true,
  comments: true,
  marketing: false,
  product_updates: true,
  digest_frequency: 'weekly',
  preferred_format: 'html',
  timezone: 'UTC',
};

const supabase = createServiceRoleClient();

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('email_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[EmailPreferences] Fetch error:', error);
      return NextResponse.json({ success: false, error: 'Failed to load preferences' }, { status: 500 });
    }

    if (!data) {
      const unsubscribeToken = randomUUID();
      await supabase.from('email_preferences').upsert({
        user_id: user.id,
        ...DEFAULT_PREFERENCES,
        unsubscribe_token: unsubscribeToken,
      });

      return NextResponse.json({
        success: true,
        preferences: {
          ...DEFAULT_PREFERENCES,
          unsubscribe_token: unsubscribeToken,
        },
      });
    }

    return NextResponse.json({
      success: true,
      preferences: {
        ...DEFAULT_PREFERENCES,
        ...data,
      },
    });
  } catch (error) {
    console.error('[EmailPreferences] Unexpected error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load preferences' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const result = preferenceSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid payload',
        details: result.error.flatten(),
      }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('email_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const unsubscribeToken = existing?.unsubscribe_token ?? randomUUID();

    const updatePayload = {
      user_id: user.id,
      ...DEFAULT_PREFERENCES,
      ...existing,
      ...result.data,
      unsubscribe_token: unsubscribeToken,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('email_preferences')
      .upsert(updatePayload);

    if (error) {
      console.error('[EmailPreferences] Save error:', error);
      return NextResponse.json({ success: false, error: 'Failed to save preferences' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      preferences: updatePayload,
    });
  } catch (error) {
    console.error('[EmailPreferences] Unexpected error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save preferences' }, { status: 500 });
  }
}
