# Centralized Mock Infrastructure

This directory contains the centralized mock infrastructure for the test suite. All mocks are organized into logical categories and provide consistent, reusable mocking capabilities across all test files.

## Directory Structure

```
tests/mocks/
├── README.md                 # This documentation
├── types.ts                 # TypeScript type definitions
├── utils/                   # Utility helpers
│   └── index.ts
├── database/                # Database-related mocks
│   ├── supabase.ts         # Supabase client mocks
│   └── queries.ts          # Database query function mocks
├── auth/                    # Authentication mocks
│   └── nextauth.ts            # NextAuth authentication mocks
├── external/               # External service mocks
│   ├── services.ts         # Anthropic, OpenAI, Resend mocks
│   ├── gmail.ts           # Gmail API mocks
│   ├── puppeteer.ts       # Puppeteer browser mocks
│   └── axiom.ts           # Axiom logging mocks
├── nextjs/                 # Next.js specific mocks
│   └── server.ts          # NextRequest, NextResponse mocks
└── fixtures/              # Test data fixtures
    └── data.ts            # Sample data factories
```

## Quick Start

### Using Global Test Utilities

The easiest way to use mocks is through the global test utilities available in all test files:

```typescript
import { describe, it, expect } from 'vitest';

describe('My Component', () => {
  it('should work with authenticated user', async () => {
    // Set up a signed-in user
    const user = testUtils.mockSignedInUser({ email: 'test@example.com' });
    
    // Mock successful Anthropic API calls
    testUtils.mockAnthropicSuccess('Sample AI response');
    
    // Mock successful email sending
    testUtils.mockResendSuccess();
    
    // Your test code here
    expect(user.email).toBe('test@example.com');
  });
});
```

### Direct Mock Import

For more granular control, import mocks directly:

```typescript
import { nextauthMocks } from '../mocks/auth/nextauth';
import { externalServicesMocks } from '../mocks/external/services';
import { DataFixtures } from '../mocks/fixtures/data';

describe('Advanced Mock Usage', () => {
  it('should handle complex scenarios', async () => {
    // Configure NextAuth authentication
    const user = nextauthMocks.createTestUser({ email: 'advanced@example.com' });
    nextauthMocks.signIn(user);
    
    // Configure Anthropic to return specific data
    externalServicesMocks.mockAnthropicSuccess(JSON.stringify({
      companies: [{ name: 'Test Company', description: 'A test company' }]
    }));
    
    // Use test data fixtures
    const companies = DataFixtures.createCompanies(5);
    
    // Your test code here
  });
});
```

## Mock Categories

### 1. Database Mocks (`/database`)

#### Supabase Client Mock

```typescript
import { mockSupabaseClient, createMockSupabaseClient } from '../mocks/database/supabase';

// Use the pre-configured client
const result = await mockSupabaseClient
  .from('companies')
  .select('*')
  .eq('id', 'test-id');

// Create a custom configured client
const customClient = createMockSupabaseClient({
  shouldResolve: true,
  resolveValue: { data: [{ id: '1', name: 'Test Co' }], error: null }
});
```

#### Database Query Mocks

```typescript
import { databaseQueryMocks } from '../mocks/database/queries';

// Configure specific query responses
databaseQueryMocks.mockResolvedValue('getCompanies', [
  { id: '1', name: 'Company A' },
  { id: '2', name: 'Company B' }
]);

// Mock query errors
databaseQueryMocks.mockRejectedValue('getCompanyById', new Error('Not found'));

// Use the mocks in your tests
const companies = await getCompanies();
expect(companies).toHaveLength(2);
```

### 2. Authentication Mocks (`/auth`)

#### NextAuth Authentication

```typescript
import { nextauthMocks, testScenarios } from '../mocks/auth/nextauth';

// Quick scenarios
testScenarios.signedOutUser();
testScenarios.signedInUser({ email: 'user@example.com' });
testScenarios.userWithOrganization();

// Manual configuration
const user = nextauthMocks.createTestUser({ 
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User'
});
nextauthMocks.signIn(user);

// Check authentication state
expect(nextauthMocks.useAuth().isSignedIn).toBe(true);
```

### 3. External Service Mocks (`/external`)

#### Anthropic AI

```typescript
import { externalServicesMocks } from '../mocks/external/services';

// Mock successful AI response
externalServicesMocks.mockAnthropicSuccess(JSON.stringify({
  companies: [
    { name: 'Glossier', description: 'Beauty brand' }
  ]
}));

// Mock AI API error
externalServicesMocks.mockAnthropicError(new Error('API rate limited'));
```

#### OpenAI Embeddings

