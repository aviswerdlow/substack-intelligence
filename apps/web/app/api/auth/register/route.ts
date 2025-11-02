import { NextRequest, NextResponse } from 'next/server';
import { registerUser, supportedRoles } from '@/lib/auth';
import { withRateLimit } from '@/lib/security/rate-limiting';
import { z } from 'zod';

const registrationSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(120),
  role: z.enum(supportedRoles).default('reader'),
});

async function buildRateLimitResponse(response: Response) {
  const body = await response.text();
  return new NextResponse(body, {
    status: response.status,
    headers: response.headers,
  });
}

export async function POST(request: NextRequest) {
  const rateLimit = await withRateLimit(request, 'auth/signup');
  if (rateLimit) {
    return await buildRateLimitResponse(rateLimit);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({
      error: 'Invalid JSON payload',
    }, { status: 400 });
  }

  const parsed = registrationSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({
      error: 'Registration validation failed',
      details: parsed.error.flatten(),
    }, { status: 400 });
  }

  try {
    const user = await registerUser(parsed.data);
    return NextResponse.json({
      success: true,
      userId: user.id,
      email: user.email,
      emailVerified: Boolean(user.email_confirmed_at),
    }, { status: 201 });
  } catch (error) {
    console.error('[auth] Registration request failed', error);
    return NextResponse.json({
      error: 'Unable to create account',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
