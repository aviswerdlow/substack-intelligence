import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@substack-intelligence/database';

// Disable Next.js caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const supabase = createServiceRoleClient();
    
    // Get all companies
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (companiesError) {
      throw companiesError;
    }
    
    // Get all company mentions
    const { data: mentions, error: mentionsError } = await supabase
      .from('company_mentions')
      .select('*')
      .order('extracted_at', { ascending: false });
    
    if (mentionsError) {
      throw mentionsError;
    }
    
    return NextResponse.json({
      success: true,
      data: {
        companies: companies || [],
        mentions: mentions || [],
        companiesCount: companies?.length || 0,
        mentionsCount: mentions?.length || 0
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