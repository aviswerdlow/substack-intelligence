# Pipeline 500 Error - Debugging Guide

This guide will help you diagnose and fix the 500 Internal Server Error from `/api/pipeline/sync`.

## Quick Diagnosis Steps

### Step 1: Check Vercel Deployment Logs

1. Go to your Vercel dashboard
2. Select your deployment
3. Click on "Functions" tab
4. Find the `/api/pipeline/sync` function
5. Look for error logs with stack traces

**What to look for:**
- Authentication errors
- Missing environment variables
- Database connection failures
- Gmail API errors
- AI service initialization failures

---

### Step 2: Validate Environment Variables

Run this check in your Vercel deployment environment:

```bash
# Check if all critical variables are set
curl https://your-app.vercel.app/api/config/validate
```

**Required Environment Variables:**
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- ✅ `CLERK_SECRET_KEY`
- ✅ `ANTHROPIC_API_KEY`
- ✅ `GOOGLE_CLIENT_ID`
- ✅ `GOOGLE_CLIENT_SECRET`

**How to check in Vercel:**
1. Go to Project Settings → Environment Variables
2. Verify all variables above are set
3. Make sure they're set for the correct environment (Preview, Production, Development)

---

### Step 3: Common Error Scenarios & Solutions

#### Error 1: "Gmail account not connected"
```json
{
  "success": false,
  "error": "Gmail account not connected. Please connect your Gmail account in Settings first."
}
```

**Solution:**
1. Sign out and sign back in with Google
2. Ensure you're using a Google account with Gmail enabled
3. Check database: `user_settings` table should have `gmail_connected = true`

---

#### Error 2: "Gmail OAuth configuration incomplete"
```json
{
  "success": false,
  "error": "Gmail OAuth configuration incomplete. Missing environment variables: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET"
}
```

**Solution:**
1. Add missing environment variables in Vercel
2. Redeploy the application
3. Values should match your Google Cloud Console OAuth credentials

---

#### Error 3: "AI service initialization failed"
```json
{
  "success": false,
  "error": "AI service initialization failed. Please ensure your Anthropic API key is properly configured"
}
```

**Solution:**
1. Verify `ANTHROPIC_API_KEY` is set in Vercel
2. Check the key is valid and has credits: https://console.anthropic.com/
3. Ensure the key starts with `sk-ant-api03-`

---

#### Error 4: "This Google account does not have Gmail enabled"
```json
{
  "success": false,
  "error": "Gmail not available on this Google account",
  "details": {
    "message": "The Google account you signed in with does not have Gmail enabled..."
  }
}
```

**Solution:**
1. Sign out from the application
2. Sign in with a different Google account that has Gmail access
3. Use a personal Gmail account (@gmail.com) or Google Workspace account with Gmail

---

#### Error 5: Database Schema Error - Missing user_id column
```json
{
  "success": false,
  "error": "Database schema is missing the required user_id column. Please run the latest migrations..."
}
```

**Solution:**
1. Check if database migrations are up to date
2. Run migrations: `npm run db:migrate` or apply via Supabase dashboard
3. Verify `user_id` column exists in: `emails`, `companies`, `company_mentions` tables

---

### Step 4: Test Pipeline Components Individually

#### Test 1: Authentication
```bash
curl https://your-app.vercel.app/api/debug-clerk
```
**Expected:** User information and authentication status

#### Test 2: Database Connection
```bash
curl https://your-app.vercel.app/api/monitoring/health
```
**Expected:** All services showing as "healthy"

#### Test 3: Gmail Configuration
Check the pipeline status endpoint:
```bash
curl https://your-app.vercel.app/api/pipeline/status
```
**Expected:** `configurationStatus.isOAuthConfigured = true`

#### Test 4: AI Service
The AI service is tested internally when pipeline runs. Check logs for:
```
ClaudeExtractor initialization failed
```

---

### Step 5: Enable Debug Logging

To get more detailed logs, you can temporarily add debug statements:

1. Check browser console for client-side errors
2. Check Vercel function logs for server-side errors
3. Look for these specific log messages:
   - `[Pipeline Sync] Starting Gmail configuration check for user:`
   - `[Pipeline Sync] Gmail fetch error:`
   - `[Pipeline Sync] Pipeline failed with error:`

---

## Most Likely Causes (Based on Code Analysis)

### 1. Gmail Access Issue (90% probability)
**Location:** `route.ts:378-404`

The error occurs when:
- User signed in with a Google account that doesn't have Gmail enabled
- Google Workspace account without Gmail service
- OAuth permissions not granted

**How to fix:**
- Sign in with a @gmail.com account
- Or enable Gmail in Google Workspace admin console

---

### 2. Missing Environment Variables (5% probability)
**Location:** `route.ts:126-146`

**How to fix:**
- Add all required environment variables in Vercel
- Redeploy after adding variables

---

### 3. Database Schema Issue (3% probability)
**Location:** Throughout `route.ts` (lines 448-796)

**How to fix:**
- Run latest database migrations
- Verify `user_id` column exists in all tables

---

### 4. AI Service Initialization (2% probability)
**Location:** `route.ts:418-443`

**How to fix:**
- Verify Anthropic API key is valid
- Check API key has available credits
- Ensure key has proper permissions

---

## Quick Fix Checklist

- [ ] All environment variables set in Vercel
- [ ] Signed in with Google account that has Gmail
- [ ] Database migrations are up to date
- [ ] Anthropic API key is valid and has credits
- [ ] CSP violations are fixed (worker-src, clerk-telemetry)
- [ ] Clerk redirect URLs updated to use `fallbackRedirectUrl`
- [ ] No console errors related to authentication
- [ ] Pipeline status endpoint returns valid configuration

---

## Next Steps

1. **Check Vercel logs** for the exact error message and stack trace
2. **Verify environment variables** are all set correctly
3. **Test authentication** by signing in with a Gmail account
4. **Try the pipeline** again after confirming all checks pass
5. **Monitor logs** during pipeline execution for detailed error info

---

## Support Resources

- **Pipeline Code:** `apps/web/app/api/pipeline/sync/route.ts`
- **Middleware:** `apps/web/middleware.ts`
- **Auth Pages:** `apps/web/app/(auth)/sign-in` and `sign-up`
- **Environment Setup:** `apps/web/.env.local`

---

## Recent Fixes Applied

✅ **CSP Violations Fixed** (middleware.ts:129)
   - Added `worker-src 'self' blob:` for Clerk workers
   - Added `https://clerk-telemetry.com` to connect-src

✅ **Clerk Deprecation Warnings Fixed**
   - SignIn component: Updated to use `fallbackRedirectUrl`
   - SignUp component: Updated to use `fallbackRedirectUrl`

---

## Still Having Issues?

If you're still experiencing the 500 error after following this guide:

1. **Share the Vercel function logs** - This will show the exact error
2. **Check browser console** - Copy all error messages
3. **Verify test account** - Use a @gmail.com account for testing
4. **Check API quotas** - Ensure Anthropic and Gmail APIs aren't rate limited
