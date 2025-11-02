# Substack Intelligence Documentation

Welcome to the living documentation for the Substack Intelligence platform. The resources in this folder are organised so new contributors can get productive quickly while existing team members have a single source of truth for the system architecture, APIs, data model, and operational runbooks.

## Documentation Index

| Topic | Description |
| --- | --- |
| [Quick Start](../README.md#-quick-start) | High-level overview and initial setup steps for the project. |
| [Architecture](./ARCHITECTURE.md) | Core architectural decisions, system topology, and data flow diagrams. |
| [API Reference](./API.md) | HTTP endpoints, authentication requirements, and example payloads. |
| [Database](./DATABASE.md) | Supabase schema, migrations, and relational map. |
| [Deployment Guide](./DEPLOYMENT.md) | Deploying to Vercel and Supabase environments, secrets management, and rollback procedures. |
| [Developer Onboarding](./DEVELOPMENT.md) | Local development workflows, tooling, and quality standards. |
| [Environment Setup](./ENVIRONMENT_SETUP.md) | Detailed environment variable catalogue and service prerequisites. |
| [Contributing](../CONTRIBUTING.md) | Code review process, branching model, and style expectations. |
| [Troubleshooting](./TROUBLESHOOTING.md) | Common operational issues and the playbooks to resolve them. |
| [Changelog](./CHANGELOG.md) | Version history and notable updates to the platform. |

## Additional References

* [Architecture Overview](./ARCHITECTURE_OVERVIEW.md) – Legacy audit that dives deeper into historical architectural context.
* [API Routes Inventory](./API_ROUTES_INVENTORY.md) – Exhaustive, auto-generated inventory of routes across applications.
* [Database Schema](./DATABASE_SCHEMA.md) – Detailed schema diagrams and relation descriptions.
* [Dependencies Catalog](./DEPENDENCIES_CATALOG.md) – Snapshot of package dependencies and upgrade recommendations.
* [Technical Debt Assessment](./TECHNICAL_DEBT.md) – Prioritised list of remediation tasks and refactors.

All documentation should be updated alongside code changes. When introducing new behaviour, add or amend the relevant guide so the documentation continues to reflect the live system.
