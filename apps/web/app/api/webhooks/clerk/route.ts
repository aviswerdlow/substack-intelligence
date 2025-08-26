import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { WebhookEvent } from '@clerk/nextjs/server';
import { createServiceRoleClient } from '@substack-intelligence/database';

// This webhook captures Google OAuth tokens after successful authentication
// and stores them for Gmail API access

export async function POST(req: Request) {
  // Get the headers
  const headerPayload = headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your webhook secret
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('CLERK_WEBHOOK_SECRET not set');
    return new Response('Server configuration error', { status: 500 });
  }

  const wh = new Webhook(webhookSecret);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occured', {
      status: 400
    });
  }

  // Handle the webhook
  const eventType = evt.type;

  if (eventType === 'user.created' || eventType === 'user.updated') {
    const { id, email_addresses, external_accounts } = evt.data;
    
    // Find Google account in external accounts
    const googleAccount = external_accounts?.find(
      account => account.provider === 'google'
    );

    if (googleAccount && googleAccount.provider_user_id) {
      console.log(`User ${id} has connected Google account: ${googleAccount.email_address}`);
      
      // Check if this account has Gmail OAuth tokens
      // Note: Clerk doesn't directly expose OAuth tokens for security
      // You'll need to implement a separate OAuth flow or use Clerk's OAuth features
      
      try {
        const supabase = createServiceRoleClient();
        
        // Store the Google account info in your database
        const { error } = await supabase
          .from('user_settings')
          .upsert({
            user_id: id,
            gmail_connected: true,
            gmail_email: googleAccount.email_address,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });

        if (error) {
          console.error('Failed to update user settings:', error);
        } else {
          console.log(`Updated Gmail connection status for user ${id}`);
        }

        // Important: To get actual Gmail API access, you'll need to:
        // 1. Use Clerk's OAuth token management
        // 2. Or implement a separate OAuth flow that captures refresh tokens
        // 3. Store encrypted refresh tokens in your database
        
      } catch (error) {
        console.error('Failed to process Google account connection:', error);
      }
    }
  }

  return new Response('', { status: 200 });
}