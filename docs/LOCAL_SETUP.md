# Local Development Setup Guide

## Overview

This guide helps you set up the Substack Intelligence platform for local development. The application is designed to work with varying levels of configuration, from minimal setup to full feature availability.

## Quick Start (Minimal Setup)

For basic local development, you only need:

1. **Database Configuration** (Required)
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_KEY=your-service-key
   ```

2. **Copy Environment Template**
   ```bash
   cp .env.example .env.local
   ```

3. **Install Dependencies**
   ```bash
   pnpm install
   ```

4. **Apply Supabase Migrations**
   ```bash
   pnpm run db:migrate
   ```
   > This pushes the latest schema (including the required `user_id` columns and RLS policies) to your linked Supabase project. If the CLI is unavailable, follow `manual-migration-instructions.md` to run the SQL files from the dashboard.

5. **Start Development Server**
   ```bash
   pnpm dev
   ```

## Health Check Status Levels

The application health endpoint (`/api/health`) reports three possible states:

### 🟢 Healthy
- All required services configured and responding
- Database connection successful
- All critical environment variables present and valid

### 🟡 Degraded
- Application functional but some services unavailable
- Missing optional environment variables
- Non-critical service failures

### 🔴 Unhealthy
- Critical services failing
- Database connection errors (when configured)
- Missing required environment variables

## Environment Configuration Tiers

### Tier 1: Minimal (Database Only)
**Status**: Application runs with limited features

```env
# Database (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
```

### Tier 2: Basic (Database + Auth)
**Status**: User authentication enabled

```env
# Previous tier plus...

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

### Tier 3: Standard (AI Features)
**Status**: Full AI capabilities

```env
# Previous tiers plus...

# AI Services
ANTHROPIC_API_KEY=sk-ant-api03-...
OPENAI_API_KEY=sk-... # Optional
```

### Tier 4: Enhanced (Email + Monitoring)
**Status**: Email notifications and monitoring

```env
# Previous tiers plus...

# Email Services
RESEND_API_KEY=re_...
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=...

# Monitoring
AXIOM_TOKEN=xaat-...
AXIOM_DATASET=substack-intelligence
```

### Tier 5: Complete (All Features)
**Status**: Production-ready with all features

```env
# Previous tiers plus...

# Caching & Rate Limiting
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...

# Security
ENCRYPTION_KEY=exactly-32-character-key-here
CRON_SECRET=your-32-char-secret

# Background Jobs
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...
```

## Troubleshooting Health Check Issues

### "Database client not configured"
**Cause**: Missing Supabase environment variables
**Solution**: Add minimal database configuration (Tier 1)

### "Connection failed" or "Connection timeout"
**Cause**: Database is configured but unreachable
**Solution**: 
- Verify Supabase URL is correct
- Check network connectivity
- Ensure service key is valid

### "Missing required environment variables"
**Cause**: Critical services not configured
**Solution**: Check health endpoint response for specific missing variables

### Tests Passing but Health Check Failing
**Cause**: Tests mock environment variables and database connections
**Solution**: This is expected behavior - tests run in isolation with mocked services

## Running Without Full Configuration

The application is designed to gracefully degrade when services are unavailable:

1. **No Database**: Health check reports "degraded", core features unavailable
2. **No Auth**: Public access only, no user management
3. **No AI**: AI features disabled, manual processing only
4. **No Email**: Notifications disabled, logs only
5. **No Monitoring**: Local logging only, no external telemetry

## Development Tips

### Check Current Configuration Status
```bash
curl http://localhost:3000/api/health | jq
```

### Validate Environment Variables
```bash
pnpm env:validate
```

### Generate Minimal .env File
```bash
pnpm env:generate
```

### Test with Different Configurations
```bash
# Minimal setup
NODE_ENV=development pnpm dev

# Test mode (all mocked)
NODE_ENV=test pnpm dev

# Production-like
NODE_ENV=production pnpm build && pnpm start
```

## Security Considerations

⚠️ **Never commit `.env.local` or any file containing real credentials**

For local development:
- Use test/development API keys when available
- Create a separate Supabase project for development
- Use Clerk's test mode for authentication
- Set `DEBUG=true` for detailed error messages

## Getting Help

If health checks continue to fail:

1. Check the detailed health response:
   ```bash
   curl -v http://localhost:3000/api/health
   ```

2. Review application logs for specific errors

3. Ensure all required services are running:
   - Supabase project is active
   - API keys are valid and not expired
   - Network allows outbound HTTPS connections

4. Run integration tests to identify issues:
   ```bash
   pnpm test:integration
   ```

## Next Steps

Once your local environment is running:

1. Visit http://localhost:3000 to access the application
2. Check http://localhost:3000/api/health for system status
3. Use the monitoring dashboard at http://localhost:3000/api/monitoring/health
4. Configure additional services as needed for your development tasks