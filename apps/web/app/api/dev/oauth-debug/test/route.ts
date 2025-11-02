import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { validateOAuthConfig } from '@/lib/oauth-health-check';

// Development OAuth flow testing endpoint
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ 
      error: 'Test endpoint only available in development mode' 
    }, { status: 404 });
  }

  try {
    const testResults: any = {
      timestamp: new Date().toISOString(),
      tests: []
    };

    // Test 1: Environment Variables
    const envTest = await testEnvironmentVariables();
    testResults.tests.push(envTest);

    // Test 2: OAuth Configuration
    const configTest = await testOAuthConfiguration();
    testResults.tests.push(configTest);

    // Test 3: Google API Connection
    const apiTest = await testGoogleApiConnection();
    testResults.tests.push(apiTest);

    // Test 4: Auth URL Generation
    const urlTest = await testAuthUrlGeneration();
    testResults.tests.push(urlTest);

    // Summary
    const passedTests = testResults.tests.filter(test => test.status === 'pass').length;
    const totalTests = testResults.tests.length;
    
    testResults.summary = {
      passed: passedTests,
      total: totalTests,
      success: passedTests === totalTests,
      readyForTesting: passedTests >= 3 // Can test with at least env vars, config, and URL generation working
    };

    // Next steps based on results
    if (testResults.summary.success) {
      testResults.nextSteps = [
        '✅ All tests passed! OAuth setup is ready.',
        '🔗 You can now test the Gmail connection in the UI.',
        '📊 Monitor connections at /api/admin/oauth-monitoring',
        '🔍 Use /api/health/oauth for health checks'
      ];
    } else {
      testResults.nextSteps = [
        '❌ Some tests failed. Check the issues below:',
        ...testResults.tests
          .filter(test => test.status === 'fail')
          .map(test => `  • ${test.name}: ${test.error}`)
      ];
    }

    return NextResponse.json(testResults);

  } catch (error) {
    return NextResponse.json({
      error: 'OAuth test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

async function testEnvironmentVariables() {
  const test = {
    name: 'Environment Variables',
    status: 'pass' as 'pass' | 'fail',
    error: null as string | null,
    details: {}
  };

  try {
    const required = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'NEXT_PUBLIC_APP_URL'];
    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
      test.status = 'fail';
      test.error = `Missing environment variables: ${missing.join(', ')}`;
      test.details = { missing };
      return test;
    }

    // Check format validity
    const warnings = [];
    if (!process.env.GOOGLE_CLIENT_ID?.includes('.apps.googleusercontent.com')) {
      warnings.push('GOOGLE_CLIENT_ID format may be incorrect');
    }
    if (!process.env.NEXT_PUBLIC_APP_URL?.startsWith('http')) {
      warnings.push('NEXT_PUBLIC_APP_URL should start with http:// or https://');
    }

    test.details = {
      allPresent: true,
      warnings,
      redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/google`
    };

    return test;

  } catch (error) {
    test.status = 'fail';
    test.error = error instanceof Error ? error.message : 'Unknown error';
    return test;
  }
}

async function testOAuthConfiguration() {
  const test = {
    name: 'OAuth Configuration Validation',
    status: 'pass' as 'pass' | 'fail',
    error: null as string | null,
    details: {}
  };

  try {
    const validation = await validateOAuthConfig();
    
    if (!validation.isValid) {
      test.status = 'fail';
      test.error = validation.errors.join('; ');
      test.details = {
        errors: validation.errors,
        warnings: validation.warnings
      };
      return test;
    }

    test.details = {
      valid: true,
      warnings: validation.warnings
    };

    return test;

  } catch (error) {
    test.status = 'fail';
    test.error = error instanceof Error ? error.message : 'Configuration test failed';
    return test;
  }
}

async function testGoogleApiConnection() {
  const test = {
    name: 'Google API Connection',
    status: 'pass' as 'pass' | 'fail',
    error: null as string | null,
    details: {}
  };

  try {
    // Test Gmail API client initialization
    const gmail = google.gmail({ version: 'v1' });
    
    if (!gmail.users) {
      test.status = 'fail';
      test.error = 'Gmail API client not properly initialized';
      return test;
    }

    test.details = {
      gmailApiInitialized: true,
      version: 'v1',
      note: 'Full API test requires user authentication'
    };

    return test;

  } catch (error) {
    test.status = 'fail';
    test.error = error instanceof Error ? error.message : 'API connection test failed';
    return test;
  }
}

async function testAuthUrlGeneration() {
  const test = {
    name: 'Auth URL Generation',
    status: 'pass' as 'pass' | 'fail',
    error: null as string | null,
    details: {}
  };

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/google`
    );

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.modify'
      ],
      prompt: 'consent',
      state: 'test-user-id'
    });

    if (!authUrl.startsWith('https://accounts.google.com/o/oauth2/v2/auth')) {
      test.status = 'fail';
      test.error = 'Generated auth URL has unexpected format';
      test.details = { authUrl: authUrl.substring(0, 100) + '...' };
      return test;
    }

    // Parse URL to verify parameters
    const url = new URL(authUrl);
    const params = Object.fromEntries(url.searchParams.entries());

    test.details = {
      urlGenerated: true,
      clientId: params.client_id === process.env.GOOGLE_CLIENT_ID,
      redirectUri: params.redirect_uri === `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/google`,
      scopes: params.scope?.includes('gmail.readonly'),
      state: params.state === 'test-user-id',
      authUrl: authUrl.substring(0, 150) + '...'
    };

    return test;

  } catch (error) {
    test.status = 'fail';
    test.error = error instanceof Error ? error.message : 'Auth URL generation failed';
    return test;
  }
}

