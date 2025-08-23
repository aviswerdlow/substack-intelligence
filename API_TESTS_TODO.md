# API Route Tests - Remaining Work for Issue #22

## Current Status
✅ **50% Complete** - Reduced failures from 101 to 51 tests (53/104 passing)

## Completed Work
- ✅ Fixed mock initialization order using `vi.hoisted()` pattern
- ✅ Created isolated test configuration (`vitest.config.api.ts`)
- ✅ Added server-only module mock
- ✅ Implemented dynamic imports for route handlers
- ✅ Integrated centralized mock infrastructure from PR #31

## Remaining Issues (51 failing tests)

### Root Cause
The primary issue is a conflict between:
1. Global mocks in `/root/repo/tests/setup.ts` 
2. Local mocks in individual test files
3. Next.js server component module resolution

The Clerk authentication module (`@clerk/nextjs/server`) internally imports `server-only`, which throws errors in the test environment despite our mocking attempts.

## Next Steps to Complete

### 1. Fix Module Resolution (Priority: High)
**Problem:** The `server-only` module error persists even with mocks in place.

**Solution:**
```bash
# Option A: Use module name mapper in vitest config
# Update vitest.config.api.ts to add:
resolve: {
  conditions: ['node', 'node-addons'],
  alias: {
    'server-only': false
  }
}

# Option B: Mock at the module loader level
# Create a custom test loader that intercepts server-only imports
```

### 2. Complete Mock Isolation (Priority: High)
**Problem:** Global mocks from `tests/setup.ts` override local test mocks.

**Solution:**
```typescript
// In each test file, ensure complete mock isolation:
beforeAll(() => {
  // Clear ALL global mocks
  vi.clearAllMocks();
  vi.resetModules();
  
  // Set up fresh mocks for this test suite
  vi.mock('@clerk/nextjs/server', () => ({...}));
});
```

### 3. Fix Individual Test Expectations (Priority: Medium)
**Files to review:**
- `tests/unit/api-routes.test.ts` - Intelligence route tests failing
- `tests/unit/api-routes-comprehensive.test.ts` - Gmail/Settings route tests failing
- `tests/unit/api-routes-improved.test.ts` - Companies route tests failing

**Common issues to check:**
- Mock return values not matching expected data structure
- Async timing issues with dynamic imports
- Missing mock implementations for specific methods

### 4. Run Tests with Isolated Config (Priority: Low)
```bash
# Use the isolated config for API tests
pnpm vitest run --config vitest.config.api.ts

# Or update package.json to add a dedicated script:
"test:api": "vitest run --config vitest.config.api.ts"
```

## Quick Fix Attempts

### Try These First:
1. **Force mock priority in test files:**
```typescript
// At the very top of each test file, before any imports:
import { vi } from 'vitest';
vi.mock('server-only', () => ({}));
```

2. **Update vitest.config.api.ts:**
```typescript
export default defineConfig({
  test: {
    // ... existing config
    pool: 'forks', // Use separate process for each test file
    isolate: true,  // Isolate test environments
  }
});
```

3. **Check for missing mock implementations:**
```bash
# Search for actual API route implementations to ensure mocks match
grep -r "currentUser" apps/web/app/api/
grep -r "createServiceRoleClient" apps/web/app/api/
```

## Testing Strategy

### Phase 1: Get to 75% passing (75/104 tests)
- Focus on fixing the server-only import issue
- Ensure mock isolation is complete

### Phase 2: Get to 90% passing (93/104 tests)
- Fix individual test expectations
- Update mock return values to match actual data structures

### Phase 3: Get to 100% passing (104/104 tests)
- Handle edge cases
- Add any missing mock implementations
- Ensure all async operations are properly handled

## Commands for Testing

```bash
# Run only API route tests with isolated config
pnpm vitest run --config vitest.config.api.ts

# Run specific test file with verbose output
pnpm vitest run tests/unit/api-routes.test.ts --reporter=verbose

# Debug a specific test
pnpm vitest run tests/unit/api-routes.test.ts -t "GET /api/companies"

# Run with inline mocks
pnpm vitest run --config vitest.config.api.ts --deps.inline=server-only
```

## File Structure Reference

```
tests/
├── unit/
│   ├── api-routes.test.ts (21 tests - needs fixes)
│   ├── api-routes-improved.test.ts (17 tests - needs fixes)
│   └── api-routes-comprehensive.test.ts (66 tests - needs fixes)
├── mocks/
│   ├── auth/clerk.ts (centralized Clerk mocks)
│   ├── database/queries.ts (centralized DB mocks)
│   └── server-only.ts (server-only module mock)
├── setup.api.ts (isolated setup for API tests)
└── setup.ts (global setup - conflicts with API tests)

vitest.config.api.ts (isolated config for API route tests)
vitest.config.ts (main config with global setup)
```

## Success Criteria
- [ ] All 104 API route tests passing
- [ ] No server-only import errors
- [ ] Tests run successfully in CI/CD pipeline
- [ ] Mock conflicts fully resolved
- [ ] Clear separation between global and API test configurations

## Estimated Time to Complete
- 2-4 hours of focused debugging
- Main blocker is the server-only module resolution issue
- Once that's fixed, remaining issues should resolve quickly

## Contact for Help
If stuck, consider:
1. Checking Next.js testing documentation for server components
2. Reviewing Clerk's testing guidelines
3. Looking at similar issues in the Vitest GitHub repository
4. Checking if newer versions of dependencies fix the issue

---
*Last updated: Current session*
*Progress: 51% complete (53/104 tests passing)*