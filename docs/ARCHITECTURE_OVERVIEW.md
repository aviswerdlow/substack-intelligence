# Architecture Overview

**Generated:** 2025-11-02
**Status:** Living Document
**Last Updated:** 2025-11-02

## Executive Summary

Substack Intelligence is a monorepo-based AI-powered venture intelligence platform designed for consumer VC deal sourcing. The project uses a modular architecture with workspaces for apps, packages, and services, orchestrated via Turborepo and pnpm workspaces.

## Project Structure

### Monorepo Layout

```
substack-intelligence/
├── apps/                   # User-facing applications
│   ├── web/               # Next.js 14 dashboard application
│   └── email/             # React Email templates
├── packages/              # Shared libraries
│   ├── ai/               # AI/ML integrations (Anthropic, OpenAI)
│   ├── database/         # Supabase client & types
│   └── shared/           # Common utilities and types
├── services/             # Backend microservices
│   ├── enrichment/       # Company data enrichment
│   ├── ingestion/        # Email processing & parsing
│   └── reports/          # Report generation & delivery
└── supabase/            # Database migrations & functions
```

### Workspace Configuration

**Package Manager:** pnpm 8.15.6 (Workspace mode)
**Build System:** Turborepo 1.10.12
**Node Version:** >=18.0.0

#### Workspaces (9 total)

**Applications (2):**
- `apps/email` - Email template library using React Email
- `apps/web` - Main Next.js 14 application with App Router

**Packages (3):**
- `@substack-intelligence/ai` - AI provider abstractions
- `@substack-intelligence/database` - Supabase data layer
- `@substack-intelligence/shared` - Cross-package utilities

**Services (3):**
- `@substack-intelligence/enrichment` - Company enrichment service
- `@substack-intelligence/ingestion` - Email ingestion pipeline
- `@substack-intelligence/reports` - PDF/email report generation

**Infrastructure:**
- Root workspace with shared development dependencies

## Technology Stack

### Frontend Stack
- **Framework:** Next.js 14.2.25 (App Router)
- **UI Library:** React 18.3.1
- **UI Components:** Radix UI primitives
- **Styling:** Tailwind CSS 3.3
- **State Management:** TanStack Query 5.59.3
- **Authentication:** Clerk 6.31.4
- **Type Safety:** TypeScript 5.2.2, Zod 3.22.4

### Backend Stack
- **Runtime:** Node.js 18+
- **API Framework:** Next.js API Routes
- **Database:** Supabase (PostgreSQL with pgvector)
- **AI Services:**
  - Anthropic Claude SDK 0.60.0
  - OpenAI SDK 4.20.1
- **Email Processing:**
  - Cheerio 1.0.0-rc.12 (HTML parsing)
  - JSDOM 26.1.0 (DOM manipulation)
  - Google APIs 126.0.1 (Gmail OAuth)
- **Caching/Rate Limiting:** Upstash Redis 1.25.1

### Infrastructure & DevOps
- **Hosting:** Vercel
- **Database:** Supabase (managed PostgreSQL)
- **CI/CD:** Turborepo pipelines
- **Testing:**
  - Vitest 3.2.4 (unit tests)
  - Playwright 1.55.0 (E2E tests)
- **Monitoring:** Axiom (axiomhq/js 1.3.1)
- **Email Delivery:** Resend 2.1.0

## Architectural Patterns

### 1. Workspace Dependencies

**Dependency Graph:**
```
apps/web
├── @substack-intelligence/ai
│   ├── @substack-intelligence/database
│   └── @substack-intelligence/shared
├── @substack-intelligence/ingestion
│   ├── @substack-intelligence/database
│   └── @substack-intelligence/shared
├── @substack-intelligence/database
└── @substack-intelligence/shared

services/reports
├── @substack-intelligence/email
├── @substack-intelligence/database
└── @substack-intelligence/shared

services/ingestion
├── @substack-intelligence/database
└── @substack-intelligence/shared

services/enrichment
└── @substack-intelligence/database

apps/email
└── @substack-intelligence/shared
```

### 2. Build Pipeline (Turborepo)

**Pipeline Configuration:**
- **build:** Dependent builds with caching
- **dev:** Persistent, no cache
- **type-check:** Depends on ^build
- **test:** Depends on ^build
- **test:e2e:** Depends on build
- **lint:** Independent

**Global Dependencies:** `.env.*local` files

### 3. Data Flow Architecture

```
Gmail API → Ingestion Service → Supabase (Raw Emails)
                ↓
        AI Extraction (Claude/GPT)
                ↓
        Supabase (Companies, Mentions)
                ↓
        Web Dashboard ← Database Package
                ↓
        Report Service → PDF/Email Delivery
```

### 4. Database Architecture

**Platform:** Supabase (PostgreSQL 15+ with extensions)

**Key Extensions:**
- `uuid-ossp` - UUID generation
- `vector` - pgvector for embeddings (1536 dimensions)

**Core Tables:**
- `emails` - Raw email data with full-text search
- `companies` - Company entities with vector embeddings
- `company_mentions` - Junction table for email-company relationships
- `user_settings` - User preferences and OAuth tokens
- `report_history` - Generated reports tracking
- `user_api_keys` - API key management
- `user_webhooks` - Webhook configurations

**Advanced Features:**
- Vector similarity search (IVFFlat index)
- Full-text search (GIN indexes)
- Row-level security (RLS) policies
- Automatic trigger-based analytics updates

## Service Boundaries

### Web Application (`apps/web`)
**Responsibility:** User interface, authentication, API orchestration