```typescript
// Mock successful embeddings
externalServicesMocks.mockOpenAIEmbeddingsSuccess([
  [0.1, 0.2, 0.3, /* ... 1533 more values */]
]);

// Mock embeddings error
externalServicesMocks.mockOpenAIEmbeddingsError(new Error('API error'));
```

#### Email Service (Resend)

```typescript
// Mock successful email sending
externalServicesMocks.mockResendSuccess('email-id-123');

// Mock email sending failure
externalServicesMocks.mockResendError(new Error('SMTP error'));
```

#### Gmail API

```typescript
import { gmailMocks, gmailTestScenarios } from '../mocks/external/gmail';

// Use pre-configured scenarios
gmailTestScenarios.successfulAuth();
gmailTestScenarios.substackEmails();

// Manual configuration
gmailMocks.mockSuccessfulAuth({
  access_token: 'custom-token',
  refresh_token: 'custom-refresh-token'
});

gmailMocks.mockMessagesListSuccess({
  messages: [
    { id: 'msg-1', threadId: 'thread-1' }
  ]
});
```

#### Puppeteer Browser Automation

```typescript
import { puppeteerMocks, puppeteerTestScenarios } from '../mocks/external/puppeteer';

// Use scenarios
puppeteerTestScenarios.successfulPDFGeneration();
puppeteerTestScenarios.browserLaunchFailure();

// Manual configuration
puppeteerMocks.mockSuccessfulLaunch();
puppeteerMocks.mockPDFGeneration(Buffer.from('custom-pdf-content'));
```

#### Axiom Logging

```typescript
import { axiomMocks, axiomTestScenarios } from '../mocks/external/axiom';

// Use scenarios
axiomTestScenarios.normalLogging();
axiomTestScenarios.loggingFailure();

// Check logged data in tests
axiomMocks.clearCollectedData();
await someFunction(); // Function that logs data
expect(axiomMocks.assertLoggedMessage('Processing started')).toBe(true);
expect(axiomMocks.getLogCount()).toBeGreaterThan(0);
```

### 4. Next.js Mocks (`/nextjs`)

#### Request/Response Mocking

```typescript
import { createMockNextRequest, createMockNextResponse } from '../mocks/nextjs/server';

// Create mock request
const request = createMockNextRequest('http://localhost:3000/api/test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: { data: 'test' }
});

// Create mock response
const response = createMockNextResponse();
response.json({ success: true }, { status: 200 });
```

### 5. Test Data Fixtures (`/fixtures`)

#### Using Data Factories

```typescript
import { DataFixtures, SAMPLE_COMPANIES } from '../mocks/fixtures/data';

// Use pre-defined sample data
expect(SAMPLE_COMPANIES).toHaveLength(5);

// Create custom data
const company = DataFixtures.createCompany({
  name: 'Custom Company',
  industry: 'Tech'
});

const companies = DataFixtures.createCompanies(10, {
  funding_status: 'Series A'
});

// Create scenario data
const scenario = DataFixtures.createScenario('medium');
expect(scenario.companies).toHaveLength(10);
expect(scenario.emails).toHaveLength(20);
expect(scenario.intelligence).toHaveLength(35);
```

## Advanced Usage

### Configuration and State Management

All mock factories support configuration and state management:

```typescript
import { externalServicesMocks } from '../mocks/external/services';

// Configure mock behavior
externalServicesMocks.configureAnthropic({
  shouldResolve: false,
  rejectValue: new Error('Custom error'),
  delay: 1000
});

// Reset to defaults
externalServicesMocks.reset();

// Reset all mocks (useful in afterEach)
externalServicesMocks.resetAllMocks();
```

### Error Simulation

```typescript
// Simulate network delays
puppeteerMocks.mockNetworkDelay({
  launch: 2000,
  newPage: 1000,
  pdf: 3000
});

// Simulate API failures
externalServicesMocks.mockAnthropicError({
  message: 'Rate limit exceeded',
  status: 429
});

// Simulate database timeouts
databaseQueryMocks.mockDelay('getCompanies', 5000);
```

### Assertion Helpers

```typescript
// Check if specific logs were recorded
expect(axiomMocks.assertLoggedError('API call failed')).toBe(true);
expect(axiomMocks.assertLoggedEvent('user.signup')).toBe(true);

// Check mock call counts
expect(gmailMocks.listMessages).toHaveBeenCalledTimes(1);
expect(externalServicesMocks.createAnthropicMessage).toHaveBeenCalledWith(
  expect.objectContaining({
    model: 'claude-sonnet-4-5'
  })
);
```

## Best Practices

### 1. Use Global Utilities for Simple Cases

