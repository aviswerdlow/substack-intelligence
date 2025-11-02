# Issue #8: Set Up Proper Environment Configuration

**Priority:** 🔴 Critical
**Type:** Infrastructure
**Estimated Time:** 2-3 hours
**Sprint:** Foundation Sprint

## Description
Establish proper environment configuration management for local development, staging, and production environments.

## Current State
- Environment variables potentially exposed
- No clear environment separation
- Missing .env.example file

## Acceptance Criteria
- [ ] .env.example created with all required variables
- [ ] Environment validation implemented
- [ ] Secrets properly managed
- [ ] Different configs for dev/staging/prod
- [ ] Documentation updated

## Dependencies
**Blocks:** Issue #9-14 (All feature implementation)
**Blocked by:** Issue #7 (Vercel Deployment)

## Technical Implementation
1. **Create .env.example**
   ```bash
   # Authentication
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=

   # Database
   DATABASE_URL=

   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_KEY=

   # Stripe
   STRIPE_SECRET_KEY=
   STRIPE_WEBHOOK_SECRET=
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

   # Email
   RESEND_API_KEY=
   ```

2. **Add environment validation**
   ```typescript
   // lib/env.ts
   const requiredEnvVars = [
     'DATABASE_URL',
     'NEXTAUTH_SECRET',
     // etc
   ];

   export function validateEnv() {
     for (const envVar of requiredEnvVars) {
       if (!process.env[envVar]) {
         throw new Error(`Missing required environment variable: ${envVar}`);
       }
     }
   }
   ```

3. **Set up env management**
   - Use dotenv for local development
   - Vercel env for production
   - GitHub secrets for CI/CD

## Human Actions Required
- [ ] **PROVIDE:** All API keys and secrets
- [ ] **CONFIGURE:** Vercel environment variables
- [ ] **SECURE:** Production secrets in password manager
- [ ] Review and approve environment setup

## Labels
`infrastructure`, `security`, `configuration`

## Related Files
- `/.env.example`
- `/.env.local`
- `/lib/env.ts`
- `/vercel.json`