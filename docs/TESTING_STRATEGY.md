# Substack Intelligence Testing Strategy

## Objectives
- Safeguard critical business flows with fast feedback loops.
- Maintain deterministic, hermetic test suites that support rapid iteration.
- Provide clear guidance so any contributor can add, run, and debug tests.
- Achieve and enforce ≥ 80% coverage across branches, functions, and lines for TypeScript code that runs on the platform.

## Test Pyramid Overview
| Layer | Primary Tools | Scope | Trigger |
| --- | --- | --- | --- |
| Unit | [Vitest](../vitest.config.ts) | Pure utilities, hooks, data mappers, state machines | On every commit and PR |
| Integration | Vitest + Supabase/Gmail mocks (`tests/integration`) | API routes, queue processors, multi-service workflows | On every commit, nightly full run |
| End-to-End | Playwright (`tests/e2e`) | Critical user journeys in web apps (ingestion dashboard, intelligence report review) | Scheduled smoke suite and on-demand before releases |
| Non-Functional | k6 (performance), Playwright visual diff, Lighthouse CI | Latency, throughput, UI regressions | Nightly and pre-release |

## Repository Structure
```
tests/
  setup.ts                # Global test hooks + environment mocks
  setup.api.ts            # API-focused bootstrap (Supabase, Gmail, Anthropic)
  mocks/                  # Shareable fixtures and service mocks
  unit/                   # Pure unit suites (Vitest)
  integration/            # API + workflow integration suites
  e2e/                    # Playwright specs & helpers
  fixtures/               # (new) Scenario fixtures consumed across suites
```

- **New `tests/fixtures/`**: introduce this directory for reusable JSON/TypeScript fixtures. Store company profiles, Gmail message payloads, Supabase rows, and synthetic analytics snapshots here.
- **Configuration**: update module resolution in `vitest.config.ts` and Playwright config to include the fixtures alias (`@fixtures/*`).

## Tooling & Configuration
### Vitest (Unit + Integration)
- Use `tests/setup.ts` for shared mocks, ensuring deterministic SDK behaviour.
- Extend `vitest.config.ts` with:
  - `coverage: { reporter: ['text', 'lcov'], thresholds: { global: { branches: 0.8, functions: 0.8, lines: 0.8 }}}`
  - Alias `@fixtures` -> `tests/fixtures` and `@mocks` -> `tests/mocks` for readability.
- Command matrix:
  - `pnpm test` – watch mode for local iteration.
  - `pnpm test:run` – CI deterministic run.
  - `pnpm test:coverage` – generate coverage artifacts (upload to Codecov or GitHub summary).

### Playwright (E2E + Visual Regression)
- House specs in `tests/e2e` and bootstrap via `tests/e2e/fixtures` for common flows (auth, newsletter processing, report approval).
- Configure `playwright.config.ts` to:
  - Launch against local dev server on `http://localhost:3000` with environment variables loaded via `.env.test`.
  - Enable `expect: { toHaveScreenshot: { maxDiffPixels: 150 } }` for screenshot comparisons.
  - Define projects: `chromium`, `firefox`, `webkit` (smoke) + `chromium-ui` (visual regression baseline).
- Snapshot storage: commit baseline screenshots under `tests/e2e/__screenshots__` with per-component folders.

### Performance Testing
- Adopt `k6` scripts under `tests/performance` for API throughput testing (ingestion webhook, report retrieval endpoints).
- Provide wrapper npm script `test:performance` executing `k6 run tests/performance/<scenario>.js` with thresholds for P95 latency and error rate.
- Collect results into `artifacts/performance/<timestamp>.json` for trend analysis.

## Test Coverage Strategy
1. **Baseline Inventory**: Use `pnpm test:coverage -- --reporter=json-summary` to export `coverage/coverage-summary.json`.
2. **Gating**: Configure CI to fail when coverage dips below 80% globally or below 70% per package (configurable via `thresholds`).
3. **Dashboard**: Publish coverage summary to GitHub Pages or Supabase metrics board.
4. **Incremental Enforcement**: Enable `vitest --changed` for focused coverage on touched files before merging.

## CI/CD Integration
- GitHub Actions workflow `.github/workflows/tests.yml` should:
  1. Run lint + type-check.
  2. Execute unit/integration suites in parallel matrix across Node 18/20.
  3. Upload coverage reports.
  4. Execute Playwright smoke specs headless (Chromium) against deployed preview.
  5. Optionally trigger nightly job for full cross-browser E2E, performance, and visual regression.
- Add status checks on PRs: `lint`, `type-check`, `unit-integration`, `e2e-smoke`.

## Mock Data & Fixtures
- Centralize mocks in `tests/mocks` and new `tests/fixtures` directory.
- Provide generators (TypeScript factories) under `tests/fixtures/factories` using [Zod](https://github.com/colinhacks/zod) schemas to produce consistent domain objects.
- Maintain environment-specific configuration via `tests/fixtures/config/*.ts` (e.g., Gmail labels, Supabase project IDs) to minimize duplication.

## Documentation & Onboarding
- Update `docs/LOCAL_SETUP.md` with test commands.
- Maintain `docs/TESTING_STRATEGY.md` (this file) as the canonical strategy.
- Add quickstart to repository README linking to this document for contributors.

## Milestones & Metrics
| Milestone | Deliverable | Target |
| --- | --- | --- |
| Phase 1 | Unit + integration coverage ≥ 70%, fixtures folder populated | Week 1 |
| Phase 2 | Playwright smoke suite stable, CI gating enabled | Week 2 |
| Phase 3 | Coverage ≥ 80%, nightly performance + visual regression | Week 3 |
| Phase 4 | Continuous improvement backlog (flaky test triage, tooling upgrades) | Ongoing |

### Success Indicators
- All PRs run full lint/type/test checks automatically.
- New features ship with matching tests in relevant layers.
- Regression rate in production decreases release-over-release.
- Coverage and performance metrics trend upward and are visible to the team.

## Ownership
- **Quality Engineering Lead**: Maintains tooling, CI workflows, and coverage enforcement.
- **Feature Teams**: Own end-to-end test coverage for their components.
- **Platform Team**: Provides shared fixtures, mocks, and data factories.

## Next Steps
1. Stand up GitHub Actions workflow per CI plan.
2. Backfill tests where coverage is below thresholds, prioritizing ingestion and intelligence report flows.
3. Establish baseline Playwright screenshots and k6 performance baselines.
4. Review and iterate on this strategy quarterly.
