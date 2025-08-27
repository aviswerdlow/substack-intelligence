import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createServiceRoleClient } from '@substack-intelligence/database';

export async function GET() {
  try {
    const user = await currentUser();
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (!user && !isDevelopment) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        companies: []
      }, { status: 401 });
    }
    
    const userId = user?.id || 'development-user';
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
      throw error;
    }
    
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