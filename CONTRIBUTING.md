# Contributing Guidelines

Thank you for investing time in Substack Intelligence! This guide explains how we collaborate, review changes, and keep quality high.

## Code of Conduct

We follow the [Contributor Covenant](https://www.contributor-covenant.org/). Be respectful, assume positive intent, and keep discussions focused on the work.

## Getting Started

1. Read the [Developer Onboarding](./docs/DEVELOPMENT.md) guide.
2. Ensure `pnpm install` succeeds and `pnpm lint && pnpm test` pass locally.
3. Request access to required external services (Supabase, Clerk, Anthropic, Stripe).

## Branching Strategy

* Use feature branches named `feature/<short-description>` or `fix/<short-description>`.
* Keep branches up to date with `main` via rebasing.
* Avoid force-pushing to shared branches.

## Commit Messages

* Follow the conventional format: `type(scope): short description` (e.g., `feat(pipeline): add retry policy`).
* Reference GitHub issues when applicable (`refs #73`).
* Write small commits that capture a cohesive change.

## Pull Request Checklist

Before requesting review:

- [ ] Update documentation relevant to your change.
- [ ] Run `pnpm lint` and `pnpm test`.
- [ ] Include screenshots for UI updates.
- [ ] Highlight breaking changes and required migrations.
- [ ] Add tests for new functionality or bug fixes.

## Code Review

* Assign at least one reviewer from the core team.
* Respond to feedback with follow-up commits rather than force-pushing unless requested.
* Provide context for complex changes, linking to architecture docs or ADRs when helpful.

## Releases

* Merge to `main` to trigger staging deployments.
* Tag production releases (`production-YYYYMMDD`). Include release notes in [docs/CHANGELOG.md](./docs/CHANGELOG.md).

## Security

* Do not share secrets or database dumps in public channels.
* Report vulnerabilities privately to the maintainers.

Thanks again for contributing! Reach out in the #engineering Slack channel with questions or proposals.
