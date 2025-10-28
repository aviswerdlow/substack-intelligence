/**
 * Reset failed emails to pending status so they can be reprocessed
 */
import { createServiceRoleClient } from '@substack-intelligence/database';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function resetFailedEmails() {
  console.log('[RESET] Resetting failed emails to pending status');

  const supabase = createServiceRoleClient();

  try {
    // Get user with emails
    const { data: emailsWithUser, error: userError } = await supabase
      .from('emails')
      .select('user_id')
      .not('user_id', 'is', null)
      .limit(1);

    if (!emailsWithUser || emailsWithUser.length === 0) {
      console.log('[RESET] No emails with user_id found');
      return;
    }

    const userId = emailsWithUser[0].user_id!;
    console.log('[RESET] Processing emails for user:', userId);

    // Reset all failed emails to pending
    const { data: failedEmails, error: fetchError } = await supabase
      .from('emails')
      .select('id, newsletter_name, subject')
      .eq('user_id', userId)
      .eq('processing_status', 'failed');

    if (fetchError) {
      console.error('[RESET] Failed to fetch failed emails:', fetchError);
      return;
    }

    if (!failedEmails || failedEmails.length === 0) {
      console.log('[RESET] No failed emails found');
    } else {
      console.log(`[RESET] Found ${failedEmails.length} failed emails to reset`);

      for (const email of failedEmails) {
        console.log(`[RESET] Resetting email: ${email.newsletter_name} - ${email.subject}`);

        const { error: updateError } = await supabase
          .from('emails')
          .update({
            processing_status: 'pending',
            extraction_status: 'pending',
            error_message: null,
            extraction_error: null,
            companies_extracted: 0
          })
          .eq('id', email.id);

        if (updateError) {
          console.error(`[RESET] Failed to reset email ${email.id}:`, updateError);
        } else {
          console.log(`[RESET] Successfully reset email ${email.id} to pending`);
        }
      }
    }

    // Also reset any emails that are completed but have 0 companies extracted
    // (these might have been incorrectly marked as completed)
    const { data: emptyCompleted, error: emptyError } = await supabase
      .from('emails')
      .select('id, newsletter_name, subject')
      .eq('user_id', userId)
      .eq('processing_status', 'completed')
      .eq('companies_extracted', 0);

    if (!emptyError && emptyCompleted && emptyCompleted.length > 0) {
      console.log(`\n[RESET] Found ${emptyCompleted.length} completed emails with 0 companies`);

      // Only reset a sample to avoid overwhelming the system
      const toReset = emptyCompleted.slice(0, 10);
      console.log(`[RESET] Resetting first ${toReset.length} of these emails`);

      for (const email of toReset) {
        const { error: updateError } = await supabase
          .from('emails')
          .update({
            processing_status: 'pending',
            extraction_status: 'pending'
          })
          .eq('id', email.id);

        if (!updateError) {
          console.log(`[RESET] Reset empty completed email: ${email.newsletter_name}`);
        }
      }
    }

    // Check final status
    const { count: pendingCount } = await supabase
      .from('emails')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('processing_status', 'pending');

    console.log(`\n[RESET] Final status: ${pendingCount || 0} emails ready for processing`);

  } catch (error) {
    console.error('[RESET] Failed to reset emails:', error);
  }
}

// Run the reset
resetFailedEmails()
  .then(() => {
    console.log('\n[RESET] Reset completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('[RESET] Reset crashed:', error);
    process.exit(1);
  });