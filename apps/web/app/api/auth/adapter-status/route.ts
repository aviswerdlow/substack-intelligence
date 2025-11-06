import { NextResponse } from 'next/server';
import { getAuthAdapterSource } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const source = getAuthAdapterSource();
  return NextResponse.json({ adapterSource: source });
}
