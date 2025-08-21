# Upstash Redis Setup Guide

## Why Upstash Redis?

Upstash Redis is used for:
- **Rate limiting** API endpoints to prevent abuse
- **Caching** frequently accessed data
- **Session management** for improved performance
- **Queue management** for background jobs

## Setup Instructions

### Step 1: Create Upstash Account

1. Go to [Upstash Console](https://console.upstash.com/)
2. Sign up for a free account (no credit card required)
3. Verify your email

### Step 2: Create a Redis Database

1. Click **"Create Database"** in the dashboard
2. Configure your database:
   - **Name**: `substack-intelligence` (or any name you prefer)
   - **Type**: Choose "Regional" for better performance
   - **Region**: Select closest to your location (e.g., `us-east-1` for US East)
   - **Eviction**: Enable eviction (recommended for caching)
   - **TLS/SSL**: Keep enabled (default)

3. Click **"Create"**

### Step 3: Get Your Credentials

After creation, you'll see your database details:

1. Click on your database name
2. Go to the **"Details"** tab
3. Find the **"REST API"** section
4. Copy these values:
   - **UPSTASH_REDIS_REST_URL**: Something like `https://us1-example-12345.upstash.io`
   - **UPSTASH_REDIS_REST_TOKEN**: A long token string starting with `AX...`

### Step 4: Update Your Environment Variables

Replace the placeholder values in your `.env.local`:

```env
# Upstash Redis (for rate limiting and caching)
UPSTASH_REDIS_REST_URL=https://your-actual-endpoint.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-actual-token-here
```

Example with real values (don't use these - get your own):
```env
UPSTASH_REDIS_REST_URL=https://us1-settling-ferret-39481.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXkSASQgN2Y3ZmZiZDItNzE4My00YWY4LWJmMTEt...
```

### Step 5: Verify Configuration

After updating `.env.local`, restart your dev server:

```bash
# Stop the current server (Ctrl+C)
npm run dev
```

Then test the connection:

```bash
# Test rate limiting is working
curl -X POST http://localhost:3000/api/test/extract \
  -H "Content-Type: application/json" \
  -d '{"content": "test", "newsletterName": "test"}'
```

## Free Tier Limits

Upstash free tier includes:
- **10,000 commands per day** (more than enough for development)
- **256 MB storage**
- **No credit card required**
- **Perfect for development and testing**

## Rate Limiting Configuration

The app uses Upstash for rate limiting with these defaults:

```typescript
// lib/security/rate-limiting.ts
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"), // 10 requests per 10 seconds
  analytics: true,
  prefix: "@upstash/ratelimit",
});
```

You can adjust these settings based on your needs:
- **Development**: 10 requests per 10 seconds (default)
- **Production**: Consider 5 requests per 10 seconds for public APIs
- **Internal APIs**: Can be higher, like 30 requests per 10 seconds

## Alternative: Local Redis (Optional)

If you prefer running Redis locally instead of using Upstash:

### Option 1: Docker
```bash
# Run Redis in Docker
docker run -d -p 6379:6379 redis:alpine

# Update .env.local
REDIS_URL=redis://localhost:6379
```

### Option 2: Homebrew (macOS)
```bash
# Install Redis
brew install redis

# Start Redis
brew services start redis

# Update .env.local
REDIS_URL=redis://localhost:6379
```

### Option 3: Redis Stack
```bash
# Run Redis Stack with RedisInsight GUI
docker run -d \
  -p 6379:6379 \
  -p 8001:8001 \
  redis/redis-stack:latest
```

Then modify the rate limiting code to use local Redis instead of Upstash.

## Troubleshooting

### "Connection refused" error
- Check that your Upstash URL and token are correct
- Ensure there are no extra spaces or quotes in the environment variables
- Try regenerating the token in Upstash console

### "Rate limit exceeded" error
- This means rate limiting is working!
- Wait a few seconds between requests
- Or temporarily increase limits in development

### "Invalid token" error
- Make sure you copied the entire token (they're quite long)
- Check for any line breaks in the token
- Regenerate the token if needed

## Testing After Setup

Once configured, test the complete pipeline:

```bash
# 1. Test rate limiting
for i in {1..15}; do
  curl -X GET http://localhost:3000/api/test/gmail
  echo ""
done
# Should see rate limit errors after 10 requests

# 2. Test email fetching
curl -X POST http://localhost:3000/api/test/gmail

# 3. Test extraction
node scripts/test-extraction.js

# 4. Run full Puppeteer test suite
npm run test:puppeteer
```

## Security Notes

⚠️ **Important**:
- Never commit Upstash credentials to git
- Keep `.env.local` in `.gitignore`
- Use different Redis instances for development and production
- Rotate tokens periodically for security
- Monitor usage in Upstash dashboard to detect unusual activity

## Next Steps

After setting up Upstash Redis:

1. **Test the extraction API** works without fetch errors
2. **Verify rate limiting** is protecting your endpoints
3. **Check caching** improves performance
4. **Run the full pipeline** to extract companies from newsletters
5. **Monitor usage** in Upstash dashboard

The free tier is perfect for development and will handle thousands of requests per day!