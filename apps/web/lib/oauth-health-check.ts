/**
 * OAuth Health Check and Configuration Validation
 * Provides comprehensive validation for Gmail OAuth setup
 */

import { google } from 'googleapis';

export interface OAuthHealthStatus {
  status: 'healthy' | 'warning' | 'error';
  checks: {
    environmentVariables: OAuthCheckResult;
    redirectUri: OAuthCheckResult;
    googleClientConfig: OAuthCheckResult;
    gmailApiAccess: OAuthCheckResult;
  };
  recommendations: string[];
  lastChecked: string;
}

export interface OAuthCheckResult {
  status: 'pass' | 'warn' | 'fail';
  message: string;
  details?: string[];
}

export class OAuthHealthChecker {
  private static instance: OAuthHealthChecker;
  private lastHealthCheck: OAuthHealthStatus | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): OAuthHealthChecker {
    if (!OAuthHealthChecker.instance) {
      OAuthHealthChecker.instance = new OAuthHealthChecker();
    }
    return OAuthHealthChecker.instance;
  }

  /**
   * Perform a comprehensive OAuth health check
   */
  public async performHealthCheck(): Promise<OAuthHealthStatus> {
    const checks = {
      environmentVariables: await this.checkEnvironmentVariables(),
      redirectUri: await this.checkRedirectUri(),
      googleClientConfig: await this.checkGoogleClientConfig(),
      gmailApiAccess: await this.checkGmailApiAccess(),
    };

    const failedChecks = Object.values(checks).filter(check => check.status === 'fail').length;
    const warningChecks = Object.values(checks).filter(check => check.status === 'warn').length;
    
    let overallStatus: 'healthy' | 'warning' | 'error';
    if (failedChecks > 0) {
      overallStatus = 'error';
    } else if (warningChecks > 0) {
      overallStatus = 'warning';
    } else {
      overallStatus = 'healthy';
    }

    const recommendations = this.generateRecommendations(checks);

    this.lastHealthCheck = {
      status: overallStatus,
      checks,
      recommendations,
      lastChecked: new Date().toISOString(),
    };

    return this.lastHealthCheck;
  }

  /**
   * Get the last health check result (cached)
   */
  public getLastHealthCheck(): OAuthHealthStatus | null {
    return this.lastHealthCheck;
  }

  /**
   * Start periodic health checks
   */
  public startPeriodicHealthChecks(intervalMinutes: number = 30): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(
      () => this.performHealthCheck(),
      intervalMinutes * 60 * 1000
    );

    // Perform initial health check
    this.performHealthCheck();
  }

  /**
   * Stop periodic health checks
   */
  public stopPeriodicHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  private async checkEnvironmentVariables(): Promise<OAuthCheckResult> {
    const requiredVars = {
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    };

    const missingVars = Object.entries(requiredVars)
      .filter(([_, value]) => !value)
      .map(([key, _]) => key);

    if (missingVars.length > 0) {
      return {
        status: 'fail',
        message: `Missing required environment variables: ${missingVars.join(', ')}`,
        details: [
          'Set up OAuth 2.0 credentials in Google Cloud Console',
          'Add the required environment variables to your .env.local file',
          'Restart your application after updating environment variables'
        ]
      };
    }

    // Validate format of variables
    const warnings = [];
    
    if (requiredVars.GOOGLE_CLIENT_ID && !requiredVars.GOOGLE_CLIENT_ID.includes('.apps.googleusercontent.com')) {
      warnings.push('GOOGLE_CLIENT_ID should end with .apps.googleusercontent.com');
    }

    if (requiredVars.NEXT_PUBLIC_APP_URL && !requiredVars.NEXT_PUBLIC_APP_URL.startsWith('http')) {
      warnings.push('NEXT_PUBLIC_APP_URL should start with http:// or https://');
    }

    return {
      status: warnings.length > 0 ? 'warn' : 'pass',
      message: warnings.length > 0 
        ? `Environment variables set but with warnings: ${warnings.join(', ')}`
        : 'All required environment variables are set',
      details: warnings.length > 0 ? warnings : undefined
    };
  }

  private async checkRedirectUri(): Promise<OAuthCheckResult> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      return {
        status: 'fail',
        message: 'Cannot validate redirect URI - NEXT_PUBLIC_APP_URL not set'
      };
    }

    const redirectUri = `${appUrl}/api/auth/gmail/callback`;
    const expectedLocal = 'http://localhost:3000/api/auth/gmail/callback';
    
    // Check if using localhost in production
    if (process.env.NODE_ENV === 'production' && appUrl.includes('localhost')) {
      return {
        status: 'fail',
        message: 'Using localhost URL in production environment',
        details: [
          'Update NEXT_PUBLIC_APP_URL to your production domain',
          'Update authorized redirect URIs in Google Cloud Console',
          'Ensure the redirect URI matches exactly (no trailing slashes)'
        ]
      };
    }

    // Check for common redirect URI issues
    const warnings = [];
    if (redirectUri.endsWith('/')) {
      warnings.push('Redirect URI should not end with a slash');
    }

    return {
      status: warnings.length > 0 ? 'warn' : 'pass',
      message: `Redirect URI: ${redirectUri}`,
      details: warnings.length > 0 ? [
        ...warnings,
        'Make sure this exact URI is added to Google Cloud Console authorized redirect URIs'
      ] : [
        'Add this URI to Google Cloud Console authorized redirect URIs',
        'Ensure the URI matches exactly (case-sensitive, no trailing slashes)'
      ]
    };
  }

  private async checkGoogleClientConfig(): Promise<OAuthCheckResult> {
    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/gmail/callback`
      );

      // Try to generate an auth URL to validate the client config
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/gmail.readonly'],
        prompt: 'consent'
      });

      if (!authUrl.startsWith('https://accounts.google.com/o/oauth2/v2/auth')) {
        return {
          status: 'fail',
          message: 'Generated auth URL does not match expected Google OAuth URL format',
          details: ['Check that GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are correct']
        };
      }

      return {
        status: 'pass',
        message: 'Google OAuth client configuration is valid',
        details: ['Auth URL can be generated successfully']
      };

    } catch (error) {
      return {
        status: 'fail',
        message: `Failed to create Google OAuth client: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: [
          'Verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are correct',
          'Check that the credentials are for a web application',
          'Ensure the Google Cloud project has OAuth consent screen configured'
        ]
      };
    }
  }

  private async checkGmailApiAccess(): Promise<OAuthCheckResult> {
    try {
      // This is a basic check - we can't test actual API access without user tokens
      // But we can check if the Gmail API library is working
      const gmail = google.gmail({ version: 'v1' });
      
      if (!gmail.users) {
        throw new Error('Gmail API client not properly initialized');
      }

      return {
        status: 'pass',
        message: 'Gmail API client initialized successfully',
        details: [
          'API client is ready for use',
          'Make sure Gmail API is enabled in Google Cloud Console',
          'Actual API access will be tested during user authentication'
        ]
      };

    } catch (error) {
      return {
        status: 'warn',
        message: `Gmail API client initialization warning: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: [
          'Enable Gmail API in Google Cloud Console',
          'Verify the Google APIs client library is installed correctly',
          'Check that the project has the Gmail API enabled'
        ]
      };
    }
  }

  private generateRecommendations(checks: OAuthHealthStatus['checks']): string[] {
    const recommendations = [];

    if (checks.environmentVariables.status === 'fail') {
      recommendations.push('🔧 Set up OAuth 2.0 credentials in Google Cloud Console first');
    }

    if (checks.redirectUri.status === 'fail' || checks.redirectUri.status === 'warn') {
      recommendations.push('🔗 Verify redirect URI configuration in Google Cloud Console');
    }

    if (checks.googleClientConfig.status === 'fail') {
      recommendations.push('⚙️ Check OAuth client credentials in Google Cloud Console');
    }

    if (checks.gmailApiAccess.status === 'fail' || checks.gmailApiAccess.status === 'warn') {
      recommendations.push('📧 Enable Gmail API in Google Cloud Console');
    }

    // General recommendations based on overall health
    const hasErrors = Object.values(checks).some(check => check.status === 'fail');
    const hasWarnings = Object.values(checks).some(check => check.status === 'warn');

    if (hasErrors) {
      recommendations.push('🚨 Fix critical OAuth configuration issues before testing');
    } else if (hasWarnings) {
      recommendations.push('⚠️ Address configuration warnings for optimal performance');
    } else {
      recommendations.push('✅ OAuth configuration looks good! Test with a real Gmail connection');
    }

    return recommendations;
  }
}

/**
 * Quick validation function for use in API routes
 */
export async function validateOAuthConfig(): Promise<{
  isValid: boolean;
  errors: string[];
  warnings: string[];
}> {
  const checker = OAuthHealthChecker.getInstance();
  const health = await checker.performHealthCheck();

  const errors = Object.values(health.checks)
    .filter(check => check.status === 'fail')
    .map(check => check.message);

  const warnings = Object.values(health.checks)
    .filter(check => check.status === 'warn')
    .map(check => check.message);

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}