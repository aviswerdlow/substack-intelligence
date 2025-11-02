# Developer Onboarding

Follow this guide to get a local environment running and understand the day-to-day development workflow.

## 1. Install Tooling

* Node.js 18+
* `pnpm` (workspace package manager)
* Supabase CLI (`npm install -g supabase`)
* Docker (optional, for running local Supabase)

## 2. Clone & Install

```bash
git clone git@github.com:aviswerdlow/substack-intelligence.git
cd substack-intelligence
pnpm install
```

## 3. Environment Variables

Copy the template and populate credentials (see [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md) for field descriptions).

```bash
cp .env.example .env.local
```

At minimum you need Supabase, Clerk, Anthropic, and Google API keys for ingestion. Use sandbox/test credentials in non-production environments.

## 4. Run the Stack Locally

```bash
# Start Supabase locally (requires Docker)
supabase start

# Apply migrations and generate types
supabase db push
pnpm db:generate

# Run the Next.js dev server
pnpm dev
```

The web UI is served at `http://localhost:3000`. The Supabase studio is available at `http://localhost:54323`.

## 5. Coding Standards

* TypeScript strict mode is enabled; fix all type errors before committing.
* Use ESLint and Prettier via `pnpm lint`.
* Reuse shared utilities from `packages/shared` instead of re-implementing helpers.
* Store secrets in environment variables, never in source control.

## 6. Testing

```bash
pnpm lint
pnpm test
pnpm test:api # Optional – runs API contract tests
```

Snapshot and integration tests live under `tests/`. Add regression coverage whenever you fix a bug or introduce a new feature.

## 7. Git Workflow

1. Branch from `main` with a descriptive name, e.g., `feature/pipeline-alerts`.
2. Commit frequently with meaningful messages.
3. Open a pull request and request review.
4. Use the PR checklist to confirm migrations, docs, and tests are updated.

## 8. Helpful Commands

| Command | Description |
| --- | --- |
| `pnpm dev` | Run Next.js with hot reload. |
| `pnpm lint` | ESLint + formatting checks. |
| `pnpm test` | Vitest unit tests. |
| `pnpm db:migrate` | Push migrations to linked Supabase project. |
| `pnpm db:generate` | Generate typed Supabase client. |
| `pnpm build` | Production build verification. |

Stay connected on the #engineering Slack channel for standups, deployment notifications, and incident response.
