# Gmail Integration Setup Guide

This guide will help you set up Gmail OAuth authentication to test email ingestion from aviswerdlow@gmail.com.

## Prerequisites

1. **Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Note your Project ID

2. **Enable Gmail API**
   - In your Google Cloud Project, go to "APIs & Services" → "Library"
   - Search for "Gmail API"
   - Click on it and press "Enable"

3. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - If prompted, configure OAuth consent screen first:
     - Choose "External" user type
     - Fill in required fields (app name, user support email)
     - Add aviswerdlow@gmail.com to test users
     - Add scopes: `gmail.readonly` and `gmail.modify`
   - For Application Type, choose "Web application"
   - Add authorized redirect URI: `http://localhost:8080/oauth/callback`
   - Save and note your Client ID and Client Secret

## Setup Instructions

### Option 1: Interactive Setup (Recommended)

Run the interactive setup script:

```bash
./scripts/run-gmail-setup.sh
```

This will:
1. Prompt you for your Client ID and Secret
2. Open a browser for authentication
3. Generate a refresh token
4. Show you the environment variables to add

### Option 2: Direct Setup

Run the OAuth setup directly with your credentials:

```bash
npm run setup:gmail-oauth YOUR_CLIENT_ID YOUR_CLIENT_SECRET
```

Replace `YOUR_CLIENT_ID` and `YOUR_CLIENT_SECRET` with your actual values.

### Option 3: Manual Setup

1. Run the setup script:
   ```bash
   node scripts/gmail-oauth-setup.js "YOUR_CLIENT_ID" "YOUR_CLIENT_SECRET"
   ```

2. A browser will open automatically (or you'll get a URL to visit)

3. Sign in with aviswerdlow@gmail.com

4. Grant the requested permissions

5. You'll be redirected back and see your refresh token

## Environment Variables

After obtaining your refresh token, add these to your `.env.local` file:

```env
# Gmail OAuth Configuration
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REFRESH_TOKEN=your_refresh_token_here
```

## Testing the Integration

Once configured, you can test the Gmail integration:

### 1. Test Gmail Connection
```bash
curl http://localhost:3000/api/test/gmail
```

### 2. Fetch Emails Manually
```bash
curl -X POST http://localhost:3000/api/test/gmail
```

### 3. Run Full Puppeteer Tests
```bash
npm run test:puppeteer
```

### 4. Trigger Intelligence Pipeline
```bash
curl -X POST http://localhost:3000/api/trigger/intelligence
```

## Troubleshooting

### "Refresh token not found"
- Ensure you completed the OAuth flow
- Check that GOOGLE_REFRESH_TOKEN is in your .env.local file
- Restart your Next.js server after adding environment variables

### "Gmail API not enabled"
- Go to Google Cloud Console
- Navigate to APIs & Services → Library
- Search for Gmail API and enable it

### "Invalid client ID or secret"
- Verify your credentials in Google Cloud Console
- Ensure no extra spaces in your environment variables
- Check that redirect URI matches exactly: `http://localhost:8080/oauth/callback`

### "Access blocked: Authorization Error"
- In OAuth consent screen settings, add aviswerdlow@gmail.com as a test user
- If using a Google Workspace account, may need admin approval
- Try creating credentials in a personal Google Cloud project

## Security Notes

⚠️ **Important Security Considerations:**

1. **Never commit credentials** - Keep .env.local in .gitignore
2. **Refresh tokens don't expire** - Store securely
3. **Use service accounts for production** - This OAuth flow is for testing only
4. **Limit scope access** - Only request necessary Gmail permissions
5. **Rotate credentials regularly** - Revoke and regenerate if compromised

## Next Steps

After successful setup:

1. Run the Puppeteer test suite to verify integration
2. Check that emails are being fetched from aviswerdlow@gmail.com
3. Verify company extraction is working on real newsletter content
4. Monitor the Inngest dashboard for pipeline execution
5. Check Supabase for stored companies and mentions