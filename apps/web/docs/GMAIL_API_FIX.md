# Gmail API Configuration Fix

## Issue
The Gmail API is not enabled for your Google Cloud Project (ID: 434656214861), causing the following error:
```
Gmail API has not been used in project 434656214861 before or it is disabled
```

## Solution

### Step 1: Enable Gmail API

1. Open the direct link provided in the error message:
   ```
   https://console.developers.google.com/apis/api/gmail.googleapis.com/overview?project=434656214861
   ```

2. Or manually navigate:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Select project 434656214861 (or your project name)
   - Navigate to "APIs & Services" → "Library"
   - Search for "Gmail API"
   - Click on it and press "ENABLE"

3. Wait 2-3 minutes for the API to be fully activated

### Step 2: Verify OAuth Credentials

1. In Google Cloud Console, go to "APIs & Services" → "Credentials"
2. Verify you have an OAuth 2.0 Client ID configured
3. Check that the redirect URI includes: `http://localhost:8080/oauth/callback`
4. Ensure the Client ID and Secret in your `.env.local` match the ones in Google Cloud

### Step 3: Re-authenticate if Needed

If the API was disabled and re-enabled, you may need to generate a new refresh token:

```bash
# Run the OAuth setup again
npm run setup:gmail-oauth YOUR_CLIENT_ID YOUR_CLIENT_SECRET

# Or use the interactive script
./scripts/run-gmail-setup.sh
```

### Step 4: Update Environment Variables

Ensure your `.env.local` has the correct values:

```env
GOOGLE_CLIENT_ID=your_actual_client_id_here
GOOGLE_CLIENT_SECRET=your_actual_client_secret_here
GOOGLE_REFRESH_TOKEN=your_refresh_token_here
```

### Step 5: Fix Upstash Redis Configuration

The error also shows an issue with Redis configuration. Update your `.env.local`:

```env
# Replace these placeholder values with actual Upstash credentials
UPSTASH_REDIS_REST_URL=https://your-actual-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_actual_token_here

# Or if you don't have Upstash, you can disable rate limiting temporarily
DISABLE_RATE_LIMITING=true
```

To get Upstash credentials:
1. Go to [Upstash Console](https://console.upstash.com/)
2. Create a new Redis database (free tier available)
3. Copy the REST URL and Token from the dashboard

### Step 6: Restart and Test

1. Restart your development server:
   ```bash
   # Stop the current server (Ctrl+C)
   # Start it again
   npm run dev
   ```

2. Test the Gmail connection:
   ```bash
   curl http://localhost:3000/api/test/gmail
   ```

3. If successful, you should see:
   ```json
   {
     "success": true,
     "connected": true,
     "stats": { ... }
   }
   ```

## Verification Steps

After fixing the configuration:

1. **Test Gmail API Connection**:
   ```bash
   npm run test:puppeteer -- --testNamePattern="should test Gmail API"
   ```

2. **Test Email Fetching**:
   ```bash
   npm run test:puppeteer -- --testNamePattern="should fetch emails"
   ```

3. **Run Full Test Suite**:
   ```bash
   npm run test:puppeteer
   ```

## Common Issues

### "Access Not Configured" Error
- The Gmail API is not enabled in your Google Cloud Project
- Solution: Follow Step 1 above to enable the API

### "Invalid Credentials" Error
- The OAuth credentials don't match between Google Cloud and your .env.local
- Solution: Verify Client ID and Secret match exactly

### "Refresh Token Invalid" Error
- The refresh token has been revoked or is incorrect
- Solution: Run the OAuth setup again to generate a new refresh token

### "Quota Exceeded" Error
- You've hit the Gmail API quota limits
- Solution: Wait 24 hours or upgrade your Google Cloud quota

## Next Steps

Once the Gmail API is working:

1. Test fetching real Substack newsletters from aviswerdlow@gmail.com
2. Verify company extraction is working on real newsletter content
3. Check that extracted companies are stored in Supabase
4. Confirm the dashboard displays the extracted data correctly

## Support

If you continue to have issues:

1. Check the Google Cloud Console logs for detailed error messages
2. Verify your Google account (aviswerdlow@gmail.com) has permission to use the API
3. Ensure your Google Cloud Project has billing enabled (though Gmail API is free up to quota)
4. Try creating a new OAuth client ID if the current one seems corrupted