/**
 * Check email statuses in database to diagnose why new emails aren't being processed
 */
import { createServiceRoleClient } from '@substack-intelligence/database';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkEmailStatuses() {
  console.log('[CHECK] Checking email statuses in database');

  const supabase = createServiceRoleClient();

  try {
    // Get a user with emails
    const { data: emailsWithUser, error: userError } = await supabase
      .from('emails')
      .select('user_id')
      .not('user_id', 'is', null)
      .limit(1);

    if (!emailsWithUser || emailsWithUser.length === 0) {
      console.log('[CHECK] No emails with user_id found');
      return;
    }

    const userId = emailsWithUser[0].user_id!;
    console.log('[CHECK] Analyzing emails for user:', userId);

    // Get email status breakdown
    const { data: allEmails, error: emailError } = await supabase
      .from('emails')
      .select('processing_status, extraction_status, received_at, newsletter_name')
      .eq('user_id', userId)
      .order('received_at', { ascending: false });

    if (emailError) {
      console.error('[CHECK] Failed to fetch emails:', emailError);
      return;
    }

    if (!allEmails || allEmails.length === 0) {
      console.log('[CHECK] No emails found for user');
      return;
    }

    // Count by status
    const statusCounts: Record<string, number> = {};
    allEmails.forEach(email => {
      const status = email.processing_status || 'unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    console.log('\n[CHECK] Email Processing Status Breakdown:');
    console.log('Total emails:', allEmails.length);
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count} (${((count/allEmails.length)*100).toFixed(1)}%)`);
    });

    // Show most recent emails
    console.log('\n[CHECK] Most recent 10 emails:');
    allEmails.slice(0, 10).forEach(email => {
      const date = new Date(email.received_at!);
      console.log(`  ${date.toISOString().split('T')[0]} - ${email.newsletter_name} - Status: ${email.processing_status}/${email.extraction_status}`);
    });

    // Check for failed emails that could be reprocessed
    const { data: failedEmails } = await supabase
      .from('emails')
      .select('id, newsletter_name, subject, processing_status, extraction_status, error_message, extraction_error')
      .eq('user_id', userId)
      .eq('processing_status', 'failed')
      .limit(5);

    if (failedEmails && failedEmails.length > 0) {
      console.log('\n[CHECK] Failed emails that could be reprocessed:');
      failedEmails.forEach(email => {
        console.log(`  - ${email.newsletter_name}: ${email.error_message || email.extraction_error || 'Unknown error'}`);
      });
    }

    // Check the date range of emails
    const { data: dateRange } = await supabase
      .from('emails')
      .select('received_at')
      .eq('user_id', userId)
      .order('received_at', { ascending: true })
      .limit(1);

    const { data: latestEmail } = await supabase
      .from('emails')
      .select('received_at')
      .eq('user_id', userId)
      .order('received_at', { ascending: false })
      .limit(1);

    if (dateRange && dateRange[0] && latestEmail && latestEmail[0]) {
      const oldest = new Date(dateRange[0].received_at!);
      const newest = new Date(latestEmail[0].received_at!);
      const daysSinceNewest = Math.floor((Date.now() - newest.getTime()) / (1000 * 60 * 60 * 24));

      console.log('\n[CHECK] Email Date Range:');
      console.log(`  Oldest: ${oldest.toISOString().split('T')[0]}`);
      console.log(`  Newest: ${newest.toISOString().split('T')[0]}`);
      console.log(`  Days since newest: ${daysSinceNewest} days ago`);

      if (daysSinceNewest > 0) {
        console.log(`  ⚠️ WARNING: No emails newer than ${daysSinceNewest} days!`);
        console.log('  This suggests Gmail sync is not fetching recent emails.');
      }
    }

    // Check specifically for pending emails
    const { count: pendingCount } = await supabase
      .from('emails')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('processing_status', 'pending');

    console.log(`\n[CHECK] Emails ready for processing: ${pendingCount || 0}`);

    if (pendingCount === 0) {
      console.log('[CHECK] ⚠️ No pending emails! This is why the pipeline has nothing to process.');
      console.log('[CHECK] Possible solutions:');
      console.log('  1. Reset failed emails to pending status');
      console.log('  2. Force re-sync from Gmail to get newer emails');
      console.log('  3. Check if incremental sync is missing new emails');
    }

  } catch (error) {
    console.error('[CHECK] Failed to check email statuses:', error);
  }
}

// Run the check
checkEmailStatuses()
  .then(() => {
    console.log('\n[CHECK] Status check completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('[CHECK] Status check crashed:', error);
    process.exit(1);
  });