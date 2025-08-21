# Upstash Token Permission Fix

## Issue
You're currently using the **Read-Only Token** which gives this error:
```
NOPERM this user has no permissions to run the 'eval' command
```

The rate limiting library needs write permissions to track request counts.

## Solution

Go back to your Upstash dashboard and copy the **Standard Token** instead:

1. Go to your [Upstash Dashboard](https://console.upstash.com/)
2. Click on your `moved-phoenix-9691` database
3. In the **REST** tab, you'll see two tokens:
   - **Standard Token** (Full read/write access) ← USE THIS ONE
   - **Read-Only Token** (Read-only access) ← NOT THIS ONE

4. Copy the **Standard Token** (it's the first one, above the Read-Only Token)

5. Update your `.env.local`:
```env
UPSTASH_REDIS_REST_TOKEN=paste_the_standard_token_here
```

The Standard Token will look similar but has full permissions for rate limiting operations.

## Quick Test

After updating the token and restarting the server, test it:

```bash
# Test extraction endpoint (uses rate limiting)
curl -X POST http://localhost:3001/api/test/extract \
  -H "Content-Type: application/json" \
  -d '{"content": "Test content", "newsletterName": "Test"}'
```

This should work without permission errors!