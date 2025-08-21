import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@substack-intelligence/database';

// Disable Next.js caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const supabase = createServiceRoleClient();
    
    const { data: companies, error } = await supabase
      .from('companies')
      .select('*')
      .order('mention_count', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to fetch companies: ${error.message}`);
    }
    
    return NextResponse.json({
      success: true,
      data: {
        totalCompanies: companies?.length || 0,
        companies: companies || []
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });
    
  } catch (error) {
    console.error('Failed to fetch companies:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}