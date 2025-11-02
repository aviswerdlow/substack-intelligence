# Issue #3: Audit Current Project Structure and Dependencies

**Priority:** 🟡 High
**Type:** Analysis
**Estimated Time:** 3-4 hours
**Sprint:** Foundation Sprint

## Description
Comprehensive audit of the current monorepo structure, dependencies, and architecture to inform migration decisions.

## Current State
- Monorepo structure with unknown number of apps/packages
- Mixed dependency management
- Unclear service boundaries

## Acceptance Criteria
- [ ] Complete inventory of all packages/apps in monorepo
- [ ] Dependency graph documented
- [ ] List of all external services (Supabase, etc.)
- [ ] Database schema documented
- [ ] API routes inventory completed
- [ ] Tech stack analysis document created

## Dependencies
**Blocks:** Issue #4 (Document Features), Issue #5 (Research Payload CMS)
**Blocked by:** Issue #1 (Package Manager), Issue #2 (Clean Artifacts)

## Technical Implementation
1. **Analyze monorepo structure**
   ```bash
   # List all workspaces
   pnpm list -r --depth 0

   # Generate dependency graph
   npx madge --circular --extensions ts,tsx,js,jsx apps/web/src
   ```

2. **Document findings in markdown**
   ```markdown
   ## Project Structure Audit

   ### Monorepo Packages
   - apps/web: [description]
   - packages/[name]: [description]

   ### Dependencies
   - Production: [list]
   - Development: [list]

   ### External Services
   - Supabase: [tables, auth, storage]
   - Vercel: [deployment config]

   ### API Routes
   - /api/[route]: [purpose]
   ```

3. **Create technical debt inventory**
   - Outdated dependencies
   - Security vulnerabilities
   - Performance bottlenecks
   - Code duplication

## Human Actions Required
- [ ] **PROVIDE:** Supabase access credentials for schema export
- [ ] **PROVIDE:** List of known external service integrations
- [ ] Review and validate audit findings
- [ ] Prioritize technical debt items

## Deliverables
- [ ] `/docs/ARCHITECTURE.md`
- [ ] `/docs/DEPENDENCIES.md`
- [ ] `/docs/DATABASE_SCHEMA.md`
- [ ] `/docs/API_INVENTORY.md`
- [ ] `/docs/TECHNICAL_DEBT.md`

## Labels
`analysis`, `documentation`, `architecture`

## Related Files
- `/package.json`
- `/apps/*/package.json`
- `/packages/*/package.json`
- Database migration files
- API route files