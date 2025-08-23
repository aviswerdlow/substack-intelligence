import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createServiceRoleClient, getDailyIntelligence } from '@substack-intelligence/database';

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceRoleClient();
    const companies = await getDailyIntelligence(supabase, { limit: 10 });
    
    return NextResponse.json({ 
      companies: companies || [],
      total: companies?.length || 0
    });
  } catch (error) {
    console.error('Failed to fetch recent companies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recent companies', companies: [] },
      { status: 500 }
    );
  }
}