/**
 * Test script to run the processor directly with enhanced logging
 */
import { processBackgroundEmails } from '../app/api/pipeline/process-background/processor';
import { createServiceRoleClient } from '@substack-intelligence/database';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testProcessor() {
  console.log('[TEST] Starting processor test with enhanced logging');
  console.log('[TEST] Environment check:', {
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasClaudeKey: !!process.env.CLAUDE_API_KEY,
  });

  try {
    // Get a test user
    const supabase = createServiceRoleClient();

    // First, check if we have any emails to get a user_id
    const { data: emailsWithUser, error: userError } = await supabase
      .from('emails')
      .select('user_id')
      .not('user_id', 'is', null)
      .limit(1);

    if (userError) {
      console.error('[TEST] Failed to fetch users from emails:', userError);
      return;
    }

    if (!emailsWithUser || emailsWithUser.length === 0) {
      console.log('[TEST] No emails with user_id found in database');
      return;
    }

    const testUserId = emailsWithUser[0].user_id!;
    console.log('[TEST] Using test user_id:', testUserId);

    // Check if this user has any pending emails
    const { data: pendingEmails, error: emailError } = await supabase
      .from('emails')
      .select('id, newsletter_name, subject, processing_status')
      .eq('user_id', testUserId)
      .eq('processing_status', 'pending')
      .limit(5);

    if (emailError) {
      console.error('[TEST] Failed to fetch pending emails:', emailError);
      return;
    }

    console.log('[TEST] Found pending emails:', pendingEmails?.length || 0);
    if (pendingEmails && pendingEmails.length > 0) {
      console.log('[TEST] Sample pending emails:');
      pendingEmails.forEach(email => {
        console.log(`  - ${email.newsletter_name}: ${email.subject} (${email.processing_status})`);
      });
    }

    // Run the processor with our enhanced logging
    console.log('[TEST] Starting background email processor...');
    console.log('=' .repeat(80));

    const result = await processBackgroundEmails({
      userId: testUserId,
      batchSize: 2, // Process just 2 emails for testing
      maxProcessingTime: 30000, // 30 seconds max
      logPrefix: '[TEST-PROCESSOR]'
    });

    console.log('=' .repeat(80));
    console.log('[TEST] Processor result:', JSON.stringify(result, null, 2));

    // Check what companies were saved
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name, description, mention_count, created_at')
      .eq('user_id', testUserId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (!companiesError && companies) {
      console.log('[TEST] Recent companies in database:');
      companies.forEach(company => {
        console.log(`  - ${company.name}: ${company.description?.substring(0, 50)}... (mentions: ${company.mention_count})`);
      });
    }

  } catch (error) {
    console.error('[TEST] Test failed:', error);
  }
}

// Run the test
testProcessor()
  .then(() => {
    console.log('[TEST] Test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('[TEST] Test crashed:', error);
    process.exit(1);
  });