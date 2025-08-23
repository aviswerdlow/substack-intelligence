# End-to-End Testing Suite

This comprehensive E2E testing suite ensures all critical user journeys work correctly and prevents regressions.

## 🚀 Quick Start

```bash
# Install dependencies (already done if you've run pnpm install)
cd apps/web

# Run all E2E tests
pnpm run test:e2e

# Run only critical tests (used in pre-commit hooks)
pnpm run test:e2e:critical

# Run tests with browser visible (for debugging)
pnpm run test:e2e:headed

# Run tests with Playwright UI
pnpm run test:e2e:ui

# View test reports
pnpm run test:e2e:report
```

## 🧪 Test Suites

### Critical User Journeys (`critical-user-journeys.spec.ts`)
**Runs in pre-commit hooks** - Must pass before any commit
- Complete user registration and authentication flow
- Dashboard and page navigation
- No dummy data validation
- Basic pipeline functionality
- Data persistence
- Authentication state management
- Error handling
- Performance validation

### Authentication Tests (`auth-comprehensive.spec.ts`)
- Sign up with email verification
- Sign in/out flows
- Session persistence and management
- Protected route access control
- User profile management
- Session expiration handling

### Gmail Integration Tests (`gmail-integration.spec.ts`)
- OAuth connection flow
- Email fetching and validation
- Company extraction from emails
- Data storage in Supabase
- Gmail disconnection
- Security validation
- Rate limit handling

### Data Pipeline Tests (`data-pipeline.spec.ts`)
- End-to-end pipeline execution
- Email processing and extraction
- Company data storage validation
- Pipeline status monitoring
- Configuration management
- Error handling
- Performance validation
- Data consistency checks

### Onboarding Journey Tests (`onboarding-journey.spec.ts`)
- New user onboarding checklist
- Product tour completion
- Gamification system
- Progress tracking and persistence
- Step validation
- Accessibility features

## 🔧 Configuration

### Environment Setup
1. Copy `.env.test.local.example` to `.env.test.local`
2. Fill in your test credentials and API keys
3. Ensure you have a test Supabase project
4. Set up test Clerk application
5. Configure test Gmail OAuth credentials

### Test User Requirements
- **TEST_USER_EMAIL**: Valid email for test user account
- **TEST_USER_PASSWORD**: Password for test user (must meet requirements)
- Ensure test user exists in your Clerk test environment

## 📊 Test Coverage

### User Journeys Covered
✅ **Authentication Flow**
- User sign-up and email verification
- Sign-in and session management
- Protected route access
- Sign-out and session cleanup

✅ **Gmail Integration**
- OAuth connection process
- Email fetching from Gmail API
- No dummy data validation
- Data storage in Supabase

✅ **Data Pipeline**
- Company extraction from emails
- Pipeline execution and monitoring
- Error handling and recovery
- Database consistency

✅ **Onboarding Experience**
- New user checklist
- Product tour interaction
- Progress gamification
- Step completion validation

✅ **Settings Management**
- Configuration persistence
- Import/export functionality
- API key management
- Newsletter preferences

✅ **Report Generation**
- Daily/weekly/monthly reports
- PDF export functionality
- Email delivery
- Schedule configuration

✅ **Analytics & Insights**
- Dashboard data accuracy
- Chart interactions
- Export capabilities
- Real-time updates

## 🚫 Pre-Commit Protection

The pre-commit hook runs critical tests to ensure:

1. **No Broken User Journeys**: Authentication, Gmail, pipeline, and onboarding flows work
2. **No Dummy Data**: All displayed data comes from real sources
3. **Basic Performance**: Pages load within reasonable time limits
4. **Error Handling**: Graceful error handling throughout the app
5. **Data Persistence**: Settings and state persist correctly

### Pre-Commit Hook Behavior
```bash
# On git commit:
1. Runs linting (quick syntax check)
2. Runs critical user journey tests
3. Blocks commit if any test fails
4. Provides debugging instructions
```

To bypass pre-commit tests (not recommended):
```bash
git commit --no-verify -m "Your commit message"
```

## 🐛 Debugging Tests

### Common Issues

**Tests timeout or fail to load**
```bash
# Check if dev server is running
pnpm dev

# Verify environment variables
cat .env.test.local
```

**Authentication failures**
- Verify TEST_USER_EMAIL and TEST_USER_PASSWORD
- Check Clerk test environment configuration
- Ensure test user exists and is verified

**Database connection issues**
- Verify Supabase test project credentials
- Check service role key permissions
- Ensure test database schema is up to date

**Gmail integration failures**
- Verify Google OAuth credentials
- Check Gmail API is enabled
- Ensure refresh token is valid

### Debugging Commands
```bash
# Run specific test file
pnpm run test:e2e tests/e2e/auth-comprehensive.spec.ts

# Run with browser visible
pnpm run test:e2e:headed

# Run with Playwright inspector
pnpm run test:e2e --debug

# Generate test report
pnpm run test:e2e --reporter=html

# Run single test
pnpm run test:e2e --grep "should complete sign in flow"
```

## 📈 Performance Benchmarks

Current performance thresholds:
- Dashboard load: < 10 seconds
- Settings page: < 8 seconds  
- Email page: < 8 seconds
- Pipeline execution: < 2 minutes (test data)

## 🔄 Continuous Integration

Tests run automatically:
- **Pre-commit**: Critical tests only (fast validation)
- **CI/CD Pipeline**: Full test suite on pull requests
- **Nightly**: Full test suite against staging environment

## 🆘 Getting Help

If tests are failing and blocking your commits:

1. **Check the test output** for specific error messages
2. **Run tests locally** with `pnpm run test:e2e:critical --headed`
3. **View test report** with `pnpm run test:e2e:report`
4. **Check environment setup** in `.env.test.local`
5. **Review recent changes** that might have broken user journeys

For persistent issues, contact the development team with:
- Test output and error messages
- Screenshot of failing test (if using --headed)
- Your environment configuration (without secrets)
- Steps to reproduce the issue