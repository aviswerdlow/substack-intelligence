# Dependencies Catalog

**Generated:** 2025-11-02
**Status:** Living Document
**Package Manager:** pnpm 8.15.6

## Table of Contents

- [Root Workspace Dependencies](#root-workspace-dependencies)
- [Apps Dependencies](#apps-dependencies)
- [Packages Dependencies](#packages-dependencies)
- [Services Dependencies](#services-dependencies)
- [Dependency Analysis](#dependency-analysis)
- [Security Audit](#security-audit)
- [Recommendations](#recommendations)

---

## Root Workspace Dependencies

### Production Dependencies

| Package | Version | Purpose | Risk Level |
|---------|---------|---------|------------|
| `@anthropic-ai/sdk` | ^0.59.0 | Anthropic Claude AI integration | Medium |
| `@supabase/supabase-js` | ^2.38.4 | Supabase database client | Low |
| `dotenv` | ^17.2.1 | Environment variable management | Low |
| `express` | ^5.1.0 | HTTP server framework | Low |
| `googleapis` | ^126.0.1 | Google API integrations (Gmail) | Medium |
| `open` | ^10.2.0 | Cross-platform opener utility | Low |
| `puppeteer` | ^21.5.2 | **DEPRECATED** Headless browser | **HIGH** |
| `tailwindcss-animate` | ^1.0.7 | Tailwind animation utilities | Low |

### Development Dependencies

| Package | Version | Purpose | Risk Level |
|---------|---------|---------|------------|
| `@turbo/gen` | ^1.10.12 | Turborepo code generation | Low |
| `@types/node` | ^20.0.0 | Node.js TypeScript types | Low |
| `@vitest/coverage-v8` | ^1.6.1 | Test coverage reporting | Low |
| `eslint` | ^8.0.0 | **DEPRECATED** Code linting | **Medium** |
| `glob` | ^11.0.3 | File pattern matching | Low |
| `husky` | ^8.0.0 | Git hooks management | Low |
| `lint-staged` | ^13.0.0 | Staged file linting | Low |
| `prettier` | ^3.0.0 | Code formatting | Low |
| `turbo` | ^1.10.12 | Build system orchestration | Low |
| `typescript` | ^5.2.2 | TypeScript compiler | Low |
| `vitest` | ^3.2.4 | Unit testing framework | Low |
| `zod` | ^4.1.0 | Schema validation (v4 at root) | Low |

---

## Apps Dependencies

### apps/web (Next.js Application)

#### Production Dependencies (65 packages)

**Core Framework:**
| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 14.2.25 | Next.js framework |
| `react` | ^18.3.1 | React library |
| `react-dom` | ^18.3.1 | React DOM renderer |

**Authentication & Security:**
| Package | Version | Purpose |
|---------|---------|---------|
| `@clerk/nextjs` | ^6.31.4 | Authentication provider |
| `crypto-js` | ^4.2.0 | Cryptographic utilities |
| `js-cookie` | ^3.0.5 | Cookie management |
| `@upstash/ratelimit` | ^0.4.4 | Rate limiting |
| `svix` | ^1.74.1 | Webhook signature verification |

**Database & State:**
| Package | Version | Purpose |
|---------|---------|---------|
| `@supabase/auth-helpers-nextjs` | ^0.10.0 | **DEPRECATED** Supabase auth |
| `@supabase/supabase-js` | ^2.38.4 | Supabase client |
| `@tanstack/react-query` | ^5.59.3 | Server state management |
| `lru-cache` | ^10.0.0 | Client-side caching |

**UI Components (Radix UI):**
| Package | Version | Purpose |
|---------|---------|---------|
| `@radix-ui/react-accordion` | ^1.2.0 | Accordion component |
| `@radix-ui/react-checkbox` | ^1.1.0 | Checkbox component |
| `@radix-ui/react-collapsible` | ^1.1.12 | Collapsible component |
| `@radix-ui/react-dialog` | ^1.1.0 | Dialog/modal component |
| `@radix-ui/react-dropdown-menu` | ^2.1.16 | Dropdown menu |
| `@radix-ui/react-label` | ^2.1.7 | Form label |
| `@radix-ui/react-popover` | ^1.1.0 | Popover component |
| `@radix-ui/react-progress` | ^1.1.0 | Progress bar |
| `@radix-ui/react-select` | ^1.2.0 | Select dropdown |
| `@radix-ui/react-slot` | ^1.2.3 | Slot composition |
| `@radix-ui/react-switch` | ^1.2.6 | Toggle switch |
| `@radix-ui/react-tabs` | ^1.1.0 | Tabs component |
| `@radix-ui/react-toast` | ^1.2.0 | Toast notifications |
| `@radix-ui/react-tooltip` | ^1.1.0 | Tooltip component |

**UI Utilities:**
| Package | Version | Purpose |
|---------|---------|---------|
| `class-variance-authority` | ^0.7.1 | CVA utility |
| `clsx` | ^2.0.0 | Class name utility |
| `tailwind-merge` | ^1.14.0 | Tailwind class merger |
| `lucide-react` | ^0.263.0 | Icon library |
| `framer-motion` | ^10.0.0 | Animation library |

**Data Visualization & Documents:**
| Package | Version | Purpose |
|---------|---------|---------|
| `recharts` | ^3.1.2 | Chart library |
| `@react-pdf/renderer` | ^3.1.14 | PDF generation |
| `file-saver` | ^2.0.5 | File download utility |

**Monitoring & Analytics:**
| Package | Version | Purpose |
|---------|---------|---------|
| `@axiomhq/js` | ^1.3.1 | Observability platform |

**Other Libraries:**
| Package | Version | Purpose |
|---------|---------|---------|
| `axios` | ^1.7.0 | HTTP client |
| `date-fns` | ^4.1.0 | Date utilities |
| `react-dropzone` | ^14.2.0 | File upload component |
| `react-hotkeys-hook` | ^4.6.2 | Keyboard shortcuts |
| `react-joyride` | ^2.5.0 | Product tours |
| `sonner` | ^2.0.7 | Toast notifications |
| `zod` | ^3.22.0 | Validation (v3 here) |

**Workspace Dependencies:**
| Package | Version |
|---------|---------|
| `@substack-intelligence/ai` | workspace:^ |
| `@substack-intelligence/database` | workspace:^ |
| `@substack-intelligence/ingestion` | workspace:^ |
| `@substack-intelligence/shared` | workspace:^ |

#### Development Dependencies (7 packages)

| Package | Version | Purpose |
|---------|---------|---------|
| `@playwright/test` | ^1.55.0 | E2E testing |
| `@types/node` | ^20.0.0 | Node types |
| `@types/react` | ^18.2.0 | React types |
| `@types/react-dom` | ^18.2.0 | React DOM types |
| `autoprefixer` | ^10.4.0 | CSS autoprefixer |
| `eslint-config-next` | ^15.5.0 | Next.js ESLint config |
| `postcss` | ^8.4.0 | CSS processing |
| `tailwindcss` | ^3.3.0 | Tailwind CSS |
| `typescript` | ^5.0.0 | TypeScript |

### apps/email (React Email Templates)

#### Production Dependencies (5 packages)

| Package | Version | Purpose |
|---------|---------|---------|
| `@react-email/components` | ^0.5.0 | Email components |
| `@react-email/render` | ^1.2.0 | Email renderer |
| `@react-email/tailwind` | ^1.2.2 | Tailwind for email |
| `react` | ^18.2.0 | React library |
| `react-dom` | ^18.2.0 | React DOM |
| `@substack-intelligence/shared` | workspace:* | Shared utilities |

#### Development Dependencies (4 packages)

| Package | Version | Purpose |
|---------|---------|---------|
| `react-email` | ^4.2.8 | Email development server |
| `@types/react` | ^18.2.37 | React types |
| `@types/react-dom` | ^18.2.15 | React DOM types |
| `typescript` | ^5.2.2 | TypeScript |

---

## Packages Dependencies

### packages/ai

#### Production Dependencies (6 packages)

| Package | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `@anthropic-ai/sdk` | ^0.60.0 | Anthropic API | Newer than root |
| `@upstash/redis` | ^1.25.1 | Redis client | |
| `@upstash/ratelimit` | ^0.4.4 | Rate limiting | |
| `openai` | ^4.20.1 | OpenAI API | |
| `zod` | ^3.22.4 | Validation | v3 here |
| `@substack-intelligence/shared` | workspace:* | Shared utilities | |
| `@substack-intelligence/database` | workspace:* | Database layer | |

#### Development Dependencies (1 package)

| Package | Version |
|---------|---------|
| `typescript` | ^5.2.2 |

### packages/database

#### Production Dependencies (3 packages)

| Package | Version | Purpose |
|---------|---------|---------|
| `@supabase/supabase-js` | ^2.38.4 | Supabase client |
| `@supabase/ssr` | ^0.0.10 | SSR support |
| `zod` | ^3.22.4 | Validation |

#### Development Dependencies (2 packages)

| Package | Version |
|---------|---------|---------|
| `@types/react` | ^18.2.37 | React types (for SSR) |
| `typescript` | ^5.2.2 | TypeScript |

#### Peer Dependencies

| Package | Version | Notes |
|---------|---------|-------|
| `next` | ^14.0.0 | Required for SSR |
| `react` | ^18.0.0 | Required for SSR |

### packages/shared

#### Production Dependencies (1 package)

| Package | Version | Purpose |
|---------|---------|---------|
| `zod` | ^3.22.4 | Schema validation |

#### Development Dependencies (1 package)

| Package | Version |
|---------|---------|---------|
| `typescript` | ^5.2.2 | TypeScript |

---

## Services Dependencies

### services/enrichment

#### Production Dependencies (2 packages)

| Package | Version | Purpose |
|---------|---------|---------|
| `@substack-intelligence/database` | workspace:* | Database access |
| `zod` | ^3.22.0 | Validation |

#### Development Dependencies (2 packages)

| Package | Version |
|---------|---------|---------|
| `@types/node` | ^20.0.0 | Node types |
| `typescript` | ^5.2.2 | TypeScript |

### services/ingestion

#### Production Dependencies (8 packages)

| Package | Version | Purpose |
|---------|---------|---------|
| `@substack-intelligence/database` | workspace:* | Database access |
| `@substack-intelligence/shared` | workspace:* | Shared utilities |
| `@supabase/supabase-js` | ^2.38.4 | Supabase client |
| `cheerio` | 1.0.0-rc.12 | HTML parsing |
| `google-auth-library` | ^10.3.0 | Google OAuth |
| `googleapis` | ^126.0.1 | Google APIs |
| `jsdom` | ^26.1.0 | DOM manipulation |
| `p-map` | ^7.0.1 | Promise mapping |
| `zod` | ^3.22.4 | Validation |

#### Development Dependencies (2 packages)

| Package | Version |
|---------|---------|---------|
| `@types/jsdom` | ^21.1.7 | JSDOM types |
| `typescript` | ^5.2.2 | TypeScript |

### services/reports

#### Production Dependencies (6 packages)

| Package | Version | Purpose |
|---------|---------|---------|
| `puppeteer` | ^21.5.2 | **DEPRECATED** PDF rendering |
| `@react-pdf/renderer` | ^3.1.14 | PDF generation |
| `react` | ^18.2.0 | React library |
| `resend` | ^2.1.0 | Email delivery |
| `@substack-intelligence/email` | workspace:* | Email templates |
| `@substack-intelligence/database` | workspace:* | Database access |
| `@substack-intelligence/shared` | workspace:* | Shared utilities |

#### Development Dependencies (2 packages)

| Package | Version |
|---------|---------|---------|
| `@types/react` | ^18.2.37 | React types |
| `typescript` | ^5.2.2 | TypeScript |

---

## Dependency Analysis

### Version Inconsistencies

**Zod Version Mismatch:**
- Root: `^4.1.0`
- Workspaces: `^3.22.0` - `^3.22.4`
- **Risk:** Potential API incompatibilities
- **Action Required:** Standardize on single major version

**@anthropic-ai/sdk Version Mismatch:**
- Root: `^0.59.0`
- packages/ai: `^0.60.0`
- **Risk:** Low (minor version difference)
- **Action:** Update root to match

### Deprecated Dependencies

**High Priority:**
1. **puppeteer 21.5.2** - Multiple instances
   - Status: Versions < 24.9.0 no longer supported
   - Location: Root, services/reports
   - Impact: Security vulnerabilities, no updates
   - Recommendation: Upgrade to 24.9.0+ or migrate to puppeteer-core

2. **eslint 8.57.1**
   - Status: No longer supported
   - Location: Root devDependencies
   - Impact: No security patches
   - Recommendation: Upgrade to ESLint 9.x

3. **@supabase/auth-helpers-nextjs 0.10.0**
   - Status: Deprecated by Supabase
   - Location: apps/web
   - Impact: No future updates
   - Recommendation: Migrate to @supabase/ssr

### Security Vulnerabilities (from pnpm audit)

**Found Issues:**
- **vite vulnerabilities:** 4 issues found in vitest dependency chain
  - Recommended: Update vite to 7.1.12
- **inquirer/tmp vulnerability:** 1 issue in @turbo/gen
  - Impact: Low (dev dependency only)

**Deprecated Subdependencies (10 total):**
- @humanwhocodes/config-array@0.13.0
- @humanwhocodes/object-schema@2.0.3
- @supabase/auth-helpers-shared@0.7.0
- @types/minimatch@6.0.0
- glob@7.2.3
- inflight@1.0.6
- lodash.get@4.4.2
- node-domexception@1.0.0
- popper.js@1.16.1
- rimraf@3.0.2

### Workspace Dependency Health

**Healthy Patterns:**
- All workspaces use TypeScript 5.2.2
- Consistent @types/node version (20.0.0)
- Proper workspace protocol usage

**Concerns:**
- No dependency on enrichment service (underutilized?)
- Puppeteer duplicated in root and reports service
- Zod version inconsistency across workspaces

### Bundle Size Considerations

**Large Dependencies (Production):**
1. `next` (~12MB)
2. `react` + `react-dom` (~1.5MB)
3. `@clerk/nextjs` (~2MB)
4. `puppeteer` (120MB+ with browser)
5. `googleapis` (~5MB)
6. `@supabase/supabase-js` (~500KB)

**Optimization Opportunities:**
- Consider dynamic imports for heavy libraries
- Evaluate if puppeteer is necessary (Playwright alternative?)
- Tree-shake unused Radix UI components

---

## External Service Dependencies

### Required External Services

**Authentication:**
- Clerk (clerk.com)
  - SDK: @clerk/nextjs
  - Purpose: User authentication
  - Pricing: Usage-based

**Database:**
- Supabase (supabase.com)
  - SDK: @supabase/supabase-js
  - Purpose: PostgreSQL database, auth, storage
  - Pricing: Usage-based

**AI/ML Services:**
- Anthropic (anthropic.com)
  - SDK: @anthropic-ai/sdk
  - Purpose: Claude AI for company extraction
  - Pricing: Token-based
- OpenAI (openai.com)
  - SDK: openai
  - Purpose: GPT models (fallback/enrichment)
  - Pricing: Token-based

**Caching & Rate Limiting:**
- Upstash (upstash.com)
  - SDK: @upstash/redis, @upstash/ratelimit
  - Purpose: Serverless Redis
  - Pricing: Request-based

**Monitoring:**
- Axiom (axiom.co)
  - SDK: @axiomhq/js
  - Purpose: Logs and observability
  - Pricing: Data ingestion-based

**Email Delivery:**
- Resend (resend.com)
  - SDK: resend
  - Purpose: Transactional emails
  - Pricing: Email volume-based

**Google Services:**
- Gmail API
  - SDK: googleapis
  - Purpose: Email ingestion
  - Pricing: Free (OAuth flow)

**Webhooks:**
- Svix (svix.com)
  - SDK: svix
  - Purpose: Webhook infrastructure
  - Pricing: Delivery-based

---

## Recommendations

### Immediate Actions (High Priority)

1. **Resolve Zod Version Conflict**
   - Downgrade root to zod ^3.22.4
   - Ensure consistent API usage

2. **Upgrade Puppeteer**
   - Update to version 24.9.0+ in all workspaces
   - Test PDF generation functionality
   - Alternative: Consider migrating to Playwright for PDF

3. **Replace Deprecated Auth Helper**
   - Migrate from @supabase/auth-helpers-nextjs to @supabase/ssr
   - Update authentication code in apps/web

4. **Upgrade ESLint**
   - Migrate to ESLint 9.x
   - Update config files for new flat config format
   - Test linting across all workspaces

5. **Update Vite (via Vitest)**
   - Update vitest to latest version (includes vite 7.1.12)
   - Run full test suite to verify compatibility

### Medium Priority

6. **Standardize TypeScript Configs**
   - Create shared tsconfig.base.json
   - Extend from base in all workspaces

7. **Audit Unused Dependencies**
   - Verify all Radix UI components are used
   - Check if all googleapis modules are necessary

8. **Add Dependency Scanning**
   - Integrate Dependabot or Renovate
   - Set up automated security alerts

9. **Document External Service Credentials**
   - Create EXTERNAL_SERVICES.md
   - Document API keys and setup requirements

### Low Priority (Optimization)

10. **Consider Bundle Optimization**
    - Implement code splitting for heavy routes
    - Lazy load non-critical Radix components
    - Evaluate if puppeteer can be optional dependency

11. **Evaluate Enrichment Service**
    - Currently minimal dependencies
    - Plan enrichment strategy (data sources?)
    - Integrate with external APIs if needed

12. **Update Development Tools**
    - Consider upgrading Turbo to latest
    - Evaluate pnpm 9.x migration

---

## Dependency Update Strategy

### Update Frequency
- **Security patches:** Immediate (within 24-48 hours)
- **Minor versions:** Monthly review
- **Major versions:** Quarterly with testing sprint

### Testing Requirements
- Run `pnpm type-check` across all workspaces
- Execute full unit test suite (`pnpm test`)
- Run E2E tests (`pnpm test:e2e`)
- Verify build succeeds (`pnpm build`)
- Manual smoke testing in staging environment

### Rollback Plan
- Use pnpm lockfile for version pinning
- Tag known-good versions in git
- Document breaking changes in CHANGELOG.md

---

**Last Audit:** 2025-11-02
**Next Review:** 2025-12-02
**Owner:** Engineering Team
