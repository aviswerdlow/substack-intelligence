# Manual Authentication Setup for Testing

Since Google OAuth detects automated browsers as insecure, here's how to set up testing:

## Option 1: Use Email/Password Authentication (Recommended for Testing)

1. Go to your NextAuth Dashboard: https://dashboard.nextauth.com/
2. Navigate to your application
3. Go to "User & Authentication" → "Email, Phone, Username"
4. Enable "Email address" sign-in
5. Enable "Password" authentication
6. Create a test user with email/password

## Option 2: Manual Browser Session

1. Open a regular Chrome browser (not Playwright)
2. Navigate to http://localhost:3000
3. Sign in normally with Google
4. Open Chrome DevTools (F12)
5. Go to Application → Storage → Local Storage
6. Copy the NextAuth session tokens
7. Use these tokens in tests

## Option 3: Use NextAuth Test Mode

1. Set environment variable: `NEXTAUTH_TEST_MODE=true`
2. This bypasses authentication in development
3. Use mock user data for testing

## Option 4: Create Test User via NextAuth API

```javascript
// Create a test user programmatically
const user = await nextauthClient.users.createUser({
  emailAddress: ['test@example.com'],
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'User'
});
```

## Current Workaround

For now, you can:
1. Sign in manually in a regular browser
2. Navigate to the dashboard
3. Then run the dashboard tests that assume authentication