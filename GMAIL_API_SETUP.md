# Gmail API Setup Guide

This guide walks you through setting up Gmail API access for the intelligence pipeline system.

## Overview

The Gmail pipeline fetches Substack newsletters from Gmail, extracts company mentions, and provides intelligence data through the dashboard. This requires OAuth 2.0 authentication with Gmail API.

## Prerequisites

- A Google Account with Gmail access
- Access to Google Cloud Console
- Administrative access to your deployment environment

## Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" dropdown at the top of the page
3. Click "New Project"
4. Enter a project name (e.g., "Substack Intelligence Pipeline")
5. Select your organization (if applicable)
6. Click "Create"

## Step 2: Enable Gmail API

1. In your Google Cloud project, go to "APIs & Services" → "Library"
2. Search for "Gmail API"
3. Click on "Gmail API" in the results
4. Click "Enable"

## Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Choose "External" user type (unless you're using Google Workspace)
3. Click "Create"
4. Fill in the required information:
   - **App name**: "Substack Intelligence Pipeline"
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
5. Click "Save and Continue"
6. On the "Scopes" page, click "Add or Remove Scopes"
7. Add the following scope:
   - `https://www.googleapis.com/auth/gmail.readonly`
8. Click "Save and Continue"
9. On the "Test users" page, add your Gmail address as a test user
10. Click "Save and Continue"

## Step 4: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Choose "Web application" as the application type
4. Give it a name: "Gmail Pipeline Client"
5. Add authorized redirect URIs:
   - For development: `http://localhost:3000/api/auth/gmail/callback`
   - For production: `https://yourdomain.com/api/auth/gmail/callback`
6. Click "Create"
7. **Important**: Save the Client ID and Client Secret - you'll need these!

## Step 5: Generate Refresh Token

Since this is a server-side application that needs to access Gmail without user interaction, you need a refresh token.

### Method 1: Using OAuth 2.0 Playground (Recommended)

