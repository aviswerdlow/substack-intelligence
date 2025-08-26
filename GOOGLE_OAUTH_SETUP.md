# Google OAuth + Gmail Integration Setup Guide

## Overview
This guide will help you configure Clerk to use Google OAuth as the primary authentication method and automatically capture Gmail access for newsletter processing.

## Prerequisites
- Clerk account and application
- Google Cloud Console account
- Environment variables configured

## Step 1: Google Cloud Console Setup

1. **Go to Google Cloud Console**: https://console.cloud.google.com/

2. **Create or Select a Project**

3. **Enable Gmail API**:
   - Go to "APIs & Services" → "Library"
   - Search for "Gmail API"
   - Click on it and press "Enable"

4. **Configure OAuth Consent Screen**:
   - Go to "APIs & Services" → "OAuth consent screen"
   - Choose "External" (or "Internal" for Google Workspace)
   - Fill in required fields:
     - App name: "Substack Intelligence"
     - User support email: Your email
     - Developer contact: Your email
   - Add scopes:
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `https://www.googleapis.com/auth/gmail.modify`
     - `https://mail.google.com/`
   - Add test users if in development

5. **Create OAuth 2.0 Credentials**:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client ID"
   - Application type: "Web application"
   - Name: "Substack Intelligence"
   - Authorized redirect URIs:
     ```
     https://YOUR-CLERK-FRONTEND-API.clerk.accounts.dev/v1/oauth_callback
     http://localhost:3000/api/auth/callback/google (for development)
     ```
   - Copy the **Client ID** and **Client Secret**

## Step 2: Clerk Dashboard Configuration

1. **Sign in to Clerk Dashboard**: https://dashboard.clerk.com/

2. **Navigate to Social Connections**:
   - Go to "User & Authentication" → "Social Connections"

3. **Configure Google OAuth**:
   - Click on "Google"
   - Toggle it ON
   - Enter your Google OAuth credentials:
     - Client ID: (from Google Cloud Console)
     - Client Secret: (from Google Cloud Console)
   - Under "Additional Scopes", add:
     ```
     https://www.googleapis.com/auth/gmail.readonly
     https://www.googleapis.com/auth/gmail.modify
     https://mail.google.com/
     ```
   - Save configuration

4. **Create OAuth Token Template** (for accessing tokens):
   - Go to "JWT Templates"
   - Create new template named "google_oauth"
   - Set claims to include OAuth tokens
   - Save template

5. **Setup Webhook** (to capture user creation):
   - Go to "Webhooks"
   - Add endpoint: `https://your-domain.com/api/webhooks/clerk`
   - Select events:
     - user.created
     - user.updated
     - session.created
   - Copy the webhook secret

## Step 3: Environment Variables

Add these to your `.env.local`:

```bash
# Clerk (existing)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# Clerk Webhook
CLERK_WEBHOOK_SECRET=whsec_...

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Optional: For direct Gmail API access
GOOGLE_REFRESH_TOKEN=... # Obtained through OAuth flow
```

## Step 4: Install Dependencies

```bash
npm install svix
```

## Step 5: Test the Flow

1. **Clear browser cookies** and localStorage
2. **Visit your app** at http://localhost:3000
3. **Click "Sign In"**
4. **Choose "Continue with Google"**
5. **Grant Gmail permissions** when prompted
6. **Verify** you're redirected to dashboard with Gmail connected

## Step 6: Verify Integration

Check these endpoints:
- `/api/auth/google-token` - Should return Gmail access status
- `/api/auth/gmail/status` - Should show connected status
- Dashboard should show "Gmail Connected" automatically

## Troubleshooting

### "Gmail permissions not granted"
- User needs to re-authenticate and grant Gmail scopes
- Check that scopes are properly configured in Clerk

### "No Google account connected"
- User didn't sign in with Google
- They need to use Google OAuth instead of email/password

### Webhook not firing
- Verify webhook secret is correct
- Check Clerk dashboard for webhook logs
- Ensure ngrok/production URL is accessible

### Token access issues
- Ensure JWT template is configured in Clerk
- Verify `getToken({ template: 'google_oauth' })` is using correct template name

## Production Considerations

1. **Token Storage**: 
   - Encrypt OAuth refresh tokens before storing
   - Use a secure key management service

2. **Token Refresh**:
   - Implement automatic token refresh
   - Handle expired tokens gracefully

3. **Rate Limiting**:
   - Implement rate limiting for Gmail API calls
   - Cache frequently accessed data

4. **Error Handling**:
   - Graceful fallback if Gmail connection fails
   - Clear error messages for users

## Benefits of This Approach

✅ **Single Sign-On**: Users authenticate once with Google
✅ **Automatic Gmail Access**: No separate Gmail connection step
✅ **Better UX**: Streamlined onboarding process
✅ **Higher Conversion**: Reduced friction increases activation
✅ **Secure**: OAuth tokens managed by Clerk

## Next Steps

After setup:
1. Test with multiple Google accounts
2. Implement token refresh logic
3. Add error recovery mechanisms
4. Monitor webhook reliability
5. Set up alerting for OAuth failures