# Environment Configuration Guide

## Overview

This guide explains how to set up environment variables for the Substack Intelligence platform.

## Quick Start

1. Copy the example environment file:
```bash
cp .env.example .env.local
```

2. Fill in the required values in `.env.local`

3. Validate your configuration:
```bash
pnpm run env:validate
```

## Required Environment Variables

### 🗄️ Database (Supabase)

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

**How to get these:**
1. Create a project at [supabase.com](https://supabase.com)
2. Go to Settings → API
3. Copy the URL and keys

### 🔐 Authentication (Clerk)

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxx
CLERK_SECRET_KEY=sk_live_xxxxx
```

**How to get these:**
1. Create an application at [clerk.com](https://clerk.com)
2. Go to API Keys
3. Copy the keys

### 🤖 AI Services

```env
ANTHROPIC_API_KEY=sk-ant-xxxxx
```

**How to get this:**
1. Create an account at [anthropic.com](https://anthropic.com)
2. Go to API settings
3. Generate an API key

### 🔒 Security

```env
ENCRYPTION_KEY=your-32-character-encryption-key-here
```

**How to generate:**
```bash
openssl rand -base64 32 | cut -c1-32
```

## Optional Environment Variables

### 📧 Email Service (Resend)

```env
RESEND_API_KEY=re_xxxxx
```

### 📊 Monitoring (Axiom)

```env
AXIOM_TOKEN=xaat-xxxxx
AXIOM_DATASET=substack-intelligence
```

### ⚡ Rate Limiting (Upstash Redis)

```env
UPSTASH_REDIS_REST_URL=https://xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxxxx
```

## Environment-Specific Configuration

### Development

Use `.env.local` with placeholder values for optional services:
```env
NODE_ENV=development
DEBUG=true
ENABLE_MONITORING=false
```

### Staging

Use `.env.staging` with test service credentials:
```env
NODE_ENV=staging
DEBUG=false
ENABLE_MONITORING=true
```

### Production

Configure in Vercel Dashboard:
1. Go to Project Settings → Environment Variables
2. Add all required variables
3. Use production API keys and credentials

## Validation

Run the validation script to ensure all required variables are set:

```bash
# Validate current environment
pnpm run env:validate

# Generate environment file
pnpm run env:generate

# Check for secrets in code
pnpm run env:secrets
```

## Security Best Practices

1. **Never commit `.env.local` files** - They're gitignored for a reason
2. **Use different credentials** for development, staging, and production
3. **Rotate secrets regularly** - Especially after team member changes
4. **Use secure generation** for secrets and keys
5. **Limit access** - Only give team members the credentials they need

## Troubleshooting

### Missing Environment Variables

If you see errors about missing environment variables:

1. Check `.env.local` exists and is properly formatted
2. Ensure no quotes around values unless they contain spaces
3. Restart the development server after changes
4. Run `pnpm run env:validate` to identify issues

### Invalid Values

Common issues:

- **ENCRYPTION_KEY wrong length**: Must be exactly 32 characters
- **URLs missing protocol**: Include `https://` or `http://`
- **Keys with wrong prefix**: Check if it should be `pk_`, `sk_`, etc.

### Vercel Deployment

For Vercel deployments:

1. Add variables in Vercel Dashboard → Settings → Environment Variables
2. Set appropriate environment scope (Production/Preview/Development)
3. Redeploy after adding/changing variables

## Environment Variable Reference

See `.env.example` for a complete list of all environment variables with descriptions.

## Support

If you're having issues with environment setup:

1. Check this guide and `.env.example`
2. Run `pnpm run env:validate` for diagnostics
3. Check GitHub Issues for similar problems
4. Ask in the team Slack channel