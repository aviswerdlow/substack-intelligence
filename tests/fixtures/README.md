# Shared Test Fixtures

This directory houses reusable domain fixtures that can be consumed across unit, integration, and end-to-end tests.

## Contents
- `factories/`: TypeScript helpers that generate typed domain objects (company profiles, newsletter messages, Supabase rows).
- JSON snapshots representing canonical inputs/outputs for critical workflows.

## Guidelines
1. Keep fixtures deterministic and version-controlled.
2. Prefer factory helpers over static JSON when the shape changes frequently.
3. Document any assumptions inside the fixture file header comment.
4. Avoid embedding secrets or production data. Use synthetic but realistic examples.
