# Architecture Guide

The Substack Intelligence platform is a distributed Next.js monorepo that ingests Substack newsletters, extracts venture insights with AI, and publishes structured intelligence to downstream consumers. This document captures the current architectural baseline so contributors understand how the pieces fit together.

## System Overview

```
┌────────────────────────┐      ┌──────────────────┐
│ Gmail Ingestion Worker │────▶ │  Supabase Queue  │
└────────────────────────┘      └────────┬─────────┘
                                         │
                                         ▼
┌────────────────────────┐      ┌──────────────────┐
│ Claude Extraction Svc  │────▶ │  Vector Store    │
└────────────────────────┘      └────────┬─────────┘
                                         │
                                         ▼
┌────────────────────────┐      ┌──────────────────┐
│  Enrichment Service    │────▶ │  Web Dashboard   │
└────────────────────────┘      └──────────────────┘
```

* **Apps**: The `apps/web` Next.js 14 application exposes UI dashboards and API routes. `apps/email` stores transactional email templates.
* **Services**: Workers in `services/ingestion`, `services/extraction`, and `services/enrichment` orchestrate the daily newsletter pipeline.
* **Packages**: Shared TypeScript libraries in `packages/database`, `packages/ai`, and `packages/shared` encapsulate Supabase access, LLM utilities, and cross-cutting helpers.
* **Infrastructure**: The `infrastructure/` folder holds IaC assets and monitoring configuration. Supabase hosts the Postgres database with row-level security and vector search.

## Data Flow

1. **Ingestion** – Gmail API pulls new Substack newsletters using service accounts. Messages are stored in Supabase storage and queued for processing via Inngest.
2. **Extraction** – Claude 3 processes email content, extracting company mentions, deal metrics, and metadata. Structured results are persisted in Supabase tables (`company_mentions`, `newsletters`, `pipeline_events`).
3. **Enrichment** – Additional data is fetched (e.g., Crunchbase, LinkedIn) and normalised. Vector embeddings are generated for semantic discovery.
4. **Delivery** – The web application surfaces dashboards, search, and alerts via real-time Supabase subscriptions. Email reports and CSV exports are generated from the same data.

## Architectural Decisions

* **App Router**: We adopted Next.js App Router for server-side rendering, streaming, and colocation of API routes with UI segments.
* **Supabase**: Combines Postgres, storage, and authentication. Row Level Security policies enforce per-user data access.
* **Edge-first**: Critical API routes deploy to Vercel Edge Functions for low-latency responses; long-running jobs execute as background services using Inngest.
* **Observability**: Axiom centralises logs from workers and Next.js functions. Alerts trigger on ingestion failures or extraction accuracy degradation.

## Workspace Structure

```
substack-intelligence/
├── apps/
│   ├── web/            # Next.js 14 app router
│   └── email/          # React Email templates
├── packages/
│   ├── ai/             # Claude + OpenAI wrappers
│   ├── database/       # Supabase client + queries
│   └── shared/         # Cross-cutting utilities & types
├── services/
│   ├── ingestion/      # Gmail polling + queue dispatch
│   ├── extraction/     # LLM processing pipeline
│   └── enrichment/     # Third-party data enrichment
└── infrastructure/
    ├── supabase/       # Migrations + RLS policies
    └── monitoring/     # Observability + runbooks
```

## Integration Points

* **Authentication** – Clerk provides hosted authentication. Tokens are exchanged in Next.js middleware for Supabase session creation.
* **Payments** – Stripe manages subscriptions; webhook handlers live under `apps/web/app/api/stripe/*`.
* **Notifications** – Email notifications rely on React Email templates with Resend delivery.
* **Search** – Vector similarity search uses Supabase pgvector. The `packages/database` layer exposes typed search functions.

## Future Work

* Complete ADRs for ingestion and enrichment strategies.
* Automate OpenAPI specification generation for API routes.
* Evaluate moving background services to Vercel Cron + Edge Functions for simplified ops.

Keep this guide updated whenever major architectural changes land.
