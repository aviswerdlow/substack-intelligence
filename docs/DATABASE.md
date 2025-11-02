# Database Overview

The platform uses Supabase (PostgreSQL 15) with pgvector for semantic search and row-level security (RLS) to enforce tenant isolation. This document captures the schema highlights, migration workflow, and maintenance notes.

## Core Tables

| Table | Purpose |
| --- | --- |
| `newsletters` | Stores raw Substack newsletter metadata and processing state. |
| `newsletter_messages` | Normalised email content and parsed HTML/plain text. |
| `company_mentions` | Extracted companies, including confidence scores and deal attributes. |
| `companies` | Canonical company profiles enriched with external data. |
| `pipeline_events` | Audit log for ingestion, extraction, and enrichment runs. |
| `user_settings` | Feature flags and notification preferences scoped per Clerk user. |

Vector embeddings live in `company_embeddings`, keyed by `company_id`.

## Relations

* `company_mentions.newsletter_id → newsletters.id`
* `company_mentions.company_id → companies.id`
* `pipeline_events.newsletter_id → newsletters.id`
* `user_settings.user_id` aligns with Clerk user IDs for RLS policies.

Refer to [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) for a full entity-relationship diagram and SQL definitions.

## Migrations

* Managed via Supabase CLI and SQL files in `infrastructure/supabase/migrations`.
* `pnpm db:migrate` pushes the latest schema to the linked project.
* TypeScript types are generated with `pnpm db:generate` and committed to `packages/database`.
* For manual dashboards, follow `manual-migration-instructions.md` to apply SQL scripts directly in Supabase.

## Row-Level Security

RLS is enabled on user-facing tables. Policies ensure a user only sees data for organisations they are a member of. Service roles (used by background workers) authenticate with the Supabase service key to bypass RLS when necessary.

## Backups & Maintenance

* Supabase automated backups run nightly; confirm retention via the project dashboard.
* Create restoration points before large migrations using `supabase db backup`.
* Monitor slow queries through Supabase Insights and add indexes using the migration workflow.

Keep this document updated when the schema evolves or when new operational procedures are introduced.
