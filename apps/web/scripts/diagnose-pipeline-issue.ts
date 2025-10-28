/**
 * Diagnose pipeline issue - why companies are extracted but not saved
 */
import { createServiceRoleClient } from '@substack-intelligence/database';
import { ClaudeExtractor } from '@substack-intelligence/ai';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function diagnose() {
  console.log('[DIAGNOSE] Starting pipeline diagnosis');
  console.log('[DIAGNOSE] Environment:', {
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasClaudeKey: !!process.env.CLAUDE_API_KEY,
  });

  const supabase = createServiceRoleClient();

  try {
    // Get a user with emails
    const { data: emailsWithUser, error: userError } = await supabase
      .from('emails')
      .select('user_id')
      .not('user_id', 'is', null)
      .limit(1);

    if (!emailsWithUser || emailsWithUser.length === 0) {
      console.log('[DIAGNOSE] No emails with user_id found');
      return;
    }

    const userId = emailsWithUser[0].user_id!;
    console.log('[DIAGNOSE] Analyzing user:', userId);

    // Get email stats
    const { data: emailStats } = await supabase
      .from('emails')
      .select('processing_status, extraction_status, companies_extracted')
      .eq('user_id', userId);

    if (emailStats) {
      const stats = {
        total: emailStats.length,
        pending: emailStats.filter(e => e.processing_status === 'pending').length,
        processing: emailStats.filter(e => e.processing_status === 'processing').length,
        completed: emailStats.filter(e => e.processing_status === 'completed').length,
        failed: emailStats.filter(e => e.processing_status === 'failed').length,
        extraction_completed: emailStats.filter(e => e.extraction_status === 'completed').length,
        extraction_failed: emailStats.filter(e => e.extraction_status === 'failed').length,
        totalCompaniesExtracted: emailStats.reduce((sum, e) => sum + (e.companies_extracted || 0), 0),
      };

      console.log('[DIAGNOSE] Email Stats:', stats);
    }

    // Get some failed emails to diagnose
    const { data: failedEmails } = await supabase
      .from('emails')
      .select('id, newsletter_name, subject, processing_status, extraction_status, extraction_error, error_message, companies_extracted')
      .eq('user_id', userId)
      .in('processing_status', ['failed', 'completed'])
      .order('updated_at', { ascending: false })
      .limit(10);

    if (failedEmails && failedEmails.length > 0) {
      console.log('\n[DIAGNOSE] Recent processed/failed emails:');
      failedEmails.forEach(email => {
        console.log(`  Email ID: ${email.id}`);
        console.log(`  Newsletter: ${email.newsletter_name}`);
        console.log(`  Subject: ${email.subject}`);
        console.log(`  Processing Status: ${email.processing_status}`);
        console.log(`  Extraction Status: ${email.extraction_status}`);
        console.log(`  Companies Extracted: ${email.companies_extracted}`);
        if (email.error_message || email.extraction_error) {
          console.log(`  Errors: ${email.error_message || email.extraction_error}`);
        }
        console.log('  ---');
      });
    }

    // Check companies table
    const { data: companies } = await supabase
      .from('companies')
      .select('id, name, mention_count, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (companies) {
      console.log(`\n[DIAGNOSE] Total companies for user: ${companies.length}`);
      if (companies.length > 0) {
        console.log('[DIAGNOSE] Recent companies:');
        companies.forEach(c => {
          console.log(`  - ${c.name} (mentions: ${c.mention_count}, created: ${c.created_at})`);
        });
      }
    }

    // Test the extractor directly on a sample email
    const { data: sampleEmail } = await supabase
      .from('emails')
      .select('id, clean_text, raw_html, newsletter_name')
      .eq('user_id', userId)
      .in('extraction_status', ['completed', 'failed'])
      .not('clean_text', 'is', null)
      .limit(1)
      .single();

    if (sampleEmail) {
      console.log('\n[DIAGNOSE] Testing extractor on email:', sampleEmail.id);
      console.log('[DIAGNOSE] Newsletter:', sampleEmail.newsletter_name);

      try {
        const extractor = new ClaudeExtractor();
        const content = sampleEmail.clean_text || sampleEmail.raw_html || '';

        console.log('[DIAGNOSE] Content length:', content.length);
        console.log('[DIAGNOSE] Content preview:', content.substring(0, 200));

        console.log('\n[DIAGNOSE] Calling ClaudeExtractor.extractCompanies()...');
        const result = await extractor.extractCompanies(
          content,
          sampleEmail.newsletter_name || 'Unknown'
        );

        console.log('[DIAGNOSE] Extraction Result:', {
          hasResult: !!result,
          companiesCount: result?.companies?.length || 0,
          companies: result?.companies?.map(c => ({
            name: c.name,
            description: c.description?.substring(0, 50)
          })),
          metadata: result?.metadata,
          hasError: !!result?.metadata?.error
        });

        if (result?.metadata?.error) {
          console.log('[DIAGNOSE] ❌ Extraction error:', result.metadata.error);
        } else if (result?.companies && result.companies.length > 0) {
          console.log('[DIAGNOSE] ✅ Successfully extracted', result.companies.length, 'companies');
        } else {
          console.log('[DIAGNOSE] ⚠️ No companies extracted (empty result)');
        }
      } catch (error) {
        console.error('[DIAGNOSE] Direct extraction failed:', error);
      }
    }

    // Check if there's a pattern in failed extractions
    const { data: extractionErrors } = await supabase
      .from('emails')
      .select('extraction_error, count')
      .eq('user_id', userId)
      .not('extraction_error', 'is', null)
      .limit(5);

    if (extractionErrors && extractionErrors.length > 0) {
      console.log('\n[DIAGNOSE] Common extraction errors:');
      extractionErrors.forEach(err => {
        console.log(`  - ${err.extraction_error}`);
      });
    }

  } catch (error) {
    console.error('[DIAGNOSE] Diagnosis failed:', error);
  }
}

// Run diagnosis
diagnose()
  .then(() => {
    console.log('\n[DIAGNOSE] Diagnosis completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('[DIAGNOSE] Diagnosis crashed:', error);
    process.exit(1);
  });