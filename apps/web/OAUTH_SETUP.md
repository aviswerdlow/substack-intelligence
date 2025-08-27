# OAuth Configuration Guide for Substack Intelligence

## Google Cloud Project Setup

### Project Details
- **Project ID**: substack-469521
- **Project Name**: Your Substack Intelligence project

### Step-by-Step OAuth Configuration

#### 1. Enable Gmail API
1. Navigate to [Google Cloud Console](https://console.cloud.google.com)
2. Select project: **substack-469521**
3. Go to **APIs & Services** → **Library**
4. Search for "Gmail API"
5. Click **Enable**

#### 2. Create OAuth 2.0 Credentials
1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. Select **Web application**
4. Name: "Substack Intelligence Web"

#### 3. Configure OAuth Client
Add the following authorized origins and redirect URIs:

**Authorized JavaScript origins:**
```
https://substack-clone-kappa.vercel.app
http://localhost:3000
```

**Authorized redirect URIs:**
```
https://substack-clone-kappa.vercel.app/api/auth/gmail/callback
http://localhost:3000/api/auth/gmail/callback
```

#### 4. OAuth Consent Screen
If not already configured:
1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** (or Internal if using Google Workspace)
3. Fill in required fields:
   - App name: Substack Intelligence
   - User support email: Your email
   - Developer contact: Your email
4. Add scopes:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.modify`
5. Add test users if in development

#### 5. Copy Credentials
After creating the OAuth client, copy:
- **Client ID**: `[your-new-client-id].apps.googleusercontent.com`
- **Client Secret**: `[your-new-client-secret]`

## Vercel Environment Variables

Update these in your Vercel project settings:

```bash
# Google Gmail API (from project substack-469521)
GOOGLE_CLIENT_ID=[new-client-id-from-step-5]
GOOGLE_CLIENT_SECRET=[new-client-secret-from-step-5]

# Note: GOOGLE_REFRESH_TOKEN will be generated when user first connects
```

## Local Development

Update your `.env.local` file with the new credentials:

```bash
# Google Gmail API (from project substack-469521)
GOOGLE_CLIENT_ID=[new-client-id-from-step-5]
GOOGLE_CLIENT_SECRET=[new-client-secret-from-step-5]
```

## Verification Steps

1. **Local Testing**:
   ```bash
   npm run dev
   ```
   Navigate to http://localhost:3000/dashboard and test Gmail connection

2. **Production Testing**:
   After updating Vercel environment variables and redeploying:
   - Visit https://substack-clone-kappa.vercel.app/dashboard
   - Click "Connect Gmail"
   - Should redirect to Google OAuth without "Access blocked" error

## Troubleshooting

### "Access blocked" Error
- Ensure you're using credentials from project substack-469521
- Verify all redirect URIs match exactly (including trailing slashes)
- Check OAuth consent screen is configured

### "Invalid client" Error  
- Double-check Client ID and Secret are copied correctly
- Ensure no extra spaces or line breaks in environment variables

### "Redirect URI mismatch" Error
- Verify redirect URIs in Google Cloud Console match exactly
- Check both http://localhost:3000 and production URLs are added

## Important Notes

1. **Project Selection**: Always ensure you're in project **substack-469521** when making changes
2. **Environment Variables**: Update both Vercel and local `.env.local` with the same credentials
3. **Deployment**: After updating Vercel variables, trigger a new deployment
4. **Testing**: Test OAuth flow in both local and production environments

## Next Steps

1. Complete OAuth setup in Google Cloud Console (project substack-469521)
2. Update environment variables in Vercel
3. Trigger redeployment
4. Test Gmail connection