import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@substack-intelligence/database';

// List of known bad "company" names that are actually sentence fragments
const BAD_COMPANY_NAMES = [
  'the president has never',
  'the single biggest',
  'in the Hamptons',
  'and',
  'but',
  'in the hamptons',
  'READ IN',
  'America has been scrambling to find a',
  'Trump',  // Just a person name, not a company
  'Softbank invested',
  'Loomer',  // Just a person name
  'and the Department of Health and Human',
  'Michael Best Strategies to lobby the White House'
];

export async function DELETE() {
  try {
    const supabase = createServiceRoleClient();
    
    // Delete bad company records
    const deletionPromises = BAD_COMPANY_NAMES.map(async (badName) => {
      // First, get the company ID
      const { data: company, error: fetchError } = await supabase
        .from('companies')
        .select('id')
        .ilike('name', badName)
        .single();
      
      if (fetchError || !company) {
        return { name: badName, status: 'not_found' };
      }
      
      // Delete related mentions first (foreign key constraint)
      const { error: mentionsError } = await supabase
        .from('company_mentions')
        .delete()
        .eq('company_id', company.id);
      
      if (mentionsError) {
        return { name: badName, status: 'mentions_delete_failed', error: mentionsError.message };
      }
      
      // Then delete the company
      const { error: deleteError } = await supabase
        .from('companies')
        .delete()
        .eq('id', company.id);
      
      if (deleteError) {
        return { name: badName, status: 'company_delete_failed', error: deleteError.message };
      }
      
      return { name: badName, status: 'deleted', id: company.id };
    });
    
    const results = await Promise.all(deletionPromises);
    
    // Get updated counts
    const [companiesResult, mentionsResult] = await Promise.all([
      supabase.from('companies').select('*', { count: 'exact', head: true }),
      supabase.from('company_mentions').select('*', { count: 'exact', head: true })
    ]);
    
    return NextResponse.json({
      success: true,
      message: 'Cleanup completed',
      deletionResults: results,
      remainingCounts: {
        companies: companiesResult.count || 0,
        mentions: mentionsResult.count || 0
      }
    });
    
  } catch (error) {
    console.error('Cleanup failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}