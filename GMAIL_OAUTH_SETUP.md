# Gmail OAuth Setup & Troubleshooting Guide

## Overview

This guide covers the complete setup and troubleshooting of Gmail OAuth integration for the Substack Intelligence platform. Follow these steps to configure Gmail email integration correctly and resolve common issues.

## Table of Contents

1. [Quick Setup](#quick-setup)
2. [Google Cloud Console Configuration](#google-cloud-console-configuration)
3. [Environment Variables](#environment-variables)
4. [Testing & Validation](#testing--validation)
5. [Common Issues & Solutions](#common-issues--solutions)
6. [Monitoring & Debugging](#monitoring--debugging)
7. [Production Deployment](#production-deployment)
8. [Security Considerations](#security-considerations)

## Quick Setup

### Prerequisites
- Google Cloud account with billing enabled
- Access to the project's environment variables
- Admin access to modify OAuth settings

### Steps Overview
1. Configure Google Cloud Console OAuth credentials
2. Set environment variables
3. Test the connection
4. Deploy to production

## Google Cloud Console Configuration

### 1. Create/Select a Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note the Project ID for reference

### 2. Enable Gmail API

1. Navigate to **APIs & Services** → **Library**
2. Search for "Gmail API"
3. Click **Enable**
4. Wait 2-3 minutes for the API to be fully activated

### 3. Configure OAuth Consent Screen

1. Navigate to **APIs & Services** → **OAuth consent screen**
2. Choose **External** (or Internal if using Google Workspace)
3. Fill in required fields:
   - **App name**: "Substack Intelligence" (or your app name)
   - **User support email**: Your support email
   - **Developer contact information**: Your email
4. Add scopes:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.modify`
5. Add test users (if needed for testing)
6. Save and continue

### 4. Create OAuth 2.0 Credentials

1. Navigate to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth 2.0 Client IDs**
3. Choose **Web application**
4. Set name: "Gmail Integration"
5. Add **Authorized redirect URIs**:
   - Development: `http://localhost:3000/api/auth/gmail/callback`
   - Production: `https://yourdomain.com/api/auth/gmail/callback`
   
   ⚠️ **Critical**: URLs must match exactly (no trailing slashes)

6. Click **Create**
7. **Download the JSON file** or copy Client ID and Client Secret

## Environment Variables

### Required Variables

Add these to your `.env.local` (development) or hosting platform (production):

```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
NEXT_PUBLIC_APP_URL=http://localhost:3000  # or your production URL

# Optional: Monitoring (recommended for production)
AXIOM_TOKEN=your-axiom-token
AXIOM_DATASET=substack-intelligence
```

### Environment-Specific URLs

- **Development**: `http://localhost:3000`
- **Staging**: `https://staging.yourapp.com`
- **Production**: `https://yourapp.com`

⚠️ **Important**: Update both `NEXT_PUBLIC_APP_URL` and Google Cloud Console redirect URIs when changing environments.

## Testing & Validation

### Automated Health Checks

The platform includes built-in health checking and debugging tools:

#### 1. OAuth Health Check
```bash
curl http://localhost:3000/api/health/oauth
```

**Response Types:**
- `status: "healthy"` - All checks pass
- `status: "warning"` - Non-critical issues detected
- `status: "error"` - Critical issues that prevent OAuth

#### 2. Development Debug Tools (Dev Mode Only)

```bash
# Comprehensive debug information
curl http://localhost:3000/api/dev/oauth-debug

# Run automated tests
curl http://localhost:3000/api/dev/oauth-debug/test
```

#### 3. Manual Testing

1. Go to Settings → Email Integration
2. Click "Connect Gmail"
3. Complete the OAuth flow
4. Check for success message

### Test Connection Flow

1. **Initiate Connection**: User clicks "Connect Gmail"
2. **Redirect to Google**: Opens OAuth popup/tab
3. **User Authorizes**: Grants permissions to the app
4. **Callback Processing**: Exchanges authorization code for tokens
5. **Token Storage**: Saves tokens to database
6. **Success Confirmation**: Shows success message to user

## Common Issues & Solutions

### Issue 1: "Configuration Error - Missing Environment Variables"

**Symptoms:**
- Error when clicking "Connect Gmail"
- Health check shows missing variables

**Solutions:**
```bash
# Check if variables are set
echo $GOOGLE_CLIENT_ID
echo $GOOGLE_CLIENT_SECRET
echo $NEXT_PUBLIC_APP_URL

# If missing, add to .env.local:
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Restart development server
npm run dev
```

### Issue 2: "OAuth error: invalid_client"

**Symptoms:**
- Redirect to Google fails
- "OAuth client configuration error" message

**Root Causes & Solutions:**
- **Wrong credential type**: Ensure you created "Web application" credentials
- **Incorrect Client ID/Secret**: Verify they match Google Cloud Console
- **Project not enabled**: Ensure Gmail API is enabled in the project

### Issue 3: "redirect_uri_mismatch"

**Symptoms:**
- Google shows "redirect_uri_mismatch" error
- OAuth flow fails at Google authorization step

**Solutions:**
1. **Check exact URL match**:
   ```bash
   # Your app URL
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   
   # Redirect URI must be
   http://localhost:3000/api/auth/gmail/callback
   ```

2. **Common mistakes**:
   - Trailing slash: `http://localhost:3000/` ❌
   - Wrong protocol: `https://` vs `http://` 
   - Wrong port: `3001` instead of `3000`
   - Case sensitivity: `Callback` vs `callback`

3. **Update Google Cloud Console**:
   - Go to Credentials → Edit OAuth client
   - Add/update redirect URI exactly as shown above
   - Save changes

### Issue 4: "Google did not provide a refresh token"

**Symptoms:**
- OAuth completes but shows "missing refresh token" error
- Works first time, fails on subsequent attempts

**Root Cause:**
Google only provides refresh tokens on first authorization. Re-authorizing without revoking access won't provide a new refresh token.

**Solutions:**
1. **Revoke existing access**:
   - Go to [Google Account Permissions](https://myaccount.google.com/permissions)
   - Find your app and click "Remove access"
   - Wait 30 seconds
   - Try connecting again

2. **Force consent prompt** (already implemented):
   ```javascript
   // OAuth URL includes prompt: 'consent'
   prompt: 'consent'  // Forces re-consent and new refresh token
   ```

### Issue 5: "Gmail API has not been used"

**Symptoms:**
- OAuth succeeds but fails when accessing Gmail profile
- "Gmail API not enabled" error in callback

**Solutions:**
1. **Enable Gmail API**:
   - Go to Google Cloud Console
   - Navigate to APIs & Services → Library
   - Search "Gmail API" and enable it
   - Wait 2-3 minutes for activation

2. **Verify project**:
   - Ensure OAuth credentials and API are in the same project
   - Check project ID in URL matches your OAuth project

### Issue 6: Token Exchange Failures

**Symptoms:**
- "Failed to exchange authorization code" error
- Network timeouts during OAuth callback

**Solutions:**
1. **Check system clock**: Ensure server time is accurate
2. **Network connectivity**: Verify server can reach Google APIs
3. **Authorization code expiry**: Codes expire in 10 minutes - complete flow quickly
4. **Retry logic**: Platform automatically retries 3 times with exponential backoff

### Issue 7: Database Storage Errors

**Symptoms:**
- "Successfully authenticated but failed to save" error
- OAuth succeeds but connection not saved

**Solutions:**
1. **Check database connection**: Verify Supabase credentials
2. **Check user authentication**: Ensure user is logged in with Clerk
3. **Database schema**: Verify `user_settings` table exists with correct columns
4. **Permissions**: Ensure service role has write access

## Monitoring & Debugging

### Real-time Monitoring

#### 1. OAuth Monitoring Dashboard
```bash
# View metrics and recent events (admin only)
curl -H "Authorization: Bearer your-token" \
  http://localhost:3000/api/admin/oauth-monitoring
```

**Metrics Tracked:**
- Total OAuth attempts
- Success/failure rates
- Average connection time
- Error types and frequencies
- Retry patterns

#### 2. Health Monitoring
```bash
# Check OAuth system health
curl http://localhost:3000/api/health/oauth
```

#### 3. Axiom Logging (Production)

All OAuth events are automatically logged to Axiom when configured:

```bash
# Set environment variables for logging
AXIOM_TOKEN=your-axiom-token
AXIOM_DATASET=substack-intelligence
AXIOM_ENABLED=true
```

**Logged Events:**
- `oauth_initiated` - User starts OAuth flow
- `oauth_success` - Successful connection
- `oauth_failure` - Any failure with detailed error info
- `token_refresh` - Token refresh operations

### Debug Information

#### Development Debug Endpoint
```bash
GET /api/dev/oauth-debug
```

**Provides:**
- Environment variable validation
- OAuth client configuration test  
- Health check status
- Recent monitoring data
- Setup instructions
- Common issue solutions

#### Test Suite
```bash
GET /api/dev/oauth-debug/test
```

**Runs automated tests for:**
- Environment variables
- OAuth configuration
- Google API connection
- Auth URL generation

## Production Deployment

### Pre-Deployment Checklist

- [ ] **Google Cloud Console**:
  - [ ] Gmail API enabled
  - [ ] OAuth consent screen published
  - [ ] Production redirect URI added
  - [ ] Credentials created for web application

- [ ] **Environment Variables**:
  - [ ] `GOOGLE_CLIENT_ID` set correctly
  - [ ] `GOOGLE_CLIENT_SECRET` set correctly  
  - [ ] `NEXT_PUBLIC_APP_URL` matches production domain
  - [ ] HTTPS enabled for production URLs

- [ ] **Monitoring** (Recommended):
  - [ ] `AXIOM_TOKEN` configured for logging
  - [ ] `AXIOM_DATASET` configured
  - [ ] Alert notifications configured

- [ ] **Testing**:
  - [ ] Health check passes: `/api/health/oauth`
  - [ ] Manual OAuth flow tested
  - [ ] Error scenarios tested

### Deployment Steps

1. **Update Environment Variables**:
   ```bash
   GOOGLE_CLIENT_ID=your-production-client-id
   GOOGLE_CLIENT_SECRET=your-production-client-secret
   NEXT_PUBLIC_APP_URL=https://yourapp.com
   ```

2. **Update Google Cloud Console**:
   - Add production redirect URI: `https://yourapp.com/api/auth/gmail/callback`
   - Verify OAuth consent screen is published

3. **Deploy Application**

4. **Verify Health**:
   ```bash
   curl https://yourapp.com/api/health/oauth
   ```

5. **Test OAuth Flow**:
   - Go to production app
   - Test Gmail connection end-to-end
   - Verify monitoring data

### Rolling Back

If OAuth issues occur in production:

1. **Quick Fix**: Revert to previous working environment variables
2. **Monitoring**: Check `/api/admin/oauth-monitoring` for error details
3. **Health Check**: Verify `/api/health/oauth` status
4. **Logs**: Review Axiom logs for detailed error information

## Security Considerations

### Token Security
- **Refresh tokens** are stored encrypted in the database
- **Access tokens** are rotated automatically
- **State parameter** prevents CSRF attacks
- **HTTPS required** for all OAuth flows in production

### Scope Permissions
The app requests minimal required permissions:
- `gmail.readonly` - Read email content and metadata
- `gmail.modify` - Manage labels and modify messages (for processing)

### Access Control
- **User isolation**: Each user's tokens are isolated
- **Admin endpoints**: Monitoring endpoints require admin authentication
- **Debug endpoints**: Only available in development mode

### Best Practices
- **Regularly rotate** OAuth client credentials
- **Monitor for suspicious activity** in OAuth logs
- **Implement rate limiting** on OAuth endpoints
- **Use HTTPS everywhere** in production
- **Audit OAuth permissions** regularly

## API Reference

### Health Check Endpoints

#### `GET /api/health/oauth`
Returns OAuth system health status.

**Response:**
```json
{
  "status": "healthy|warning|error",
  "checks": {
    "environmentVariables": { "status": "pass", "message": "..." },
    "redirectUri": { "status": "pass", "message": "..." },
    "googleClientConfig": { "status": "pass", "message": "..." },
    "gmailApiAccess": { "status": "pass", "message": "..." }
  },
  "recommendations": ["..."],
  "lastChecked": "2024-01-01T00:00:00.000Z"
}
```

### OAuth Endpoints

#### `GET /api/auth/gmail`
Initiates OAuth flow. Returns authorization URL for redirect.

#### `GET /api/auth/gmail/callback`
Handles OAuth callback, exchanges code for tokens.

#### `DELETE /api/auth/gmail`
Disconnects Gmail account and revokes tokens.

#### `GET /api/auth/gmail/status`
Returns current Gmail connection status for authenticated user.

### Monitoring Endpoints

#### `GET /api/admin/oauth-monitoring`
Admin-only endpoint returning OAuth metrics and events.

**Query Parameters:**
- `limit` - Number of recent events to return (default: 100)
- `hours` - Time window for analytics (default: 24)

### Debug Endpoints (Development Only)

#### `GET /api/dev/oauth-debug`
Comprehensive debug information and setup validation.

#### `GET /api/dev/oauth-debug/test`
Automated test suite for OAuth configuration.

## Support

For additional help:

1. **Check health endpoint**: `/api/health/oauth`
2. **Review debug information**: `/api/dev/oauth-debug` (development)
3. **Monitor OAuth events**: `/api/admin/oauth-monitoring` (admin)
4. **Check application logs** for detailed error information
5. **Review Google Cloud Console** audit logs for OAuth-related events

## Changelog

- **v1.0.0** - Initial OAuth implementation
- **v1.1.0** - Added comprehensive error handling and retry logic
- **v1.2.0** - Added health checks and monitoring
- **v1.3.0** - Added debug tools and improved documentation