For most tests, use the global `testUtils` for quick mock setup:

```typescript
beforeEach(() => {
  testUtils.mockSignedInUser();
  testUtils.mockAnthropicSuccess();
  testUtils.mockAxiomLogging();
});
```

### 2. Import Specific Mocks for Complex Scenarios

When you need fine-grained control, import specific mock factories:

```typescript
import { nextauthMocks } from '../mocks/auth/nextauth';
import { externalServicesMocks } from '../mocks/external/services';

// Custom user with organization
const { user, organization } = nextauthMocks.mockUserWithOrganization(
  { email: 'user@company.com' },
  { name: 'Test Company' }
);
```

### 3. Reset Mocks Appropriately

Use the global reset for most cases:

```typescript
afterEach(() => {
  testUtils.resetAllTestMocks();
});
```

Or reset specific mocks when needed:

```typescript
afterEach(() => {
  axiomMocks.clearCollectedData();
  nextauthMocks.signOut();
});
```

### 4. Use Fixtures for Consistent Test Data

```typescript
import { SAMPLE_COMPANIES, DataFixtures } from '../mocks/fixtures/data';

// Use predefined data for consistency
const glossier = SAMPLE_COMPANIES.find(c => c.name === 'Glossier');

// Create variations when needed
const techCompanies = DataFixtures.createCompanies(5, { 
  industry: 'Technology' 
});
```

### 5. Configure Mock Behavior for Test Scenarios

```typescript
describe('Error handling', () => {
  it('should handle API errors gracefully', async () => {
    // Configure multiple services to fail
    externalServicesMocks.mockAnthropicError();
    gmailMocks.mockAuthError();
    
    // Test error handling
    await expect(processEmails()).rejects.toThrow();
  });
});
```

## Migration from Legacy Mocks

If you're migrating from the old inline mocks, follow these steps:

1. **Remove inline vi.mock() calls** from your test files
2. **Import centralized mocks** instead
3. **Use global utilities** for simple cases
4. **Import specific factories** for complex scenarios
5. **Update assertions** to use new mock methods

### Before (Legacy)

```typescript
vi.mock('@nextauth/nextjs', () => ({
  auth: vi.fn(() => ({ userId: 'test-user-id' })),
  currentUser: vi.fn(() => Promise.resolve({ id: 'test-user-id' }))
}));
```

### After (Centralized)

```typescript
// Simple case
testUtils.mockSignedInUser();

// Complex case
import { nextauthMocks } from '../mocks/auth/nextauth';
const user = nextauthMocks.createTestUser({ id: 'specific-user-id' });
nextauthMocks.signIn(user);
```

## Troubleshooting

### Common Issues

1. **Mock not found errors**: Ensure you're importing from the correct path
2. **State leakage between tests**: Use `testUtils.resetAllTestMocks()` in `afterEach`
3. **TypeScript errors**: Import types from `../mocks/types` if needed
4. **Mock not being called**: Check if the mock is configured correctly and not overridden

### Debugging Tips

```typescript
// Enable mock collection to inspect calls
axiomMocks.enableCollection();

// Check collected data
console.log('Logs:', axiomMocks.getCollectedLogs());
console.log('Events:', axiomMocks.getCollectedEvents());

// Verify mock calls
expect(externalServicesMocks.createAnthropicMessage).toHaveBeenCalled();
```

## Contributing

When adding new mocks:

1. **Follow the directory structure**: Place mocks in appropriate categories
2. **Provide factory functions**: Allow easy creation of mock instances
3. **Include configuration methods**: Allow behavior customization
4. **Add reset functionality**: Ensure clean state between tests
5. **Export for vi.mock()**: Provide objects for vi.mock() calls
6. **Update documentation**: Add usage examples to this README
7. **Add TypeScript types**: Include proper type definitions

### Example New Mock

```typescript
// /tests/mocks/external/new-service.ts
export class NewServiceMocks {
  private _config = { shouldResolve: true };
  
  configure(config: Partial<typeof this._config>) {
    this._config = { ...this._config, ...config };
  }
  
  reset() {
    this._config = { shouldResolve: true };
  }
  
  mockMethod = vi.fn(async () => {
    if (!this._config.shouldResolve) {
      throw new Error('Mock error');
    }
    return 'success';
  });
  
  resetAllMocks() {
    this.mockMethod.mockReset();
    this.reset();
  }
}

export const newServiceMocks = new NewServiceMocks();
export const { mockMethod } = newServiceMocks;

// Export for vi.mock()
export const newServiceModuleMocks = {
  NewService: vi.fn(() => ({ method: mockMethod }))
};
```