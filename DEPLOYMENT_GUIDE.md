# Substack Intelligence Platform - Deployment Guide

## Overview
This guide covers deploying the Substack Intelligence Platform to production using Vercel, Supabase, and other cloud services.

## Prerequisites

### Required Accounts
1. **Vercel** - https://vercel.com (hosting & serverless functions)
2. **Supabase** - https://supabase.com (database & auth)
3. **Clerk** - https://clerk.com (authentication)
4. **Anthropic** - https://console.anthropic.com (Claude AI)
5. **OpenAI** - https://platform.openai.com (embeddings)
6. **Google Cloud** - https://console.cloud.google.com (Gmail API)
7. **Resend** - https://resend.com (email delivery)

### Optional Services (Enhanced Features)
- **Upstash** - https://console.upstash.com (Redis cache)
- **Axiom** - https://axiom.co (logging & monitoring)
- **Inngest** - https://inngest.com (workflow orchestration)

---

## Step 1: Database Setup (Supabase)

### 1.1 Create Project
```bash
# Visit https://supabase.com/dashboard
# Click "New Project"
# Choose organization and project name: "substack-intelligence"
# Select region closest to your users
# Generate strong database password
```

### 1.2 Run Migrations
```bash
# Clone the repository
git clone <your-repo-url>
cd substack-intelligence

# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref <your-project-ref>

# Run migrations
supabase db push
```

### 1.3 Enable Extensions
In the Supabase dashboard, go to Database > Extensions and enable:
- `uuid-ossp` (already enabled by migration)
- `vector` (for semantic search)

### 1.4 Set RLS Policies
The migrations automatically set up Row Level Security policies. Verify they're enabled in the Authentication section.

---

## Step 2: Authentication Setup (Clerk)

### 2.1 Create Application
```bash
# Visit https://dashboard.clerk.com
# Click "Create Application"
# Name: "Substack Intelligence"
# Choose authentication methods: Email + Password
```

### 2.2 Configure Domains
In your Clerk dashboard:
1. Go to **Domains**
2. Add your production domain: `your-app.vercel.app`
3. Add development domain: `localhost:3000`

### 2.3 Get API Keys
From the **API Keys** section, copy:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

---

## Step 3: AI Services Setup

### 3.1 Anthropic (Claude AI)
```bash
# Visit https://console.anthropic.com
# Create API key
# Copy ANTHROPIC_API_KEY (starts with sk-ant-)
```

### 3.2 OpenAI (Embeddings)
```bash
# Visit https://platform.openai.com/api-keys
# Create new secret key
# Copy OPENAI_API_KEY (starts with sk-proj-)
```

---

## Step 4: Gmail API Setup

### 4.1 Google Cloud Console
```bash
# Visit https://console.cloud.google.com
# Create new project or select existing
# Enable Gmail API
# Create OAuth 2.0 credentials
```

### 4.2 OAuth Configuration
1. **OAuth consent screen**:
   - User Type: Internal (for personal use) or External
   - App name: "Substack Intelligence"
   - Scopes: `gmail.readonly`

2. **OAuth 2.0 Client**:
   - Application type: Web application
   - Authorized redirect URIs: `https://developers.google.com/oauthplayground`

### 4.3 Generate Refresh Token
```bash
# Use OAuth 2.0 Playground: https://developers.google.com/oauthplayground
# 1. Select Gmail API v1 > https://www.googleapis.com/auth/gmail.readonly
# 2. Click "Authorize APIs"
# 3. Sign in with your Gmail account
# 4. Click "Exchange authorization code for tokens"
# 5. Copy the refresh_token
```

---

## Step 5: Email Service Setup (Resend)

### 5.1 Create Account
```bash
# Visit https://resend.com
# Create account and verify email
# Go to API Keys section
# Create new API key
# Copy RESEND_API_KEY (starts with re_)
```

### 5.2 Domain Setup (Optional)
For production:
1. Add your domain in Resend dashboard
2. Verify DNS records
3. Update email templates to use your domain

---

## Step 6: Environment Variables

### 6.1 Copy Template
```bash
cp .env.example .env.local
```

### 6.2 Configure Variables
Update `.env.local` with your actual values:

```bash
# Application
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NODE_ENV=production

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_KEY=eyJhbGci...
NEXT_PUBLIC_SUPABASE_PROJECT_ID=your-project-ref

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...

# AI Services
ANTHROPIC_API_KEY=sk-ant-api03-...
OPENAI_API_KEY=sk-proj-...

# Gmail API
GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-secret
GOOGLE_REFRESH_TOKEN=1//your-refresh-token

# Email
RESEND_API_KEY=re_your-key

# Optional: Caching
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# Optional: Monitoring
AXIOM_TOKEN=xaat-your-token
AXIOM_ORG_ID=your-org-id

# Optional: Workflows
INNGEST_EVENT_KEY=your-event-key
INNGEST_SIGNING_KEY=signkey-your-signing-key
```

