# Troubleshooting Guide

A collection of common issues and how to resolve them when working on Substack Intelligence.

## Development Environment

### `supabase start` fails with port conflict

* Stop any existing Docker containers using ports `54321`, `54322`, or `54323`.
* Run `supabase stop` to clean up stray resources, then retry `supabase start`.

### Next.js fails to start (`error: ENOENT .env.local`)

* Ensure `.env.local` exists – copy from `.env.example` and provide required values.
* Verify environment variables contain no surrounding quotes.

### Gmail test routes return `401`

* Confirm Google OAuth credentials are valid and the refresh token has Gmail scopes (`https://www.googleapis.com/auth/gmail.readonly`).
* Re-run `pnpm test:gmail` after updating secrets.

## Pipeline Failures

### Ingestion job stuck in `queued`

* Check Inngest dashboard for failed runs.
* Restart the ingestion worker: `pnpm --filter services/ingestion dev`.
* Validate Supabase service role credentials in `.env.local`.

### Extraction accuracy drops

* Review Claude responses in the `pipeline_events` table.
* Ensure the Anthropic quota is not exceeded and the `ANTHROPIC_API_KEY` is active.
* Regenerate embeddings if the OpenAI fallback was triggered.

## Deployment Issues

### Vercel build fails with missing environment variables

* Re-sync secrets using `vercel env pull .env.vercel`.
* Confirm the environment variable exists for the targeted environment (preview/staging/prod).

### Stripe webhooks failing (status 400)

* Confirm `STRIPE_WEBHOOK_SECRET` matches the value shown in the Stripe dashboard.
* Verify the webhook endpoint is deployed and accessible (`/api/stripe/webhook`).
* Check logs in the Vercel dashboard for error details.

## Getting Help

* Search the repository issues for similar problems.
* Ask in #engineering with relevant logs, screenshots, and reproduction steps.
* Update this guide with any new fixes discovered.
