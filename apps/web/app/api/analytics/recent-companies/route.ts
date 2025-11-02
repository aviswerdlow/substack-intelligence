import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@substack-intelligence/database';
import { buildMissingUserIdColumnResponse, isMissingUserIdColumnError } from '@/lib/supabase-errors';
import { getServerSecuritySession } from '@substack-intelligence/lib/security/session';

export async function GET() {
  try {
    const session = await getServerSecuritySession();
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (!session && !isDevelopment) {
      return NextResponse.json({
        error: 'Unauthorized',
        companies: []
      }, { status: 401 });
    }

    const userId = session?.user.id || 'development-user';
    const supabase = createServiceRoleClient();
    
    // Fetch recent companies - FILTER BY USER_ID
    const { data: companies, error } = await supabase
      .from('companies')
      .select('*')
      .eq('user_id', userId)  // CRITICAL: Filter by user_id
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Failed to fetch recent companies:', error);
      if (isMissingUserIdColumnError(error)) {
        return buildMissingUserIdColumnResponse('recent_companies', 'companies');
      }
      throw error;
    }
    
    return NextResponse.json({ 
      companies: companies || [],
      total: companies?.length || 0
    });
  } catch (error) {
    console.error('Failed to fetch recent companies:', error);
    if (isMissingUserIdColumnError(error)) {
      return buildMissingUserIdColumnResponse('recent_companies', 'companies');
    }
    return NextResponse.json(
      { error: 'Failed to fetch recent companies', companies: [] },
      { status: 500 }
    );
  }
}