---

## Step 7: Vercel Deployment

### 7.1 Install Vercel CLI
```bash
npm install -g vercel
```

### 7.2 Login to Vercel
```bash
vercel login
```

### 7.3 Deploy
```bash
# Initial deployment
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? Your personal account
# - Link to existing project? No
# - Project name: substack-intelligence
# - In which directory is your code located? ./
# - Want to override settings? No
```

### 7.4 Set Environment Variables
```bash
# Add all environment variables to Vercel
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add SUPABASE_SERVICE_KEY
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
vercel env add CLERK_SECRET_KEY
vercel env add ANTHROPIC_API_KEY
vercel env add OPENAI_API_KEY
vercel env add GOOGLE_CLIENT_ID
vercel env add GOOGLE_CLIENT_SECRET
vercel env add GOOGLE_REFRESH_TOKEN
vercel env add RESEND_API_KEY

# Optional environment variables
vercel env add UPSTASH_REDIS_REST_URL
vercel env add UPSTASH_REDIS_REST_TOKEN
vercel env add AXIOM_TOKEN
vercel env add AXIOM_ORG_ID
vercel env add INNGEST_EVENT_KEY
vercel env add INNGEST_SIGNING_KEY
```

### 7.5 Deploy to Production
```bash
vercel --prod
```

---

## Step 8: Post-Deployment Configuration

### 8.1 Update Clerk Settings
In your Clerk dashboard:
1. Go to **Domains**
2. Add your production domain: `your-app.vercel.app`
3. Update redirect URLs in **Paths**

### 8.2 Configure Gmail Subscriptions
1. Set up your Substack newsletter subscriptions in the Gmail account
2. Ensure the account has the newsletters you want to monitor
3. Test the Gmail API connection using the `/api/test/gmail` endpoint

### 8.3 Initialize Database
```bash
# Visit your deployed app
# Sign up for an account
# The system will automatically create necessary database entries
```

### 8.4 Test Core Functions
Visit these endpoints to verify functionality:
- `/api/health` - Health check
- `/api/test/gmail` - Gmail connection test
- `/api/test/extract` - AI extraction test
- `/dashboard` - Main application

---

## Step 9: Monitoring and Maintenance

### 9.1 Set up Monitoring
If using Axiom:
1. Create project in Axiom dashboard
2. Add datasets: `events`, `errors`, `metrics`
3. Verify logs are flowing

### 9.2 Schedule Regular Tasks
The platform automatically runs:
- **Daily intelligence pipeline**: 6 AM UTC
- **Embedding processing**: Every 10 minutes
- **Database cleanup**: Weekly on Sunday 2 AM UTC

### 9.3 Monitor Performance
Check these metrics regularly:
- API response times
- Database query performance
- AI API usage and costs
- Email delivery rates

---

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify Supabase URL and keys
   - Check RLS policies are correctly set
   - Ensure migrations ran successfully

2. **Authentication Issues**
   - Verify Clerk keys and domain configuration
   - Check redirect URLs match exactly
   - Ensure user has proper permissions

3. **AI API Errors**
   - Check API key validity and format
   - Verify rate limits aren't exceeded
   - Monitor API usage in provider dashboards

4. **Gmail API Issues**
   - Verify OAuth setup and refresh token
   - Check OAuth consent screen approval
   - Ensure Gmail account has necessary permissions

5. **Email Delivery Problems**
   - Check Resend API key and domain setup
   - Verify email templates render correctly
   - Monitor delivery rates in Resend dashboard

### Debug Commands
```bash
# Check build logs
vercel logs your-app.vercel.app

# Test API endpoints
curl https://your-app.vercel.app/api/health

# Check database connection
curl -X POST https://your-app.vercel.app/api/test/db

# Verify environment variables
vercel env ls
```

### Support Resources
- **Vercel**: https://vercel.com/docs
- **Supabase**: https://supabase.com/docs
- **Clerk**: https://clerk.com/docs
- **Project Issues**: Create an issue in the repository

---

## Security Checklist

- [ ] Environment variables set in Vercel (not in code)
- [ ] Database RLS policies enabled
- [ ] API endpoints properly authenticated
- [ ] HTTPS enforced (automatic with Vercel)
- [ ] Security headers configured in vercel.json
- [ ] Regular dependency updates scheduled
- [ ] Monitoring and alerting set up
- [ ] Backup strategy for database
- [ ] Rate limiting configured for APIs

Your Substack Intelligence Platform is now ready for production! 🚀