import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceRoleClient } from '@substack-intelligence/database';

const requestSchema = z.object({
  token: z.string().min(10, 'Invalid token'),
  categories: z.array(z.enum(['newsletter', 'new_posts', 'comments', 'marketing', 'product_updates'])).optional(),
});

const supabase = createServiceRoleClient();

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const parsed = requestSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
    }

    const { token, categories } = parsed.data;

    const { data, error } = await supabase
      .from('email_preferences')
      .select('*')
      .eq('unsubscribe_token', token)
      .single();

    if (error || !data) {
      return NextResponse.json({ success: false, error: 'Subscription not found' }, { status: 404 });
    }

    const updates: Record<string, any> = {
      unsubscribed_at: new Date().toISOString(),
    };

    const fields = categories && categories.length > 0 ? categories : ['newsletter', 'new_posts', 'comments', 'marketing', 'product_updates'];

    for (const field of fields) {
      updates[field] = false;
    }

    const { error: updateError } = await supabase
      .from('email_preferences')
      .update(updates)
      .eq('user_id', data.user_id);

    if (updateError) {
      console.error('[EmailUnsubscribe] Update error:', updateError);
      return NextResponse.json({ success: false, error: 'Failed to update preferences' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'You have successfully updated your email preferences.',
    });
  } catch (error) {
    console.error('[EmailUnsubscribe] Unexpected error:', error);
    return NextResponse.json({ success: false, error: 'Failed to process unsubscribe request' }, { status: 500 });
  }
}