// POST endpoint for manual test triggers
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ 
      error: 'Test endpoint only available in development mode' 
    }, { status: 404 });
  }

  try {
    const body = await request.json();
    const action = body.action;

    switch (action) {
      case 'generate_test_url':
        return await generateTestAuthUrl(body.userId || 'test-user');
      
      case 'validate_redirect_uri':
        return await validateRedirectUri(body.uri);
      
      case 'simulate_callback':
        return await simulateCallback(body.code, body.state);
      
      default:
        return NextResponse.json({
          error: 'Unknown test action',
          availableActions: ['generate_test_url', 'validate_redirect_uri', 'simulate_callback']
        }, { status: 400 });
    }

  } catch (error) {
    return NextResponse.json({
      error: 'Test action failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function generateTestAuthUrl(userId: string) {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/google`
    );

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.modify'
      ],
      prompt: 'consent',
      state: userId
    });

    return NextResponse.json({
      success: true,
      authUrl,
      instructions: [
        'Copy this URL and paste it in your browser',
        'Complete the Google OAuth flow',
        'You will be redirected back to the callback endpoint',
        'Check the monitoring dashboard for results'
      ],
      note: 'This is a real OAuth URL - completing it will create an actual connection'
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to generate test auth URL',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function validateRedirectUri(uri: string) {
  const expected = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/google`;
  
  return NextResponse.json({
    provided: uri,
    expected,
    matches: uri === expected,
    issues: uri !== expected ? [
      uri.endsWith('/') ? 'Remove trailing slash' : null,
      !uri.startsWith('http') ? 'Must start with http:// or https://' : null,
      uri.includes('localhost') && process.env.NODE_ENV === 'production' ? 'Using localhost in production' : null
    ].filter(Boolean) : []
  });
}

async function simulateCallback(code?: string, state?: string) {
  return NextResponse.json({
    message: 'Callback simulation not implemented',
    note: 'Use the actual OAuth flow for testing',
    provided: { code: !!code, state: !!state },
    testInstructions: [
      'Use generate_test_url action to get an auth URL',
      'Complete the OAuth flow in your browser',
      'The callback will be processed automatically'
    ]
  });
}