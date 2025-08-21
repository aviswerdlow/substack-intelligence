import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@substack-intelligence/database';

// Disable Next.js caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST() {
  try {
    const supabase = createServiceRoleClient();
    
    const testCompany = {
      name: 'Vevo Test',
      normalized_name: 'vevo-test-' + Date.now(),
      description: 'Test company for debugging',
      industry: ['media'],
      mention_count: 1,
      first_seen_at: new Date().toISOString(),
      last_updated_at: new Date().toISOString(),
      enrichment_status: 'pending',
      newsletter_diversity: 1
    };
    
    console.log('Attempting to create company:', testCompany);
    
    const { data, error } = await supabase
      .from('companies')
      .insert(testCompany)
      .select()
      .single();
    
    if (error) {
      console.error('Company creation error:', error);
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error
      }, { status: 400 });
    }
    
    console.log('Company created successfully:', data);
    
    return NextResponse.json({
      success: true,
      data: data,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });
    
  } catch (error) {
    console.error('Failed to create test company:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}