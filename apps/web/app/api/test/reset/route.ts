import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@substack-intelligence/database';

export async function DELETE() {
  try {
    const supabase = createServiceRoleClient();
    
    // Delete all company mentions first (due to foreign key constraints)
    const { error: mentionsError } = await supabase
      .from('company_mentions')
      .delete()
      .gte('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    if (mentionsError) {
      throw new Error(`Failed to delete mentions: ${mentionsError.message}`);
    }
    
    // Then delete all companies
    const { error: companiesError } = await supabase
      .from('companies')
      .delete()
      .gte('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    if (companiesError) {
      throw new Error(`Failed to delete companies: ${companiesError.message}`);
    }
    
    // Get counts to confirm
    const [companiesResult, mentionsResult] = await Promise.all([
      supabase.from('companies').select('*', { count: 'exact', head: true }),
      supabase.from('company_mentions').select('*', { count: 'exact', head: true })
    ]);
    
    return NextResponse.json({
      success: true,
      message: 'All companies and mentions deleted',
      remainingCounts: {
        companies: companiesResult.count || 0,
        mentions: mentionsResult.count || 0
      }
    });
    
  } catch (error) {
    console.error('Reset failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}