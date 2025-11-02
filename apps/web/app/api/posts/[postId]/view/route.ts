import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerComponentClient, recordPostView } from '@substack-intelligence/database';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ViewPayloadSchema = z.object({
  referrer: z.string().optional().nullable(),
  device: z.string().optional().nullable(),
  location: z.unknown().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = ViewPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid view payload' }, { status: 400 });
    }

    const { userId } = await auth();
    const supabase = createServerComponentClient();

    await recordPostView(supabase, params.postId, {
      userId: userId ?? undefined,
      referrer: parsed.data.referrer ?? undefined,
      device: parsed.data.device ?? undefined,
      location: parsed.data.location ?? undefined,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error recording post view:', error);
    return NextResponse.json({ success: false, error: 'Failed to record view' }, { status: 500 });
  }
}
