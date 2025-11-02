import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  createServerComponentClient,
  listMediaAssets,
  createMediaAsset,
  deleteMediaAsset,
} from '@substack-intelligence/database';
import { withRateLimit } from '@/lib/security/rate-limiting';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const GetMediaSchema = z.object({
  limit: z.string().optional(),
  offset: z.string().optional(),
});

const CreateMediaSchema = z.object({
  filename: z.string().optional().nullable(),
  url: z.string().min(1, 'Media URL is required'),
  mimeType: z.string().optional().nullable(),
  sizeBytes: z.number().optional().nullable(),
  metadata: z.unknown().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = GetMediaSchema.safeParse({
      limit: searchParams.get('limit') ?? undefined,
      offset: searchParams.get('offset') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid pagination parameters' }, { status: 400 });
    }

    const limit = parsed.data.limit ? parseInt(parsed.data.limit, 10) : 50;
    const offset = parsed.data.offset ? parseInt(parsed.data.offset, 10) : 0;

    const supabase = createServerComponentClient();
    const assets = await listMediaAssets(supabase, userId, { limit, offset });

    return NextResponse.json({ success: true, data: assets });
  } catch (error) {
    console.error('Error fetching media assets:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch media assets' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = await withRateLimit(request, 'api/posts/media');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = CreateMediaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid media payload',
        details: parsed.error.flatten(),
      }, { status: 400 });
    }

    const supabase = createServerComponentClient();
    const asset = await createMediaAsset(supabase, userId, {
      filename: parsed.data.filename ?? undefined,
      url: parsed.data.url,
      mimeType: parsed.data.mimeType ?? undefined,
      sizeBytes: parsed.data.sizeBytes ?? undefined,
      metadata: parsed.data.metadata ?? undefined,
    });

    return NextResponse.json({ success: true, data: { asset } }, { status: 201 });
  } catch (error) {
    console.error('Error uploading media asset:', error);
    return NextResponse.json({ success: false, error: 'Failed to upload media asset' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const rateLimitResponse = await withRateLimit(request, 'api/posts/media/delete');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const assetId = searchParams.get('id');
    if (!assetId) {
      return NextResponse.json({ success: false, error: 'Missing asset id' }, { status: 400 });
    }

    const supabase = createServerComponentClient();
    await deleteMediaAsset(supabase, userId, assetId);

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    console.error('Error deleting media asset:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete media asset' }, { status: 500 });
  }
}
