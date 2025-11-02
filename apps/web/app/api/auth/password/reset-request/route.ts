import { NextRequest, NextResponse } from 'next/server';
import { requestPasswordReset } from '@/lib/auth';
import { withRateLimit } from '@/lib/security/rate-limiting';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
});

async function buildRateLimitResponse(response: Response) {
  const body = await response.text();
  return new NextResponse(body, {
    status: response.status,
    headers: response.headers,
  });
}

export async function POST(request: NextRequest) {
  const rateLimit = await withRateLimit(request, 'auth/password-request');
  if (rateLimit) {
    return await buildRateLimitResponse(rateLimit);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({
      error: 'Invalid email address',
      details: parsed.error.flatten(),
    }, { status: 400 });
  }

  try {
    await requestPasswordReset(parsed.data);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[auth] Password reset request failed', error);
    return NextResponse.json({
      error: 'Unable to process password reset request',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
