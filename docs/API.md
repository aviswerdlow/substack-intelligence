# API Reference

The Next.js App Router co-locates HTTP handlers under `apps/web/app/api`. This guide provides a concise reference for the APIs exposed by the Substack Intelligence platform.

## Authentication

All routes require either:

* A valid Clerk session (browser interactions).
* A service token issued via Supabase (server-to-server integrations).

Public health and diagnostic routes are explicitly marked.

## Core Domains

### Intelligence Pipeline

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/pipeline/run` | `POST` | Manually trigger the intelligence pipeline via Inngest. Requires `pipeline:run` role. |
| `/api/pipeline/status` | `GET` | Returns ingestion, extraction, and enrichment job state. |
| `/api/pipeline/health` | `GET` | Health summary for pipeline workers. |

### Content & Insights

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/companies` | `GET` | Paginated list of tracked companies with metadata and engagement scores. Supports filtering by sector, tags, and pipeline stage. |
| `/api/companies/[id]` | `GET` | Fetch a specific company record, including mentions and enrichment fields. |
| `/api/newsletters` | `GET` | Retrieve newsletter issues with processing status and extraction confidence. |
| `/api/search` | `POST` | Vector similarity search across company embeddings. Expects `{ "query": string, "limit": number }`. |

### Reports & Notifications

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/reports/daily` | `GET` | Generate the latest daily intelligence report. Optional `format=csv`. |
| `/api/reports/subscribe` | `POST` | Subscribe the authenticated user to email reports. |
| `/api/alerts/test` | `POST` | Send a test alert to verify notification wiring. |

## Error Handling

* All responses follow a standard envelope: `{ "data": T | null, "error": string | null }`.
* Validation errors return `400` with details; unauthorised access returns `401` or `403`.
* Pipeline operations surface Inngest run IDs to simplify log correlation.

## Pagination & Filtering

Paginated routes accept `page`, `pageSize`, and `orderBy` query parameters. Filters follow the `filter[field]=value` convention. See `packages/shared/api/pagination.ts` for helpers.

## Webhooks

Stripe and Supabase webhooks live under `/api/stripe/*` and `/api/webhooks/supabase`. They validate signatures using secrets stored in Vercel environment variables.

## Testing Endpoints

Local smoke tests are provided for critical integrations:

```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/test/gmail
curl http://localhost:3000/api/test/extract
```

The `/api/test/*` routes are gated behind the `NEXT_PUBLIC_ENABLE_TEST_ROUTES` flag to prevent exposure in production.

## Extending the API

1. Create a new route under `apps/web/app/api/<namespace>/route.ts`.
2. Use `withAuth` middleware from `packages/shared/auth` to enforce authentication.
3. Validate payloads with Zod schemas stored alongside the handler.
4. Add integration tests under `tests/api` and update this document.

Keep this reference updated as endpoints change. For a generated list of every route, refer to [API Routes Inventory](./API_ROUTES_INVENTORY.md).