1. Go to [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
2. Click the gear icon (⚙️) in the top-right corner
3. Check "Use your own OAuth credentials"
4. Enter your Client ID and Client Secret from Step 4
5. Close the configuration
6. In the left sidebar, find "Gmail API v1" and select:
   - `https://www.googleapis.com/auth/gmail.readonly`
7. Click "Authorize APIs"
8. Sign in with the Gmail account you want to access
9. Grant permissions
10. Click "Exchange authorization code for tokens"
11. **Save the refresh_token** - this is your `GOOGLE_REFRESH_TOKEN`

### Method 2: Manual Authorization Flow (Advanced)

```bash
# 1. Generate authorization URL
curl "https://accounts.google.com/o/oauth2/v2/auth?client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&scope=https://www.googleapis.com/auth/gmail.readonly&response_type=code&access_type=offline"

# 2. Visit the URL, authorize, and get the authorization code from redirect
# 3. Exchange code for tokens
curl -X POST https://oauth2.googleapis.com/token \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "code=AUTHORIZATION_CODE" \
  -d "grant_type=authorization_code" \
  -d "redirect_uri=YOUR_REDIRECT_URI"
```

## Step 6: Configure Environment Variables

Add the following environment variables to your deployment:

```env
# Gmail OAuth Configuration
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REFRESH_TOKEN=your_refresh_token_here
```

### For Development (.env.local)

```env
# Copy these values from your Google Cloud Console
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=ABCDEF-GhIjKlMnOpQrStUvWxYz
GOOGLE_REFRESH_TOKEN=1//0abcdefghijklmnop-qrstuvwxyz
```

### For Production

Set these environment variables in your hosting platform:
- **Vercel**: Project Settings → Environment Variables
- **Netlify**: Site Settings → Environment Variables
- **Railway**: Variables tab in your project
- **Docker**: Use `-e` flags or environment file

## Step 7: Test the Configuration

### Using the Health Check Endpoint

1. Start your application
2. Visit `/api/auth/gmail/health` (or use curl):

```bash
curl -X GET https://yourdomain.com/api/auth/gmail/health
```

Expected successful response:
```json
{
  "success": true,
  "healthy": true,
  "details": {
    "emailAddress": "your-email@gmail.com",
    "messagesTotal": 1500,
    "threadsTotal": 800,
    "configurationComplete": true,
    "lastChecked": "2024-01-01T12:00:00.000Z"
  }
}
```

### Using the Dashboard

1. Go to your application dashboard
2. Look for the "Pipeline Status" widget
3. It should show:
   - ✅ No "Configuration Required" errors
   - Real pipeline steps (not mock data)
   - Ability to trigger pipeline sync

## Troubleshooting

### Common Issues

#### 1. "Gmail OAuth configuration incomplete"
- **Cause**: Missing or incorrect environment variables
- **Solution**: Double-check `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REFRESH_TOKEN`

#### 2. "Invalid refresh token"
- **Cause**: Refresh token has expired or been revoked
- **Solutions**: 
  - Re-generate refresh token using OAuth 2.0 Playground
  - Ensure `access_type=offline` was used during authorization
  - Check that consent screen is published (not in testing mode)

#### 3. "Quota exceeded"
- **Cause**: Gmail API quota limits reached
- **Solution**: 
  - Check quota usage in Google Cloud Console
  - Implement rate limiting in your application
  - Consider increasing quota limits if needed

#### 4. "Redirect URI mismatch"
- **Cause**: The redirect URI in your OAuth client doesn't match what's being used
- **Solution**: Update authorized redirect URIs in Google Cloud Console

#### 5. "Access blocked: This app's request is invalid"
- **Cause**: OAuth consent screen not properly configured
- **Solution**: 
  - Complete all required fields in OAuth consent screen
  - Add your email as a test user during development
  - Publish the app for production use

### Debug Mode

Enable debug logging by setting:
```env
DEBUG_GMAIL_API=true
```

This will log detailed information about API calls and responses.

### API Quotas and Limits

- **Gmail API calls**: 1,000,000 quota units per day
- **Rate limiting**: 250 quota units per user per 100 seconds
- **Batch requests**: Up to 100 operations per batch

Monitor usage in Google Cloud Console → APIs & Services → Quotas.

## Security Best Practices

### 1. Secure Credential Storage
- Never commit credentials to version control
- Use secure environment variable management
- Rotate credentials regularly

### 2. Least Privilege Access
- Use only `gmail.readonly` scope (never `gmail.modify`)
- Limit access to specific Gmail account(s)
- Regular security audits

### 3. Error Handling
- Don't log sensitive tokens in error messages
- Implement proper retry logic with exponential backoff
- Monitor for suspicious activity

### 4. Compliance
- Ensure compliance with Google API Terms of Service
- Implement proper data retention policies
- Consider GDPR/privacy regulations

## Production Checklist

- [ ] OAuth consent screen published (not in testing)
- [ ] Production redirect URIs configured
- [ ] Environment variables set in production
- [ ] Health check endpoint returns success
- [ ] Pipeline can fetch test emails
- [ ] Monitoring and alerting configured
- [ ] Backup refresh token stored securely
- [ ] Rate limiting implemented
- [ ] Error handling tested

## Additional Resources

- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [Google OAuth 2.0 Guide](https://developers.google.com/identity/protocols/oauth2)
- [API Quotas and Limits](https://developers.google.com/gmail/api/reference/quota)
- [Google Cloud Console](https://console.cloud.google.com/)

## Support

If you encounter issues:

1. Check the health check endpoint for specific error messages
2. Review the troubleshooting section above  
3. Verify all environment variables are correctly set
4. Check Google Cloud Console for quota usage and errors
5. Review application logs for detailed error information

For additional help, consult the [Gmail API documentation](https://developers.google.com/gmail/api) or create an issue in the project repository.