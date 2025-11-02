# Deployment Guide

This guide outlines how to deploy the Substack Intelligence platform to the managed production environment (Vercel + Supabase) and how to promote releases between environments.

## Prerequisites

* Vercel account with access to the project.
* Supabase project with service and anon keys.
* Clerk, Stripe, Anthropic, Resend, and Google OAuth credentials.
* `pnpm` installed locally and Supabase CLI authenticated (`supabase login`).

## Environments

| Environment | Purpose | Branch |
| --- | --- | --- |
| Preview | Feature validation | Pull Requests |
| Staging | Pre-production smoke tests | `main` (protected) |
| Production | Live users | `production` tag |

## Deployment Workflow

1. **Run Tests** – `pnpm lint && pnpm test` before opening a pull request.
2. **Create PR** – Merge to `main` once approved; Vercel automatically creates a preview URL for each PR.
3. **Promote to Staging** – Merge to `main`. Vercel deploys to the staging environment using environment variables prefixed with `STAGING_`.
4. **Promote to Production** – Tag the commit: `git tag production-YYYYMMDD && git push origin production-YYYYMMDD`. Vercel promotes the associated build to production.

## Environment Variables

Set the following variables in Vercel and Supabase. Keep values in sync across environments:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_KEY
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
ANTHROPIC_API_KEY
OPENAI_API_KEY (optional for fallback)
RESEND_API_KEY
GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN
STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_ENABLE_TEST_ROUTES=false (production)
```

Store secrets using Vercel's dashboard or `vercel env`. Never commit `.env.local` files.

## Database Migrations

1. Pull latest migrations: `pnpm install` (workspace will install Supabase CLI hooks).
2. Apply migrations locally: `supabase db push`.
3. Generate types: `pnpm db:generate`.
4. Deploy migrations to Supabase via CI or manually with `pnpm db:migrate`.

Always back up the database before running destructive migrations. See [DATABASE.md](./DATABASE.md) for backup notes.

## Rollbacks

* Vercel retains previous deployments; use the dashboard to "Promote" a previous build.
* Restore Supabase from a point-in-time backup if a migration fails. After restoration, redeploy the last known good Vercel build to align application and schema versions.

## Monitoring

* **Axiom**: View logs and alerts for ingestion/extraction workers. Configure alerts on error rate and latency spikes.
* **Supabase Insights**: Monitor slow queries and replication lag.
* **Stripe Dashboard**: Monitor webhook delivery status.

Document any deviations from this process in the changelog and notify the team in the #deployments channel.