**Key Features:**
- 100+ API routes (Next.js App Router)
- Real-time dashboard with TanStack Query
- OAuth flow management (Gmail, Google)
- PDF export and report generation
- E2E testing with Playwright

**External Integrations:**
- Clerk (authentication)
- Upstash (rate limiting)
- Axiom (monitoring)
- Supabase (data)

### Ingestion Service (`services/ingestion`)
**Responsibility:** Email fetching, parsing, and preprocessing

**Key Features:**
- Gmail API integration
- HTML-to-text extraction (Cheerio)
- Batch processing with p-map
- Error handling and retry logic

**Dependencies:**
- Google Auth Library 10.3.0
- googleapis 126.0.1
- cheerio 1.0.0-rc.12

### AI Package (`packages/ai`)
**Responsibility:** AI provider abstraction and prompt management

**Key Features:**
- Multi-provider support (Anthropic, OpenAI)
- Rate limiting with Upstash
- Structured output validation (Zod)
- Company extraction from text

**Dependencies:**
- @anthropic-ai/sdk 0.60.0
- openai 4.20.1
- @upstash/ratelimit 0.4.4

### Enrichment Service (`services/enrichment`)
**Responsibility:** Company data enrichment and validation

**Status:** Early stage (minimal dependencies)

**Dependencies:**
- @substack-intelligence/database
- zod 3.22.0

### Reports Service (`services/reports`)
**Responsibility:** Report generation and email delivery

**Key Features:**
- PDF generation (@react-pdf/renderer)
- Email templating (React Email)
- Puppeteer for complex rendering
- Resend integration

**Dependencies:**
- puppeteer 21.5.2
- @react-pdf/renderer 3.1.14
- resend 2.1.0

### Database Package (`packages/database`)
**Responsibility:** Data access layer and type safety

**Key Features:**
- Supabase client wrapper
- Auto-generated TypeScript types
- SSR support (@supabase/ssr)
- Centralized query functions

**Build Requirement:** Must build before other packages (postinstall hook)

### Shared Package (`packages/shared`)
**Responsibility:** Common utilities and validation schemas

**Key Features:**
- Zod schemas for shared types
- Utility functions
- Constants and enums

## Security Architecture

### Authentication & Authorization
- **User Auth:** Clerk (JWT-based)
- **Database Auth:** Supabase RLS policies
- **API Keys:** SHA-256 hashed, stored in `user_api_keys`
- **Webhooks:** HMAC signature verification

### Row-Level Security (RLS)
- All tables have RLS enabled
- Service role bypasses RLS
- User-scoped queries via `auth.uid()`

### Environment Configuration
- Multi-environment support (dev/staging/prod)
- Validation scripts (`scripts/setup-environment.js`)
- Secrets management via environment variables

## Performance Optimizations

### Caching Strategy
- Turborepo build cache
- Next.js ISR and SSG where applicable
- Upstash Redis for API rate limiting
- LRU cache (client-side)

### Database Optimizations
- GIN indexes for full-text search
- IVFFlat indexes for vector search (lists=100)
- Composite indexes on frequently queried columns
- Generated columns for search vectors

### Build Optimizations
- Parallel workspace builds
- Incremental type checking
- Tree-shaking with ESM
- Turbo build caching

## Deployment Architecture

### Hosting Platform: Vercel

**Build Configuration:**
- Root package.json build script
- Turborepo orchestration
- Environment variable injection
- Postinstall hooks for database types

**Environment Variables Required:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `CLERK_SECRET_KEY`
- `UPSTASH_REDIS_REST_URL`
- `RESEND_API_KEY`

### Cron Jobs (Vercel Cron)
- Daily intelligence reports
- Email processing batch jobs
- Security audits
- Cleanup tasks

## Known Limitations

1. **Puppeteer Installation:** Fails in some environments (Chrome download issues)
2. **Deprecated Dependencies:**
   - eslint 8.x (deprecated)
   - @supabase/auth-helpers-nextjs 0.10.0 (deprecated)
   - puppeteer < 24.9.0 (deprecated)
3. **Build Dependencies:** Database package must build first (enforced via postinstall)
4. **Monorepo Complexity:** Circular dependency risks (requires madge analysis)

## Future Architecture Considerations

### Scalability
- Separate ingestion service to standalone deployment
- Implement message queue (e.g., BullMQ, Inngest)
- Add Redis caching layer for hot data
- Consider edge functions for global performance

### Multi-Tenancy
- Enhance RLS policies for user isolation
- Implement organization-level grouping
- Add resource quotas per tenant

### Microservices Evolution
- Extract enrichment service to separate API
- Add dedicated search service (Algolia/Meilisearch)
- Implement event-driven architecture

## Maintenance Notes

### Critical Scripts
- `pnpm env:validate` - Validate environment configuration
- `pnpm db:generate` - Regenerate database types
- `pnpm security:audit` - Check for vulnerabilities
- `pnpm validate:api-routes` - Validate API routes

### Development Workflow
1. Install dependencies: `pnpm install`
2. Generate env files: `pnpm env:dev`
3. Run development: `pnpm dev`
4. Type check: `pnpm type-check`
5. Run tests: `pnpm test`

### Common Issues
- **Build failures:** Ensure database package builds first
- **Type errors:** Run `pnpm db:generate` to sync DB types
- **Environment issues:** Run `pnpm env:validate`

## References

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Supabase Documentation](https://supabase.com/docs)
- [pnpm Workspaces](https://pnpm.io/workspaces)

---

**Document Owner:** Engineering Team
**Review Cycle:** Quarterly or on major architectural changes
