import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@substack-intelligence/database';

export async function GET() {
  try {
    const supabase = createServiceRoleClient();
    
    // Get ALL companies
    const { data: companies, error } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    // Get companies with most mentions
    const { data: topCompanies, error: topError } = await supabase
      .from('companies')
      .select('name, mention_count, description')
      .order('mention_count', { ascending: false })
      .limit(10);
    
    if (topError) {
      throw topError;
    }
    
    return NextResponse.json({
      success: true,
      recentCompanies: companies?.map(c => ({
        name: c.name,
        description: c.description,
        mentions: c.mention_count
      })),
      topCompanies: topCompanies
    });
    
  } catch (error) {
    console.error('Failed to fetch companies:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}